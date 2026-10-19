import mongoose from "mongoose";
import process from "node:process";
import JobApplication from "../models/JobApplication.js";
import Notification from "../models/Notification.js";

export const captureEnabled = () => process.env.NOTIFICATION_CAPTURE_ENABLED === "true";
export const deliveryEnabled = () => process.env.NOTIFICATION_DELIVERY_ENABLED === "true";
export function applicationEvent(kind, application, status) {
  if (!captureEnabled()) return null;
  return { _id: new mongoose.Types.ObjectId(), kind, occurredAt: new Date(),
    recipientType: kind === "application" ? "employer" : "talent",
    recipientId: kind === "application" ? application.employerId : application.applicantId,
    ...(status ? { status } : {}) };
}

// No caller on the action path touches Notification storage. Acknowledgements
// are exact event IDs and never update the application's business timestamps.
export async function reconcileNotifications({ batchSize = 25, signal } = {}) {
  if (!deliveryEnabled() || signal?.aborted) return { processed: 0, failed: 0 };
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 25) throw new Error("Invalid reconciliation bound");
  const applications = await JobApplication.find({ notificationNextAttemptAt: { $lte: new Date() } })
    .sort({ notificationNextAttemptAt: 1, _id: 1 }).limit(batchSize)
    .select({ notificationOutbox: { $slice: 4 }, notificationAttempts: 1 }).lean();
  let processed = 0, failed = 0;
  for (const application of applications) {
    if (signal?.aborted) break;
    try {
      // Current workflow allows creation plus at most three status transitions.
      for (const event of application.notificationOutbox || []) {
        if (signal?.aborted || !deliveryEnabled()) return { processed, failed };
        const { _id, ...payload } = event;
        try {
          await Notification.updateOne({ _id }, { $setOnInsert: {
            ...payload, applicationId: application._id, readAt: null,
            createdAt: new Date(), updatedAt: new Date(),
          } }, { upsert: true, timestamps: false, writeConcern: { w: "majority", j: true } });
        } catch (error) {
          if (error.code !== 11000 || !await Notification.exists({ _id })) throw error;
        }
        await JobApplication.updateOne({ _id: application._id },
          { $pull: { notificationOutbox: { _id } } }, { timestamps: false, writeConcern: { w: "majority", j: true } });
        processed++;
      }
      await JobApplication.updateOne({ _id: application._id, notificationOutbox: { $size: 0 } },
        { $unset: { notificationNextAttemptAt: 1, notificationAttempts: 1 } }, { timestamps: false });
    } catch {
      failed++;
      const delay = Math.min(300000, 5000 * 2 ** Math.min(application.notificationAttempts || 0, 6));
      await JobApplication.updateOne({ _id: application._id }, {
        $inc: { notificationAttempts: 1 }, $set: { notificationNextAttemptAt: new Date(Date.now() + delay) },
      }, { timestamps: false });
    }
  }
  return { processed, failed };
}

export function startNotificationReconciler() {
  let stopped = false, timer;
  const controller = new AbortController();
  async function tick() {
    try { await reconcileNotifications({ signal: controller.signal }); }
    catch { /* Source DB unavailable: retain intent and retry; never touch action responses. */ }
    if (!stopped) { timer = setTimeout(tick, 5000); timer.unref?.(); }
  }
  timer = setTimeout(tick, 5000); timer.unref?.();
  return () => { stopped = true; controller.abort(); clearTimeout(timer); };
}
