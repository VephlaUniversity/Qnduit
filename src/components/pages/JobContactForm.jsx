import { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { API_BASE_URL } from "../utils/api";
import { friendlyError } from "../utils/userMessage";

const fieldClass =
  "w-full bg-[#262C36] border border-[#2A3142] rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-blue-600";
const EMPTY = { subject: "", message: "" };

const readToken = () => {
  try {
    return localStorage.getItem("token");
  } catch {
    return null;
  }
};

// "Contact Us" box on a job page: signed-in users email whoever posted the job.
export const JobContactForm = ({ jobId }) => {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const token = readToken();

  const update = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (error) setError("");
  };

  const validate = () => {
    if (form.subject.trim().length < 2) return "Please enter a subject.";
    if (form.message.trim().length < 10)
      return "Message must be at least 10 characters.";
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (sending) return;
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }

    setSending(true);
    try {
      await axios.post(`${API_BASE_URL}/api/jobs/${jobId}/contact`, form, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(
        "Message sent. The employer will reply to your account email.",
      );
      setForm(EMPTY);
    } catch (err) {
      setError(
        friendlyError(err, "We couldn't send your message. Please try again."),
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-[#191D23] rounded-xl p-6">
      <h3 className="text-white font-semibold mb-4">Contact Us</h3>
      {!token ? (
        <div className="space-y-4">
          <p className="text-muted-foreground text-sm">
            Sign in to send a message to the employer who posted this job.
          </p>
          <Link
            to="/signin"
            className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-sm py-2 transition-colors"
          >
            Sign in to contact
          </Link>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <p className="text-muted-foreground text-xs">
            The employer will reply to the email on your account.
          </p>
          <input
            type="text"
            placeholder="Subject"
            value={form.subject}
            onChange={update("subject")}
            maxLength={150}
            className={fieldClass}
          />
          <textarea
            placeholder="Message"
            rows={4}
            value={form.message}
            onChange={update("message")}
            maxLength={5000}
            className={`${fieldClass} resize-none`}
          />
          {error && (
            <p role="alert" className="text-red-400 text-sm">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={sending}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-sm py-2 transition-colors cursor-pointer disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {sending && <Loader2 className="w-4 h-4 animate-spin" />}
            {sending ? "Sending..." : "Send Message"}
          </button>
        </form>
      )}
    </div>
  );
};
