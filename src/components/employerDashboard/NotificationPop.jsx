import React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

export const NotificationPop = ({ children }) => (
  <Popover>
    <PopoverTrigger asChild>{children}</PopoverTrigger>
    <PopoverContent
      align="end"
      className="w-[320px] bg-[#1A1A1E] border-white/10 p-0 mt-2"
      aria-label="Notifications"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <h3 className="text-white font-semibold">Notification</h3>
      </div>
      <div className="max-h-[400px] overflow-y-auto px-4 py-3">
        <p className="text-gray-400 text-sm">Notifications are not available yet.</p>
      </div>
    </PopoverContent>
  </Popover>
);

export default NotificationPop;
