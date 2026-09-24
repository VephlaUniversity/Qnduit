import React from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

export const PaginationBar = ({ page, totalPages, onChange }) => {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="flex items-center justify-center gap-3 py-6">
      <button
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className="w-9 h-9 rounded-full flex items-center justify-center bg-[#2A2A2E] text-blue-500 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
      </button>

      {pages.map((p) => (
        <button
          key={p}
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
