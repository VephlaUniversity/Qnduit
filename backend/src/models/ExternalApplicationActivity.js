import mongoose from "mongoose";

const displaySchema = new mongoose.Schema({
  jobTitle: { type: String, default: "" },
  companyName: { type: String, default: "" },
  location: { type: String, default: "" },
  category: { type: String, default: "" },
  workType: { type: String, default: "" },
  jobApplyType: { type: String, default: "" },
}, { _id: false });

const schema = new mongoose.Schema({
  // Built-in _id uniqueness also protects in-flight requests if an operator
  // removes the compound index between readiness inspection and insert.
  _id: { type: String, required: true, immutable: true },
  talentId: { type: mongoose.Schema.Types.ObjectId, ref: "Talent", required: true, immutable: true },
  intentId: { type: String, required: true, immutable: true },
  jobId: { type: mongoose.Schema.Types.ObjectId, required: true, immutable: true },
  source: { type: String, enum: ["employer", "admin"], required: true, immutable: true },
  posterId: { type: mongoose.Schema.Types.ObjectId, required: true, immutable: true },
  posterType: { type: String, enum: ["Employer", "Admin"], required: true, immutable: true },
  destinationUrl: { type: String, required: true, immutable: true },
  clickedAt: { type: Date, required: true, immutable: true },
  display: { type: displaySchema, required: true, immutable: true },
}, { collection: "externalapplicationactivities", autoIndex: false, autoCreate: false, versionKey: false });

export const EXTERNAL_ACTIVITY_INTENT_INDEX = "external_activity_talent_intent_unique";
schema.index({ talentId: 1, intentId: 1 }, { unique: true, name: EXTERNAL_ACTIVITY_INTENT_INDEX, collation: { locale: "simple" } });
schema.index({ talentId: 1, clickedAt: -1, _id: -1 }, { name: "external_activity_talent_time" });

schema.index({ source: 1, clickedAt: -1, _id: -1 }, { name: "external_activity_source_time" });

const ExternalApplicationActivity = mongoose.model("ExternalApplicationActivity", schema);

// No cached readiness: an index removed after startup must disable new recording.
// Provisioning is explicit and never runs on an application request.
export async function assertExternalActivityReady() {
  try {
    const indexes = await ExternalApplicationActivity.collection.listIndexes().toArray();
    const protectedIntent = indexes.some(index => index.name === EXTERNAL_ACTIVITY_INTENT_INDEX &&
      index.unique === true && !index.sparse && !index.partialFilterExpression &&
      (!index.collation || index.collation.locale === "simple") &&
      JSON.stringify(index.key) === JSON.stringify({ talentId: 1, intentId: 1 }));
    if (!protectedIntent) throw new Error("Missing required unique intent index");
  } catch {
    throw Object.assign(new Error("External application activity recording is temporarily unavailable."), {
      status: 503, code: "EXTERNAL_ACTIVITY_NOT_READY",
    });
  }
}

export default ExternalApplicationActivity;
