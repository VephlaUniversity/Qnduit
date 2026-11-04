import mongoose from "mongoose";
import process from "node:process";
import ExternalApplicationActivity, { assertExternalActivityReady } from "../models/ExternalApplicationActivity.js";

// No dotenv or application startup. Operator must select the database explicitly.
const uri = process.env.EXTERNAL_ACTIVITY_DATABASE_URI;
if (!uri) throw new Error("Set EXTERNAL_ACTIVITY_DATABASE_URI to the intended database before provisioning.");
try {
  await mongoose.connect(uri, { autoIndex: false, autoCreate: false });
  await ExternalApplicationActivity.createCollection();
  // Additively creates declared intent/history and Employer figures indexes.
  // Never drops/reconciles existing indexes; recording readiness is unchanged.
  await ExternalApplicationActivity.createIndexes();
  await assertExternalActivityReady();
  console.log("External application activity indexes provisioned and verified.");
} finally {
  await mongoose.disconnect();
}
