export const applicationStatusLabels = {
  pending: "Pending",
  reviewed: "Reviewed",
  shortlisted: "Shortlisted",
  rejected: "Rejected",
  hired: "Hired",
};

export function applicationStatusLabel(status) {
  if (typeof status !== "string" || !status) return "—";
  return Object.hasOwn(applicationStatusLabels, status)
    ? applicationStatusLabels[status]
    : status;
}
