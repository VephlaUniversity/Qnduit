import { createHmac } from 'node:crypto';
import Employer from '../models/Employer.js';
import Talent from '../models/Talent.js';
import Event, { assertAnalyticsReady } from '../models/PortfolioAnalyticsEvent.js';
import Resume from '../models/Resume.js';
import { findPublishedPortfolio } from '../services/publicTalentAccess.js';
import { resolveSubscriptionStatus } from '../services/subscriptionStatus.js';
import { resolveAuthentication } from '../middleware/authMiddleware.js';
import { PUBLIC_TALENT_FIELDS, PUBLIC_RESUME_FIELDS, publicTalentProfileDto } from '../utils/publicTalentProfile.js';
import { analyticsConfiguration as configuration, validActivationId, permittedMeasurement, analyticsProjectKey, analyticsWindow, eventIdentity, paidAnalytics, summaryPipeline, validateEvent } from '../utils/portfolioAnalytics.js';

async function publicProjects(published) {
  const resume = await Resume.findOne({ talent: published.talent._id }).select(PUBLIC_RESUME_FIELDS).lean();
  const dto = publicTalentProfileDto(published.talent, resume, { analyticsKey: analyticsProjectKey, paidPortfolio: published.publication.subscriptionStatus?.eligibility?.talentPublicProfile === true });
  return [...dto.portfolio, ...dto.gallery];
}
export function createAnalyticsHandlers(dependencies = {}) {
  const { eventModel = Event, ready = assertAnalyticsReady, portfolio = findPublishedPortfolio,
    subscription = resolveSubscriptionStatus,
    authentication = resolveAuthentication, projectsFor = publicProjects } = dependencies;
  async function ingestPortfolioEvent(req, res) {
    res.set('Cache-Control', 'private, no-store');
    if (!validateEvent(req.body) || Object.keys(req.query).length) return res.status(400).json({ message: 'Invalid analytics event.' });
    // Downloads are accepted only through the authenticated application-scoped endpoint.
    if (req.body.type === 'cv_download') return res.status(403).json({ message: 'Employer application access required.' });
    if (req.body.type === 'contact_click') return res.status(403).json({ message: 'Employer saved-candidate access required.' });
    if (!permittedMeasurement(req.body)) return res.status(403).json({ message: 'Analytics permission or documented exception required.' });
    if (req.get('Sec-GPC') === '1' || req.get('DNT') === '1' || /bot|crawler|spider|headless|preview|slurp/i.test(req.get('User-Agent') || '') || !req.get('User-Agent')) return res.sendStatus(204);
    try {
      const { secret } = configuration();
      if (req.headers.authorization) {
        const { user, role } = await authentication(req);
        req.analyticsActor = { user, role };
      }
      const published = await portfolio(req.params.username, PUBLIC_TALENT_FIELDS);
      if (!published) return res.sendStatus(404);
      const owner = published.talent._id;
      if (req.analyticsActor?.role === 'talent' && String(req.analyticsActor.user._id) === String(owner)) return res.sendStatus(204);
      const event = req.body;
      if (event.type.startsWith('project_')) {
        const project = (await projectsFor(published)).find(row => row.analyticsKey === event.projectKey);
        if (!project || event.type === 'project_link_click' && !project.projectUrl && !project.links?.length) return res.sendStatus(400);
      }
      await ready();
      const identity = eventIdentity(owner, event, secret);
      try {
        await eventModel.updateOne({ _id: identity.id }, { $setOnInsert: { owner, ...(identity.visitor ? { visitor: identity.visitor } : {}), ...(event.measurement ? { measurement: event.measurement, version: 2 } : {}), type: event.type, source: event.source, ...(event.projectKey ? { projectKey: event.projectKey } : {}), at: new Date() } }, { upsert: true });
      } catch (error) { if (error.code !== 11000) throw error; }
      return res.sendStatus(204);
    } catch { return res.status(503).json({ message: 'Analytics recording unavailable.' }); }
  }
  async function getPortfolioAnalytics(req, res) {
    res.set('Cache-Control', 'private, no-store');
    if (req.user?.role !== 'talent') return res.sendStatus(403);
    try {
      const status = await subscription({ accountId: req.user._id, role: 'talent' });
      if (!paidAnalytics(status)) return res.status(403).json({ code: 'ANALYTICS_PAID_REQUIRED', message: 'An active Public Listing subscription is required.' });
      const range = analyticsWindow(Number(req.query.days ?? 30));
      if (!range || Object.keys(req.query).some(key => key !== 'days')) return res.status(400).json({ message: 'Choose 7, 30 or 90 days.' });
      const { startedAt } = configuration();
      await ready();
      const [data] = await eventModel.aggregate(summaryPipeline(req.user._id, range)).option({ maxTimeMS: 5000 });
      const totals = Object.fromEntries(data.totals.map(row => [row._id, row.count]));
      const trends = [];
      for (const day = new Date(range.start); day <= range.end; day.setUTCDate(day.getUTCDate() + 1)) {
        const date = day.toISOString().slice(0, 10), row = data.trends.find(value => value._id === date);
        trends.push({ date, visits: row?.visits || 0, visitors: row?.visitors || 0 });
      }
      // Resolve current labels without storing project content in analytics events.
      const published = await portfolio(req.user.username, PUBLIC_TALENT_FIELDS);
      const projects = published ? await projectsFor(published) : [];
      return res.json({ startedAt, timezone: 'UTC', range, totals, uniqueVisitors: data.unique[0]?.count || 0, trends,
        projects: data.projects.map(row => ({ key: row._id, title: projects.find(p => p.analyticsKey === row._id)?.title || 'Unavailable project', views: row.views })),
        referrals: data.referrals.map(row => ({ source: row._id, visits: row.visits })), contactSupported: false, savedCandidatesContactClicks: data.savedCandidateContacts?.[0]?.count || 0, coverage: (data.coverage || []).map(row => ({ measurement: row._id, visits: row.visits })) });
    } catch { return res.status(503).json({ message: 'Analytics could not be verified or loaded. Please try again.' }); }
  }

  return { ingestPortfolioEvent, getPortfolioAnalytics };
}
export const { ingestPortfolioEvent, getPortfolioAnalytics } = createAnalyticsHandlers();

