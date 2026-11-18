import { isPortfolioLayout, PORTFOLIO_SECTIONS, resolvePortfolioLayout } from "../../../backend/src/utils/portfolioAppearance.js";

export function portfolioLayoutDraft(layout) {
  const valid = isPortfolioLayout(layout) ? layout : {};
  return {
    ...(Object.hasOwn(valid, "sectionOrder") ? { sectionOrder: valid.sectionOrder.length ? [...resolvePortfolioLayout(valid).sectionOrder] : [] } : {}),
    hiddenSections: PORTFOLIO_SECTIONS.map(section => section.id).filter(id => valid.hiddenSections?.includes(id)),
    ...(valid.projectLayout ? { projectLayout: valid.projectLayout } : {}),
  };
}

export const samePortfolioLayout = (first, second) =>
  JSON.stringify(portfolioLayoutDraft(first)) === JSON.stringify(portfolioLayoutDraft(second));

// The owner response resolves omitted sections, but separately preserves whether
// the owner ever selected an explicit order. Do not materialize theme grouping.
export function portfolioLayoutFromResponse(layout, hasCustomSectionOrder, usesStandardSectionGrouping = false) {
  if (layout === undefined) return portfolioLayoutDraft();
  if (!layout || typeof layout !== "object" || Array.isArray(layout)
    || typeof hasCustomSectionOrder !== "boolean" || typeof usesStandardSectionGrouping !== "boolean"
    || hasCustomSectionOrder && usesStandardSectionGrouping) throw Error("The saved layout could not be confirmed.");
  const raw = { ...layout };
  if (raw.projectLayout === null) delete raw.projectLayout;
  if (!isPortfolioLayout(raw)) throw Error("The saved layout could not be confirmed.");
  if (usesStandardSectionGrouping) raw.sectionOrder = [];
  else if (!hasCustomSectionOrder) delete raw.sectionOrder;
  return portfolioLayoutDraft(raw);
}

export const usesStandardPortfolioArrangement = layout =>
  Array.isArray(layout?.sectionOrder) && layout.sectionOrder.length === 0;
