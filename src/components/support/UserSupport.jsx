import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Send, CheckCircle2, ChevronDown, Inbox } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { TICKET_CATEGORIES } from "../utils/supportTickets";
import axios from "axios";
import ButtonSpinner from "../utils/ButtonSpinner";
import { API_BASE_URL } from "../utils/api";
import { browserSessions } from "../utils/requestSafety";
import SupportReplyComposer from "./SupportReplyComposer";
import SupportConversation from "./SupportConversation";
import { createSupportSession } from "../utils/supportSession";

const STATUS_STYLE = {
  Open: "bg-yellow-500/15 text-yellow-500",
  "In Progress": "bg-blue-500/15 text-blue-400",
  Resolved: "bg-emerald-500/15 text-emerald-500",
  Closed: "bg-red-500/15 text-red-500",
};

const MIN_MESSAGE_LENGTH = 10;

const formatTicketDate = (date) =>
  date
    ? new Date(date).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "-";

export const UserSupport = () => {
  const { user } = useAuth();

  const [category, setCategory] = useState(TICKET_CATEGORIES[0]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [ticketOwner, setTicketOwner] = useState("");
  const [pending, setPending] = useState(false);
  const actor = user && `${user.userType}:${user.id || user._id}`;
  const token = browserSessions().find(owner => owner.actor === actor)?.token;
  const session = useMemo(() => createSupportSession({ client: axios, baseUrl: API_BASE_URL,
    readOwner: () => browserSessions().find(owner => owner.actor === actor && owner.token === token),
  }), [actor, token]);
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requestError, setRequestError] = useState("");

  const [paging, setPaging] = useState({ actor: "", page: 1 });
  const page = paging.actor === actor ? paging.page : 1;
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const requestVersion = useRef(0);
  const email = user?.email || "";

  const refresh = useCallback(async () => {
    const version = ++requestVersion.current;
    setLoading(true);
    setRequestError("");

    try {
      const response = await session.request("GET", `/tickets/mine?page=${page}&limit=10`);
      if (version !== requestVersion.current) return;
      const totalPages = Math.max(1, response.pagination?.totalPages || 1);
      setPagination({ total: response.pagination?.total || 0, totalPages });
      if (page > totalPages) { setPaging({ actor, page: totalPages }); return; }
      setTicketOwner(actor);
      setTickets(
        (response.data || []).map((ticket) => ({
          ...ticket,
          subject: ticket.category,
          fullSubject:
            ticket.fullSubject || `${ticket.category} - ${ticket.title}`,
          date: formatTicketDate(ticket.createdAt),
        })),
      );
    } catch (error) {
      if (axios.isCancel(error) || version !== requestVersion.current) return;
      setRequestError(
        error.response?.data?.message || "Unable to load your support tickets.",
      );
    } finally {
      if (session.isCurrent() && version === requestVersion.current) setLoading(false);
    }
  }, [session, actor, page]);

  useEffect(() => {
    setTickets([]); setTicketOwner(""); setExpandedId(null); setTitle(""); setMessage(""); setPending(false); setErrors({}); setSubmitted(false);
    setPagination({ total: 0, totalPages: 1 });
    return () => session.cancel();
  }, [actor, session]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!submitted) return;
    const timer = setTimeout(() => setSubmitted(false), 5000);
    return () => clearTimeout(timer);
  }, [submitted]);

  const validate = () => {
    const next = {};
    if (!title.trim()) next.title = "Please add a short subject";
    if (!message.trim()) {
      next.message = "Please describe your issue";
    } else if (message.trim().length < MIN_MESSAGE_LENGTH) {
      next.message = `Please give us a bit more detail (at least ${MIN_MESSAGE_LENGTH} characters)`;
    }
    if (message.trim().length > 10000)
      next.message = "Message cannot exceed 10,000 characters.";
    if (!email)
      next.form = "We couldn't find your account email. Please sign in again.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (pending || !validate()) return;
    setPending(true);

    setRequestError("");

    try {
      await session.request("POST", "/tickets", { category, title, message });

      setTitle("");
      setMessage("");
      setCategory(TICKET_CATEGORIES[0]);
      setErrors({});
      setSubmitted(true);

      if (page === 1) await refresh();
      else { setExpandedId(null); setPaging({ actor, page: 1 }); }
    } catch (error) {
      if (axios.isCancel(error)) return;
      setRequestError(
        error.response?.data?.message ||
          "Unable to submit your support ticket.",
      );
    } finally { if (session.isCurrent()) setPending(false); }
  };

  const sendReply = async (body, ticketId) => {
    if (pending) throw Error("A Support request is already pending.");
    setPending(true); setRequestError("");
    try {
      await session.request("POST", `/tickets/${ticketId}/replies`, body);
      await refresh();
    } catch (error) {
      if (!axios.isCancel(error)) setRequestError(error.response?.data?.message || "Reply not confirmed. Refresh, then retry the same reply safely.");
      throw error;
    } finally { if (session.isCurrent()) setPending(false); }
  };

  const visibleTickets = ticketOwner === actor ? tickets : [];

  const inputBase =
    "w-full bg-[#0E0E10] border rounded-lg px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500 transition-colors";

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-1 h-8 bg-blue-600 rounded-full"></div>
        <h1 className="text-2xl md:text-3xl font-semibold text-white">
          Support
        </h1>
      </div>
      <p className="text-gray-400 text-sm mb-6 ml-4">
        Having trouble? Send us a ticket and track it here.
      </p>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Submit */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="xl:col-span-2 bg-[#1A1A1E] rounded-lg border border-white/5 p-6 h-fit"
        >
          <h2 className="text-lg font-semibold text-white mb-5">
            Submit a ticket
          </h2>

          {submitted && (
            <div className="flex items-start gap-2 mb-5 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
              <p className="text-emerald-400 text-sm">
                Ticket submitted. Our team will take a look and you can follow
                its status below.
              </p>
            </div>
          )}

          {errors.form && (
            <p className="text-red-500 text-sm mb-4">{errors.form}</p>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Category
              </label>
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={`${inputBase} border-white/10 appearance-none pr-10`}
                >
                  {TICKET_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-gray-500 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Subject
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (errors.title) setErrors({ ...errors, title: "" });
                }}
                maxLength={80}
                placeholder="e.g. Premium not activated after payment"
                className={`${inputBase} ${errors.title ? "border-red-500" : "border-white/10"}`}
              />
              {errors.title && (
                <p className="text-red-500 text-xs mt-1">{errors.title}</p>
              )}
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Message
              </label>
              <textarea
                maxLength={10000}
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  if (errors.message) setErrors({ ...errors, message: "" });
                }}
                rows={6}
                placeholder="Tell us what happened and what you were trying to do"
                className={`${inputBase} resize-y ${errors.message ? "border-red-500" : "border-white/10"}`}
              />
              {errors.message && (
                <p className="text-red-500 text-xs mt-1">{errors.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={pending}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-3 font-medium text-sm transition-colors"
            >
              {pending ? <><ButtonSpinner />Submitting…</> : <><Send className="w-4 h-4" />Submit Ticket</>}
            </button>
          </div>
        </form>

        {/* My tickets */}
        <div className="xl:col-span-3 bg-[#1A1A1E] rounded-lg border border-white/5 p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-white">My tickets <span className="text-gray-500">({ticketOwner === actor ? pagination.total : 0})</span></h2>
            <button type="button" onClick={() => refresh()} disabled={loading || pending} className="min-h-11 rounded-lg border border-white/10 px-4 py-2 text-sm text-blue-400 hover:bg-white/5 disabled:opacity-50">Refresh tickets</button>
          </div>

          {requestError && (
            <div role="alert" className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
              {requestError}
            </div>
          )}

          {loading && !visibleTickets.length ? (
            <p className="py-10 text-center text-gray-400 text-sm">
              Loading support tickets...
            </p>
          ) : visibleTickets.length === 0 ? (
            <div className="flex flex-col items-center text-center py-12 gap-3">
              <div className="w-12 h-12 rounded-full bg-[#2A2A2E] flex items-center justify-center">
                <Inbox className="w-5 h-5 text-gray-500" />
              </div>
              <p className="text-gray-400 text-sm">
                You haven't submitted any tickets yet.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {visibleTickets.map((ticket) => {
                const open = expandedId === ticket.id;
                return (
                  <div
                    key={ticket.id}
                    className="rounded-lg border border-white/5 bg-[#0E0E10]"
                  >
                    <button
                      onClick={() => { setExpandedId(open ? null : ticket.id); }}
                      className="w-full flex items-center justify-between gap-4 p-4 text-left"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <img src="/images/header-logo.svg" alt="" aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 object-contain" />
                        <div className="min-w-0">
                          <div className="text-white font-medium truncate">
                            {ticket.fullSubject || ticket.subject}
                          </div>
                          <div className="text-gray-500 text-xs mt-0.5">
                            {ticket.subject} · {ticket.date}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_STYLE[ticket.status] || ""}`}
                        >
                          {ticket.status}
                        </span>
                        <ChevronDown
                          className={`w-4 h-4 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`}
                        />
                      </div>
                    </button>
                    {open && (
                      <div className="px-4 pb-4 pt-0">
                        <div className="border-t border-white/5 pt-4">
                          <SupportConversation ticket={ticket} />

                          <SupportReplyComposer key={`${actor}:${token}:${ticket.id}`} ticketId={ticket.id} disabled={pending} onSend={body => sendReply(body, ticket.id)} />

                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {pagination.totalPages > 1 && ticketOwner === actor && <nav aria-label="Ticket pagination" className="mt-5 flex flex-wrap items-center justify-center gap-3 text-sm">
            <button type="button" disabled={loading || pending || page <= 1} onClick={() => { setExpandedId(null); setPaging({ actor, page: page - 1 }); }} className="min-h-11 rounded-lg border border-white/10 px-3 py-2 text-blue-400 disabled:opacity-40">Previous tickets</button>
            <span className="text-gray-400">Page {page} of {pagination.totalPages}</span>
            <button type="button" disabled={loading || pending || page >= pagination.totalPages} onClick={() => { setExpandedId(null); setPaging({ actor, page: page + 1 }); }} className="min-h-11 rounded-lg border border-white/10 px-3 py-2 text-blue-400 disabled:opacity-40">Next tickets</button>
          </nav>}
        </div>
      </div>
    </div>
  );
};

export default UserSupport;
