// IDs are shared by owner validation, public resolution and the dashboard.
export const PORTFOLIO_THEMES = Object.freeze([
  { id: "minimalist", label: "Minimalist" },
  { id: "creative", label: "Creative" },
  { id: "developer", label: "Developer" },
  { id: "data-professional", label: "Data Professional" },
]);

export const isPortfolioTheme = value => typeof value === "string"
  && PORTFOLIO_THEMES.some(theme => theme.id === value);

export const PORTFOLIO_FONTS = Object.freeze([
  { id: "jakarta", label: "Plus Jakarta Sans", family: '"Plus Jakarta Sans", sans-serif' },
  { id: "system-sans", label: "System sans-serif", family: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  { id: "system-serif", label: "System serif", family: 'Georgia, "Times New Roman", serif' },
  { id: "system-mono", label: "System monospace", family: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' },
]);
export const isPortfolioFont = value => typeof value === "string"
  && PORTFOLIO_FONTS.some(font => font.id === value);

export const hasPortfolioAppearanceAccess = status => status?.role === "talent"
  && status.paidEligible === true && status.effectivePlan === "public"
  && status.eligibility?.talentPublicProfile === true;

// Read-only resolution: expired preferences remain stored for a later renewal.
export const resolvePortfolioTheme = (savedTheme, status) =>
  hasPortfolioAppearanceAccess(status) && isPortfolioTheme(savedTheme) ? savedTheme : "default";

export const resolvePortfolioFont = (appearance, status) =>
  hasPortfolioAppearanceAccess(status) && isPortfolioFont(appearance?.font) ? appearance.font : null;

const defaultColors = Object.freeze({ primary: "#155dfc", secondary: "#50a2ff" });
// The existing layouts share QNDUIT's blue accents. Keep defaults in one place
// for the editor and public response, without changing their backgrounds/fonts.
export const PORTFOLIO_THEME_COLORS = Object.freeze(Object.fromEntries(
  ["default", ...PORTFOLIO_THEMES.map(theme => theme.id)].map(id => [id, defaultColors]),
));
export const portfolioThemeColors = theme => PORTFOLIO_THEME_COLORS[isPortfolioTheme(theme) ? theme : "default"];

// All current layouts use this page background; card surfaces remain separate.
export const portfolioThemeBackground = () => "#0f1419";

export function normalizePortfolioColor(value) {
  if (typeof value !== "string") return null;
  const hex = value.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(hex)) return hex;
  if (/^#[0-9a-f]{3}$/.test(hex)) return `#${[...hex.slice(1)].map(char => char + char).join("")}`;
  return null;
}

export function resolvePortfolioColors(appearance, status) {
  const theme = resolvePortfolioTheme(appearance?.theme, status);
  const defaults = portfolioThemeColors(theme);
  return {
    primary: hasPortfolioAppearanceAccess(status) && normalizePortfolioColor(appearance?.primaryColor) || defaults.primary,
    secondary: hasPortfolioAppearanceAccess(status) && normalizePortfolioColor(appearance?.secondaryColor) || defaults.secondary,
  };
}

export const resolvePortfolioBackground = (appearance, status) =>
  hasPortfolioAppearanceAccess(status) && normalizePortfolioColor(appearance?.backgroundColor)
  || portfolioThemeBackground(resolvePortfolioTheme(appearance?.theme, status));

// Layout is optional and independent of theme, colour, font and cover settings.
// This order follows the existing public content flow; fixed page chrome is excluded.
export const PORTFOLIO_SECTIONS = Object.freeze([
  { id: "about", label: "About" },
  { id: "skills", label: "Skills" },
  { id: "links", label: "Links" },
  { id: "projects", label: "Projects" },
  { id: "introVideo", label: "Introduction Video" },
  { id: "experience", label: "Experience" },
  { id: "education", label: "Education" },
].map(Object.freeze));

export const PORTFOLIO_PROJECT_LAYOUTS = Object.freeze([
  { id: "grid", label: "Grid" },
  { id: "list", label: "List" },
  { id: "featured", label: "Featured" },
].map(Object.freeze));

export const isPortfolioSection = value => typeof value === "string"
  && PORTFOLIO_SECTIONS.some(section => section.id === value);
export const isPortfolioProjectLayout = value => typeof value === "string"
  && PORTFOLIO_PROJECT_LAYOUTS.some(layout => layout.id === value);

const isSectionList = value => Array.isArray(value)
  && value.length <= PORTFOLIO_SECTIONS.length
  && Array.from(value).every(isPortfolioSection)
  && new Set(value).size === value.length;

// Strict submitted input: omitted properties are allowed; explicit null/undefined
// values and unknown keys are not. An empty object means all defaults.
export function isPortfolioLayout(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) return false;
  return Reflect.ownKeys(value).every(key => {
    if (key === "sectionOrder" || key === "hiddenSections") return isSectionList(value[key]);
    if (key === "projectLayout") return isPortfolioProjectLayout(value[key]);
    return false;
  });
}

// Pure stored-data resolution. Invalid objects fall back as a whole; no repair
// writes or mutations. null is an output sentinel: retain the theme's project grid.
export function resolvePortfolioLayout(savedLayout) {
  const layout = isPortfolioLayout(savedLayout) ? savedLayout : {};
  const ordered = layout.sectionOrder || [];
  return {
    sectionOrder: [...ordered, ...PORTFOLIO_SECTIONS.map(section => section.id).filter(id => !ordered.includes(id))],
    hiddenSections: [...(layout.hiddenSections || [])],
    projectLayout: layout.projectLayout ?? null,
  };
}

// Public layout keeps absence of a saved order distinct from a completed order.
// Visibility-only settings must retain each theme's existing section grouping.
export function resolvePublicPortfolioLayout(savedLayout, status) {
  const saved = hasPortfolioAppearanceAccess(status) && isPortfolioLayout(savedLayout) ? savedLayout : {};
  const resolved = resolvePortfolioLayout(saved);
  return {
    ...resolved,
    // An explicit empty order requests the standard newly-upgraded grouping;
    // an absent order continues to preserve legacy theme-specific grouping.
    standardGrouping: Object.hasOwn(saved, "sectionOrder") && saved.sectionOrder.length === 0,
    sectionOrder: saved.sectionOrder?.length ? resolved.sectionOrder : null,
  };
}
