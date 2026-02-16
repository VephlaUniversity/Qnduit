import Meeting from "../models/Meeting.js";

export const createMeeting = async (req, res, next) => {
  try {
    const employerId = req.user._id;
    const { title, attendee, date, time, duration, message, zoomLink } = req.body;

    const meeting = new Meeting({
      employer: employerId,
      title,
      attendee,
      date,
      time,
      duration,
      message,
      zoomLink,
    });

    await meeting.save();

    res.status(201).json({ success: true, message: "Meeting created", meeting });
  } catch (error) {
    next(error);
  }
};

export const getEmployerMeetings = async (req, res, next) => {
  try {
    const employerId = req.user._id;
    const meetings = await Meeting.find({ employer: employerId, isDeleted: false }).sort({ date: 1, time: 1 });
    res.json({ success: true, meetings });
  } catch (error) {
    next(error);
  }
};

export const getSingleMeeting = async (req, res, next) => {
  try {
    const meeting = await Meeting.findById(req.params.id);

    if (!meeting)
      return res.status(404).json({ success: false, message: "Meeting not found" });

    if (meeting.employer.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: "Unauthorized" });

    res.json({ success: true, meeting });
  } catch (error) {
    next(error);
  }
};

export const updateMeeting = async (req, res, next) => {
  try {
    const { id } = req.params;
    const meeting = await Meeting.findOne({ _id: id, employer: req.user._id });

    if (!meeting)
      return res.status(404).json({ success: false, message: "Meeting not found" });

    Object.assign(meeting, req.body);

    if (req.body.date || req.body.time) {
      meeting.status = "rescheduled";
    }

    await meeting.save();
    res.json({ success: true, message: "Meeting updated", meeting });
  } catch (error) {
    next(error);
  }
};

export const deleteMeeting = async (req, res, next) => {
  try {
    const { id } = req.params;
    const meeting = await Meeting.findOne({ _id: id, employer: req.user._id });

    if (!meeting)
      return res.status(404).json({ success: false, message: "Meeting not found" });

    meeting.isDeleted = true;
    await meeting.save();

    res.json({ success: true, message: "Meeting deleted" });
  } catch (error) {
    next(error);
  }
};
