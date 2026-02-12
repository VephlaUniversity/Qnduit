import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar as CalendarIcon,
  MessageSquare,
  Trash2,
  Hourglass,
  Clock,
  Plus,
  Video,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Calendar } from "../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { format } from "date-fns";
import { useToast } from "../hooks/useToast";

const INITIAL_MEETINGS = [
  {
    id: 1,
    date: "06",
    month: "DEC",
    title: "Marketer",
    attendee: "Tony Nguyen",
    time: "3:00 pm",
    duration: "30m",
  },
  {
    id: 2,
    date: "07",
    month: "DEC",
    title: "Junior Graphic Designer",
    attendee: "Daniel Dovin",
    time: "3:00 pm",
    duration: "30m",
  },
  {
    id: 3,
    date: "08",
    month: "DEC",
    title: "Digital Marketing",
    attendee: "Danimla",
    time: "3:00 pm",
    duration: "30m",
  },
  {
    id: 4,
    date: "09",
    month: "DEC",
    title: "Project Manager",
    attendee: "Danimla",
    time: "3:00 pm",
    duration: "30m",
  },
  {
    id: 5,
    date: "11",
    month: "DEC",
    title: "Director",
    attendee: "Danimla",
    time: "3:00 pm",
    duration: "30m",
  },
  {
    id: 6,
    date: "13",
    month: "DEC",
    title: "UI UX Designer",
    attendee: "Danimla",
    time: "3:00 pm",
    duration: "30m",
  },
  {
    id: 7,
    date: "14",
    month: "DEC",
    title: "Digital Marketing",
    attendee: "Danimla",
    time: "3:00 pm",
    duration: "30m",
  },
];

