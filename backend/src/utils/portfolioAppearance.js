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
