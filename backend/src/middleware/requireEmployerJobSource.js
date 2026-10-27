// Legacy job/application URLs always refer to Employer jobs. Keep source-less
// clients compatible, but never reinterpret an explicitly typed Admin job ID.
export function requireEmployerJobSource(req, res, next) {
  if ([req.query?.source, req.body?.source].some(source => source !== undefined && source !== "employer")) {
    return res.status(400).json({ success: false, message: "This endpoint accepts Employer jobs only." });
  }
  next();
}
