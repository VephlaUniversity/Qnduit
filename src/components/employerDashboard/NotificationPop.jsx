import React from "react";
import { X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { useAuth } from "../hooks/useAuth";

export const NotificationPop = ({ children }) => {
  const { user } = useAuth();

  // Use user notifications or fallback to default
  const notifications = user?.notifications || [
    {
      id: 1,
      type: "success",
      time: "1 day ago",
      title: "Your submit job",
      jobTitle: "Graphic Design",
      status: "is Success",
    },
    {
      id: 2,
      type: "info",
      time: "3 Days ago",
      message: "A new application is submitted on your job",
      jobTitle: "Graphic Design",
      applicant: "Maverick Nguyen",
    },
  ];

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[320px] bg-[#1A1A1E] border-white/10 p-0 mt-2"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h3 className="text-white font-semibold">Notification</h3>
          <span className="text-blue-500 text-sm cursor-pointer hover:text-blue-400">
            {unreadCount} New
          </span>
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className="px-4 py-3 border-b border-white/10 hover:bg-white/5 transition-colors group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-blue-400 text-xs flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                      {notification.time}
                    </span>
                  </div>
                  <p className="text-white text-sm">
                    {notification.title && (
                      <>
                        {notification.title}{" "}
                        <span className="font-semibold">
                          {notification.jobTitle}
                        </span>{" "}
                        <span className="text-green-500">
                          {notification.status}
                        </span>
                      </>
                    )}
                    {notification.message && (
                      <>
                        {notification.message}{" "}
                        <span className="font-semibold">
                          {notification.jobTitle}
                        </span>
                        {notification.applicant && (
                          <>
                            {" by "}
                            <span className="font-semibold">
                              {notification.applicant}
                            </span>
                          </>
                        )}
                      </>
                    )}
                  </p>
                </div>
                <button className="text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="px-4 py-3">
          <button className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
            Read All
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationPop;
