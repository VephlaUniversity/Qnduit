import { createHash, createHmac } from 'node:crypto';
export const eventTypes = ['portfolio_view', 'project_view', 'project_link_click', 'cv_download', 'contact_click'];
export const sources = ['direct', 'internal', 'search', 'social', 'other'];
const uuid = /^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i;
export const validActivationId = value => typeof value === 'string' && uuid.test(value);
export function validateEvent(body) {
  if (!body || Object.keys(body).some(key => !['type', 'eventId', 'navigationId', 'browserId', 'projectKey', 'cvId', 'source', 'consent', 'measurement', 'basis', 'policyReference'].includes(key))) return false;
  const legacy = body.measurement === undefined && body.consent === true;
  const measured = legacy || body.measurement === 'browser';
  const permission = legacy || body.consent === undefined && ['activity', 'browser'].includes(body.measurement) && ['consent', 'exception'].includes(body.basis)
    && typeof body.policyReference === 'string' && /^[a-zA-Z0-9._:-]{1,120}$/.test(body.policyReference);
  return permission && eventTypes.includes(body.type) && uuid.test(body.eventId) && uuid.test(body.navigationId)
    && (measured ? uuid.test(body.browserId) : body.browserId === undefined)
    && sources.includes(body.source) && (body.type.startsWith('project_') ? typeof body.projectKey === 'string' && body.projectKey.length <= 100 && /^[\w:-]+$/.test(body.projectKey) : body.projectKey === undefined)
    && (body.type === 'cv_download' ? typeof body.cvId === 'string' && /^(?:[a-f\d]{24}|legacy-[a-f\d]{32})$/i.test(body.cvId) : body.cvId === undefined);
}
export function permittedMeasurement(event, policy = process.env) {
  if (event.measurement === undefined) return event.consent === true; // Existing consent-backed clients.
  if (event.basis === 'consent') return true; // Trusted first-party preference integration supplies the scoped decision.
  const expected = policy[event.measurement === 'browser' ? 'PORTFOLIO_ANALYTICS_BROWSER_EXCEPTION_REF' : 'PORTFOLIO_ANALYTICS_ACTIVITY_EXCEPTION_REF'];
  return Boolean(expected && event.policyReference === expected);
}
export function publicAnalyticsPolicy(policy = process.env) {
  const valid = value => typeof value === 'string' && /^[a-zA-Z0-9._:-]{1,120}$/.test(value) ? value : null;
  return { activityException: valid(policy.PORTFOLIO_ANALYTICS_ACTIVITY_EXCEPTION_REF), browserException: valid(policy.PORTFOLIO_ANALYTICS_BROWSER_EXCEPTION_REF) };
}
export function analyticsWindow(days, now = new Date()) {
  if (![7, 30, 90].includes(days)) return null;
  const end = new Date(now), start = new Date(now);
  start.setUTCHours(0, 0, 0, 0); start.setUTCDate(start.getUTCDate() - days + 1);
  return { start, end };
}
export function paidAnalytics(status) {
  return status?.role === 'talent' && status.paidEligible === true && status.effectivePlan === 'public' && status.eligibility?.talentPublicProfile === true;
}
export function eventIdentity(owner, event, secret) {
  const digest = value => createHmac('sha256', secret).update(JSON.stringify(value)).digest('hex');
  const visitor = event.browserId ? digest([String(owner), event.browserId]) : undefined;
  const impression = ['portfolio_view', 'project_view'].includes(event.type);
  const payload = impression ? [event.navigationId, event.type, event.projectKey || ''] : event.eventId;
  return { visitor, id: digest(event.measurement === undefined ? [String(owner), visitor, payload] : ['v2', String(owner), payload]) };
}
// Versioned opaque project identifier shared by DTO rendering and ingestion.
export function analyticsProjectKey(owner, source, row, index) {
  return createHash('sha256').update(JSON.stringify([String(owner), source, String(row?.portfolioItemId || row?._id || index)])).digest('hex');
}
export function summaryPipeline(owner, range) {
  return [
    { $match: { owner, at: { $gte: range.start, $lte: range.end } } },
    { $facet: {
      savedCandidateContacts: [{ $match: { type: 'contact_click', channel: 'saved-candidates' } }, { $count: 'count' }],
      totals: [{ $group: { _id: '$type', count: { $sum: 1 } } }],
      coverage: [{ $match: { type: 'portfolio_view' } }, { $group: { _id: { $ifNull: ['$measurement', 'legacy-consented-browser'] }, visits: { $sum: 1 } } }],
      unique: [{ $match: { type: 'portfolio_view', visitor: { $type: 'string' } } }, { $group: { _id: '$visitor' } }, { $count: 'count' }],
      trends: [{ $match: { type: 'portfolio_view' } }, { $group: { _id: { day: { $dateToString: { date: '$at', format: '%Y-%m-%d', timezone: 'UTC' } }, visitor: { $ifNull: ['$visitor', null] } }, visits: { $sum: 1 } } }, { $group: { _id: '$_id.day', visits: { $sum: '$visits' }, visitors: { $sum: { $cond: [{ $ne: ['$_id.visitor', null] }, 1, 0] } } } }, { $sort: { _id: 1 } }],
      projects: [{ $match: { type: 'project_view' } }, { $group: { _id: '$projectKey', views: { $sum: 1 } } }, { $sort: { views: -1, _id: 1 } }, { $limit: 10 }],
      referrals: [{ $match: { type: 'portfolio_view' } }, { $group: { _id: '$source', visits: { $sum: 1 } } }],
    } },
  ];
}

export function analyticsConfiguration() {
  const secret = process.env.PORTFOLIO_ANALYTICS_SECRET;
  const startedAt = process.env.PORTFOLIO_ANALYTICS_STARTED_AT;
  if (!secret || secret.length < 32 || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(startedAt || '') || !Number.isFinite(Date.parse(startedAt)) || Date.parse(startedAt) > Date.now()) throw Error('Analytics configuration unavailable');
  return { secret, startedAt: new Date(startedAt).toISOString() };
}