// Route middleware supplies authentication, Employer role and the established
// messaging entitlement. This handler additionally enforces saved-list ownership.
export function createSavedCandidateContactHandler(dependencies = {}) {
  const { employers = Employer, talents = Talent, events = Event, ready = assertAnalyticsReady,
    config = configuration, now = () => new Date() } = dependencies;
  return async function recordSavedCandidateContact(req, res) {
    res.set('Cache-Control', 'private, no-store');
    if (req.user?.role !== 'employer') return res.status(req.user ? 403 : 401).json({ message: 'Employer authentication required.' });
    const body = req.body;
    if (!/^[a-f\d]{24}$/i.test(req.params.talentId || '') || Object.keys(req.query || {}).length
      || !body || Object.keys(body).some(key => !['activationId', 'measurement', 'basis', 'policyReference'].includes(key))
      || !validActivationId(body.activationId) || body.measurement !== 'activity' || !['consent', 'exception'].includes(body.basis)
      || typeof body.policyReference !== 'string' || !/^[a-zA-Z0-9._:-]{1,120}$/.test(body.policyReference)) {
      return res.status(400).json({ message: 'Invalid contact activation.' });
    }
    if (!permittedMeasurement(body) && !permittedMeasurement({ ...body, measurement: 'browser' })) return res.status(403).json({ message: 'Analytics permission required.' });
    if (req.get('Sec-GPC') === '1' || req.get('DNT') === '1' || !req.get('User-Agent')
      || /bot|crawler|spider|headless|preview|slurp/i.test(req.get('User-Agent'))) return res.sendStatus(204);
    try {
      const talentId = req.params.talentId.toLowerCase();
      if (!await employers.exists({ _id: req.user._id, savedCandidates: talentId })) return res.status(404).json({ message: 'Saved candidate unavailable.' });
      const target = await talents.exists({ _id: talentId });
      if (!target) return res.status(404).json({ message: 'Saved candidate unavailable.' });
      const { secret } = config();
      const id = createHmac('sha256', secret).update(JSON.stringify(['saved-candidates', String(target._id), body.activationId])).digest('hex');
      await ready();
      try {
        await events.updateOne({ _id: id }, { $setOnInsert: { owner: target._id, type: 'contact_click', channel: 'saved-candidates',
          activationId: body.activationId, measurement: 'activity', version: 2, at: now() } }, { upsert: true });
      } catch (error) { if (error.code !== 11000) throw error; }
      return res.sendStatus(204);
    } catch { return res.status(503).json({ message: 'Contact analytics unavailable.' }); }
  };
}
export const recordSavedCandidateContact = createSavedCandidateContactHandler();
