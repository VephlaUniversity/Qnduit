import { portfolioLayoutDraft } from "./portfolioLayoutDraft.js";
import { isPortfolioFont, isPortfolioTheme, isPortfolioLayout, normalizePortfolioColor, portfolioThemeColors, portfolioThemeBackground, resolvePortfolioLayout } from "../../../backend/src/utils/portfolioAppearance.js";

// Input is the server's public DTO, never the private owner profile. No I/O.
export function portfolioPreviewDraft(talent, draft = {}) {
  const theme = isPortfolioTheme(draft.theme) ? draft.theme : talent.theme;
  const defaults = portfolioThemeColors(theme);
  let layout = talent.layout;
  if (isPortfolioLayout(draft.layout)) layout = {
    ...resolvePortfolioLayout(draft.layout),
    standardGrouping: Object.hasOwn(draft.layout, "sectionOrder") && draft.layout.sectionOrder.length === 0,
    sectionOrder: draft.layout.sectionOrder?.length ? resolvePortfolioLayout(draft.layout).sectionOrder : null,
  };
  const color = (field, fallback) => Object.hasOwn(draft, field)
    ? normalizePortfolioColor(draft[field]) || fallback : fallback;
  return {
    ...talent, theme, layout,
    colors: {
      primary: color("primaryColor", Object.hasOwn(draft, "primaryColor") ? defaults.primary : talent.colors?.primary || defaults.primary),
      secondary: color("secondaryColor", Object.hasOwn(draft, "secondaryColor") ? defaults.secondary : talent.colors?.secondary || defaults.secondary),
    },
    backgroundColor: color("backgroundColor", Object.hasOwn(draft, "backgroundColor") ? portfolioThemeBackground(theme) : talent.backgroundColor),
    font: Object.hasOwn(draft, "font") ? isPortfolioFont(draft.font) ? draft.font : null : talent.font,
    cover: Object.hasOwn(draft, "cover") ? draft.cover : talent.cover,
  };
}

// The editor owns one draft. Saved values initialize it, restore it on discard,
// and replace its baseline only after a successful explicit save.
export function portfolioAppearanceDraft(saved = {}) {
  return {
    layout: portfolioLayoutDraft(saved.layout),
    theme: saved.theme || "",
    font: saved.font ?? null,
    primaryColor: saved.primaryColor ?? null,
    secondaryColor: saved.secondaryColor ?? null,
    backgroundColor: saved.backgroundColor ?? null,
  };
}
