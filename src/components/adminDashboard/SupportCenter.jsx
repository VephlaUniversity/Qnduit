import React, { useState, useRef, useEffect, useMemo } from "react";
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
import {
  getTickets,
  updateTicketStatus,
  deleteTicket,
  subscribeTickets,
} from "../utils/supportTickets";

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

  const item = (Icon, label, status, danger) => (
    <button
      onClick={() => {
        onSetStatus(status);
        setOpen(false);
      }}
      className={`w-full text-left px-4 py-2.5 flex items-center gap-2.5 hover:bg-white/10 transition-colors ${
        danger ? "text-red-500" : "text-gray-200"
      }`}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
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
          {item(PlayCircle, "Mark as In Progress", "In Progress")}
          {item(CheckCircle2, "Mark as Resolved", "Resolved")}
          {item(XCircle, "Mark as Closed", "Closed")}
          {item(Trash2, "Delete", "__delete", true)}
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

const TicketModal = ({ ticket, onClose, onSendResponse }) => (
  <Modal open={!!ticket} onClose={onClose}>
    {ticket && (
      <div className="p-8">
        <div className="flex items-start justify-between gap-4 mb-8">
          <h2 className="text-2xl font-semibold text-white">
            {ticket.fullSubject || ticket.subject}
          </h2>
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={() => onSendResponse(ticket)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors whitespace-nowrap"
            >
              <Send className="w-4 h-4" />
              Send Response
            </button>
          </div>
        </div>

        <h3 className="text-white font-semibold mb-3">Message</h3>
        <p className="text-gray-400 whitespace-pre-line leading-relaxed mb-8">
          {ticket.message}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <InfoField
            icon={User}
            label="Sender's Name"
            value={
              ticket.userType
                ? `${ticket.name} (${ticket.userType})`
                : ticket.name
            }
          />
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

export const SupportCenter = () => {
  const [tickets, setTickets] = useState(getTickets);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Requests");
  const [pageSize, setPageSize] = useState(8);
  const [page, setPage] = useState(1);
  const [activeTicketId, setActiveTicketId] = useState(null);

  // New tickets submitted from the talent/employer dashboards land here.
  useEffect(() => subscribeTickets(() => setTickets(getTickets())), []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets.filter((t) => {
      const matchesQuery =
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q);
      const matchesStatus =
        statusFilter === "All Requests" || t.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [tickets, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  // Clamp so deleting the last ticket on the final page (or narrowing a
  // filter) never strands you on an empty page while earlier pages have rows.
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );
  const activeTicket = tickets.find((t) => t.id === activeTicketId) || null;

  const updateStatus = (id, status) => {
    if (status === "__delete") {
      deleteTicket(id);
      toast.success("Ticket deleted");
      return;
    }
    updateTicketStatus(id, status);
    toast.success(`Ticket marked as ${status}`);
  };

  const sendResponse = (ticket) => {
    updateTicketStatus(ticket.id, "Resolved");
    toast.success(`Response sent to ${ticket.email}`);
    setActiveTicketId(null);
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
            <span className="text-gray-500">({filtered.length})</span>
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
              {pageRows.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="py-8 text-center text-gray-500 text-sm"
                  >
                    No tickets match your filters.
                  </td>
                </tr>
              )}
              {pageRows.map((ticket) => (
                <tr key={ticket.id} className="text-sm">
                  <td className="py-4 pr-4 whitespace-nowrap">
                    <div className="text-white font-medium">{ticket.name}</div>
                    {ticket.userType && (
                      <div className="text-gray-500 text-xs capitalize">
                        {ticket.userType}
                      </div>
                    )}
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
                        onSetStatus={(status) =>
                          updateStatus(ticket.id, status)
                        }
                      />
                      <button
                        onClick={() => setActiveTicketId(ticket.id)}
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

        <PaginationBar
          page={safePage}
          totalPages={totalPages}
          onChange={setPage}
        />
      </div>

      <TicketModal
        ticket={activeTicket}
        onClose={() => setActiveTicketId(null)}
        onSendResponse={sendResponse}
      />
    </div>
  );
};

export default SupportCenter;
