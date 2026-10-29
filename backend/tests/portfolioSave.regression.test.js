import assert from "node:assert/strict";
import { test } from "node:test";
import process from "node:process";
import mongoose from "mongoose";
import Resume from "../src/models/Resume.js";
import Talent from "../src/models/Talent.js";
import PortfolioSave from "../src/models/PortfolioSave.js";
import cloudinary from "../src/utils/cloudinary.js";
import { saveResume } from "../src/controllers/resumeController.js";
import { savePortfolioPage } from "../src/controllers/portfolioSaveController.js";
import { editorRevision, talentDraft } from "../src/utils/talentPortfolioDraft.js";

const owner = new mongoose.Types.ObjectId();
const image = name => ({ fieldname: "portfolioImages", originalname: name,
  mimetype: "image/png", size: 3, buffer: new Uint8Array([1, 2, 3]) });
const run = async (handler, body, files = []) => {
  const result = { status: 200 };
  await handler({ user: { _id: owner }, body, files: { portfolioImages: files } }, {
    status(code) { result.status = code; return this; },
    json(data) { result.data = data; return this; },
  }, error => { result.error = error; result.status = error.statusCode || 500; });
  return result;
};

// All model/provider operations are mocked. No database or provider is contacted.
function legacy(t, { stored = null, saveError = false, readError = false, commit = true, failUpload = 0 } = {}) {
  const state = { stored, uploads: 0, writes: 0, deleted: [], confirmations: [] };
  t.mock.method(Resume, "findOne", () => ({ lean: async () => state.stored }));
  t.mock.method(Resume.collection, "findOne", async (filter, options) => {
    state.confirmations.push({ filter, options });
    if (readError) throw new Error("Confirmation unavailable");
    return state.stored;
  });
  t.mock.method(Resume.prototype, "save", async function () {
    state.writes++;
    if (commit) state.stored = this.toObject();
    if (saveError) throw new Error("Write acknowledgement lost");
    return this;
  });
  t.mock.method(cloudinary.uploader, "upload_stream", (_options, callback) => ({
    end() {
      const n = ++state.uploads;
      if (n === failUpload) callback(new Error("Upload failed"));
      else callback(null, { secure_url: `https://example.com/new-${n}.png`, public_id: `NEW-${n}` });
    },
  }));
  t.mock.method(cloudinary.uploader, "destroy", async id => { state.deleted.push(id); });
  return state;
}

