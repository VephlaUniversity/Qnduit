import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare, Hourglass, Clock } from "lucide-react";

export const Meeting = () => {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState([
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
  ]);

  const handleCancel = (id) => {
    setMeetings(meetings.filter((meeting) => meeting.id !== id));
  };

  const handleMessage = () => {
    navigate("/talent-dashboard/messages");
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
                  onClick={handleMessage}
                  className="p-2 bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleCancel(meeting.id)}
                  className="px-4 py-2 bg-transparent border border-white/20 hover:bg-white/5 rounded text-white text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Meeting;
