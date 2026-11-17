import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { API_BASE_URL } from "../utils/api";
import { browserSessions } from "../utils/requestSafety";
import { friendlyError } from "../utils/userMessage";
import { portfolioPreviewDraft } from "../utils/portfolioPreview";
import PublicTalentPortfolioView from "../profiles/PublicTalentPortfolioView";

const frameDocument = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>[data-portfolio-theme], [data-portfolio-theme] * { transition: none !important; }</style></head><body style="margin:0"></body></html>';

export function PreviewViewport({ talent }) {
  const [mode, setMode] = useState("desktop");
  const [frame, setFrame] = useState(null);
  useEffect(() => {
    if (!frame) return;
    // Copy actual Vite/production styles into the independent viewport. Observe
    // HMR updates as well; a narrow div would not exercise media breakpoints.
    const copies = new Map();
    const syncStyles = () => {
      const sources = new Set(document.head.querySelectorAll('style, link[rel="stylesheet"]'));
      for (const [source, copy] of copies) if (!sources.has(source)) {
        copy.remove();
        copies.delete(source);
      }
      for (const source of sources) {
        let copy = copies.get(source);
        if (!copy) {
          copy = source.cloneNode(true);
          copy.setAttribute("data-preview-style", "");
          copies.set(source, copy);
          frame.head.appendChild(copy);
        } else {
          // Keep unchanged stylesheets mounted. Recreating every sheet on an
          // unrelated head mutation can briefly remove the preview's CSS.
          if (copy.textContent !== source.textContent) copy.textContent = source.textContent;
          for (const attribute of source.attributes) if (copy.getAttribute(attribute.name) !== attribute.value) copy.setAttribute(attribute.name, attribute.value);
          for (const attribute of [...copy.attributes]) if (attribute.name !== "data-preview-style" && !source.hasAttribute(attribute.name)) copy.removeAttribute(attribute.name);
        }
      }
    };
    syncStyles();
    const observer = new MutationObserver(syncStyles);
    observer.observe(document.head, { childList: true, subtree: true, characterData: true, attributes: true });
    return () => { observer.disconnect(); for (const copy of copies.values()) copy.remove(); };
  }, [frame]);
  return <section aria-label="Live portfolio preview" className="mt-8 min-w-0 border-t border-white/10 pt-6">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-semibold">Live preview</h2>
      <div role="group" aria-label="Preview viewport" className="flex gap-2">
        {[["desktop", "Desktop", 1280], ["mobile", "Mobile", 390]].map(([value, label, width]) => <button
          key={value} type="button" aria-pressed={mode === value} onClick={() => setMode(value)}
          className={`min-h-11 rounded-lg border px-4 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 ${mode === value ? "border-blue-400 bg-blue-500/15" : "border-white/15"}`}>
          {label} <span className="text-xs text-gray-400">{width}px</span>
        </button>)}
      </div>
    </div>
    <p className="mb-3 text-sm text-gray-400">Appearance changes stay in this preview until you save. Scroll inside the preview to explore your portfolio.</p>
    <div className="max-w-full overflow-x-auto rounded-xl border border-white/15 bg-[#0F1419]">
      <iframe title={`${mode === "desktop" ? "Desktop" : "Mobile"} portfolio preview`}
        srcDoc={frameDocument} onLoad={event => setFrame(event.currentTarget.contentDocument)}
        style={{ width: mode === "desktop" ? 1280 : 390, height: 720, maxWidth: "none" }}
        className="block border-0" />
    </div>
    {frame && createPortal(<div onClickCapture={event => {
      // Internal public navigation is inert inside the editor. Project/social
      // links retain their existing separate-tab behavior.
      const link = event.target.closest?.("a");
      if (link && link.target !== "_blank") event.preventDefault();
    }}><PublicTalentPortfolioView talent={talent} /></div>, frame.body)}
  </section>;
}

export default function PortfolioLivePreview({ actor, token, draft }) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const current = () => !controller.signal.aborted && browserSessions().some(owner => owner.actor === actor && owner.token === token);
    axios.get(`${API_BASE_URL}/api/talents/portfolio-appearance/preview`, {
      headers: { Authorization: `Bearer ${token}` }, signal: controller.signal, timeout: 10000,
    }).then(({ data }) => {
      if (!current()) return;
      if (data?.success !== true || !data.talent || `talent:${data.talent.id}` !== actor) throw new Error("Preview account could not be confirmed.");
      setResult(data.talent);
    }).catch(failure => { if (current()) setError(friendlyError(failure, "We couldn't load your portfolio preview.")); });
    return () => controller.abort();
  }, [actor, token, retry]);
  if (error) return <div role="alert" className="mt-6"><p>{error}</p><button type="button" className="min-h-11 text-blue-300 underline" onClick={() => { setError(""); setRetry(value => value + 1); }}>Reload preview</button></div>;
  if (!result) return <p role="status" className="mt-6">Loading your portfolio preview…</p>;
  return <PreviewViewport talent={portfolioPreviewDraft(result, draft)} />;
}
