import { normalizePortfolioColor, portfolioThemeBackground, portfolioThemeColors } from "../../../backend/src/utils/portfolioAppearance.js";

const channels = hex => [1, 3, 5].map(offset => Number.parseInt(hex.slice(offset, offset + 2), 16));
const luminance = hex => channels(hex).map(value => {
  const channel = value / 255;
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
export const portfolioContrast = (first, second) => {
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
};

const darkSurfaces = ["#0f1419", "#191d23", "#1d2b40"];
const blend = (foreground, background, opacity) => `#${channels(foreground).map((value, index) =>
  Math.round(value * opacity + channels(background)[index] * (1 - opacity)).toString(16).padStart(2, "0")).join("")}`;
const readableInk = background => portfolioContrast(background, "#ffffff") >= portfolioContrast(background, "#000000") ? "#ffffff" : "#000000";

// Adjust only the text variant of an accent. Each surface supplies its own
// contrast context; a light page and its dark project cards cannot share one.
export function readablePortfolioAccent(hex, surfaces = darkSurfaces) {
  const score = color => Math.min(...surfaces.map(surface => portfolioContrast(color, surface)));
  const target = score("#ffffff") >= score("#000000") ? "#ffffff" : "#000000";
  for (let step = 0; step <= 100; step++) {
    const candidate = blend(target, hex, step / 100);
    if (score(candidate) >= 4.5) return candidate;
  }
  return target;
}

export function portfolioColorStyles(theme, colors) {
  const defaults = portfolioThemeColors(theme);
  const primary = normalizePortfolioColor(colors?.primary) || defaults.primary;
  const secondary = normalizePortfolioColor(colors?.secondary) || defaults.secondary;
  if (primary === defaults.primary && secondary === defaults.secondary) return undefined;
  return {
    "--portfolio-primary": primary,
    "--portfolio-primary-ink": portfolioContrast(primary, "#ffffff") >= portfolioContrast(primary, "#000000") ? "#ffffff" : "#000000",
    "--portfolio-secondary-ink": readablePortfolioAccent(secondary),
  };
}

export function portfolioBackgroundStyles(theme, backgroundColor, colors) {
  const background = normalizePortfolioColor(backgroundColor) || portfolioThemeBackground(theme);
  if (background === portfolioThemeBackground(theme)) return undefined;
  const defaults = portfolioThemeColors(theme);
  const primary = normalizePortfolioColor(colors?.primary) || defaults.primary;
  const secondary = normalizePortfolioColor(colors?.secondary) || defaults.secondary;
  const ink = readableInk(background);
  // Move the chip surface away from the text pole so it remains readable even
  // at mid-tone backgrounds where an arbitrary tint could cross the threshold.
  const chip = blend(ink === "#ffffff" ? "#000000" : "#ffffff", background, 0.08);
  const surfaces = [background, chip];
  return {
    "--portfolio-page-background": background,
    "--portfolio-ink": ink,
    "--portfolio-muted": readablePortfolioAccent("#9ca3af", surfaces),
    "--portfolio-border": readablePortfolioAccent("#6b7280", surfaces),
    "--portfolio-focus": ink,
    "--portfolio-track": chip,
    "--portfolio-chip-background": chip,
    "--portfolio-primary": primary,
    "--portfolio-primary-ink": readableInk(primary),
    "--portfolio-secondary-ink": readablePortfolioAccent(secondary, surfaces),
    "--portfolio-dark-secondary-ink": readablePortfolioAccent(secondary),
  };
}
