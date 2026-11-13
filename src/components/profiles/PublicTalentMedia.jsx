import { useId, useRef, useState } from "react";
import { ImageOff, UserRound } from "lucide-react";
import { publicImageUrl, publicVideoUrl } from "../../../backend/src/utils/publicTalentProfile.js";
import { API_BASE_URL } from "../utils/api";

export function PublicTalentImage({ src, alt, className = "", avatar = false, contain = false }) {
  const [failed, setFailed] = useState("");
  const safe = publicImageUrl(src);
  const url = safe.startsWith("/uploads/") ? `${API_BASE_URL}${safe}` : safe;
  return <div className={`flex shrink-0 items-center justify-center overflow-hidden bg-blue-500/10 text-blue-400 ${className}`}>
    {url && failed !== url ? <img src={url} alt={alt} loading="lazy" referrerPolicy="no-referrer" className={`h-full w-full ${contain ? "object-contain" : "object-cover"}`} onError={() => setFailed(url)} />
      : avatar ? <UserRound className="h-1/2 w-1/2" aria-label="Profile photo unavailable" />
        : <span className="flex items-center gap-2 p-4 text-sm text-gray-400"><ImageOff className="h-5 w-5" aria-hidden="true" />Image unavailable</span>}
  </div>;
}

// Both introduction and case-study videos use the same strict provider policy.
export function PublicTalentVideo({ url, title }) {
  const safe = publicVideoUrl(url);
  if (!safe) return null;
  const id = new URL(safe).searchParams.get("v");
  return <div className="aspect-video overflow-hidden rounded-xl bg-black">
    <iframe className="h-full w-full" src={`https://www.youtube-nocookie.com/embed/${id}`}
      title={title} loading="lazy" referrerPolicy="strict-origin-when-cross-origin"
      allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
  </div>;
}

// Native scrolling supplies touch swipe without a second media/player system.
export function PublicTalentGallery({ images, title }) {
  const track = useRef(null);
  const id = useId();
  const [active, setActive] = useState(0);
  if (!images.length) return null;
  const current = Math.min(active, images.length - 1);
  const navigate = index => {
    const slides = track.current?.children;
    const target = Math.max(0, Math.min(index, images.length - 1));
    if (!slides?.[target]) return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    track.current.scrollTo({ left: slides[target].offsetLeft - slides[0].offsetLeft, behavior: reduced ? "instant" : "smooth" });
  };
  const keyDown = event => {
    if (event.target !== event.currentTarget) return;
    const target = { ArrowLeft: current - 1, ArrowRight: current + 1, Home: 0, End: images.length - 1 }[event.key];
    if (target === undefined) return;
    event.preventDefault();
    navigate(target);
  };
  return <section aria-label={`${title}: project gallery`} aria-roledescription="carousel" className="min-w-0 max-w-full space-y-3 overflow-hidden">
    <div id={id} ref={track} tabIndex={images.length > 1 ? 0 : undefined} aria-label="Project images. Use left and right arrow keys to navigate."
      onKeyDown={keyDown} onScroll={() => {
        const slides = Array.from(track.current.children);
        const left = track.current.scrollLeft;
        const first = slides[0]?.offsetLeft || 0;
        const nearest = slides.reduce((best, slide, index) => Math.abs(slide.offsetLeft - first - left) < Math.abs(slides[best].offsetLeft - first - left) ? index : best, 0);
        setActive(nearest);
      }} className="relative flex w-full min-w-0 snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain rounded-lg focus-visible:outline-2 focus-visible:outline-blue-400">
      {images.map((image, index) => <figure key={image._id || `${image.url}:${index}`} role="group" aria-roledescription="slide" aria-label={`${index + 1} of ${images.length}`}
        className="w-full min-w-0 shrink-0 snap-start space-y-2">
        {["before", "after"].includes(image.comparisonLabel) && <p className="text-sm font-medium capitalize text-blue-300">{image.comparisonLabel}</p>}
        <PublicTalentImage src={image.url} alt={image.alt || `${title}, image ${index + 1}`} contain className="aspect-video w-full rounded-lg border border-white/10" />
        {image.caption && <figcaption className="whitespace-pre-line break-words text-sm leading-7 text-gray-300 [overflow-wrap:anywhere]">{image.caption}</figcaption>}
      </figure>)}
    </div>
    {images.length > 1 && <div className="flex flex-wrap items-center justify-between gap-2">
      <button type="button" aria-controls={id} aria-label="Previous project image" disabled={current === 0} onClick={() => navigate(current - 1)} className="min-h-11 rounded-lg border border-white/10 px-3 text-sm text-blue-300 disabled:opacity-40">Previous</button>
      <p role="status" aria-live="polite" aria-atomic="true" className="text-sm text-gray-300">Image {current + 1} of {images.length}</p>
      <button type="button" aria-controls={id} aria-label="Next project image" disabled={current === images.length - 1} onClick={() => navigate(current + 1)} className="min-h-11 rounded-lg border border-white/10 px-3 text-sm text-blue-300 disabled:opacity-40">Next</button>
    </div>}
  </section>;
}
