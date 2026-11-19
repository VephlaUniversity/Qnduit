import React from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

export const PaginationBar = ({ page, totalPages, onChange, compact = false }) => {
  const pages = compact ? [] : Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="flex items-center justify-center gap-3 py-6">
      <button
        type="button"
        aria-label="Previous page"
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className="w-9 h-9 rounded-full flex items-center justify-center bg-[#2A2A2E] text-blue-500 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
      </button>

      {compact && <span className="text-sm text-gray-300">Page {page} of {totalPages}</span>}
      {pages.map((p) => (
        <button
          key={p}
          type="button"
          aria-label={`Page ${p}`}
          aria-current={p === page ? "page" : undefined}
          onClick={() => onChange(p)}
          className={`w-9 h-9 rounded-full text-sm font-medium transition-colors ${
            p === page
              ? "bg-blue-600 text-white"
              : "text-gray-400 hover:bg-white/5"
          }`}
        >
          {String(p).padStart(2, "0")}
        </button>
      ))}

      <button
        type="button"
        aria-label="Next page"
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        className="w-9 h-9 rounded-full flex items-center justify-center bg-[#2A2A2E] text-blue-500 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
};

export default PaginationBar;
