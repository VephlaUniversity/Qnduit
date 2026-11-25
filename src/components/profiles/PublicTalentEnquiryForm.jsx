
import { useState } from "react";
import axios from "axios";
import { CheckCircle2, Loader2, Send, AlertCircle } from "lucide-react";
import { API_BASE_URL } from "../utils/api";

const inputClass =
  "min-h-11 w-full rounded-lg border border-white/10 bg-[#0E0E10] px-4 py-3 text-sm text-white placeholder-gray-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500";

export default function PublicTalentEnquiryForm({
  username,
  sectionClass,
  headingClass,
  textClass,
  surface,
}) {
  const [form, setForm] = useState({
    senderName: "",
    senderEmail: "",
    message: "",
    website: "",
  });

  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const updateField = (field, value) => {
    setForm(previous => ({
      ...previous,
      [field]: value,
    }));

    setSuccess("");
    setError("");
  };

  const submitEnquiry = async event => {
    event.preventDefault();

    if (sending) return;

    setSending(true);
    setError("");
    setSuccess("");

    try {
      const { data } = await axios.post(
        `${API_BASE_URL}/api/talents/public/${encodeURIComponent(username)}/enquiries`,
        {
          senderName: form.senderName,
          senderEmail: form.senderEmail,
          message: form.message,
          website: form.website,
        },
        {
          timeout: 15000,
          withCredentials: false,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (
        data?.success !== true
      ) {
        throw new Error(
          "Your enquiry could not be confirmed."
        );
      }

      setForm({
        senderName: "",
        senderEmail: "",
        message: "",
        website: "",
      });

      setSuccess(
        "Your enquiry has been submitted successfully. Thank you for reaching out."
      );
    } catch (err) {
      const status = err.response?.status;

      setError(
        status === 429
          ? "Too many enquiries have been submitted. Please try again later."
          : err.response?.data?.message ||
            "We couldn't submit your enquiry. Please try again."
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <section
      id="portfolio-contact-form"
      data-portfolio-surface={surface}
      aria-labelledby="portfolio-contact-heading"
      className={`${sectionClass} mt-8 scroll-mt-8`}
    >
      <h2
        id="portfolio-contact-heading"
        className={headingClass}
      >
        Get in Touch
      </h2>

      <p className={`${textClass} mt-2`}>
        Have an opportunity, project or collaboration in mind?
        Send an enquiry using the form below.
      </p>

      {success && (
        <div
          role="status"
          aria-live="polite"
          className="mt-5 flex items-start gap-3 rounded-lg border border-green-500/20 bg-green-500/5 p-4 text-sm text-green-300"
        >
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mt-5 flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300"
        >
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form
        onSubmit={submitEnquiry}
        className="mt-6 max-w-2xl space-y-5"
      >
        {/* Honeypot field for automated spam submissions. */}
        <div
          className="absolute -left-[10000px] h-px w-px overflow-hidden"
          aria-hidden="true"
        >
          <label htmlFor="portfolio-enquiry-website">
            Website
          </label>

          <input
            id="portfolio-enquiry-website"
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={form.website}
            onChange={event =>
              updateField("website", event.target.value)
            }
          />
        </div>

        <div>
          <label
            htmlFor="portfolio-enquiry-name"
            className="mb-2 block text-sm font-medium text-gray-300"
          >
            Your Name
          </label>

          <input
            id="portfolio-enquiry-name"
            type="text"
            autoComplete="name"
            required
            minLength={1}
            maxLength={100}
            value={form.senderName}
            onChange={event =>
              updateField("senderName", event.target.value)
            }
            placeholder="Enter your name"
            className={inputClass}
          />
        </div>

        <div>
          <label
            htmlFor="portfolio-enquiry-email"
            className="mb-2 block text-sm font-medium text-gray-300"
          >
            Email Address
          </label>

          <input
            id="portfolio-enquiry-email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            value={form.senderEmail}
            onChange={event =>
              updateField("senderEmail", event.target.value)
            }
            placeholder="you@example.com"
            className={inputClass}
          />
        </div>

        <div>
          <label
            htmlFor="portfolio-enquiry-message"
            className="mb-2 block text-sm font-medium text-gray-300"
          >
            Your Enquiry
          </label>

          <textarea
            id="portfolio-enquiry-message"
            required
            minLength={10}
            maxLength={3000}
            rows={6}
            value={form.message}
            onChange={event =>
              updateField("message", event.target.value)
            }
            placeholder="Tell me about your opportunity or enquiry..."
            className={`${inputClass} resize-y`}
          />

          <p className="mt-2 text-right text-xs text-gray-500">
            {form.message.length}/3000 characters
          </p>
        </div>

        <button
          type="submit"
          disabled={sending}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Send Enquiry
            </>
          )}
        </button>
      </form>
    </section>
  );
}
