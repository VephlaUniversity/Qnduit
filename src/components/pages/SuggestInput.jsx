import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Briefcase, Building2, MapPin } from "lucide-react";
import { useJobSuggestions } from "../utils/useJobSuggestions";

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Bold the part of a suggestion that matches what was typed.
function Highlight({ text, query }) {
  const words = String(query || "")
    .trim()
    .split(/\s+/)
    .filter((w) => w.length >= 2)
    .map(escapeRegex);
  if (!words.length) return text;
  const parts = text.split(new RegExp(`(${words.join("|")})`, "ig"));
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold">
        {part}
      </strong>
    ) : (
      part
    ),
  );
}

const KIND_ICON = { title: Briefcase, company: Building2, location: MapPin };
const KIND_LABEL = {
  title: "Job titles",
  company: "Companies",
  location: "Locations",
};

const THEMES = {
  light: {
    panel: "bg-white border border-gray-200 text-gray-900",
    heading: "text-gray-400",
    row: "hover:bg-gray-100",
    active: "bg-gray-100",
    count: "text-gray-400",
  },
  dark: {
    panel: "bg-[#191D23] border border-[#2A3142] text-white",
    heading: "text-gray-500",
    row: "hover:bg-[#232A3B]",
    active: "bg-[#232A3B]",
    count: "text-gray-500",
  },
};

/**
 * A text box that shows suggestions while typing.
 *  - mode "keyword": job titles, companies and places
 *  - mode "location": places only
 * onPick(kind, text) runs when a suggestion is chosen; onSubmit() when Enter is
 * pressed with no suggestion highlighted.
 */
export function SuggestInput({
  value,
  onChange,
  onPick,
  onSubmit,
  mode = "keyword",
  placeholder,
  theme = "light",
  icon = null,
  wrapperClassName = "relative",
  inputClassName = "",
  ariaLabel,
}) {
  const colors = THEMES[theme] || THEMES.light;
  const listId = useId();
  const wrapperRef = useRef(null);
  const [typed, setTyped] = useState(false); // only after the user types, not on page load
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const suggestions = useJobSuggestions(value, typed);

  const items = useMemo(() => {
    const list = [];
    if (mode === "keyword") {
      suggestions.titles.forEach((s) => list.push({ kind: "title", ...s }));
      suggestions.companies.forEach((s) =>
        list.push({ kind: "company", ...s }),
      );
    }
    suggestions.locations.forEach((s) => list.push({ kind: "location", ...s }));
    return list;
  }, [suggestions, mode]);

  const visible = open && typed && items.length > 0;

  useEffect(() => {
    setActive(-1);
  }, [items]);

  useEffect(() => {
    const close = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const pick = (item) => {
    setOpen(false);
    setTyped(false);
    setActive(-1);
    onPick(item.kind, item.text);
  };

  const handleKeyDown = (event) => {
    if (visible && event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => (i + 1) % items.length);
    } else if (visible && event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => (i <= 0 ? items.length - 1 : i - 1));
    } else if (event.key === "Escape") {
      setOpen(false);
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (visible && active >= 0) pick(items[active]);
      else {
        setOpen(false);
        onSubmit?.();
      }
    }
  };

  let lastKind = null;

  return (
    <div ref={wrapperRef} className={wrapperClassName}>
      {icon}
      <input
        type="text"
        role="combobox"
        aria-label={ariaLabel || placeholder}
        aria-expanded={visible}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          visible && active >= 0 ? `${listId}-${active}` : undefined
        }
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setTyped(true);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        className={inputClassName}
      />

      {visible && (
        <ul
          id={listId}
          role="listbox"
          className={`absolute left-0 top-full z-50 mt-2 max-h-80 w-full min-w-[16rem] overflow-y-auto rounded-lg py-1 shadow-xl ${colors.panel}`}
        >
          {items.map((item, index) => {
            const showHeading = item.kind !== lastKind;
            lastKind = item.kind;
            const Icon = KIND_ICON[item.kind];
            return (
              <li key={`${item.kind}-${item.text}`} role="presentation">
                {showHeading && (
                  <div
                    className={`px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide ${colors.heading}`}
                  >
                    {KIND_LABEL[item.kind]}
                  </div>
                )}
                <div
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={index === active}
                  // mouseDown (not click) so the box keeps focus until picked
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(item);
                  }}
                  onMouseEnter={() => setActive(index)}
                  className={`flex cursor-pointer items-center gap-3 px-3 py-2 text-sm ${
                    index === active ? colors.active : colors.row
                  }`}
                >
                  <Icon className={`h-4 w-4 flex-shrink-0 ${colors.count}`} />
                  <span className="min-w-0 flex-1 truncate">
                    <Highlight text={item.text} query={value} />
                  </span>
                  <span className={`flex-shrink-0 text-xs ${colors.count}`}>
                    {item.count} {item.count === 1 ? "job" : "jobs"}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
