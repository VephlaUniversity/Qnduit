// Explicit availability queries only. Retained jobs still count toward quota,
// and application/history queries intentionally do not apply this predicate.
// Keep strict false semantics: missing legacy flags are not implicitly public.
export const nonDeletedJobFilter = () => ({ isDeleted: false });
