import { portfolioLayoutFromResponse } from "./portfolioLayoutDraft.js";
import axios from "axios";
import { API_BASE_URL } from "./api.js";
import { portfolioCoverImage } from "../../../backend/src/utils/publicTalentProfile.js";
import { isPortfolioFont, isPortfolioTheme, normalizePortfolioColor } from "../../../backend/src/utils/portfolioAppearance.js";

export async function portfolioAppearanceRequest(token, { signal, ...patch } = {}) {
  patch = Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined));
  const writing = Object.keys(patch).length > 0;
  const response = await axios({
    method: writing ? "put" : "get",
    url: `${API_BASE_URL}/api/talents/portfolio-appearance`,
    headers: { Authorization: `Bearer ${token}` },
    ...(writing ? { data: patch } : {}),
    signal, timeout: 10000,
  });
  const saved = response.data?.portfolioAppearance;
  if (response.data?.success !== true || !(saved?.theme === null || isPortfolioTheme(saved?.theme))
    || saved.cover != null && !portfolioCoverImage(saved.cover)
    || saved.coverVersion != null && (!Number.isSafeInteger(saved.coverVersion) || saved.coverVersion < 0)
    || saved.font != null && !isPortfolioFont(saved.font)
    || ["primaryColor", "secondaryColor", "backgroundColor"].some(field => saved[field] != null && !normalizePortfolioColor(saved[field]))) {
    throw new Error("The saved appearance could not be confirmed.");
  }
  return { layout: portfolioLayoutFromResponse(saved.layout, saved.hasCustomSectionOrder, saved.usesStandardSectionGrouping), cover: portfolioCoverImage(saved.cover), coverVersion: saved.coverVersion ?? 0, theme: saved.theme, primaryColor: normalizePortfolioColor(saved.primaryColor), secondaryColor: normalizePortfolioColor(saved.secondaryColor), backgroundColor: normalizePortfolioColor(saved.backgroundColor), font: saved.font ?? null };
}

export async function portfolioCoverRequest(token, { file, remove = false, version, signal }) {
  const data = remove ? undefined : new FormData();
  if (!remove) data.append("coverImage", file);
  const response = await axios({ method: remove ? "delete" : "put",
    url: `${API_BASE_URL}/api/talents/portfolio-appearance/cover`, data, signal, timeout: 60000,
    headers: { Authorization: `Bearer ${token}`, "If-Match": `"${version}"` },
  });
  const body = response.data;
  if (body?.success !== true || !Number.isSafeInteger(body.coverVersion) || body.coverVersion < 0
    || body.cover !== null && !portfolioCoverImage(body.cover)) throw new Error("The saved cover could not be confirmed.");
  return { cover: portfolioCoverImage(body.cover), coverVersion: body.coverVersion };
}