test("portfolio save regressions", async t => {
  await t.test("legacy committed write with lost acknowledgement confirms success and retains image", async t => {
    const state = legacy(t, { saveError: true });
    const result = await run(saveResume, {}, [image("a.png")]);
    assert.equal(result.data.success, true);
    assert.equal(state.stored.portfolioImages[0].public_id, "NEW-1");
    assert.deepEqual(state.deleted, []);
    assert.deepEqual(state.confirmations[0].filter, { _id: state.stored._id, talent: owner });
    assert.equal(state.confirmations[0].options.readConcern.level, "majority");
  });
  for (const readError of [false, true]) {
    await t.test(`legacy unresolved outcome retains uploads (confirmation unavailable: ${readError})`, async t => {
      const state = legacy(t, { saveError: true, readError, commit: false });
      const result = await run(saveResume, {}, [image("a.png")]);
      assert.equal(result.status, 503);
      assert.equal(result.data.success, false);
      assert.equal(result.data.saveState, "pending");
      assert.deepEqual(state.deleted, []);
    });
  }
  await t.test("definitive upload failure before persistence cleans only new uploads", async t => {
    const stored = new Resume({ talent: owner, portfolioImages: [{ url: "https://example.com/old.png", public_id: "KEEP" }] }).toObject();
    const state = legacy(t, { stored, failUpload: 2 });
    const result = await run(saveResume, {}, [image("a.png"), image("b.png")]);
    assert.equal(result.status, 500);
    assert.equal(state.writes, 0);
    assert.deepEqual(state.stored, stored);
    assert.deepEqual(state.deleted, ["NEW-1"]);
  });
  await t.test("ordinary legacy append preserves raw image strings and metadata", async t => {
    const retained = { _id: new mongoose.Types.ObjectId(), url: "https://example.com/structured.png",
      description: "KEEP DESCRIPTION", projectUrl: "https://example.com/project?q=one&v=two", skills: ["React"] };
    const state = legacy(t, { stored: { _id: new mongoose.Types.ObjectId(), talent: owner,
      portfolioImages: ["https://example.com/legacy.png", retained], cvFiles: [] } });
    const result = await run(saveResume, {}, [image("a.png")]);
    assert.equal(result.data.success, true);
    assert.equal(state.stored.portfolioImages.length, 3);
    assert.equal(state.stored.portfolioImages[0].url, "https://example.com/legacy.png");
    assert.deepEqual(state.stored.portfolioImages[1], retained);
    assert.equal(state.stored.portfolioImages[2].public_id, "NEW-1");
    assert.deepEqual(state.deleted, []);
  });
  const duplicate = () => {
    const id = new mongoose.Types.ObjectId();
    return { _id: new mongoose.Types.ObjectId(), talent: owner, cvFiles: [], portfolioImages: [
      { _id: id, url: "https://example.com/first.png", description: "FIRST" },
      { _id: id, url: "https://example.com/second.png", description: "SECOND" },
    ] };
  };
  await t.test("legacy duplicate stored IDs reject even an empty removal manifest before providers/writes", async t => {
    const stored = duplicate(), state = legacy(t, { stored });
    const result = await run(saveResume, { portfolioItems: "[]" }, [image("a.png")]);
    assert.equal(result.status, 400);
    assert.match(result.error.message, /duplicate identities/);
    assert.equal(state.uploads, 0);
    assert.equal(state.writes, 0);
    assert.deepEqual(state.stored, stored);
    assert.deepEqual(state.deleted, []);
  });
  for (const ambiguous of [false, true]) {
    await t.test(`unified save ${ambiguous ? "rejects duplicate stored IDs before receipt/provider/write" : "still commits both sources and receipt"}`, async t => {
      const previousSecret = process.env.JWT_SECRET;
      process.env.JWT_SECRET = "synthetic-regression-secret";
      t.after(() => {
        if (previousSecret === undefined) delete process.env.JWT_SECRET;
        else process.env.JWT_SECRET = previousSecret;
      });
      const talent = { _id: owner, portfolio: ["https://example.com/talent.png"] };
      const stored = ambiguous ? duplicate() : new Resume({ talent: owner,
        portfolioImages: [{ url: "https://example.com/resume.png", description: "BEFORE" }] }).toObject();
      const state = legacy(t, { stored });
      let receipt, claims = 0, sourceWrites = 0, sessions = 0;
      t.mock.method(Talent.collection, "findOne", async () => talent);
      t.mock.method(Talent.collection, "updateOne", async (_filter, update, options) => {
        assert.ok(options.session); sourceWrites++; talent.portfolio = update.$set.portfolio; return { matchedCount: 1 };
      });
      t.mock.method(Resume.collection, "updateOne", async (_filter, update, options) => {
        assert.ok(options.session); sourceWrites++; Object.assign(stored, update.$set); return { matchedCount: 1 };
      });
      t.mock.method(PortfolioSave.collection, "findOne", async () => receipt);
      t.mock.method(PortfolioSave, "create", async value => { claims++; receipt = value; });
      t.mock.method(PortfolioSave.collection, "updateOne", async (_filter, update, options) => {
        assert.ok(options.session); receipt.state = update.$set.state; return { matchedCount: 1 };
      });
      t.mock.method(mongoose, "startSession", async () => {
        sessions++; return { withTransaction: async callback => callback(), endSession: async () => {} };
      });
      const revision = editorRevision(talent, stored);
      const body = { saveRequestId: "regression-save-0001", portfolioRevision: revision, keepCvIds: "[]",
        talentItems: JSON.stringify(talentDraft(talent.portfolio, owner, revision).map(row => ({ ref: row.ref, description: "TALENT EDIT" }))),
        portfolioItems: JSON.stringify([{ id: String(stored.portfolioImages[0]._id), description: "RESUME EDIT" }]) };
      const before = structuredClone(stored);
      const result = await run(savePortfolioPage, body);
      if (ambiguous) {
        assert.equal(result.status, 400);
        assert.match(result.data.message, /duplicate identities/);
        assert.deepEqual(structuredClone(stored), before);
        assert.equal(claims + sourceWrites + sessions + state.uploads, 0);
      } else {
        assert.equal(result.data.saveState, "committed");
        assert.equal(talent.portfolio[0].description, "TALENT EDIT");
        assert.equal(stored.portfolioImages[0].description, "RESUME EDIT");
        assert.equal(sourceWrites, 2);
        assert.equal(receipt.state, "committed");
      }
      assert.deepEqual(state.deleted, []);
    });
  }
});
