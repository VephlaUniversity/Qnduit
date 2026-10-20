import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  MessageSquare,
  Hourglass,
  Clock,
  Loader2,
  CalendarX,
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { API_BASE_URL } from "../utils/api";
import { friendlyError } from "../utils/userMessage";

export const Meeting = () => {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [cancellingId, setCancellingId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const fetchMeetings = async () => {
      try {
        setLoading(true);
        setLoadError("");
        const token = localStorage.getItem("token");

        const { data } = await axios.get(
          `${API_BASE_URL}/api/meetings/talent-meetings`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (cancelled) return;
        setMeetings(Array.isArray(data?.meetings) ? data.meetings : []);
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            friendlyError(
              error,
              "We couldn't load your meetings. Please try again.",
            ),
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchMeetings();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const formatMeetingDate = (date) => {
    const d = new Date(date);

    return {
      day: d.getDate(),
      month: d.toLocaleString("default", { month: "short" }).toUpperCase(),
    };
  };

  const handleCancel = async (id) => {
    const token = localStorage.getItem("token");
    setCancellingId(id);
    try {
      await axios.delete(`${API_BASE_URL}/api/meetings/cancel/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMeetings((prev) => prev.filter((m) => m._id !== id));
      toast.success("Meeting cancelled");
    } catch (error) {
      toast.error(
        friendlyError(
          error,
          "We couldn't cancel this meeting. Please try again.",
        ),
      );
    } finally {
      setCancellingId(null);
    }
  };

  const handleMessage = (meeting) => {
    navigate(
      `/talent-dashboard/messages?attendee=${encodeURIComponent(
        meeting.attendee,
      )}`,
    );
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
      </div>

      {/* Meetings List */}
      <div className="space-y-4">
        {loading && (
          <div className="bg-[#1A1A1E] rounded-lg border border-white/5 px-6 py-12 flex items-center justify-center gap-2 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading meetings...</span>
          </div>
        )}

        {!loading && loadError && (
          <div className="bg-[#1A1A1E] rounded-lg border border-white/5 px-6 py-12 text-center">
            <p className="text-gray-400 mb-4">{loadError}</p>
            <button
              onClick={() => setReloadKey((k) => k + 1)}
              className="px-6 py-2 border border-blue-600 text-blue-500 rounded-lg hover:bg-blue-600/10 transition-colors"
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !loadError && meetings.length === 0 && (
          <div className="bg-[#1A1A1E] rounded-lg border border-white/5 px-6 py-12 text-center">
            <CalendarX className="w-10 h-10 text-gray-500 mx-auto mb-3" />
            <p className="text-white font-medium mb-1">No meetings scheduled</p>
            <p className="text-gray-400 text-sm">
              When an employer schedules a meeting with you, it will show up
              here.
            </p>
          </div>
        )}

        {!loading &&
          !loadError &&
          meetings.map((meeting) => {
            const { day, month } = formatMeetingDate(meeting.date);

            return (
              <div
                key={meeting._id}
                className="bg-[#1A1A1E] rounded-lg border border-white/5 p-4 md:p-6 hover:bg-white/5 transition-colors"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    {/* Date Badge */}
                    <div className="bg-white rounded-lg text-center p-3 min-w-[60px] flex-shrink-0">
                      <div className="text-blue-600 text-xs font-medium uppercase">
                        {month}
                      </div>
                      <div className="text-gray-900 text-2xl font-bold">
                        {day}
                      </div>
                    </div>

                    {/* Meeting Info */}
                    <div className="flex-1">
                      <h3 className="text-white font-semibold text-lg mb-1">
                        {meeting.title}
                      </h3>
                      <p className="text-sm text-gray-400 mb-2">
                        Meeting with:{" "}
                        <span className="text-blue-400">
                          {meeting.employer?.firstName}{" "}
                          {meeting.employer?.lastName}
                        </span>
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" /> {meeting.time}
                        </span>
                        <span className="flex items-center gap-1">
                          <Hourglass className="w-4 h-4" /> {meeting.duration}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => handleMessage(meeting)}
                      className="p-2 bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleCancel(meeting._id)}
                      disabled={cancellingId === meeting._id}
                      className="px-4 py-2 bg-transparent border border-white/20 hover:bg-white/5 rounded text-white text-sm transition-colors"
                    >
                      {cancellingId === meeting._id
                        ? "Cancelling..."
                        : "Cancel"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default Meeting;
