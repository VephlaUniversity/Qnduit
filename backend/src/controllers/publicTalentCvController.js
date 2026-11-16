// Retired public URLs must never disclose CV metadata or redirect to file assets.
// Legitimate Employers use the existing application-scoped authenticated endpoint.
export function getPublicTalentCv(req, res) {
  res.set('Cache-Control', 'private, no-store');
  res.set('Referrer-Policy', 'no-referrer');
  return res.status(404).json({ success: false, message: 'CV unavailable.' });
}
