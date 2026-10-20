import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { TALENT_OPTION_GROUPS, matchesTalentOption } from "../data/talentOptions";

export default function TalentOptionPicker({ label, value, onChange, kind }) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [panelPlacement, setPanelPlacement] = useState({ side: "bottom", maxHeight: 320 });
  const panelRef = useRef(null);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const optionsId = useId();
  const selectedValues = useRef(value);
  selectedValues.current = value;

  useEffect(() => {
    const closeOutside = event => {
      if (!containerRef.current?.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) return;
    const viewport = window.visualViewport;
    const updatePlacement = () => {
      if (!inputRef.current || !panelRef.current) return;
      const control = inputRef.current.getBoundingClientRect();
      const viewportTop = viewport?.offsetTop || 0;
      const viewportBottom = viewportTop + (viewport?.height || window.innerHeight);
      const gap = 8;
      const edgePadding = 12;
      const spaceBelow = Math.max(0, viewportBottom - control.bottom - gap - edgePadding);
      const spaceAbove = Math.max(0, control.top - viewportTop - gap - edgePadding);
      const desiredHeight = Math.min(320, panelRef.current.scrollHeight);
      const side = spaceBelow >= desiredHeight || spaceBelow >= spaceAbove ? "bottom" : "top";
      const maxHeight = Math.floor(Math.min(320, side === "bottom" ? spaceBelow : spaceAbove));
      setPanelPlacement(previous => previous.side === side && previous.maxHeight === maxHeight
        ? previous : { side, maxHeight });
    };
    updatePlacement();
    window.addEventListener("resize", updatePlacement);
    window.addEventListener("scroll", updatePlacement, true);
    viewport?.addEventListener("resize", updatePlacement);
    viewport?.addEventListener("scroll", updatePlacement);
    return () => {
      window.removeEventListener("resize", updatePlacement);
      window.removeEventListener("scroll", updatePlacement, true);
      viewport?.removeEventListener("resize", updatePlacement);
      viewport?.removeEventListener("scroll", updatePlacement);
    };
  }, [isOpen, query, value.length]);

  const updateSelection = option => {
    const current = selectedValues.current;
    const next = current.includes(option)
      ? current.filter(item => item !== option) : [...current, option];
    selectedValues.current = next;
    onChange(next);
  };
  const groups = TALENT_OPTION_GROUPS.map(group => ({
    label: group.label,
    options: (kind === "categories"
      ? [{ value: group.label }, ...group.roles]
      : group.skills.map(skill => ({ value: skill })))
      .filter(option => matchesTalentOption(option, query)),
  })).filter(group => group.options.length);
  const customValue = query.trim().replace(/\s+/g, " ");
  const existingOption = TALENT_OPTION_GROUPS.flatMap(group => kind === "categories"
    ? [{ value: group.label }, ...group.roles]
    : group.skills.map(skill => ({ value: skill })))
    .find(option => [option.value, ...(option.aliases || [])]
      .some(name => name.toLowerCase() === customValue.toLowerCase()));
  const customAlreadySelected = value.some(item => item.toLowerCase() === customValue.toLowerCase());

  return (
    <fieldset ref={containerRef} className={`relative min-w-0 space-y-3 ${isOpen ? "z-30" : "z-0"}`}
      onKeyDown={event => {
        if (event.key === "Escape") {
          event.stopPropagation(); inputRef.current?.focus({ preventScroll: true }); setIsOpen(false);
        }
      }}>
      <legend className="text-sm text-gray-400 mb-2">{label}</legend>
      <div className="relative">
        <input ref={inputRef} aria-label={`Search ${label.toLowerCase()}`} value={query}
          aria-expanded={isOpen} aria-controls={optionsId} autoComplete="off"
          onFocus={() => setIsOpen(true)}
          onChange={event => { setQuery(event.target.value); setIsOpen(true); }}
          onKeyDown={event => {
            if (event.key === "Enter" && !event.nativeEvent.isComposing) event.preventDefault();
            if (event.key === "ArrowDown") {
              event.preventDefault(); setIsOpen(true);
              requestAnimationFrame(() => document.getElementById(optionsId)?.querySelector("input")?.focus());
            }
          }}
          placeholder={`Search ${label.toLowerCase()}`}
          className="w-full min-w-0 bg-transparent border border-gray-700 text-white rounded-lg pl-4 pr-14 py-3 focus:outline-none focus:border-blue-600" />
        <button type="button" aria-label={`${isOpen ? "Close" : "Open"} ${label.toLowerCase()} options`}
          aria-expanded={isOpen} aria-controls={optionsId}
          onClick={() => setIsOpen(previous => !previous)}
          className="absolute right-1 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center text-gray-400 rounded-md focus-visible:outline-2">
          <ChevronDown aria-hidden="true" className={`pointer-events-none h-4 w-4 ${isOpen ? "rotate-180" : ""}`} />
        </button>
        {isOpen && <div ref={panelRef} id={optionsId} data-side={panelPlacement.side}
          style={{ maxHeight: panelPlacement.maxHeight }}
          className={`absolute left-0 right-0 z-30 overflow-y-auto overscroll-contain rounded-xl border border-white/15 bg-[#141820] p-2 shadow-xl space-y-3 [overflow-anchor:none] ${panelPlacement.side === "bottom" ? "top-full mt-2" : "bottom-full mb-2"}`}>
          {groups.map(group => <div key={group.label}>
            <p className="px-2 pt-1 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{group.label}</p>
            {group.options.map(option => <label key={option.value}
              className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm text-white focus-within:ring-2 focus-within:ring-blue-500 ${value.includes(option.value) ? "border-blue-500/40 bg-blue-600/20" : "border-transparent hover:bg-white/5"}`}>
              <input type="checkbox" checked={value.includes(option.value)}
                onChange={() => updateSelection(option.value)} className="h-4 w-4 shrink-0 accent-blue-600" />
              <span className="min-w-0 break-words">{option.value}
                {option.aliases?.length > 0 && <span className="text-gray-400"> ({option.aliases.join(", ")})</span>}
              </span>
            </label>)}
          </div>)}
          {!groups.length && <p className="text-sm text-gray-400">No suggestions match your search.</p>}
          {customValue && !customAlreadySelected && !existingOption && <button type="button"
            onClick={() => { updateSelection(customValue); setQuery(""); inputRef.current?.focus({ preventScroll: true }); }}
            className="min-h-11 text-blue-400 text-sm break-words [overflow-wrap:anywhere] focus-visible:outline-2">
            Add “{customValue}”
          </button>}
        </div>}
      </div>
      <div className="flex min-w-0 flex-wrap gap-2" aria-label={`Selected ${label.toLowerCase()}`}>
        {value.map(option => <span key={option}
          className="inline-flex max-w-full items-center gap-1 rounded-md bg-blue-600 pl-3 text-sm text-white">
          <span className="min-w-0 break-words [overflow-wrap:anywhere]">{option}</span>
          <button type="button" onClick={() => updateSelection(option)} aria-label={`Remove ${option}`}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md focus-visible:outline-2">
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </span>)}
      </div>
    </fieldset>
  );
}
