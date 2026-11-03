// File snapshots remain in memory across conversation refresh/close/reopen.
// Scope includes the authenticated session; never share attempts across actors.
const attempts = new Map();
export const readSupportAttempt = scope => attempts.get(scope);
export const rememberSupportAttempt = (scope, attempt) => attempts.set(scope, attempt);
export const forgetSupportAttempt = scope => attempts.delete(scope);
