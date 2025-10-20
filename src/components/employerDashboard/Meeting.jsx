import  { useState } from "react";
import {
  Video,
  Calendar as CalendarIcon,
  MessageSquare,
  X,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Calendar } from "../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { format } from "date-fns";

export const Meeting = () => {
  const [showZoomModal, setShowZoomModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState("5:00 pm");
  const [duration, setDuration] = useState("30m");
  const [message, setMessage] = useState("");
  const meetings = [
    {
      id: 1,
      date: "06",
      month: "DEC",
      title: "Marketer",
      attendee: "Tony Nguyen",
      time: "3h: 00",
      duration: "30m",
    },
    {
      id: 2,
      date: "07",
      month: "DEC",
      title: "Junior Graphic Designer",
      attendee: "Daniel Dovin",
      time: "3h: 00",
      duration: "30m",
    },
    {
      id: 3,
      date: "08",
      month: "DEC",
      title: "Digital Marketing",
      attendee: "Danimla",
      time: "3h: 00",
      duration: "30m",
    },
    {
      id: 4,
      date: "09",
      month: "DEC",
      title: "Project Manager",
      attendee: "Danimla",
      time: "3h: 00",
      duration: "30m",
    },
    {
      id: 5,
      date: "11",
      month: "DEC",
      title: "Director",
      attendee: "Danimla",
      time: "3h: 00",
      duration: "30m",
    },
    {
      id: 6,
      date: "13",
      month: "DEC",
      title: "UI UX Designer",
      attendee: "Danimla",
      time: "3h: 00",
      duration: "30m",
    },
    {
      id: 7,
      date: "14",
      month: "DEC",
      title: "Digital Marketing",
      attendee: "Danimla",
      time: "3h: 00",
      duration: "30m",
    },
  ];

  const handleReschedule = (meeting) => {
    setSelectedMeeting(meeting);
    setShowRescheduleModal(true);
  };

  const handleSubmitReschedule = () => {
    console.log("Rescheduling meeting:", { date, time, duration, message });
    setShowRescheduleModal(false);
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 bg-blue-600 rounded-full"></div>
          <h1 className="text-2xl md:text-3xl font-semibold text-white">
            Meetings
          </h1>
        </div>
        <button
          onClick={() => setShowZoomModal(true)}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          Zoom Setting
        </button>
      </div>

      {/* Meetings List */}
      <div className="space-y-4">
        {meetings.map((meeting) => (
          <div
            key={meeting.id}
            className="bg-[#1A1A1E] rounded-lg border border-white/5 p-4 md:p-6 hover:bg-white/5 transition-colors"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1">
                {/* Date Badge */}
                <div className="bg-white rounded-lg text-center p-3 min-w-[60px] flex-shrink-0">
                  <div className="text-blue-600 text-xs font-medium uppercase">
                    {meeting.month}
                  </div>
                  <div className="text-gray-900 text-2xl font-bold">
                    {meeting.date}
                  </div>
                </div>

                {/* Meeting Info */}
                <div className="flex-1">
                  <h3 className="text-white font-semibold text-lg mb-1">
                    {meeting.title}
                  </h3>
                  <p className="text-sm text-gray-400 mb-2">
                    Meeting with:{" "}
                    <span className="text-blue-400">{meeting.attendee}</span>
                  </p>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span className="flex items-center gap-1">
                      ⏰ {meeting.time}
                    </span>
                    <span className="flex items-center gap-1">
                      ⏱️ {meeting.duration}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                <button className="p-2 bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors">
                  <MessageSquare className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleReschedule(meeting)}
                  className="p-2 bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors"
                >
                  <CalendarIcon className="w-4 h-4" />
                </button>
                <button className="px-4 py-2 bg-transparent border border-white/20 hover:bg-white/5 rounded text-white text-sm transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Zoom Setting Modal */}
      <Dialog open={showZoomModal} onOpenChange={setShowZoomModal}>
        <DialogContent className="bg-[#1A1A1E] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              Zoom API Setting
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm text-gray-400 mb-2 block">
                Zoom Email
              </label>
              <input
                type="email"
                placeholder="hi.avitex@gmail.com"
                className="w-full px-4 py-2.5 bg-[#0E0E10] border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-2 block">
                Zoom client ID
              </label>
              <input
                type="text"
                placeholder="1234ghasdfgh0231"
                className="w-full px-4 py-2.5 bg-[#0E0E10] border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-2 block">
                Client Secret
              </label>
              <input
                type="text"
                placeholder="01234567986735463824765"
                className="w-full px-4 py-2.5 bg-[#0E0E10] border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <button className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors mt-2">
              Get Authorize With Zoom
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reschedule Meeting Modal */}
      <Dialog open={showRescheduleModal} onOpenChange={setShowRescheduleModal}>
        <DialogContent className="bg-[#1A1A1E] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              Re-Schedule Meeting
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <button className="w-full px-4 py-2.5 bg-[#0E0E10] border border-white/10 rounded-lg text-white text-left flex items-center justify-between hover:border-blue-500 transition-colors">
                    {format(date, "MMMM dd, yyyy")}
                    <CalendarIcon className="w-4 h-4 text-gray-400" />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto p-0 bg-[#1A1A1E] border-white/10"
                  align="start"
                >
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    className="rounded-md"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Time</label>
                <select
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#0E0E10] border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option>5:00 pm</option>
                  <option>6:00 pm</option>
                  <option>7:00 pm</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-2 block">
                  Time Duration
                </label>
                <input
                  type="text"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#0E0E10] border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-2 block">
                Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Message..."
                rows={4}
                className="w-full px-4 py-2.5 bg-[#0E0E10] border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>
            <button
              onClick={handleSubmitReschedule}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors mt-2"
            >
              Re-Schedule Meeting
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Meeting;
