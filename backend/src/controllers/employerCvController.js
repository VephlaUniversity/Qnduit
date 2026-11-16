import { createHmac, randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import JobApplication from '../models/JobApplication.js';
import { activeSavedCv } from '../services/activeTalentCv.js';
import { publicCvAsset } from '../services/publicTalentCv.js';
import Event, { assertAnalyticsReady } from '../models/PortfolioAnalyticsEvent.js';
import { analyticsConfiguration, publicAnalyticsPolicy, permittedMeasurement } from '../utils/portfolioAnalytics.js';

const unavailable = res => res.status(404).json({ message: 'CV unavailable.' });
export function cvVersion(cv, secret) {
  return createHmac('sha256', secret).update(JSON.stringify([String(cv._id || ''), cv.public_id || '', cv.url, cv.contentHash || ''])).digest('hex');
}
export function createEmployerCvHandlers(dependencies = {}) {
  const { applications = JobApplication, savedCv = activeSavedCv, events = Event, ready = assertAnalyticsReady,
    configuration = analyticsConfiguration, now = () => Date.now() } = dependencies;
  async function authorizedApplication(req) {
    if (req.user?.role !== 'employer' || !/^[a-f\d]{24}$/i.test(req.params.applicationId || '')) return null;
    return applications.findOne({ _id: req.params.applicationId, employerId: req.user._id, employerArchivedAt: null }).lean();
  }
  async function getApplicationCv(req, res, next) {
    res.set('Cache-Control', 'private, no-store');
    try {
      const application = await authorizedApplication(req);
      if (!application) return unavailable(res);
      const cv = await savedCv(application.applicantId), asset = publicCvAsset(cv?.url);
      if (!asset) return unavailable(res);
      let downloadReceipt;
      if (req.query.purpose === 'download') {
        // Analytics configuration must never prevent an authorized CV download.
        try {
          const { secret } = configuration();
          downloadReceipt = jwt.sign({ application: String(application._id), employer: String(req.user._id),
            talent: String(application.applicantId), cvVersion: cvVersion(cv, secret), jti: randomUUID(), iat: Math.floor(now() / 1000) }, secret,
          { algorithm: 'HS256', expiresIn: 600, audience: 'employer-cv-download', issuer: 'qnduit' });
        } catch { /* CV access works without analytics readiness/configuration. */ }
      }
      return res.json({ success: true, analyticsPolicy: publicAnalyticsPolicy(), cv: {
        url: asset.url, name: cv.name || `CV.${asset.format.toLowerCase()}`, format: asset.format,
        ...(downloadReceipt ? { downloadReceipt } : {}),
      } });
    } catch (error) { next(error); }
  }
  async function recordEmployerCvDownload(req, res) {
    res.set('Cache-Control', 'private, no-store');
    const body = req.body;
    if (!body || Object.keys(body).some(key => !['receipt', 'measurement', 'basis', 'policyReference'].includes(key))
      || typeof body.receipt !== 'string' || body.receipt.length > 2500 || body.measurement !== 'activity'
      || !['consent', 'exception'].includes(body.basis) || typeof body.policyReference !== 'string' || !/^[a-zA-Z0-9._:-]{1,120}$/.test(body.policyReference || '')) {
      return res.status(400).json({ message: 'Invalid download event.' });
    }
    if (!permittedMeasurement(body) && !permittedMeasurement({ ...body, measurement: 'browser' })) return res.status(403).json({ message: 'Analytics permission required.' });
    if (req.get('Sec-GPC') === '1' || req.get('DNT') === '1' || /bot|crawler|spider|headless|preview|slurp/i.test(req.get('User-Agent') || '')) return res.sendStatus(204);
    try {
      const application = await authorizedApplication(req);
      if (!application) return unavailable(res);
      const { secret } = configuration();
      let receipt;
      try { receipt = jwt.verify(body.receipt, secret, { algorithms: ['HS256'], audience: 'employer-cv-download', issuer: 'qnduit', clockTimestamp: Math.floor(now() / 1000) }); }
      catch { return res.status(400).json({ message: 'Invalid or expired download receipt.' }); }
      if (receipt.application !== String(application._id) || receipt.employer !== String(req.user._id)
        || receipt.talent !== String(application.applicantId) || !/^[a-f\d]{64}$/.test(receipt.cvVersion || '') || !receipt.jti) return unavailable(res);
      // The signed receipt binds the actual fetched version. A later replacement
      // must not relabel that completed save as the new current CV.
      const id = createHmac('sha256', secret).update(`employer-cv:${receipt.jti}`).digest('hex');
      await ready();
      try {
        await events.updateOne({ _id: id }, { $setOnInsert: { owner: application.applicantId, type: 'cv_download',
          measurement: 'activity', version: 2, channel: 'employer-application', cvVersion: receipt.cvVersion, at: new Date(now()) } }, { upsert: true });
      } catch (error) { if (error.code !== 11000) throw error; }
      return res.sendStatus(204);
    } catch { return res.status(503).json({ message: 'Download analytics unavailable.' }); }
  }
  return { getApplicationCv, recordEmployerCvDownload };
}
export const { getApplicationCv, recordEmployerCvDownload } = createEmployerCvHandlers();
