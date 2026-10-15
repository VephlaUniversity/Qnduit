import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Search,
  ChevronDown,
  MoreVertical,
  ArrowRight,
  User,
  Mail,
  Calendar,
  CircleDot,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { PaginationBar } from "./PaginationBar";
import { Modal } from "./Modal";
import axios from "axios";
import { API_BASE_URL } from "../utils/api";

const statusStyle = {
  Open: "text-yellow-500",
  "In Progress": "text-blue-500",
  Resolved: "text-emerald-500",
  Closed: "text-red-500",
};

const statusFilters = ["All Requests", "Open", "In Progress", "Resolved", "Closed"];
const pageSizeOptions = [8, 15, 25, 50];

const getHeaders = () => {
  const token = localStorage.getItem("adminToken");

  return {
    Authorization: `Bearer ${token}`,
  };
};

const RowActions = ({ onSetStatus }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const item = (label, status, Icon, danger) => (
    <button
      onClick={() => {
        onSetStatus(status);
        setOpen(false);
      }}
      className={`w-full text-left px-4 py-2.5 flex items-center gap-2 hover:bg-white/10 transition-colors ${
        danger ? "text-red-500" : "text-gray-200"
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-gray-400 hover:text-white transition-colors p-1"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-48 bg-[#2A2A2E] border border-white/10 rounded-lg shadow-xl overflow-hidden z-20 text-sm">
          {item("Mark as In Progress", "In Progress", Clock)}
          {item("Mark as Resolved", "Resolved", CheckCircle2)}
          {item("Mark as Closed", "Closed", XCircle)}
          {item("Delete", "__delete", Trash2, true)}
        </div>
      )}
    </div>
  );
};

const InfoField = (props) => {
  const Icon = props.icon;
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
      <div>
        <div className="text-xs uppercase tracking-wide text-gray-500">
          {props.label}
        </div>
        <div className="text-white font-medium">{props.value}</div>
      </div>
    </div>
  );
};

const TicketModal = ({ ticket, onClose, onSetStatus, onReply, }) => {
  const [replying, setReplying] = useState(false);
  const [response, setResponse] = useState("");

  useEffect(() => {
    setReplying(false);
    setResponse("");
  }, [ticket]);

  const sendResponse = async () => {
    if (!response.trim()) {
      toast.error("Write a response before sending");
      return;
    }

    try {
      await onReply(ticket.id, response.trim());

      setReplying(false);
      setResponse("");
    } catch {
      // The parent handles and displays the API error.
    }
  };

  return (
    <Modal open={!!ticket} onClose={onClose}>
      {ticket && (
        <div className="p-8">
          <div className="flex items-start justify-between gap-4 mb-8">
            <h2 className="text-2xl font-semibold text-white">
              {ticket.fullSubject || ticket.subject}
            </h2>
            <div className="flex items-center gap-3 flex-shrink-0">
              <RowActions onSetStatus={onSetStatus} />
              <button
                onClick={() => setReplying((r) => !r)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors whitespace-nowrap"
              >
                <Send className="w-4 h-4" />
                Send Response
              </button>
            </div>
          </div>

          <h3 className="text-white font-semibold mb-3">Message</h3>
          <p className="text-gray-400 whitespace-pre-line leading-relaxed mb-6">
            {ticket.message}
          </p>

          {replying && (
            <div className="mb-8 bg-[#0E0E10] border border-white/10 rounded-lg p-4">
              <textarea
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                rows={4}
                placeholder={`Reply to ${ticket.name}...`}
                className="w-full bg-transparent text-sm text-gray-200 placeholder-gray-500 outline-none resize-none"
              />
              <div className="flex justify-end gap-2 mt-3">
                <button
                  onClick={() => setReplying(false)}
                  className="px-4 py-2 rounded-lg text-gray-400 hover:text-white text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={sendResponse}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
                >
                  <Send className="w-4 h-4" />
                  Send
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <InfoField icon={User} label="Sender's Name" value={ticket.name} />
            <InfoField icon={Mail} label="Email" value={ticket.email} />
            <InfoField
              icon={Calendar}
              label="Date Submitted"
              value={ticket.date}
            />
            <InfoField icon={CircleDot} label="Status" value={ticket.status} />
          </div>
        </div>
      )}
    </Modal>
  );
};

export const SupportCenter = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTickets, setTotalTickets] = useState(0);
  const [requestError, setRequestError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Requests");
  const [pageSize, setPageSize] = useState(8);
  const [page, setPage] = useState(1);
  const [activeTicket, setActiveTicket] = useState(null);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [pageSizeMenuOpen, setPageSizeMenuOpen] = useState(false);
  const statusRef = useRef(null);
  const pageSizeRef = useRef(null);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setRequestError("");

    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/support/admin/tickets`,
        {
          headers: getHeaders(),
          params: {
            q: search.trim(),
            status: statusFilter,
            page,
            limit: pageSize,
          },
        }
      );

      const data = response.data;

      setTickets(data.data || []);
      setTotalPages(Math.max(1, data.pagination?.totalPages || 1));
      setTotalTickets(data.pagination?.total || 0);

      setActiveTicket((current) => {
        if (!current) return null;

        return (data.data || []).find(
          (ticket) => ticket.id === current.id
        ) || null;
      });
    } catch (error) {
      setRequestError(
        error.response?.data?.message ||
          "Unable to load support tickets."
      );
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page, pageSize]);

  useEffect(() => {
    const timer = setTimeout(loadTickets, 300);
    return () => clearTimeout(timer);
  }, [loadTickets]);

  useEffect(() => {
    const close = (e) => {
      if (statusRef.current && !statusRef.current.contains(e.target))
        setStatusMenuOpen(false);
      if (pageSizeRef.current && !pageSizeRef.current.contains(e.target))
        setPageSizeMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const updateStatus = async (ticketId, status) => {
    try {
      if (status === "__delete") {
        await axios.delete(
          `${API_BASE_URL}/api/support/admin/tickets/${ticketId}`,
          { headers: getHeaders() }
        );

        setActiveTicket(null);
        toast.success("Ticket deleted");
      } else {
        await axios.patch(
          `${API_BASE_URL}/api/support/admin/tickets/${ticketId}/status`,
          { status },
          { headers: getHeaders() }
        );

        toast.success(`Ticket marked as ${status}`);
      }

      await loadTickets();
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Unable to update the support ticket."
      );
    }
  };

  const visible = tickets;

  return (
    <div className="min-h-screen bg-[#0E0E10] p-4 md:p-6 lg:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-8 bg-blue-600 rounded-full"></div>
        <h1 className="text-2xl md:text-3xl font-semibold text-white">
          Support Center
        </h1>
      </div>

      <div className="bg-[#1A1A1E] rounded-lg p-6 border border-white/5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <h2 className="text-lg font-semibold text-white">
             Support Tickets{" "}
            <span className="text-gray-500">({totalTickets})</span>
          </h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2 bg-[#0E0E10] border border-white/10 rounded-lg px-4 py-2.5 w-full sm:w-64 focus-within:border-white/25 transition-colors">
              <Search className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search"
                className="bg-transparent text-sm text-gray-300 placeholder-gray-500 outline-none w-full"
              />
            </div>

            <div className="relative" ref={statusRef}>
              <button
                onClick={() => setStatusMenuOpen((o) => !o)}
                className="flex items-center justify-between gap-2 bg-[#0E0E10] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-gray-300 whitespace-nowrap w-full sm:w-auto hover:border-white/25 transition-colors"
              >
                {statusFilter}
                <ChevronDown
                  className={`w-4 h-4 text-gray-500 transition-transform ${
                    statusMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              {statusMenuOpen && (
                <div className="absolute right-0 mt-1 w-44 bg-[#2A2A2E] border border-white/10 rounded-lg shadow-xl overflow-hidden z-20 text-sm">
                  {statusFilters.map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        setStatusFilter(s);
                        setStatusMenuOpen(false);
                        setPage(1);
                      }}
                      className={`w-full text-left px-4 py-2.5 transition-colors ${
                        statusFilter === s
                          ? "bg-blue-600 text-white"
                          : "text-gray-200 hover:bg-white/10"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative" ref={pageSizeRef}>
              <button
                onClick={() => setPageSizeMenuOpen((o) => !o)}
                className="flex items-center justify-between gap-2 bg-[#0E0E10] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-gray-300 whitespace-nowrap w-full sm:w-auto hover:border-white/25 transition-colors"
              >
                {pageSize} per page
                <ChevronDown
                  className={`w-4 h-4 text-gray-500 transition-transform ${
                    pageSizeMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              {pageSizeMenuOpen && (
                <div className="absolute right-0 mt-1 w-36 bg-[#2A2A2E] border border-white/10 rounded-lg shadow-xl overflow-hidden z-20 text-sm">
                  {pageSizeOptions.map((n) => (
                    <button
                      key={n}
                      onClick={() => {
                        setPageSize(n);
                        setPageSizeMenuOpen(false);
                        setPage(1);
                      }}
                      className={`w-full text-left px-4 py-2.5 transition-colors ${
                        pageSize === n
                          ? "bg-blue-600 text-white"
                          : "text-gray-200 hover:bg-white/10"
                      }`}
                    >
                      {n} per page
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[840px]">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-white/5">
                <th className="pb-3 font-medium">Name</th>
                <th className="pb-3 font-medium">Email</th>
                <th className="pb-3 font-medium">Subject</th>
                <th className="pb-3 font-medium">Date Submitted</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {visible.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-gray-500 text-sm">
                    No tickets match your filters
                  </td>
                </tr>
              )}
              {visible.map((ticket) => {
                const i = tickets.indexOf(ticket);
                return (
                  <tr key={i} className="text-sm">
                    <td className="py-4 pr-4 text-white font-medium whitespace-nowrap">
                      {ticket.name}
                    </td>
                    <td className="py-4 pr-4 text-gray-400 whitespace-nowrap">
                      {ticket.email}
                    </td>
                    <td className="py-4 pr-4 text-gray-300 whitespace-nowrap">
                      {ticket.subject}
                    </td>
                    <td className="py-4 pr-4 text-gray-400 whitespace-nowrap">
                      {ticket.date}
                    </td>
                    <td
                      className={`py-4 pr-4 font-medium whitespace-nowrap ${statusStyle[ticket.status]}`}
                    >
                      {ticket.status}
                    </td>
                    <td className="py-4">
                      <div className="flex items-center justify-end gap-2">
                        <RowActions
                          onSetStatus={(status) => updateStatus(ticket.id, status)}
                        />
                        <button
                          onClick={() => setActiveTicket(ticket)}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2A2A2E] hover:bg-blue-600 text-white text-sm font-medium transition-colors"
                        >
                          View <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <PaginationBar
          page={page}
          totalPages={totalPages}
          onChange={setPage}
        />
      </div>

      <TicketModal
        ticket={activeTicket}
        onClose={() => setActiveTicket(null)}
        onSetStatus={(status) =>
          updateStatus(activeTicket.id, status)
        }
        onReply={async (ticketId, message) => {
          try {
            await axios.post(
              `${API_BASE_URL}/api/support/admin/tickets/${ticketId}/replies`,
              { message },
              { headers: getHeaders() }
            );

            toast.success("Response saved successfully");
            await loadTickets();
          } catch (error) {
            toast.error(
              error.response?.data?.message ||
                "Unable to send response."
            );
            throw error;
          }
        }}
      />
    </div>
  );
};

export default SupportCenter;
