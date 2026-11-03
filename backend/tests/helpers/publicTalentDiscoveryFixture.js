import mongoose from "mongoose";
import Talent from "../../src/models/Talent.js";
import Resume from "../../src/models/Resume.js";
import TalentSubscription from "../../src/models/TalentSubscription.js";
import TalentPayment from "../../src/models/TalentPayment.js";

// Only call after connecting to a dedicated synthetic database.
export async function seedPublicTalentDiscovery() {
  if (mongoose.connection.host !== "127.0.0.1" || !/^qnduit_en499b_/.test(mongoose.connection.name || "")) {
    throw new Error("EN499B fixtures require a dedicated loopback synthetic database.");
  }
  const id = n => new mongoose.Types.ObjectId(n.toString(16).padStart(24, "0"));
  const now = Date.now();
  const rows = [
    { firstName: "Ada", lastName: "Okafor", jobTitle: "Product Designer", username: "ada-okafor" },
    { fullName: "Tunde Bello", jobTitle: "Frontend Engineer", username: "tunde-bello" },
    { fullName: "Maya Chen", jobTitle: "Product Designer", username: "maya-chen", location: "Canada" },
    ...Array.from({ length: 12 }, (_, i) => ({ fullName: `Sample Talent ${i + 1}`, jobTitle: "Researcher", username: `sample-talent-${i + 1}` })),
    { fullName: "Hidden Designer", username: "hidden-designer", showProfile: "hidden" },
    { fullName: "Unpaid Designer", username: "unpaid-designer", unpaid: true },
    { fullName: "Expired Designer", username: "expired-designer", expired: true },
    { fullName: "Unverified Designer", username: "unverified-designer", isVerified: false },
    { fullName: "Suspended Designer", username: "suspended-designer", accountStatus: "suspended" },
    { fullName: "Disabled Designer", username: "disabled-designer", publicProfileEnabled: false },
  ];
  for (const [index, row] of rows.entries()) {
    const { unpaid, expired, ...fields } = row;
    const talent = { _id: id(index + 1), jobTitle: "Product Designer", location: "Nigeria", tags: ["Design"],
      experienceTime: "1-3 Years", qualification: "Bachelor Degree", showProfile: "show", isVerified: true,
      accountStatus: "active", selectedPlan: "public", paymentStatus: "active", publicProfileEnabled: true,
      email: `private-${index}@example.invalid`, phone: "PRIVATE-PHONE", password: "PRIVATE-PASSWORD",
      verificationCode: "PRIVATE-CODE", avatar: { url: "", public_id: "PRIVATE-ASSET" },
      profileUpdatedAt: new Date(now - index * 1000), aboutMe: "Synthetic profile for isolated EN499B testing.", ...fields };
    await Talent.collection.insertOne(talent);
    await Resume.collection.insertOne({ talent: talent._id, skills: [{ title: "Design", percent: "80" }], cvFiles: [{ url: "PRIVATE-CV" }] });
    await TalentSubscription.collection.insertOne({ talent: talent._id, plan: "public", provider: "flutterwave", status: "active",
      currentPeriodStart: new Date(now - 86400000 * 30), currentPeriodEnd: new Date(now + (expired ? -1 : 1) * 86400000 * 30), lastTxRef: `synthetic-${index}` });
    if (!unpaid) await TalentPayment.collection.insertOne({ talent: talent._id, plan: "public", provider: "flutterwave", status: "successful", txRef: `synthetic-${index}` });
  }
}
