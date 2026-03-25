import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare, Hourglass, Clock } from "lucide-react";
import axios from "axios";
import { API_BASE_URL } from "../utils/api";

export const Meeting = () => {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMeetings = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");

        const { data } = await axios.get(
          `${API_BASE_URL}/api/meetings/talent-meetings`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setMeetings(data.meetings);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchMeetings();
  }, []);

  const formatMeetingDate = (date) => {
    const d = new Date(date);

    return {
      day: d.getDate(),
      month: d.toLocaleString("default", { month: "short" }).toUpperCase(),
    };
  };

  const handleCancel = async (id) => {
    const token = localStorage.getItem("token");

    await axios.delete(`${API_BASE_URL}/api/meetings/cancel/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    setMeetings((prev) => prev.filter((m) => m._id !== id));
  };

  const handleMessage = (meeting) => {
    navigate(
      `/talent-dashboard/messages?attendee=${encodeURIComponent(
        meeting.attendee
      )}`
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
        {meetings.map((meeting) => {
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
                      {meeting.employer?.firstName} {meeting.employer?.lastName}
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
                  className="px-4 py-2 bg-transparent border border-white/20 hover:bg-white/5 rounded text-white text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )})}
      </div>
    </div>
  );
};

export default Meeting;
