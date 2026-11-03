import SupportReplyComposer from "../support/SupportReplyComposer";
import SupportConversation from "../support/SupportConversation";
import { formatSupportTime } from "../utils/supportConversation";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "../ui/dropdown-menu";
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Search,
  ChevronDown,
  Check,
  MoreVertical,
  ArrowRight,
  User,
  Mail,
  Calendar,
  CircleDot,
  Send,
  PlayCircle,
  CheckCircle2,
  XCircle,
  Trash2,
} from "lucide-react";
import { PaginationBar } from "./PaginationBar";
import { Modal } from "./Modal";
import { toast } from "sonner";
import axios from "axios";
import { API_BASE_URL } from "../utils/api";

const statusStyle = {
  Open: "text-yellow-500",
  "In Progress": "text-blue-500",
  Resolved: "text-emerald-500",
  Closed: "text-red-500",
};

const STATUS_FILTERS = [
  "All Requests",
  "Open",
  "In Progress",
  "Resolved",
  "Closed",
];
const PAGE_SIZES = [8, 16, 24];

const SimpleDropdown = ({ options, value, onChange, renderLabel }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between gap-2 bg-[#0E0E10] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 whitespace-nowrap w-full sm:w-auto"
      >
        {renderLabel ? renderLabel(value) : value}
        <ChevronDown className="w-4 h-4 text-gray-500" />
      </button>
      {open && (
        <div className="absolute right-0 mt-1 min-w-full bg-[#2A2A2E] border border-white/10 rounded-lg shadow-xl overflow-hidden z-20 text-sm">
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
              className="w-full text-left px-4 py-2.5 flex items-center justify-between gap-4 text-gray-200 hover:bg-white/10 transition-colors whitespace-nowrap"
            >
              {renderLabel ? renderLabel(opt) : opt}
              {opt === value && <Check className="w-4 h-4 text-blue-500" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const getHeaders = () => {
  const token = localStorage.getItem("adminToken");

  return {
    Authorization: `Bearer ${token}`,
  };
};

// Portal content escapes the table's overflow and remains above the ticket modal.
const RowActions = ({ onSetStatus, label }) => (
  <DropdownMenu modal={false}>
    <DropdownMenuTrigger asChild>
      <button type="button" aria-label={`Actions for ${label}`} className="text-gray-400 hover:text-white transition-colors p-1">
        <MoreVertical className="w-4 h-4" />
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" sideOffset={6} avoidCollisions collisionPadding={8} sticky="always"
      onEscapeKeyDown={event => event.stopPropagation()}
      className="z-[70] w-48 max-w-[calc(100vw-1rem)] border-white/10 bg-[#2A2A2E] text-gray-200">
      <DropdownMenuItem onSelect={() => onSetStatus("In Progress")} className="cursor-pointer focus:bg-white/10 focus:text-white"><PlayCircle className="h-4 w-4" />Mark as In Progress</DropdownMenuItem>
      <DropdownMenuItem onSelect={() => onSetStatus("Resolved")} className="cursor-pointer focus:bg-white/10 focus:text-white"><CheckCircle2 className="h-4 w-4" />Mark as Resolved</DropdownMenuItem>
      <DropdownMenuItem onSelect={() => onSetStatus("Closed")} className="cursor-pointer focus:bg-white/10 focus:text-white"><XCircle className="h-4 w-4" />Mark as Closed</DropdownMenuItem>
      <DropdownMenuItem onSelect={() => onSetStatus("__delete")} className="cursor-pointer text-red-500 focus:bg-white/10 focus:text-red-500"><Trash2 className="h-4 w-4" />Delete</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);

const InfoField = (props) => {
  const Icon = props.icon;
  return (
    <div className="flex min-w-0 items-start gap-3">
      <Icon className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
      <div className="min-w-0">
        <div className="text-xs uppercase tracking-wide text-gray-500">
          {props.label}
        </div>
        <div className="text-white font-medium [overflow-wrap:anywhere]">{props.value}</div>
      </div>
    </div>
  );
};

const TicketModal = ({ ticket, onClose, onSetStatus, onReply, onRefresh, refreshing }) => {
  const [replying, setReplying] = useState(false);


  useEffect(() => {
    setReplying(false);
  }, [ticket?.id]);


  return (
    <Modal open={!!ticket} onClose={onClose}>
      {ticket && (
        <div className="p-4 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-8">
            <h2 className="min-w-0 break-words text-2xl font-semibold text-white [overflow-wrap:anywhere]">
              {ticket.fullSubject || ticket.subject}
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={onRefresh} disabled={refreshing} className="min-h-11 rounded-lg border border-white/10 px-3 py-2 text-sm text-blue-400 disabled:opacity-50">Refresh conversation</button>
              <RowActions label={ticket.title || ticket.subject} onSetStatus={onSetStatus} />
              <button
                onClick={() => setReplying((r) => !r)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors whitespace-nowrap"
              >
                <Send className="w-4 h-4" />
                Send Response
              </button>
            </div>
          </div>

          <div className="mb-6"><SupportConversation ticket={ticket} viewer="admin" /></div>

          {replying && (
            <div className="mb-8 bg-[#0E0E10] border border-white/10 rounded-lg p-4">
              <SupportReplyComposer key={ticket.id} ticketId={ticket.id} viewer="admin" label="Admin reply" onSend={async body => { await onReply(ticket.id, body); setReplying(false); }} />
              <button type="button" onClick={() => setReplying(false)} className="mt-3 min-h-11 text-sm text-gray-400 hover:text-white">Cancel</button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <InfoField icon={User} label="Sender's Name" value={ticket.name} />
            <InfoField icon={Mail} label="Email" value={ticket.email} />
            <InfoField
              icon={Calendar}
              label="Date Submitted"
              value={formatSupportTime(ticket.createdAt)}
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
  const loadVersion = useRef(0);

  const loadTickets = useCallback(async () => {
    const version = ++loadVersion.current;
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
        },
      );

      if (version !== loadVersion.current) return;
      const data = response.data;

      setTickets(data.data || []);
      setTotalPages(Math.max(1, data.pagination?.totalPages || 1));
      setTotalTickets(data.pagination?.total || 0);

      setActiveTicket((current) => {
        if (!current) return null;

        return (
          (data.data || []).find((ticket) => ticket.id === current.id) || null
        );
      });
    } catch (error) {
      if (version !== loadVersion.current) return;
      setRequestError(
        error.response?.data?.message || "Unable to load support tickets.",
      );
    } finally {
      if (version === loadVersion.current) setLoading(false);
    }
  }, [search, statusFilter, page, pageSize]);

  const invalidateLoads = useCallback(() => { loadVersion.current++; }, []);
  useEffect(() => {
    const timer = setTimeout(loadTickets, 300);
    return () => { clearTimeout(timer); invalidateLoads(); };
  }, [loadTickets, invalidateLoads]);

  const updateStatus = async (ticketId, status) => {
    try {
      if (status === "__delete") {
        await axios.delete(
          `${API_BASE_URL}/api/support/admin/tickets/${ticketId}`,
          { headers: getHeaders() },
        );

        setActiveTicket(null);
        toast.success("Ticket deleted");
      } else {
        await axios.patch(
          `${API_BASE_URL}/api/support/admin/tickets/${ticketId}/status`,
          { status },
          { headers: getHeaders() },
        );

        toast.success(`Ticket marked as ${status}`);
      }

      await loadTickets();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Unable to update the support ticket.",
      );
    }
  };

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
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
            <button type="button" onClick={() => loadTickets()} disabled={loading} className="min-h-11 rounded-lg border border-white/10 px-4 py-2 text-sm text-blue-400 disabled:opacity-50">Refresh tickets</button>
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
            <SimpleDropdown
              options={STATUS_FILTERS}
              value={statusFilter}
              onChange={(v) => {
                setStatusFilter(v);
                setPage(1);
              }}
            />
            <SimpleDropdown
              options={PAGE_SIZES}
              value={pageSize}
              onChange={(v) => {
                setPageSize(v);
                setPage(1);
              }}
              renderLabel={(v) => `${v} per page`}
            />
          </div>
        </div>

        {requestError && <p role="alert" className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">{requestError}</p>}
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
              {tickets.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="py-8 text-center text-gray-500 text-sm"
                  >
                    {loading
                      ? "Loading tickets..."
                      : requestError || "No tickets match your filters."}
                  </td>
                </tr>
              )}
              {tickets.map((ticket) => (
                <tr key={ticket.id} className="text-sm">
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
                        label={ticket.title || ticket.subject}
                        onSetStatus={(status) =>
                          updateStatus(ticket.id, status)
                        }
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
              ))}
            </tbody>
          </table>
        </div>

        <PaginationBar page={page} totalPages={totalPages} onChange={setPage} />
      </div>

      <TicketModal
        ticket={activeTicket}
        onRefresh={() => loadTickets()}
        refreshing={loading}
        onClose={() => setActiveTicket(null)}
        onSetStatus={(status) => updateStatus(activeTicket.id, status)}
        onReply={async (ticketId, body) => {
          try {
            await axios.post(
              `${API_BASE_URL}/api/support/admin/tickets/${ticketId}/replies`,
              body,
              { headers: getHeaders() },
            );

            toast.success("Response saved successfully");
            await loadTickets();
          } catch (error) {
            toast.error(
              error.response?.data?.message || "Unable to send response.",
            );
            throw error;
          }
        }}
      />
    </div>
  );
};

export default SupportCenter;