// Full 24-hour clock in 30-minute intervals → 48 slots: 12:00 am … 11:30 pm
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const totalMinutes = i * 30;
  const hours24 = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const period = hours24 < 12 ? "am" : "pm";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${String(minutes).padStart(2, "0")} ${period}`;
});

const DURATION_OPTIONS = ["15m", "30m", "45m", "1h", "1h 30m", "2h"];

// ── Confirmation dialog ────────────────────────────────────────────────────
const ConfirmDialog = ({ open, onConfirm, onCancel, meetingTitle }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative bg-[#1A1A1E] border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
        <div className="flex items-center justify-center w-12 h-12 bg-red-500/10 rounded-full mx-auto mb-4">
          <Trash2 className="w-6 h-6 text-red-400" />
        </div>
        <h3 className="text-white text-lg font-semibold text-center mb-2">
          Delete Meeting
        </h3>
        <p className="text-gray-400 text-sm text-center mb-6">
          Are you sure you want to delete{" "}
          <span className="text-white font-medium">"{meetingTitle}"</span>? This
          action cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 rounded-lg text-white text-sm font-medium transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main component ─────────────────────────────────────────────────────────
export const Meeting = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [meetings, setMeetings] = useState(INITIAL_MEETINGS);

  // Modal visibility
  const [showZoomModal, setShowZoomModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Reschedule form state
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState(new Date());
  const [rescheduleTime, setRescheduleTime] = useState("5:00 pm");
  const [rescheduleDuration, setRescheduleDuration] = useState("30m");
  const [rescheduleMessage, setRescheduleMessage] = useState("");

  // Create meeting form state
  const [newTitle, setNewTitle] = useState("");
  const [newAttendee, setNewAttendee] = useState("");
  const [newDate, setNewDate] = useState(new Date());
  const [newTime, setNewTime] = useState("10:00 am");
  const [newDuration, setNewDuration] = useState("30m");
  const [createErrors, setCreateErrors] = useState({});

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleMessage = (meeting) => {
    navigate(
      `/dashboard/messages?attendee=${encodeURIComponent(meeting.attendee)}`,
    );
    toast({
      title: "Opening Messages",
      description: `Opening conversation with ${meeting.attendee}.`,
    });
  };

  const handleDeleteRequest = (meeting) => {
    setConfirmDelete(meeting);
  };

  const handleDeleteConfirm = () => {
    const title = confirmDelete.title;
    setMeetings((prev) => prev.filter((m) => m.id !== confirmDelete.id));
    setConfirmDelete(null);
    toast({
      title: "Meeting Deleted",
      description: `"${title}" has been removed.`,
      variant: "destructive",
    });
  };

  const handleReschedule = (meeting) => {
    setSelectedMeeting(meeting);
    setRescheduleDate(new Date());
    setRescheduleTime(meeting.time || "5:00 pm");
    setRescheduleDuration(meeting.duration || "30m");
    setRescheduleMessage("");
    setShowRescheduleModal(true);
  };

  const handleSubmitReschedule = () => {
    const d = format(rescheduleDate, "dd");
    const mon = format(rescheduleDate, "MMM").toUpperCase();
    setMeetings((prev) =>
      prev.map((m) =>
        m.id === selectedMeeting.id
          ? {
              ...m,
              date: d,
              month: mon,
              time: rescheduleTime,
              duration: rescheduleDuration,
            }
          : m,
      ),
    );
    setShowRescheduleModal(false);
    toast({
      title: "Meeting Rescheduled",
      description: `"${selectedMeeting.title}" moved to ${format(rescheduleDate, "MMM dd, yyyy")} at ${rescheduleTime}.`,
    });
  };

  const handleCreateMeeting = () => {
    const errors = {};
    if (!newTitle.trim()) errors.title = "Meeting title is required.";
    if (!newAttendee.trim()) errors.attendee = "Attendee name is required.";
    setCreateErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const newMeeting = {
      id: Date.now(),
      date: format(newDate, "dd"),
      month: format(newDate, "MMM").toUpperCase(),
      title: newTitle.trim(),
      attendee: newAttendee.trim(),
      time: newTime,
      duration: newDuration,
    };

    setMeetings((prev) => [...prev, newMeeting]);
    setNewTitle("");
    setNewAttendee("");
    setNewDate(new Date());
    setNewTime("10:00 am");
    setNewDuration("30m");
    setCreateErrors({});
    setShowCreateModal(false);
    toast({
      title: "Meeting Created",
      description: `"${newMeeting.title}" scheduled for ${format(newDate, "MMM dd, yyyy")} at ${newTime}.`,
    });
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 bg-blue-600 rounded-full" />
          <h1 className="text-2xl md:text-3xl font-semibold text-white">
            Meetings
          </h1>
          <span className="ml-1 px-2.5 py-0.5 bg-blue-600/20 text-blue-400 text-sm font-medium rounded-full">
            {meetings.length}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Meeting
          </button>
          <button
            onClick={() => setShowZoomModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-transparent border border-white/20 hover:bg-white/5 text-white rounded-lg font-medium transition-colors"
          >
            <Video className="w-4 h-4" />
            Zoom Settings
          </button>
        </div>
      </div>

      {/* Empty state */}
      {meetings.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-4">
            <CalendarIcon className="w-8 h-8 text-gray-500" />
          </div>
          <h3 className="text-white font-semibold text-lg mb-1">
            No meetings scheduled
          </h3>
          <p className="text-gray-500 text-sm mb-6">
            Create your first meeting to get started.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Meeting
          </button>
        </div>
      )}

      {/* Meetings list */}
      <div className="space-y-4">
        {meetings.map((meeting) => (
          <div
            key={meeting.id}
            className="bg-[#1A1A1E] rounded-xl border border-white/5 p-4 md:p-6 hover:border-white/10 transition-all"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1">
                {/* Date Badge */}
                <div className="bg-white rounded-xl text-center p-3 min-w-[64px] flex-shrink-0 shadow-sm">
                  <div className="text-blue-600 text-xs font-bold uppercase tracking-wide">
                    {meeting.month}
                  </div>
                  <div className="text-gray-900 text-2xl font-extrabold leading-none mt-0.5">
                    {meeting.date}
                  </div>
                </div>

                {/* Meeting Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-semibold text-base md:text-lg mb-1 truncate">
                    {meeting.title}
                  </h3>
                  <p className="text-sm text-gray-400 mb-2">
                    Meeting with:{" "}
                    <span className="text-blue-400 font-medium">
                      {meeting.attendee}
                    </span>
                  </p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {meeting.time}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Hourglass className="w-3.5 h-3.5" />
                      {meeting.duration}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleMessage(meeting)}
                  title="Open messages"
                  className="p-2.5 bg-blue-600/10 hover:bg-blue-600 rounded-lg text-blue-400 hover:text-white transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleReschedule(meeting)}
                  title="Reschedule meeting"
                  className="p-2.5 bg-blue-600/10 hover:bg-blue-600 rounded-lg text-blue-400 hover:text-white transition-colors"
                >
                  <CalendarIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteRequest(meeting)}
                  title="Delete meeting"
                  className="p-2.5 bg-red-500/10 hover:bg-red-600 rounded-lg text-red-400 hover:text-white transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Delete Confirmation ──────────────────────────────────────────── */}
      <ConfirmDialog
        open={!!confirmDelete}
        meetingTitle={confirmDelete?.title}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmDelete(null)}
      />

      {/* ── Create Meeting Modal ─────────────────────────────────────────── */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="bg-[#1A1A1E] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-400" />
              Create Meeting
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {/* Title */}
            <div>
              <label className="text-sm text-gray-400 mb-1.5 block">
                Meeting Title <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => {
                  setNewTitle(e.target.value);
                  if (createErrors.title)
                    setCreateErrors((p) => ({ ...p, title: undefined }));
                }}
                placeholder="e.g. UI UX Designer Interview"
                className={`w-full px-4 py-2.5 bg-[#0E0E10] border rounded-lg text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500 transition-colors ${
                  createErrors.title ? "border-red-500" : "border-white/10"
                }`}
              />
              {createErrors.title && (
                <p className="text-red-400 text-xs mt-1">
                  {createErrors.title}
                </p>
              )}
            </div>

            {/* Attendee */}
            <div>
              <label className="text-sm text-gray-400 mb-1.5 block">
                Attendee Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={newAttendee}
                onChange={(e) => {
                  setNewAttendee(e.target.value);
                  if (createErrors.attendee)
                    setCreateErrors((p) => ({ ...p, attendee: undefined }));
                }}
                placeholder="e.g. Tony Nguyen"
                className={`w-full px-4 py-2.5 bg-[#0E0E10] border rounded-lg text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500 transition-colors ${
                  createErrors.attendee ? "border-red-500" : "border-white/10"
                }`}
              />
              {createErrors.attendee && (
                <p className="text-red-400 text-xs mt-1">
                  {createErrors.attendee}
                </p>
              )}
            </div>

            {/* Date */}
            <div>
              <label className="text-sm text-gray-400 mb-1.5 block">Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <button className="w-full px-4 py-2.5 bg-[#0E0E10] border border-white/10 rounded-lg text-white text-left flex items-center justify-between hover:border-blue-500 transition-colors">
                    {format(newDate, "MMMM dd, yyyy")}
                    <CalendarIcon className="w-4 h-4 text-gray-400" />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto p-0 bg-[#1A1A1E] border-white/10"
                  align="start"
                >
                  <Calendar
                    mode="single"
                    selected={newDate}
                    onSelect={(d) => d && setNewDate(d)}
                    className="rounded-md"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Time & Duration */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400 mb-1.5 block">
                  Time
                </label>
                <select
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#0E0E10] border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500 transition-colors"
                >
                  {TIME_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1.5 block">
                  Duration
                </label>
                <select
                  value={newDuration}
                  onChange={(e) => setNewDuration(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#0E0E10] border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500 transition-colors"
                >
                  {DURATION_OPTIONS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={handleCreateMeeting}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors mt-2 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Meeting
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Reschedule Modal ─────────────────────────────────────────────── */}
      <Dialog open={showRescheduleModal} onOpenChange={setShowRescheduleModal}>
        <DialogContent className="bg-[#1A1A1E] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-blue-400" />
              Re-Schedule Meeting
            </DialogTitle>
          </DialogHeader>
          {selectedMeeting && (
            <p className="text-sm text-gray-400 -mt-2 mb-2">
              Rescheduling:{" "}
              <span className="text-white font-medium">
                {selectedMeeting.title}
              </span>{" "}
              with{" "}
              <span className="text-blue-400">{selectedMeeting.attendee}</span>
            </p>
          )}
          <div className="space-y-4">
            {/* Date */}
            <div>
              <label className="text-sm text-gray-400 mb-1.5 block">
                New Date
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <button className="w-full px-4 py-2.5 bg-[#0E0E10] border border-white/10 rounded-lg text-white text-left flex items-center justify-between hover:border-blue-500 transition-colors">
                    {format(rescheduleDate, "MMMM dd, yyyy")}
                    <CalendarIcon className="w-4 h-4 text-gray-400" />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto p-0 bg-[#1A1A1E] border-white/10"
                  align="start"
                >
                  <Calendar
                    mode="single"
                    selected={rescheduleDate}
                    onSelect={(d) => d && setRescheduleDate(d)}
                    className="rounded-md"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Time & Duration */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400 mb-1.5 block">
                  Time
                </label>
                <select
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#0E0E10] border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500 transition-colors"
                >
                  {TIME_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1.5 block">
                  Duration
                </label>
                <select
                  value={rescheduleDuration}
                  onChange={(e) => setRescheduleDuration(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#0E0E10] border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500 transition-colors"
                >
                  {DURATION_OPTIONS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Message */}
            <div>
              <label className="text-sm text-gray-400 mb-1.5 block">
                Message{" "}
                <span className="text-gray-600 text-xs">(optional)</span>
              </label>
              <textarea
                value={rescheduleMessage}
                onChange={(e) => setRescheduleMessage(e.target.value)}
                placeholder="Add a note for the attendee..."
                rows={3}
                className="w-full px-4 py-2.5 bg-[#0E0E10] border border-white/10 rounded-lg text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500 resize-none transition-colors"
              />
            </div>

            <button
              onClick={handleSubmitReschedule}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Confirm Reschedule
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Zoom Settings Modal ──────────────────────────────────────────── */}
      <Dialog open={showZoomModal} onOpenChange={setShowZoomModal}>
        <DialogContent className="bg-[#1A1A1E] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              <Video className="w-5 h-5 text-blue-400" />
              Zoom API Settings
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm text-gray-400 mb-1.5 block">
                Zoom Email
              </label>
              <input
                type="email"
                placeholder="hi.avitex@gmail.com"
                className="w-full px-4 py-2.5 bg-[#0E0E10] border border-white/10 rounded-lg text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1.5 block">
                Zoom Client ID
              </label>
              <input
                type="text"
                placeholder="1234ghasdfgh0231"
                className="w-full px-4 py-2.5 bg-[#0E0E10] border border-white/10 rounded-lg text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1.5 block">
                Client Secret
              </label>
              <input
                type="text"
                placeholder="01234567986735463824765"
                className="w-full px-4 py-2.5 bg-[#0E0E10] border border-white/10 rounded-lg text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <button className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors mt-2">
              Authorize with Zoom
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Meeting;
