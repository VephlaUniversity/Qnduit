import { createAdminSubscriptionActionSession } from "./adminSubscriptionAction.js";

export const createAdminCancellationSession = options => createAdminSubscriptionActionSession({ ...options, action: "cancel" });
