import PortfolioLayoutControls from "./PortfolioLayoutControls";
import { samePortfolioLayout } from "../utils/portfolioLayoutDraft";
import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Check, Code2, LockKeyhole } from "lucide-react";
import { Button } from "../ui/button";
import TalentSelect from "./TalentSelect";
import PortfolioLivePreview from "./PortfolioLivePreview";
import PortfolioCoverEditor from "./PortfolioCoverEditor";
import { publicPortfolioStyles } from "../profiles/publicPortfolioThemes";
import { cn } from "../../lib/utils";
import { useAuth } from "../hooks/useAuth";
import { useOwnerAvatar } from "../hooks/useOwnerAvatar";
import { useTalentSubscription } from "../hooks/useTalentSubscription";
import { hasTalentPublicAccess } from "../utils/talentEntitlements";
import { browserSessions } from "../utils/requestSafety";
import { friendlyError } from "../utils/userMessage";
import { portfolioAppearanceDraft } from "../utils/portfolioPreview";
import { portfolioAppearanceRequest } from "../utils/portfolioAppearanceApi";
import { PORTFOLIO_FONTS, PORTFOLIO_THEMES, normalizePortfolioColor, portfolioThemeBackground, portfolioThemeColors } from "../../../backend/src/utils/portfolioAppearance.js";

function AppearanceUpgradeCard() {
  return <div className="relative isolate max-w-3xl overflow-hidden rounded-2xl px-3 py-10 sm:px-8 sm:py-14">
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute -left-12 top-0 h-64 w-64 rounded-full bg-blue-600/20 blur-3xl sm:h-80 sm:w-80" />
      <div className="absolute -bottom-12 -right-12 h-64 w-64 rounded-full bg-blue-400/10 blur-3xl sm:h-80 sm:w-80" />
    </div>
    <section aria-labelledby="appearance-upgrade-heading" className="relative mx-auto max-w-xl rounded-2xl border border-white/10 bg-[#191D23] p-5 text-white shadow-xl sm:p-8">
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:gap-5">
        <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-blue-400/15 bg-blue-500/10 text-blue-300">
          <LockKeyhole className="h-6 w-6" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 id="appearance-upgrade-heading" className="text-xl font-semibold leading-tight sm:text-2xl">Unlock portfolio appearance</h2>
          <p className="mt-3 text-sm leading-7 text-gray-300 sm:text-base">Theme selection requires an active Public Listing subscription. Your ordinary portfolio editing remains available.</p>
        </div>
      </div>
      <ul className="my-7 space-y-4 text-sm text-gray-100 sm:text-base">
        {["Premium themes", "Colours and backgrounds", "Fonts and typography", "Portfolio cover image"].map(benefit => <li key={benefit} className="flex items-start gap-3">
          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-300"><Check className="h-4 w-4" aria-hidden="true" /></span>
          <span className="min-w-0 pt-0.5">{benefit}</span>
        </li>)}
      </ul>
      <Button asChild className="min-h-12 w-full whitespace-normal rounded-xl bg-blue-600 px-5 py-3 text-base font-semibold text-white hover:bg-blue-500 focus-visible:border-blue-300 focus-visible:ring-blue-300/50">
        <Link to="/talent-dashboard/my-plan">View My Packages</Link>
      </Button>
    </section>
  </div>;
}

// Small sample thumbnails help compare themes; the live preview below uses owner content.
const THEME_SAMPLE = {
  role: "Product designer",
  skills: ["Design", "React", "SQL"],
  projects: ["Insight Dashboard", "Studio Website"],
};

