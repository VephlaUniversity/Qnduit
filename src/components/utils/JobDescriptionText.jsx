import React from "react";
import { sanitizeEmployerAbout } from "./sanitizeEmployerAbout";

const hasMarkup = (value) => /<\/?[a-z][\s\S]*>/i.test(value);

// Job descriptions written before the editor are plain text with line breaks;
// new ones are formatted HTML. Both render safely here.
export default function JobDescriptionText({ value, className = "", emptyText = "" }) {
  const text = typeof value === "string" ? value : "";
  if (!text.trim()) return emptyText ? <p className={className}>{emptyText}</p> : null;
  if (!hasMarkup(text)) {
    return <div className={`whitespace-pre-line ${className}`}>{text}</div>;
  }
  return (
    <div
      className={`${className} [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-6 [&_ol]:pl-6`}
      dangerouslySetInnerHTML={{ __html: sanitizeEmployerAbout(text) }}
    />
  );
}
