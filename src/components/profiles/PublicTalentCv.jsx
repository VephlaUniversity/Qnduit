import { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import PublicTalentPresentation from "./PublicTalentPresentation";
import { API_BASE_URL } from "../utils/api";
import { cvExtension, nameWithExtension } from "../utils/cvFile";

function CvFile({ cv, fileUrl }) {
  const pdfSupported = cv.format === "PDF" && navigator.pdfViewerEnabled !== false;
  const [preview, setPreview] = useState({ loading: pdfSupported, url: "", failed: cv.format === "PDF" && !pdfSupported });
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  useEffect(() => {
    if (!pdfSupported) return;
    const controller = new AbortController();
    let blobUrl;
    (async () => {
      try {
        const response = await fetch(fileUrl, { signal: controller.signal, credentials: "omit", referrerPolicy: "no-referrer", cache: "no-store" });
        if (!response.ok) throw Error("Unavailable");
        const blob = await response.blob();
        if (await cvExtension(blob) !== ".pdf") throw Error("Not a PDF");
        if (controller.signal.aborted) return;
        blobUrl = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
        setPreview({ loading: false, url: blobUrl, failed: false });
      } catch {
        if (!controller.signal.aborted) setPreview({ loading: false, url: "", failed: true });
      }
    })();
    return () => { controller.abort(); if (blobUrl) URL.revokeObjectURL(blobUrl); };
  }, [pdfSupported, fileUrl]);

  const download = async () => {
    setDownloading(true); setDownloadError("");
    let url;
    try {
      const response = await fetch(fileUrl, { credentials: "omit", referrerPolicy: "no-referrer", cache: "no-store" });
      if (!response.ok) throw Error("Unavailable");
      const blob = await response.blob();
      if (!await cvExtension(blob)) throw Error("Unsupported file");
      url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url; link.download = await nameWithExtension(cv.name, blob);
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      if (url) URL.revokeObjectURL(url);
      setDownloadError("We couldn’t download this CV. Use Open CV to open it and save a copy. If it is no longer available, reload this page.");
    } finally { setDownloading(false); }
  };
  const button = "inline-flex min-h-11 items-center justify-center rounded-lg border border-blue-500 px-5 py-2 text-blue-300 hover:bg-blue-500/10 focus-visible:outline-2 focus-visible:outline-offset-4";
  return <>
    <div className="my-6 flex flex-wrap gap-3" aria-label="CV file actions">
      <a href={fileUrl} target="_blank" rel="noopener noreferrer" className={button}>Open CV<span className="sr-only"> (opens in a new tab)</span></a>
      <button type="button" className={`${button} disabled:opacity-60`} onClick={download} disabled={downloading}>{downloading ? "Downloading…" : "Download CV"}</button>
    </div>
    {downloadError && <p role="alert" className="mb-5 text-sm text-amber-200">{downloadError}</p>}
    {preview.loading && <p role="status" className="py-8 text-gray-300">Loading PDF preview…</p>}
    {cv.format !== "PDF" && <p role="status" className="rounded-xl border border-white/10 p-6 text-gray-300">Preview is not available for Word files. Open or download the CV to view it.</p>}
    {preview.failed && <p role="status" className="rounded-xl border border-white/10 p-6 text-gray-300">PDF preview is unavailable. Open or download the CV to view it.</p>}
    {preview.url && !preview.failed && <>
      <iframe src={preview.url} title={`PDF preview: ${cv.name}`} className="h-[65dvh] min-h-80 w-full rounded-xl border border-white/10 bg-white" onError={() => setPreview(previous => ({ ...previous, failed: true }))} />
      <button type="button" className="mt-3 min-h-11 text-sm text-blue-300 underline" onClick={() => setPreview(previous => ({ ...previous, failed: true }))}>Preview not working? Show other viewing options</button>
    </>}
    <p className="mt-6 text-sm text-gray-400">Downloaded documents remain unchanged. QNDUIT branding appears on this viewing page.</p>
  </>;
}

export default function PublicTalentCv() {
  const { username, cvId } = useParams();
  const { search } = useLocation();
  const [result, setResult] = useState({ loading: true, data: null, failed: false });
  const metadataPath = `/api/talents/public/${encodeURIComponent(username.toLowerCase())}/cvs/${encodeURIComponent(cvId.toLowerCase())}`;
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}${metadataPath}${search}`, { signal: controller.signal, credentials: "omit", cache: "no-store" });
        if (!response.ok) throw Error("Unavailable");
        const data = await response.json();
        if (!data.success || data.cv?.filePath !== `${metadataPath}/file` || !["PDF", "DOC", "DOCX"].includes(data.cv?.format)) throw Error("Invalid response");
        if (!controller.signal.aborted) setResult({ loading: false, data, failed: false });
      } catch {
        if (!controller.signal.aborted) setResult({ loading: false, data: null, failed: true });
      }
    })();
    return () => controller.abort();
  }, [metadataPath, search]);
  return <PublicTalentPresentation>
    {result.loading ? <p role="status" className="py-12 text-gray-300">Loading shared CV…</p> : result.failed ? <section className="rounded-2xl border border-white/10 bg-[#191D23] p-6 md:p-8">
      <h1 className="text-2xl font-bold">CV unavailable</h1>
      <p className="mt-4 text-gray-300">We couldn’t load this CV. It may have been removed, the profile may no longer be public, or the service may be temporarily unavailable.</p>
    </section> : <section className="min-w-0 rounded-2xl border border-white/10 bg-[#191D23] p-5 md:p-8">
      <p className="text-sm text-blue-300">Shared CV</p>
      <h1 className="mt-2 break-words text-2xl font-bold [overflow-wrap:anywhere]">{result.data.talent.fullName}</h1>
      <p className="mt-2 break-words text-gray-300 [overflow-wrap:anywhere]">{result.data.cv.name} · {result.data.cv.format}</p>
      <CvFile key={result.data.cv.filePath} cv={result.data.cv} fileUrl={`${API_BASE_URL}${result.data.cv.filePath}`} />
    </section>}
  </PublicTalentPresentation>;
}
