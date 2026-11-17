import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { PublicTalentImage } from "../profiles/PublicTalentMedia";
import { browserSessions } from "../utils/requestSafety";
import { friendlyError } from "../utils/userMessage";
import { portfolioAppearanceRequest, portfolioCoverRequest } from "../utils/portfolioAppearanceApi";
import { PORTFOLIO_COVER_HELP, portfolioCoverFileError } from "../../../backend/src/config/portfolioCover.js";

export default function PortfolioCoverEditor({ actor, token, paid, config, onSaved }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const request = useRef(null), notification = useRef(null);
  const current = signal => !signal.aborted && browserSessions().some(owner => owner.actor === actor && owner.token === token);
  useEffect(() => () => { request.current?.abort(); if (notification.current !== null) toast.dismiss(notification.current); }, []);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  const clearFile = () => { setFile(null); setPreview(""); };

  function selectFile(event) {
    const selected = event.target.files?.[0];
    event.target.value = "";
    if (!selected) return;
    setError("");
    const message = portfolioCoverFileError(selected);
    if (message) { clearFile(); setError(message); return; }
    setPreview(URL.createObjectURL(selected)); setFile(selected);
  }
  async function change(removing = false) {
    if (!paid || busy || pending || !removing && !file) return;
    const controller = new AbortController(); request.current = controller;
    setBusy(removing ? "remove" : "upload"); setError("");
    if (notification.current !== null) toast.dismiss(notification.current);
    try {
      const result = await portfolioCoverRequest(token, { file: removing ? undefined : file,
        remove: removing, version: config.coverVersion, signal: controller.signal });
      if (!current(controller.signal)) return;
      onSaved(result); clearFile();
      notification.current = toast.success(removing ? "Cover removed" : "Cover saved", { duration: 2500, closeButton: true });
    } catch (failure) {
      if (!current(controller.signal)) return;
      const uncertain = failure.response?.data?.code === "COVER_SAVE_PENDING";
      setPending(uncertain);
      setError(uncertain ? "We couldn't confirm this cover change. Reload the saved cover before trying again."
        : failure.response?.status === 502 ? "We couldn't upload the cover. Your saved cover is unchanged."
          : friendlyError(failure, "We couldn't confirm the cover change. Reload the saved cover before trying again."));
    } finally { if (current(controller.signal)) setBusy(""); }
  }
  async function reload() {
    if (busy) return;
    const controller = new AbortController(); request.current = controller;
    setBusy("reload");
    try {
      const result = await portfolioAppearanceRequest(token, { signal: controller.signal });
      if (!current(controller.signal)) return;
      onSaved({ cover: result.cover, coverVersion: result.coverVersion });
      setPending(false); setError(""); clearFile();
    } catch (failure) { if (current(controller.signal)) setError(friendlyError(failure, "We couldn't reload your saved cover.")); }
    finally { if (current(controller.signal)) setBusy(""); }
  }

  return <fieldset disabled={!paid || !!busy} className="mt-6 min-w-0 border-t border-white/10 pt-5">
    <legend className="px-1 font-medium">Portfolio cover</legend>
    {config.cover ? <div className="mb-4 space-y-2"><p className="text-sm text-gray-300">Current cover</p>
      <PublicTalentImage key={config.cover.url} src={config.cover.url} alt="Current portfolio cover" contain className="h-40 w-full rounded-lg border border-white/10" />
    </div> : <p className="mb-3 text-sm text-gray-400">No portfolio cover saved.</p>}
    <label className="block text-sm font-medium">{config.cover ? "Choose a replacement cover" : "Choose a cover image"}
      <input type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" disabled={pending}
        className="mt-2 block min-h-11 w-full min-w-0 rounded-lg border border-white/15 bg-[#0F1419] p-2 text-sm text-gray-300 file:mr-3 file:rounded file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-white focus-visible:outline-2 focus-visible:outline-blue-300"
        onChange={selectFile} />
    </label>
    <p className="mt-2 text-xs leading-5 text-gray-400">{PORTFOLIO_COVER_HELP} A wide image works best as a banner.</p>
    {file && <div className="mt-4 space-y-2"><p className="break-words text-sm text-gray-300">Selected: {file.name}</p>
      {preview && <img src={preview} alt="Selected cover preview" className="max-h-48 w-full rounded-lg object-contain" />}
    </div>}
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <Button type="button" disabled={!file || pending} onClick={() => change(false)}
        className="min-h-11 bg-blue-600 text-white hover:bg-blue-500 focus-visible:ring-blue-300/50">{busy === "upload" ? "Uploading cover…" : config.cover ? "Replace cover" : "Upload cover"}</Button>
      {file && <Button type="button" variant="outline" onClick={clearFile} className="min-h-11 border-white/15 bg-transparent text-gray-300 hover:bg-white/5 hover:text-white">Cancel selection</Button>}
      {config.cover && <Button type="button" variant="link" disabled={pending} onClick={() => change(true)} className="min-h-11 text-blue-300 focus-visible:ring-blue-300/50">{busy === "remove" ? "Removing cover…" : "Remove cover"}</Button>}
    </div>
    {busy && <p role="status" className="mt-3 text-sm text-gray-300">{busy === "upload" ? "Uploading and saving your cover…" : busy === "remove" ? "Removing the saved cover…" : "Reloading your saved cover…"}</p>}
    {error && <div role="alert" className="mt-3 text-sm text-red-300"><p>{error}</p>
      <button type="button" disabled={!!busy} className="min-h-11 underline" onClick={reload}>Reload saved cover</button>
    </div>}
  </fieldset>;
}
