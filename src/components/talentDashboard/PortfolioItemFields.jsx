import { useId, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import TalentOptionPicker from "./TalentOptionPicker";
import { PORTFOLIO_TEXT_LIMITS } from "../../../backend/src/utils/portfolioMetadata.js";

const toolSuggestions = ["Figma", "Adobe Photoshop", "Adobe Illustrator", "VS Code", "Git", "GitHub", "React", "Excel", "Notion", "Blender", "AutoCAD"];
const inputClass = "w-full min-w-0 rounded-lg border border-white/10 bg-[#1A1A1E] px-4 py-2 text-white focus:outline-none focus:border-blue-500";
const buttonClass = "min-h-11 rounded-lg border border-white/15 px-3 py-2 text-sm text-blue-300 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40";
const groupClass = "min-w-0 space-y-4 rounded-lg border border-white/10 p-3 sm:p-4";

export default function PortfolioItemFields({ item, onChange, onAddImages, error }) {
  const id = useId();
  const picker = useRef(null);
  const images = item.images || [], links = item.links || [];
  const [selectedImage, setSelectedImage] = useState(null);
  const touch = useRef(null);
  const imageKey = image => image._editorKey || image._id;
  const activeIndex = Math.max(0, images.findIndex(image => imageKey(image) === selectedImage));
  const activeImage = images[activeIndex];
  const browse = index => {
    const image = images[Math.max(0, Math.min(index, images.length - 1))];
    if (image) setSelectedImage(imageKey(image));
  };
  const removeActiveImage = () => {
    const remaining = images.filter((_, index) => index !== activeIndex);
    setSelectedImage(remaining[Math.min(activeIndex, remaining.length - 1)] ? imageKey(remaining[Math.min(activeIndex, remaining.length - 1)]) : null);
    onChange("images", remaining);
  };
  const imageChange = (index, field, value) => onChange("images", images.map((image, position) => position === index ? { ...image, [field]: value } : image));
  const textField = (field, label, rows = 3) => <div>
    <label htmlFor={`${id}-${field}`} className="mb-2 block text-sm text-gray-300">{label} (optional)</label>
    <textarea id={`${id}-${field}`} value={item[field] || ""} maxLength={PORTFOLIO_TEXT_LIMITS[field]} rows={rows}
      onChange={event => onChange(field, event.target.value)} className={`${inputClass} resize-y`} />
    <p className="mt-1 text-xs text-gray-400">{(item[field] || "").length}/{PORTFOLIO_TEXT_LIMITS[field].toLocaleString()}</p>
  </div>;
  return <div className="min-w-0 space-y-4">
    <fieldset className={groupClass}>
      <legend className="px-1 font-medium text-white">Project details</legend>
      <div>
        <label htmlFor={`${id}-title`} className="mb-2 block text-sm text-gray-300">Project title{item._new ? " (required)" : " (optional)"}</label>
        <input id={`${id}-title`} type="text" value={item.title || ""} maxLength={160} required={Boolean(item._new)}
          onChange={event => onChange("title", event.target.value)} className={inputClass} />
      </div>
      {textField("overview", "Project overview")}
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-gray-300">
        <input type="checkbox" checked={item.featured === true} onChange={event => onChange("featured", event.target.checked)} className="h-5 w-5 shrink-0 accent-blue-600" />
        Featured project
      </label>
    </fieldset>
    <details className={groupClass}>
      <summary className="min-h-11 cursor-pointer py-2 font-medium text-white focus-visible:outline-2">Challenge and solution</summary>
      {textField("problemStatement", "Problem statement")}
      {textField("approach", "Approach", 4)}
    </details>
    <details className={groupClass}>
      <summary className="min-h-11 cursor-pointer py-2 font-medium text-white focus-visible:outline-2">Results and contribution</summary>
      {textField("results", "Results", 4)}
      {textField("role", "Your role", 2)}
    </details>
    <details className={`${groupClass} relative overflow-visible`}>
      <summary className="min-h-11 cursor-pointer py-2 font-medium text-white focus-visible:outline-2">Tools and skills</summary>
      <TalentOptionPicker label="Tools used" kind="skills" suggestions={toolSuggestions} value={item.toolsUsed || []}
        maxSelections={20} maxLength={80} onChange={value => onChange("toolsUsed", value)} />
      <TalentOptionPicker label="Skills demonstrated" kind="skills" value={item.skillsDemonstrated || []}
        maxSelections={20} maxLength={80} onChange={value => onChange("skillsDemonstrated", value)} />
      <p className="text-xs text-gray-400">Up to 20 tools and 20 skills, 80 characters each. You can add your own values. Profile skills stay unchanged.</p>
    </details>
    <fieldset className={groupClass}>
      <legend className="px-1 font-medium text-white">Media gallery</legend>
      <p className="text-sm text-gray-400">{images.length}/6 images. The first image is the cover. PNG/JPG, up to 5 MiB each, 16 megapixels and 8192 pixels per side.</p>
      <button type="button" disabled={images.length >= 6} onClick={() => picker.current?.click()}
        className={`${buttonClass} w-full border-dashed py-5`}>Add project images ({images.length}/6)</button>
      {activeImage && <div className="min-w-0 space-y-3">
        <div tabIndex={0} role="group" aria-roledescription="carousel" aria-label="Project images. Use left and right arrow keys to browse."
          className="relative min-w-0 overflow-hidden rounded-lg border border-white/10 focus-visible:outline-2 focus-visible:outline-blue-400"
          style={{ touchAction: "pan-y pinch-zoom" }}
          onKeyDown={event => {
            if (event.target !== event.currentTarget) return;
            const target = { ArrowLeft: activeIndex - 1, ArrowRight: activeIndex + 1, Home: 0, End: images.length - 1 }[event.key];
            if (target !== undefined) { event.preventDefault(); browse(target); }
          }}
          onTouchStart={event => { touch.current = event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null; }}
          onTouchCancel={() => { touch.current = null; }}
          onTouchEnd={event => {
            const start = touch.current;
            touch.current = null;
            const end = event.changedTouches[0];
            if (!start || !end) return;
            const dx = end.clientX - start.x, dy = end.clientY - start.y;
            if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) browse(activeIndex + (dx < 0 ? 1 : -1));
          }}>
          <img src={activeImage.preview || activeImage.url} alt={activeImage.alt || `Project image ${activeIndex + 1}`}
            className="aspect-video w-full bg-white/5 object-contain" />
          <button type="button" aria-label={`Delete image ${activeIndex + 1}`} onClick={removeActiveImage}
            className={`${buttonClass} absolute right-2 top-2 bg-[#1A1A1E]`}><Trash2 size={18} aria-hidden="true" /></button>
        </div>
        <div className="flex items-center justify-between gap-3">
          <button type="button" aria-label="Previous gallery image" disabled={activeIndex === 0} onClick={() => browse(activeIndex - 1)} className={buttonClass}><ChevronLeft size={18} aria-hidden="true" /></button>
          <p role="status" aria-live="polite" className="text-center text-sm text-gray-300">{activeIndex + 1} / {images.length}{activeIndex === 0 ? " · Cover" : ""}{activeImage.file ? " · Pending upload" : ""}</p>
          <button type="button" aria-label="Next gallery image" disabled={activeIndex === images.length - 1} onClick={() => browse(activeIndex + 1)} className={buttonClass}><ChevronRight size={18} aria-hidden="true" /></button>
        </div>
        <label htmlFor={`${id}-gallery-description`} className="block text-sm text-gray-300">Gallery description (optional, selected image)
          <textarea id={`${id}-gallery-description`} value={activeImage.caption || ""} maxLength={500} rows={2}
            onChange={event => imageChange(activeIndex, "caption", event.target.value)} className={`mt-1 resize-y ${inputClass}`} />
        </label>
        <p className="text-xs text-gray-400">Description for image {activeIndex + 1} only. Other saved captions and accessibility details are preserved.</p>
      </div>}
      <input ref={picker} type="file" accept=".png,.jpg,.jpeg,image/png,image/jpeg" multiple className="hidden"
        onChange={event => { const files = Array.from(event.target.files || []); event.target.value = ""; onAddImages?.(files); }} />
    </fieldset>
    <details className={groupClass}>
      <summary className="min-h-11 cursor-pointer py-2 font-medium text-white focus-visible:outline-2">External links and video</summary>
      {links.map((link, index) => <fieldset key={index} className="min-w-0 space-y-3 rounded-lg border border-white/10 p-3">
        <legend className="px-1 text-sm text-gray-300">Link {index + 1}</legend>
        <label className="block text-sm text-gray-300">Link label
          <input value={link.label || ""} maxLength={80} onChange={event => onChange("links", links.map((row, position) => position === index ? { ...row, label: event.target.value } : row))} className={`mt-1 ${inputClass}`} />
        </label>
        <label className="block text-sm text-gray-300">Link URL
          <input type="url" inputMode="url" autoCapitalize="none" autoCorrect="off" maxLength={2048} placeholder="https://example.com/project" value={link.url || ""}
            onChange={event => onChange("links", links.map((row, position) => position === index ? { ...row, url: event.target.value } : row))} className={`mt-1 ${inputClass}`} />
        </label>
        <button type="button" className={buttonClass} onClick={() => onChange("links", links.filter((_, position) => position !== index))}>Remove link {index + 1}</button>
      </fieldset>)}
      <button type="button" disabled={links.length >= 5} className={buttonClass} onClick={() => onChange("links", [...links, { label: "", url: "" }])}>Add project link</button>
      <label className="block text-sm text-gray-300" htmlFor={`${id}-video`}>YouTube project video (optional)</label>
      <input id={`${id}-video`} type="url" inputMode="url" autoCapitalize="none" autoCorrect="off" maxLength={2048} value={item.video || ""}
        placeholder="https://www.youtube.com/watch?v=..." onChange={event => onChange("video", event.target.value)} className={inputClass} />
      <p className="text-xs text-gray-400">Use a YouTube watch, share, shorts or embed URL. Embed code is not supported.</p>
    </details>
    <details className={groupClass}>
      <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium text-gray-300 focus-visible:outline-2">Legacy project fields</summary>
      {textField("description", "Project description")}
      <label htmlFor={`${id}-url`} className="block text-sm text-gray-300">Project URL (optional)</label>
      <input id={`${id}-url`} type="url" inputMode="url" maxLength={2048} value={item.projectUrl || ""} onChange={event => onChange("projectUrl", event.target.value)} className={inputClass} />
      <TalentOptionPicker label="Related skills (optional)" kind="skills" value={item.skills || []} maxSelections={20} maxLength={80} onChange={value => onChange("skills", value)} />
      <p className="text-xs text-gray-400">Existing values are retained. Overview, demonstrated skills and links use these values until you edit their case-study fields.</p>
    </details>
    {error && <p role="alert" className="break-words text-sm text-red-400">{error}</p>}
  </div>;
}
