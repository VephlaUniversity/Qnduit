import { startAttachmentRecovery } from "./utils/messageAttachments/recovery.js";
import app from "./app.js";
import process from "node:process";
import { startNotificationReconciler } from "./services/notifications.js";

const PORT = process.env.PORT || 5000;

const stopNotifications = startNotificationReconciler();
const stopAttachmentRecovery = startAttachmentRecovery();
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
server.on("close", stopNotifications);
server.on("close", stopAttachmentRecovery);
