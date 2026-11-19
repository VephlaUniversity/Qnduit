import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { LockKeyhole, ArrowRight, Eye, Users, FolderOpen, MousePointerClick, MessageSquare, FileDown, Globe, TrendingUp } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { useTalentSubscription } from '../../hooks/useTalentSubscription';
import { hasTalentPublicAccess } from '../../utils/talentEntitlements';
import { useAuth } from '../../hooks/useAuth';
import { API_BASE_URL } from '../../utils/api';
import { browserSessions } from '../../utils/requestSafety';
const panel = 'rounded-xl border border-white/10 bg-[#191D23] p-5 md:p-6';
const benefits = [
  { icon: Eye, title: 'Total portfolio visits', description: 'See how often visitors explore your public portfolio.' },
  { icon: Users, title: 'Distinct measured browsers', description: 'Understand your reach with an estimate of distinct browsers, rather than repeat visits.' },
  { icon: FolderOpen, title: 'Most-viewed projects', description: 'Find the projects visitors open to learn more about your work.' },
  { icon: MousePointerClick, title: 'Project link clicks', description: 'Discover when visitors follow links from your projects.' },
  { icon: MessageSquare, title: 'Saved Candidates Contact Clicks', description: 'See eligible Employer activations of Send Message in Saved Candidates. This measures contact interest, not messages sent.' },
  { icon: FileDown, title: 'CV download attempts', description: 'See when an eligible CV fetch succeeds and a browser save is initiated. Completed downloads cannot be confirmed.' },
  { icon: Globe, title: 'Traffic sources', description: 'Explore referral categories such as search, social and direct visits without exposing visitor identities.' },
  { icon: TrendingUp, title: 'Visitor trends', description: 'Compare visits and distinct measured browsers across 7, 30 and 90-day reporting periods.' },
];
const requestDeadlineMs = 10000;
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const isCount = value => Number.isSafeInteger(value) && value >= 0;
const isDate = value => typeof value === 'string' && Number.isFinite(Date.parse(value));

function isAnalyticsSummary(data) {
  return isRecord(data) && isDate(data.startedAt)
    && isRecord(data.totals) && Object.values(data.totals).every(isCount)
    && isCount(data.uniqueVisitors)
    && (data.savedCandidatesContactClicks === undefined || isCount(data.savedCandidatesContactClicks))
    && Array.isArray(data.trends) && data.trends.every(row => isRecord(row)
      && isDate(row.date) && isCount(row.visits) && isCount(row.visitors))
    && Array.isArray(data.projects) && data.projects.every(row => isRecord(row)
      && typeof row.key === 'string' && typeof row.title === 'string' && isCount(row.views))
    && Array.isArray(data.referrals) && data.referrals.every(row => isRecord(row)
      && typeof row.source === 'string' && isCount(row.visits));
}

function hasActivity(data) {
  return ['portfolio_view', 'project_link_click', 'cv_download'].some(type => data.totals[type] > 0)
    || data.uniqueVisitors > 0 || data.savedCandidatesContactClicks > 0
    || data.trends.some(row => row.visits > 0 || row.visitors > 0)
    || data.projects.some(row => row.views > 0) || data.referrals.some(row => row.visits > 0);
}

