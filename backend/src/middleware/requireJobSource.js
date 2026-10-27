// Untyped legacy URLs always mean Employer; never fall back across collections.
export function requireJobSource(req, res, next) {
  const values = [req.query?.source, req.body?.source].filter(value => value !== undefined);
  if (values.some(value => !["employer", "admin"].includes(value)) || new Set(values).size > 1) {
    return res.status(400).json({ success: false, message: "Invalid or conflicting job source." });
  }
  req.jobSource = values[0] || "employer";
  next();
}
