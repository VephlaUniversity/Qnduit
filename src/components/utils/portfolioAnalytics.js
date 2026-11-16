import { API_BASE_URL } from './api';
import { browserSessions } from './requestSafety';
// Integration point for the site's first-party privacy manager. No implicit grant.
export function analyticsDecision(policy = {}, provider = globalThis.qnduitPrivacy, browser = globalThis.navigator) {
  if (browser?.globalPrivacyControl === true || browser?.doNotTrack === '1') return null;
  let decision;
  try { decision = provider?.getPortfolioAnalyticsDecision?.(); } catch { return null; }
  if (decision?.denied === true || decision?.activity === false) return null;
  const reference = value => typeof value === 'string' && /^[a-zA-Z0-9._:-]{1,120}$/.test(value);
  if (decision?.activity === true && reference(decision.reference) && ['consent', 'exception'].includes(decision.basis)) {
    const measurement = decision.browser === true ? 'browser' : 'activity';
    if (decision.basis === 'consent' || decision.reference === policy[measurement === 'browser' ? 'browserException' : 'activityException']) {
      return { measurement, basis: decision.basis, policyReference: decision.reference };
    }
  }
  if (decision?.browser !== false && reference(policy.browserException)) return { measurement: 'browser', basis: 'exception', policyReference: policy.browserException };
  if (reference(policy.activityException)) return { measurement: 'activity', basis: 'exception', policyReference: policy.activityException };
  return null;
}
export function referralCategory(referrer, origin) {
  if (!referrer) return 'direct';
  try {
    const url = new URL(referrer), host = url.hostname.replace(/^www\./, '');
    if (url.origin === origin) return 'internal';
    if (/(^|\.)(google\.[a-z.]+|bing.com|duckduckgo.com|yahoo.com)$/.test(host)) return 'search';
    if (/(^|\.)(linkedin.com|facebook.com|instagram.com|twitter.com|x.com|t.co|youtube.com)$/.test(host)) return 'social';
  } catch { /* Referrer details never leave the browser. */ }
  return 'other';
}
export function createPortfolioTracker(username, policy = {}, navigationKey) {
  // The router key scopes lifecycle, never visitor identity or a transmitted identifier.
  const navigationId = globalThis.crypto?.randomUUID?.(), seen = new Set();
  if (!navigationId) return () => {};
  const source = typeof document === 'undefined' ? 'direct' : referralCategory(document.referrer, location.origin);
  return function track(type, details = {}) {
    try {
      const decision = analyticsDecision(policy);
      if (!decision || document.visibilityState !== 'visible') return;
      // Preserve an earlier explicit refusal; the site-wide manager must migrate it deliberately.
      if (globalThis.localStorage?.getItem('qnduit:analytics-consent') === 'denied') return;
      const impression = ['portfolio_view', 'project_view'].includes(type), key = `${navigationKey || ''}:${type}:${details.projectKey || ''}`;
      if (impression && seen.has(key)) return;
      let browserId;
      if (decision.measurement === 'browser') {
        let stored;
        try { stored = JSON.parse(localStorage.getItem('qnduit:analytics-browser')); } catch { /* Replace invalid storage only after permission. */ }
        if (!stored || !Number.isFinite(stored.expiresAt) || stored.expiresAt <= Date.now() || !/^[a-f\d-]{36}$/i.test(stored.id || '')) {
          stored = { id: crypto.randomUUID(), expiresAt: Date.now() + 90 * 86400000 };
          localStorage.setItem('qnduit:analytics-browser', JSON.stringify(stored));
        }
        browserId = stored.id;
      }
      const owner = browserSessions().find(session => session.actor.startsWith('talent:'));
      const body = { type, ...details, ...(browserId ? { browserId } : {}), navigationId, eventId: crypto.randomUUID(), ...decision, source };
      if (impression) seen.add(key);
      void fetch(`${API_BASE_URL}/api/talents/public/${encodeURIComponent(username)}/events`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...(owner ? { Authorization: `Bearer ${owner.token}` } : {}) },
        credentials: 'omit', keepalive: true, body: JSON.stringify(body),
      }).catch(() => {});
    } catch { /* Analytics must never interfere with public content. */ }
  };
}

// Completion notification only: the caller invokes this after a successful save
// initiation. Reuse scoped privacy decisions without creating a browser identifier.
export function recordEmployerCvDownload(path, receipt, policy, token) {
  try {
    if (!/^\/api\/applications\/[a-f\d]{24}\/cv$/i.test(path || '') || !receipt || !token) return;
    const decision = analyticsDecision(policy);
    if (!decision || globalThis.localStorage?.getItem('qnduit:analytics-consent') === 'denied') return;
    void fetch(`${API_BASE_URL}${path.replace(/\/cv$/, '/cv-download-events')}`, {
      method: 'POST', credentials: 'omit', keepalive: true,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ receipt, ...decision, measurement: 'activity' }),
    }).catch(() => {});
  } catch { /* Download success never depends on telemetry. */ }
}

// Called once by the existing Send Message activation, never by navigation effects.
export function recordSavedCandidateContact(talentId, policy, token) {
  try {
    if (!/^[a-f\d]{24}$/i.test(talentId || '') || !token) return;
    const decision = analyticsDecision(policy);
    if (!decision || globalThis.localStorage?.getItem('qnduit:analytics-consent') === 'denied') return;
    const activationId = globalThis.crypto?.randomUUID?.();
    if (!activationId) return;
    void fetch(`${API_BASE_URL}/api/employers/saved-candidates/${encodeURIComponent(talentId)}/contact-click`, {
      method: 'POST', credentials: 'omit', keepalive: true,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ activationId, ...decision, measurement: 'activity' }),
    }).catch(() => {});
  } catch { /* Analytics must not block the existing messaging navigation. */ }
}