export default function TalentPortfolioAnalytics() {
  const { user } = useAuth();
  const entitlement = useTalentSubscription();
  const paid = hasTalentPublicAccess(entitlement);
  const [days, setDays] = useState(30), [reload, setReload] = useState(0);
  const [result, setResult] = useState(null);
  const accountId = user?.userType === 'talent' && (user.id || user._id);
  const actor = accountId ? `talent:${accountId}` : '';
  const token = browserSessions().find(session => session.actor === actor)?.token;
  const subscriptionStatus = entitlement.subscriptionStatus;
  const deferred = Boolean(entitlement.retryAt);
  const confirmedDenial = subscriptionStatus?.role === 'talent' && subscriptionStatus.paidEligible === false;
  const verificationUnavailable = entitlement.error || (!paid && !confirmedDenial);
  useEffect(() => {
    if (!paid || deferred || !actor || !token) return;
    const controller = new AbortController();
    const request = { actor, token, days, reload, subscriptionStatus };
    const deadline = setTimeout(() => {
      controller.abort();
      setResult({ ...request, status: 'error' });
    }, requestDeadlineMs);
    axios.get(`${API_BASE_URL}/api/talents/portfolio-analytics`, { params: { days }, signal: controller.signal, timeout: requestDeadlineMs,
      headers: { Authorization: `Bearer ${token}` }, qnduitBoundedRead: true }).then(({ data }) => {
      if (controller.signal.aborted) return;
      setResult(isAnalyticsSummary(data) ? { ...request, status: 'ready', data } : { ...request, status: 'error' });
    }).catch(error => {
      if (controller.signal.aborted) return;
      const denied = error.response?.status === 403 && error.response.data?.code === 'ANALYTICS_PAID_REQUIRED';
      setResult({ ...request, status: denied ? 'denied' : 'error' });
    }).finally(() => clearTimeout(deadline));
    return () => {
      clearTimeout(deadline);
      controller.abort();
    };
  }, [paid, deferred, actor, token, days, reload, subscriptionStatus]);
  const current = paid && !deferred && result?.actor === actor && result.token === token && result.days === days
    && result.reload === reload && result.subscriptionStatus === subscriptionStatus ? result : null;
  const data = current?.data;
  const denied = current?.status === 'denied';
  const retry = () => { entitlement.refresh(); setReload(value => value + 1); };
  return <main className="p-4 text-white md:p-6 lg:p-8">
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold md:text-3xl">Portfolio Analytics</h1>
        <p className="mt-2 text-sm leading-6 text-gray-400 md:text-base">{paid ? 'View your portfolio activity from the last 90 days.' : 'Understand how people discover and explore your public portfolio.'}</p>
        {data && <details className="mt-2 max-w-2xl text-xs leading-5 text-gray-400">
          <summary className="w-fit min-h-8 cursor-pointer rounded text-blue-300 focus-visible:outline-2 focus-visible:outline-offset-2">About these metrics</summary>
          <p className="mt-1">Available from {new Date(data.startedAt).toLocaleDateString('en-GB', { timeZone: 'UTC' })} UTC; earlier activity is unavailable. Counts reflect eligible observed activity only. Measured browsers are not people and may cover only some visits. Daily browser counts do not sum to the range total. CV attempts indicate initiated saves, not completed downloads. Dates use UTC.</p>
        </details>}
      </div>
      {actor && token && paid && !deferred && !denied && <label className="flex shrink-0 flex-col gap-2 text-sm text-gray-300 sm:min-w-44">Date Range
        <select className="min-h-11 w-full rounded-lg border border-white/15 bg-[#191D23] px-4 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300" value={days} onChange={event => { setDays(Number(event.target.value)); setReload(value => value + 1); }}>
          {[7, 30, 90].map(value => <option key={value} value={value}>Last {value} days</option>)}
        </select>
      </label>}
    </div>
    {!actor || !token ? <p role="alert">Sign in with your Talent account to view analytics.</p> : entitlement.loading ? <p role="status">Checking your subscription…</p> : deferred || verificationUnavailable ? <section className={panel} role={deferred ? 'status' : 'alert'}>
      <p>{deferred ? 'Subscription verification is temporarily delayed. Try again when the request limit clears.' : 'Your subscription could not be verified. Analytics remain locked.'}</p>
      <button className="mt-4 min-h-11 text-blue-300 underline disabled:text-gray-400" onClick={retry} disabled={deferred}>Try again</button>
    </section> : confirmedDenial || denied ? <section aria-labelledby="analytics-preview-heading" className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-blue-400/20 bg-gradient-to-br from-blue-600/15 via-[#191D23] to-[#191D23] p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 max-w-2xl">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-400/25 bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-200"><LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />Public Listing feature</span>
            <h2 id="analytics-preview-heading" className="text-2xl font-semibold leading-tight md:text-3xl">See what gets your work noticed</h2>
            <p className="mt-3 text-sm leading-7 text-gray-300 md:text-base">Turn portfolio activity into insight. Upgrade to Public Listing to discover how people find your work, which projects draw attention and what they explore next.</p>
            {(denied || subscriptionStatus?.status === 'expired') && <p role="status" className="mt-3 text-sm text-amber-200">Your paid access has ended or could not be confirmed. Review your current plan in My Packages.</p>}
          </div>
          <div className="flex shrink-0 flex-col items-stretch gap-3 lg:max-w-64">
            <Link className="inline-flex min-h-12 items-center justify-center gap-3 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-300" to="/talent-dashboard/my-plan">Upgrade / Subscribe<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
            <p className="text-center text-xs leading-5 text-gray-400">Review your current plan and subscription options in My Packages.</p>
          </div>
        </div>
      </div>
      <div>
        <h3 className="text-lg font-semibold">A clearer picture of your portfolio’s reach</h3>
        <p className="mb-5 mt-2 text-sm leading-6 text-gray-400">Explore the insights included with active Public Listing access.</p>
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {benefits.map(benefit => {
            const { icon: Icon, title, description, note } = benefit;
            return <li key={title} className={`${panel} min-w-0`}>
            <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-blue-400/15 bg-blue-500/10 text-blue-300"><Icon className="h-5 w-5" aria-hidden="true" /></span>
            <h4 className="text-base font-semibold text-gray-100">{title}</h4>
            <p className="mt-2 text-sm leading-6 text-gray-400">{description}</p>
            {note && <p className="mt-3 text-xs leading-5 text-blue-200">{note}</p>}
          </li>; })}
        </ul>
      </div>
      <p className="rounded-xl border border-white/5 bg-white/[0.02] px-5 py-4 text-sm leading-6 text-gray-400">Your privacy matters. Reports include observed activity only where permission or an applicable documented exception allows collection. After upgrading, you can view retained history from the last 90 days, starting when tracking was enabled.</p>
    </section> : <>
      {!current ? <p role="status">Loading portfolio analytics…</p> : current.status === 'error' ? <section className={panel} role="alert"><p>Analytics are temporarily unavailable. No metrics are shown.</p><button className="mt-4 min-h-11 text-blue-300 underline" onClick={retry}>Try again</button></section> : data && <>
        {!hasActivity(data) && <p className={`${panel} mb-6 text-gray-300`} role="status">No portfolio activity was recorded for this date range.</p>}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{[
          ['Total Visits', data.totals.portfolio_view || 0], ['Distinct Measured Browsers', data.uniqueVisitors],
          ['Project Link Clicks', data.totals.project_link_click || 0], ['CV Download Attempts', data.totals.cv_download || 0],
        ].map(([label, value]) => <section className={panel} key={label}><h2 className="text-sm text-gray-400">{label}</h2><p className="mt-3 text-3xl font-semibold">{value.toLocaleString()}</p></section>)}</div>
        <section className={`${panel} mt-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center`} aria-label="Saved Candidates engagement">
          <div><h2 className="font-semibold">Saved Candidates Contact Clicks</h2></div>
          <p className="text-3xl font-semibold">{Number.isSafeInteger(data.savedCandidatesContactClicks) && data.savedCandidatesContactClicks >= 0 ? data.savedCandidatesContactClicks.toLocaleString() : '—'}</p>
        </section>
        <section className={`${panel} mt-6`}><h2 className="mb-2 text-xl font-semibold">Visitor Trends</h2><p className="mb-4 text-sm text-gray-400">See how your portfolio visits change over time.</p>
          <div className="h-72 min-w-0" aria-label="Visits and estimated unique browsers by UTC day"><ResponsiveContainer width="100%" height="100%"><LineChart accessibilityLayer data={data.trends}><CartesianGrid stroke="#374151" strokeDasharray="3 3" /><XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 11 }} minTickGap={30} /><YAxis allowDecimals={false} tick={{ fill: '#9ca3af' }} /><Tooltip contentStyle={{ backgroundColor: '#191D23', borderColor: '#374151', color: '#fff' }} /><Legend /><Line type="monotone" dataKey="visits" name="Visits" stroke="#60a5fa" dot={false} /><Line type="monotone" dataKey="visitors" name="Measured browsers" stroke="#34d399" dot={false} /></LineChart></ResponsiveContainer></div>
          <details className="mt-4"><summary className="min-h-11 cursor-pointer text-blue-300">View trend data table</summary><div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Daily visits and unique browsers in UTC</caption><thead><tr><th scope="col">Date</th><th scope="col">Visits</th><th scope="col">Measured browsers</th></tr></thead><tbody>{data.trends.map(row => <tr key={row.date}><th scope="row" className="py-2 font-normal">{row.date}</th><td>{row.visits}</td><td>{row.visitors}</td></tr>)}</tbody></table></div></details>
        </section>
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2"><section className={panel}><h2 className="mb-4 text-xl font-semibold">Most-Viewed Projects</h2>{data.projects.length ? <ol className="space-y-3">{data.projects.map(project => <li key={project.key} className="flex justify-between gap-4"><span className="break-words">{project.title || 'Untitled project'}</span><span>{project.views.toLocaleString()} views</span></li>)}</ol> : <p className="text-gray-400">No project activity yet.</p>}</section>
          <section className={panel}><h2 className="mb-4 text-xl font-semibold">Traffic Sources</h2>{data.referrals.length ? <ul className="space-y-3">{data.referrals.map(row => <li key={row.source} className="flex justify-between capitalize"><span>{row.source === 'direct' ? 'Direct / unknown' : row.source}</span><span>{row.visits.toLocaleString()}</span></li>)}</ul> : <p className="text-gray-400">No traffic sources recorded yet.</p>}</section></div>
      </>}
    </>}
  </main>;
}
