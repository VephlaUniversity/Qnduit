import { useAdminSubscriptionAction } from "./useAdminSubscriptionAction";

export const useAdminCancellation = onSaved => useAdminSubscriptionAction("cancel", onSaved);