function ThemePreview({ theme, displayName }) {
  const styles = publicPortfolioStyles(theme);
  const minimalist = theme === "minimalist";
  const creative = theme === "creative";
  const developer = theme === "developer";
  const data = theme === "data-professional";
  return <span aria-hidden="true" data-theme-preview={theme}
    className={cn("mt-3 block min-h-60 min-w-0 rounded-xl border border-white/10 bg-[#0F1419] p-3 text-left text-xs leading-5 text-gray-300 [overflow-wrap:anywhere]", developer && "grid content-start grid-cols-[repeat(auto-fit,minmax(min(100%,8rem),1fr))] gap-4")}>
    <span className="block min-w-0">
    <span className={cn("block border-b border-white/10 pb-3", minimalist && "pb-4", creative && "pb-3")}>
      <span className={cn("block min-w-0 whitespace-normal text-white [overflow-wrap:anywhere]", styles.name, creative ? "text-xl md:text-xl" : "text-base md:text-base")}>{displayName}</span>
      <span className="mt-1 block">{THEME_SAMPLE.role}</span>
    </span>
    <span className={cn("mt-3 block", minimalist && "mt-4", developer && "font-mono")}>
      <span className="mb-2 block font-medium text-white">Skills</span>
      <span className="flex flex-wrap gap-x-2 gap-y-1">{THEME_SAMPLE.skills.map(skill => <span key={skill}
        className={data ? "rounded bg-blue-500/10 px-2 py-0.5 text-blue-300" : "text-gray-300"}>{skill}</span>)}</span>
    </span>
    </span>
    <span className={cn("mt-4 block min-w-0", minimalist && "mt-4", developer && "mt-0")}>
      <span className={cn("mb-2 block font-medium text-white", developer && "font-mono")}>Projects</span>
      <span className={cn("grid min-w-0 gap-2", creative || data ? "grid-cols-[repeat(auto-fit,minmax(min(100%,7rem),1fr))]" : "grid-cols-1", minimalist && "gap-3")}>
        {THEME_SAMPLE.projects.map((title, index) => <span key={title} className={cn("block min-w-0",
          minimalist ? "border-b border-white/10 pb-3" : "rounded-lg border border-white/10 bg-[#191D23] p-2")}>
          {creative && <span className="mb-2 flex h-12 items-end gap-1 overflow-hidden rounded bg-blue-500/10 p-2">
            <span className={cn("h-5 flex-1 rounded-sm bg-blue-400/20", index === 1 && "h-7")} />
            <span className="h-8 flex-1 rounded-sm bg-blue-600/30" />
            <span className="h-4 flex-1 rounded-sm bg-blue-400/20" />
          </span>}
          <span className={cn("flex items-start gap-2", developer && "font-mono")}>
            {developer && <Code2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-300" />}
            <span className={cn("min-w-0 text-white", styles.projectTitle, "text-xs font-medium")}>{title}</span>
          </span>
        </span>)}
      </span>
    </span>
  </span>;
}

function OwnerThemeSelector({ actor, token, entitlement, displayName }) {
  const groupId = useId();
  const [draft, setDraft] = useState(() => portfolioAppearanceDraft());
  const { theme, font, layout, ...colors } = draft;
  const updateDraft = (field, value) => setDraft(previous => ({ ...previous, [field]: value }));
  const [saved, setSaved] = useState(null);
  const [cover, setCover] = useState({ cover: null, coverVersion: 0 });
  const acceptCover = value => setCover(previous => value.coverVersion >= previous.coverVersion ? { cover: value.cover, coverVersion: value.coverVersion } : previous);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const saveRequest = useRef(null);
  const saveToast = useRef(null);
  const currentOwner = () => browserSessions().some(owner => owner.actor === actor && owner.token === token);
  const paid = hasTalentPublicAccess(entitlement);
  const defaults = { ...portfolioThemeColors(theme), background: portfolioThemeBackground(theme) };
  const themeFont = PORTFOLIO_FONTS.find(option => option.id === publicPortfolioStyles(theme).font);
  const colorValue = field => colors[field] === null ? null : normalizePortfolioColor(colors[field]) || colors[field];
  const dirty = !samePortfolioLayout(layout, saved?.layout) || (theme || null) !== (saved?.theme ?? null) || font !== (saved?.font ?? null)
    || ["primaryColor", "secondaryColor", "backgroundColor"].some(field => colorValue(field) !== (saved?.[field] ?? null));
  const invalidColors = ["primaryColor", "secondaryColor", "backgroundColor"].some(field => colors[field] !== null && !normalizePortfolioColor(colors[field]));

  useEffect(() => {
    const controller = new AbortController();
    portfolioAppearanceRequest(token, { signal: controller.signal }).then(value => {
      if (!controller.signal.aborted && browserSessions().some(owner => owner.actor === actor && owner.token === token)) { acceptCover({ cover: value.cover ?? null, coverVersion: value.coverVersion ?? 0 }); setSaved(value); setDraft(portfolioAppearanceDraft(value)); setLoading(false); }
    }).catch(failure => {
      if (!controller.signal.aborted && browserSessions().some(owner => owner.actor === actor && owner.token === token)) { setError(friendlyError(failure, "We couldn't load your saved theme.")); setLoading(false); }
    });
    return () => { controller.abort(); saveRequest.current?.abort(); if (saveToast.current !== null) toast.dismiss(saveToast.current); };
  }, [actor, token, reload]);

  async function save(event) {
    event.preventDefault();
    if (!paid || loading || saving || !saved || !dirty || invalidColors || !currentOwner()) return;
    const controller = new AbortController();
    saveRequest.current = controller;
    setSaving(true); setError(""); if (saveToast.current !== null) toast.dismiss(saveToast.current);
    try {
      const patch = {};
      if (!samePortfolioLayout(layout, saved.layout)) patch.layout = layout;
      if (theme && theme !== saved.theme) patch.theme = theme;
      if (font !== (saved.font ?? null)) patch.font = font;
      for (const field of ["primaryColor", "secondaryColor", "backgroundColor"]) if (colorValue(field) !== (saved[field] ?? null)) patch[field] = colorValue(field);
      const value = await portfolioAppearanceRequest(token, { ...patch, signal: controller.signal });
      if (!controller.signal.aborted && currentOwner()) {
        acceptCover({ cover: value.cover ?? null, coverVersion: value.coverVersion ?? 0 }); setSaved(value); setDraft(portfolioAppearanceDraft(value));
        saveToast.current = toast.success("Saved", { duration: 2500, dismissible: true, closeButton: true });
      }
    } catch (failure) {
      if (!controller.signal.aborted && currentOwner()) {
        setError(friendlyError(failure, "We couldn't confirm your save. Reload the saved selection before retrying."));
        if (failure.response?.status === 403) entitlement.refresh();
      }
    } finally {
      if (!controller.signal.aborted && currentOwner()) setSaving(false);
    }
  }

  if (!entitlement.loading && !entitlement.error && !paid) return <AppearanceUpgradeCard />;

  return <section className="max-w-4xl rounded-xl border border-white/10 bg-[#191D23] p-4 md:p-5">
    {entitlement.loading ? <p role="status">Checking your subscription…</p> : entitlement.error ? <div role="alert">
      <p>Your subscription could not be verified. Theme selection is locked.</p>
      <button className="my-3 min-h-11 text-blue-300 underline" onClick={entitlement.refresh}>Check subscription again</button>
    </div> : null}
    {loading ? <p role="status">Loading your saved appearance…</p> : <form onSubmit={save}>
      <fieldset disabled={!paid || saving || !!error && saved === null}>
        <legend className="mb-3 font-medium">Portfolio theme</legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {PORTFOLIO_THEMES.map(option => <label key={option.id} className="relative min-w-0">
            <input type="radio" name={`${groupId}-theme`} value={option.id} checked={theme === option.id}
              aria-labelledby={`${groupId}-${option.id}-label`}
              className="peer sr-only" onChange={() => { updateDraft("theme", option.id); if (saveToast.current !== null) toast.dismiss(saveToast.current); }} />
            <span className="block h-full cursor-pointer rounded-2xl border-2 border-white/10 bg-[#191D23] p-3 transition-colors hover:border-blue-400/50 peer-checked:border-blue-600 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-blue-300 peer-disabled:cursor-not-allowed peer-disabled:opacity-60 sm:p-4">
              <span className="flex items-center justify-between gap-2">
                <span id={`${groupId}-${option.id}-label`} className="min-w-0 text-base font-semibold text-white">{option.label}</span>
                <span aria-hidden="true" className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${theme === option.id ? "border-blue-500" : "border-gray-400"}`}>
                  {theme === option.id && <span className="h-3 w-3 rounded-full bg-blue-500" />}
                </span>
              </span>
              <ThemePreview theme={option.id} displayName={displayName} />
            </span>
          </label>)}
        </div>
      </fieldset>
      <fieldset disabled={!paid || saving || !saved} className="mt-6 border-t border-white/10 pt-5">
        <legend className="px-1 font-medium">Portfolio colours</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[["primaryColor", "Primary colour", "primary"], ["secondaryColor", "Secondary colour", "secondary"], ["backgroundColor", "Background colour", "background"]].map(([field, label, key]) => {
            const effective = normalizePortfolioColor(colors[field]) || defaults[key];
            const invalid = colors[field] !== null && !normalizePortfolioColor(colors[field]);
            return <div key={field} className="min-w-0">
              <label htmlFor={`${groupId}-${field}`} className="mb-2 block text-sm font-medium">{label}</label>
              <div className="flex items-center gap-2">
                <input type="color" value={effective} aria-label={`Choose ${label.toLowerCase()}`}
                  className="h-11 w-12 shrink-0 cursor-pointer rounded-lg border border-white/15 bg-[#0F1419] p-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300"
                  onInput={event => { updateDraft(field, event.currentTarget.value);
                    if (saveToast.current !== null) toast.dismiss(saveToast.current); }}
                  onChange={event => { updateDraft(field, event.currentTarget.value); if (saveToast.current !== null) toast.dismiss(saveToast.current); }} />
                <input id={`${groupId}-${field}`} type="text" value={colors[field] ?? defaults[key]} maxLength={7} spellCheck={false} autoComplete="off"
                  aria-invalid={!!invalid} aria-describedby={`${groupId}-${field}-help`}
                  className="min-h-11 w-full min-w-0 rounded-lg border border-white/15 bg-[#0F1419] px-3 font-mono text-sm text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300"
                  onInput={event => { updateDraft(field, event.currentTarget.value);
                    if (saveToast.current !== null) toast.dismiss(saveToast.current); }}
                  onChange={event => { updateDraft(field, event.currentTarget.value); if (saveToast.current !== null) toast.dismiss(saveToast.current); }}
                  onBlur={() => { if (!invalid && colors[field] !== null) updateDraft(field, effective); }} />
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 text-xs">
                <p id={`${groupId}-${field}-help`} className={invalid ? "text-red-300" : "text-gray-400"}>{invalid ? "Enter #RGB or #RRGGBB." : colors[field] === null ? "Theme default" : "Custom colour"}</p>
                <Button type="button" variant="link" disabled={colors[field] === null} aria-label={`Reset ${label.toLowerCase()}`}
                  className="min-h-11 px-0 text-blue-300 focus-visible:ring-blue-300/50" onClick={() => { updateDraft(field, null); if (saveToast.current !== null) toast.dismiss(saveToast.current); }}>Reset</Button>
              </div>
            </div>;
          })}
        </div>
        <p className="mt-2 text-xs leading-5 text-gray-400">Primary colour is used for buttons and skill bars. Secondary colour is used for links and labels. Text colours may adjust to stay readable.</p>
      </fieldset>
      <fieldset disabled={!paid || saving || !saved} className="mt-6 border-t border-white/10 pt-5">
        <legend className="px-1 font-medium">Typography</legend>
        <label htmlFor={`${groupId}-font`} className="mb-2 block text-sm font-medium">Font</label>
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <TalentSelect id={`${groupId}-font`} value={font ?? ""} aria-describedby={`${groupId}-font-help`}
              className="min-h-11 min-w-0 truncate rounded-lg border border-white/15 bg-[#0F1419] py-2 text-sm text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300"
              onChange={event => { updateDraft("font", event.target.value || null); if (saveToast.current !== null) toast.dismiss(saveToast.current); }}>
              <option value="">Theme default</option>
              {PORTFOLIO_FONTS.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
            </TalentSelect>
          </div>
          <Button type="button" variant="link" disabled={font === null} aria-label="Reset font" className="min-h-11 text-blue-300 focus-visible:ring-blue-300/50"
            onClick={() => { updateDraft("font", null); if (saveToast.current !== null) toast.dismiss(saveToast.current); }}>Reset</Button>
        </div>
        <p id={`${groupId}-font-help`} className="mt-2 text-xs leading-5 text-gray-400">{font === null ? `Theme default: ${themeFont.label}.` : "Custom font"}</p>
      </fieldset>
      <PortfolioLayoutControls value={layout} onChange={value => updateDraft("layout", value)} disabled={!paid || saving || !saved} />
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={!paid || saving || !saved || !dirty || invalidColors}
          className="min-h-11 rounded-lg bg-blue-600 px-5 py-2 font-medium text-white hover:bg-blue-500 focus-visible:border-blue-300 focus-visible:ring-blue-300/50">{saving ? "Saving…" : "Save appearance"}</Button>
        {dirty && <Button type="button" variant="outline" disabled={saving || !saved}
          className="min-h-11 rounded-lg border-white/30 bg-transparent px-5 py-2 text-white hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300 focus-visible:ring-blue-300/50"
          onClick={() => { setDraft(portfolioAppearanceDraft(saved)); if (saveToast.current !== null) toast.dismiss(saveToast.current); }}>
          Discard changes
        </Button>}
        {dirty && <p role="status" className="text-sm text-gray-300">Unsaved changes</p>}
      </div>
    </form>}
    {saved && !loading && <PortfolioCoverEditor actor={actor} token={token} paid={paid} config={cover} onSaved={acceptCover} />}
    {paid && saved && !loading && <PortfolioLivePreview actor={actor} token={token} draft={{ ...draft, cover: cover.cover }} />}
    {error && <div role="alert" className="mt-4 text-red-300"><p>{error}</p><button disabled={saving} className="min-h-11 underline" onClick={() => { setError(""); setLoading(true); setReload(value => value + 1); }}>Reload saved appearance</button></div>}
  </section>;
}

export default function TalentPortfolioAppearance() {
  const { user } = useAuth();
  const entitlement = useTalentSubscription();
  const profile = useOwnerAvatar();
  const actor = user?.userType === "talent" ? `talent:${user.id || user._id}` : "";
  const displayName = profile.key === actor && typeof profile.fullName === "string" && profile.fullName.trim()
    ? profile.fullName.trim() : "Your name";
  const token = browserSessions().find(owner => owner.actor === actor)?.token;
  const locked = !entitlement.loading && !entitlement.error && !hasTalentPublicAccess(entitlement);
  return <main className="p-4 text-white md:p-6 lg:p-8">
    <h1 className="mb-3 text-2xl font-bold md:text-3xl">Portfolio Appearance</h1>
    {!locked && <p className="mb-6 text-gray-400">Choose and save your portfolio theme preference.</p>}
    {actor && token ? <OwnerThemeSelector key={`${actor}:${token}`} actor={actor} token={token} entitlement={entitlement} displayName={displayName} /> : <p role="status">Sign in with your Talent account to select a theme.</p>}
  </main>;
}
