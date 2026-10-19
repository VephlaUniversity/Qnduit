import createDOMPurify from "dompurify";

// Dedicated instance: these restrictions do not change other renderers.
const purifier = createDOMPurify(typeof window === "undefined" ? undefined : window);
const protocols = new Set(["http:", "https:", "mailto:", "tel:"]);
purifier.addHook?.("afterSanitizeAttributes", node => {
  if (node.nodeName !== "A") {
    node.removeAttribute("href");
    node.removeAttribute("target");
    return;
  }
  const href = node.getAttribute("href");
  let safe = false;
  if (href) {
    try { safe = protocols.has(new URL(href, window.location.href).protocol); }
    catch { /* A malformed link keeps its text, not its destination. */ }
  }
  if (!safe) node.removeAttribute("href");
  if (safe && node.getAttribute("target")?.toLowerCase() === "_blank") {
    node.setAttribute("target", "_blank");
    node.setAttribute("rel", "noopener noreferrer");
  } else node.removeAttribute("target");
});

export function sanitizeEmployerAbout(value) {
  if (typeof value !== "string" || !value.trim() || !purifier.isSupported) return "";
  const html = purifier.sanitize(value, {
    ALLOWED_TAGS: ["p", "div", "br", "span", "b", "strong", "i", "em", "u", "s", "strike", "ul", "ol", "li", "a"],
    ALLOWED_ATTR: ["href", "title", "target"],
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
  });
  // Inert parsing only to recognize the editor's empty <div><br></div> output.
  const template = document.createElement("template");
  template.innerHTML = html;
  return template.content.textContent.trim() ? html : "";
}
