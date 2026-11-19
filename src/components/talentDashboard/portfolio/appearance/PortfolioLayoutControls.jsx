import { usesStandardPortfolioArrangement } from "../../../utils/portfolioLayoutDraft";
import { useId, useLayoutEffect, useRef, useState } from "react";
import { Reorder, useDragControls } from "framer-motion";
import { GripVertical } from "lucide-react";
import TalentSelect from "../../TalentSelect";
import { PORTFOLIO_SECTIONS, PORTFOLIO_PROJECT_LAYOUTS, resolvePortfolioLayout } from "../../../../../backend/src/utils/portfolioAppearance.js";

const actionClass = "min-h-11 rounded-lg border border-white/20 px-3 py-2 text-sm text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300 disabled:opacity-40";

function SectionRow({ id, index, count, shown, disabled, register, move, toggle, onDragStart, onDragEnd }) {
  const controls = useDragControls();
  const label = PORTFOLIO_SECTIONS.find(section => section.id === id).label;
  return <Reorder.Item value={id} dragListener={false} dragControls={controls} dragMomentum={false} layout="position"
    onDragStart={onDragStart} onDragEnd={onDragEnd} tabIndex={-1} ref={register}
    aria-label={`${label} section`} className="relative flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-[#0F1419] p-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300">
    <button type="button" disabled={disabled} aria-label={`Drag ${label} to reorder`}
      className={`${actionClass} cursor-grab px-2 active:cursor-grabbing`} style={{ touchAction: "none" }}
      onPointerDown={event => { if (!disabled) { event.currentTarget.focus(); controls.start(event); } }}>
      <GripVertical className="h-5 w-5" aria-hidden="true" />
    </button>
    <span className="min-w-28 flex-1 font-medium">{label}</span>
    <label className="flex min-h-11 items-center gap-2 text-sm">
      <input type="checkbox" checked={shown} disabled={disabled} aria-label={`Show ${label}`}
        onChange={toggle} className="h-5 w-5 accent-blue-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300" />
      Show
    </label>
    <div className="flex flex-wrap gap-2">
      <button type="button" className={actionClass} disabled={disabled || index === 0} aria-label={`Move ${label} up`} onClick={() => move(-1)}>Move up</button>
      <button type="button" className={actionClass} disabled={disabled || index === count - 1} aria-label={`Move ${label} down`} onClick={() => move(1)}>Move down</button>
    </div>
  </Reorder.Item>;
}

export default function PortfolioLayoutControls({ value, onChange, disabled = false }) {
  const groupId = useId();
  const rows = useRef(new Map());
  const pendingFocus = useRef(null);
  const dragging = useRef(false);
  const standardArrangement = usesStandardPortfolioArrangement(value);
  const [announcement, setAnnouncement] = useState("");
  const order = resolvePortfolioLayout(value).sectionOrder;
  const orderKey = order.join(",");
  useLayoutEffect(() => {
    if (pendingFocus.current) {
      rows.current.get(pendingFocus.current)?.focus({ preventScroll: true });
      pendingFocus.current = null;
    }
  }, [orderKey]);
  const reorder = next => {
    if (disabled || next.every((id, index) => id === order[index])) return;
    onChange({ ...value, sectionOrder: next });
  };
  const move = (id, delta) => {
    const next = [...order], index = next.indexOf(id), target = index + delta;
    if (disabled || target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    dragging.current = false;
    pendingFocus.current = id;
    reorder(next);
    setAnnouncement(`${PORTFOLIO_SECTIONS.find(section => section.id === id).label} moved to position ${target + 1} of ${next.length}.`);
  };
  return <fieldset disabled={disabled} className="mt-6 min-w-0 border-t border-white/10 pt-5">
    <legend className="px-1 font-medium">Layout</legend>
    <p id={`${groupId}-help`} className="mb-4 text-sm leading-6 text-gray-400">Drag the handles or use Move up and Move down. Uncheck Show to hide a section. Empty sections still follow your public portfolio’s content rules.</p>
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-gray-300">{value.sectionOrder?.length ? "Custom section order" : value.sectionOrder ? "Standard section grouping" : "Theme-default section grouping"}</p>
      <button type="button" className={actionClass} disabled={disabled || standardArrangement}
        onClick={() => {
          if (disabled || standardArrangement) return;
          dragging.current = false;
          const next = { ...value };
          // Explicit reset intent survives saving while retaining legacy defaults.
          next.sectionOrder = [];
          pendingFocus.current = null;
          onChange(next);
          setAnnouncement("Section order reset to the standard newly-upgraded arrangement. Save appearance to publish this change.");
        }}>Reset order</button>
    </div>
    <Reorder.Group axis="y" values={order} onReorder={next => { if (dragging.current) reorder(next); }} aria-label="Portfolio sections" aria-describedby={`${groupId}-help`} className="space-y-3">
      {order.map((id, index) => <SectionRow key={id} id={id} index={index} count={order.length} disabled={disabled}
        shown={!value.hiddenSections?.includes(id)} register={node => { if (node) rows.current.set(id, node); else rows.current.delete(id); }}
        move={delta => move(id, delta)}
        toggle={() => onChange({ ...value, hiddenSections: PORTFOLIO_SECTIONS.map(section => section.id).filter(section => section === id ? !value.hiddenSections?.includes(id) : value.hiddenSections?.includes(section)) })}
        onDragStart={() => { dragging.current = true; pendingFocus.current = null; }}
        onDragEnd={() => { dragging.current = false; rows.current.get(id)?.focus({ preventScroll: true }); setAnnouncement(`${PORTFOLIO_SECTIONS.find(section => section.id === id).label} reorder complete.`); }} />)}
    </Reorder.Group>
    <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">{announcement}</p>
    <label htmlFor={`${groupId}-projects`} className="mb-2 mt-5 block text-sm font-medium">Project layout</label>
    <TalentSelect id={`${groupId}-projects`} aria-label="Project layout" value={value.projectLayout || ""} disabled={disabled}
      className="min-h-11 rounded-lg border border-white/15 bg-[#0F1419] text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300"
      onChange={event => { const next = { ...value }; if (event.currentTarget.value) next.projectLayout = event.currentTarget.value; else delete next.projectLayout; onChange(next); }}>
      <option value="">Theme default</option>
      {PORTFOLIO_PROJECT_LAYOUTS.map(mode => <option key={mode.id} value={mode.id}>{mode.label}</option>)}
    </TalentSelect>
  </fieldset>;
}
