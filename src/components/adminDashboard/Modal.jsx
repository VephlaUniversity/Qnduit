import React, { useEffect } from "react";
import { X } from "lucide-react";

export const Modal = ({ open, onClose, children, maxWidth = "max-w-3xl" }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto">
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative min-h-full flex items-center justify-center py-10 px-4">
        <div
          className={`relative w-full ${maxWidth} bg-[#1A1A1E] border border-white/10 rounded-2xl shadow-2xl`}
        >
          <button
            onClick={onClose}
            className="absolute -top-3 -right-3 w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-lg transition-colors z-10"
          >
            <X className="w-4 h-4" />
          </button>
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
