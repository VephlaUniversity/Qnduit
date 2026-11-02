import { lagosDateKey } from "../utils/jobDeadline.js";

// Explicit availability queries only. Retained jobs still count toward quota,
// and application/history queries intentionally do not apply this predicate.
// Keep strict false semantics: missing legacy flags are not implicitly public.
export const nonDeletedJobFilter = () => ({ isDeleted: false });

// Published, not deleted, and not past its (Africa/Lagos) deadline.
export const openJobFilter = () => ({
  status: "published",
  ...nonDeletedJobFilter(),
  $or: [
    { deadlineDate: null },
    { deadlineDate: { $exists: false } },
    { deadlineDate: { $gte: new Date(`${lagosDateKey()}T00:00:00.000Z`) } },
  ],
});
