import { sendContactEmail } from "../utils/sendEmail.js";

// Must match the options on the public Contact page.
const ROLES = {
  "job-seeker": "Job Seeker",
  employer: "Employer",
  recruiter: "Recruiter",
  partner: "Partner",
  other: "Other",
};
const SUBJECTS = {
  "general-inquiry": "General Inquiry",
  "hiring-support": "Hiring Support",
  "job-application": "Job Application",
  "technical-support": "Technical Support",
  partnership: "Partnership Opportunity",
  feedback: "Feedback",
  other: "Other",
};

// Single-line fields: strip control characters (prevents header/line injection).
const oneLine = (value, max) =>
  typeof value === "string"
    ? value
        .replace(/[\u0000-\u001f\u007f]+/g, " ")
        .trim()
        .slice(0, max)
    : "";
// Message: keep line breaks and tabs, drop other control characters.
const multiLine = (value, max) =>
  typeof value === "string"
    ? value
        .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
        .trim()
        .slice(0, max)
    : "";

// Used when CONTACT_RECEIVER_EMAIL is not set in the environment.
const DEFAULT_RECEIVER = "support@qnduit.com";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const submitContactMessage = async (req, res) => {
  const body = req.body && typeof req.body === "object" ? req.body : {};

  // Honeypot: real visitors never see or fill this field. Pretend success to bots.
  if (typeof body.website === "string" && body.website.trim()) {
    return res.json({ success: true, message: "Message sent" });
  }

  const fullName = oneLine(body.fullName, 100);
  const email = oneLine(body.email, 254);
  const message = multiLine(body.message, 5000);
  const role = Object.hasOwn(ROLES, body.contactingAs) ? body.contactingAs : "";
  const subject = Object.hasOwn(SUBJECTS, body.subject) ? body.subject : "";

  const errors = {};
  if (fullName.length < 2) errors.fullName = "Please enter your full name.";
  if (!EMAIL.test(email)) errors.email = "Please enter a valid email address.";
  if (!role) errors.contactingAs = "Please select who you are contacting as.";
  if (!subject) errors.subject = "Please select a subject.";
  if (message.length < 10)
    errors.message = "Message must be at least 10 characters.";
  if (Object.keys(errors).length) {
    return res.status(400).json({
      success: false,
      message: Object.values(errors)[0],
      errors,
    });
  }

  try {
    await sendContactEmail({
      to: process.env.CONTACT_RECEIVER_EMAIL || DEFAULT_RECEIVER,
      fullName,
      email,
      roleLabel: ROLES[role],
      subjectLabel: SUBJECTS[subject],
      message,
    });
    return res.status(200).json({ success: true, message: "Message sent" });
  } catch (error) {
    // Details are logged server-side only; never sent to the visitor.
    console.error(
      "Contact form send failed:",
      error.response?.body || error.message,
    );
    return res.status(500).json({
      success: false,
      message:
        "We couldn't send your message right now. Please try again later.",
    });
  }
};
