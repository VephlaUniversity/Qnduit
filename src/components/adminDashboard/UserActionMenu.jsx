import React, { useState, useRef, useEffect } from "react";
import {
  MoreVertical,
  ShieldCheck,
  ShieldOff,
  KeyRound,
  Trash2,
} from "lucide-react";

export const UserActionMenu = ({
  onVerify,
  onUnverify,
  onResetPassword,
  onDelete,
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
        <div className="absolute right-0 mt-1 w-48 bg-[#2A2A2E] border border-white/10 rounded-lg shadow-xl overflow-hidden z-20 text-sm">
          {item(ShieldCheck, "Verify User", onVerify)}
          {item(ShieldOff, "Unverify User", onUnverify)}
          {item(KeyRound, "Reset Password", onResetPassword)}
          {item(Trash2, "Delete User", onDelete, true)}
        </div>
      )}
    </div>
  );
};

export default UserActionMenu;
