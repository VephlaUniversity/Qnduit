import React, { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, ArrowUpDown } from "lucide-react";

// Generic search + sort toolbar shared across every admin list screen.
// `sortOptions` is [{ value, label }]; `sortValue`/`onSortChange` make the
// sort button an actual functioning dropdown instead of a static label.
export const ListToolbar = ({
  search,
  onSearchChange,
  placeholder = "Search",
  sortOptions,
  sortValue,
  onSortChange,
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const activeLabel =
    sortOptions?.find((o) => o.value === sortValue)?.label || "Default";

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-6">
      <div className="flex items-center gap-2 bg-[#0E0E10] border border-white/10 rounded-lg px-4 py-3 flex-1 focus-within:border-white/25 transition-colors">
        <Search className="w-4 h-4 text-gray-500 flex-shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          className="bg-transparent text-sm text-gray-300 placeholder-gray-500 outline-none w-full"
        />
      </div>

      {sortOptions && sortOptions.length > 0 && (
        <div className="relative sm:w-48" ref={ref}>
          <button
            onClick={() => setOpen((o) => !o)}
            className="w-full flex items-center justify-between gap-2 bg-[#0E0E10] border border-white/10 rounded-lg px-4 py-3 text-sm text-gray-300 hover:border-white/25 transition-colors"
          >
            <span className="flex items-center gap-2 truncate">
              <ArrowUpDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
              {activeLabel}
            </span>
            <ChevronDown
              className={`w-4 h-4 text-gray-500 flex-shrink-0 transition-transform ${
                open ? "rotate-180" : ""
              }`}
            />
          </button>
          {open && (
            <div className="absolute right-0 mt-1 w-full bg-[#2A2A2E] border border-white/10 rounded-lg shadow-xl overflow-hidden z-20 text-sm">
              {sortOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    onSortChange(opt.value);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 transition-colors ${
                    sortValue === opt.value
                      ? "bg-blue-600 text-white"
                      : "text-gray-200 hover:bg-white/10"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ListToolbar;
