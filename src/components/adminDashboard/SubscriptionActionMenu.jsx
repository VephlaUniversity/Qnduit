import React, { useState, useRef, useEffect } from "react";
import { MoreVertical, XCircle, ArrowDownCircle, Receipt } from "lucide-react";

export const SubscriptionActionMenu = ({
  onCancel,
  onDowngrade,
  onSendInvoice,
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

  const item = (Icon, label, handler, danger) => (
    <button
      onClick={() => {
        handler?.();
        setOpen(false);
      }}
      className={`w-full text-left px-4 py-2.5 flex items-center gap-2.5 hover:bg-white/10 transition-colors ${
        danger ? "text-red-500" : "text-gray-200"
      }`}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      {label}
    </button>
  );

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-gray-400 hover:text-white transition-colors p-1"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-52 bg-[#2A2A2E] border border-white/10 rounded-lg shadow-xl overflow-hidden z-20 text-sm">
          {item(XCircle, "Cancel Subscription", onCancel, true)}
          {item(ArrowDownCircle, "Downgrade Subscription", onDowngrade)}
          {item(Receipt, "Send Invoice", onSendInvoice)}
        </div>
      )}
    </div>
  );
};

export default SubscriptionActionMenu;
