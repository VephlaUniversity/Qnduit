import mongoose from "mongoose";

const profileViewSchema = new mongoose.Schema({
  targetType: { type: String, enum: ["talent", "employer"], required: true },
  targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
  viewerType: { type: String, enum: ["talent", "employer"], required: true },
  viewerId: { type: mongoose.Schema.Types.ObjectId, required: true },
  day: { type: String, required: true },
  viewedAt: { type: Date, required: true },
});

// One first visit per viewer/target/UTC day, including concurrent requests.
profileViewSchema.index(
  { targetType: 1, targetId: 1, viewerType: 1, viewerId: 1, day: 1 },
  { unique: true },
);
profileViewSchema.index({ targetType: 1, targetId: 1, viewedAt: -1, _id: -1 });

const ProfileView = mongoose.model("ProfileView", profileViewSchema);
let indexesReady;

// Fail closed if the deduplication constraint cannot be installed. Do not count
// concurrently until the unique index is ready, including with autoIndex off.
export function ensureProfileViewIndexes() {
  if (!indexesReady) {
    indexesReady = ProfileView.init()
      .then(() => ProfileView.createIndexes())
      .catch((error) => {
        indexesReady = undefined;
        throw error;
      });
  }
  return indexesReady;
}

export default ProfileView;
