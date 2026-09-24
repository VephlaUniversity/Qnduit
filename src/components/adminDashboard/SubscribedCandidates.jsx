import React, { useMemo, useState, useRef, useEffect } from "react";
import { MoreVertical, XCircle, ArrowDownCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { ListToolbar } from "./ListToolbar";
import { PaginationBar } from "./PaginationBar";
import { SubscriptionDetailModal } from "./SubscriptionDetailModal";

const candidates = [
  {
    name: "John Doe",
    email: "johndoe@gmail.com",
    plan: "Basic",
    date: "12 Apr 2025",
    status: "Active",
    startDate: "April 12, 2025",
    endDate: "May 12, 2025",
    paymentMethod: "Card",
    category: "Cybersecurity",
    lastPayment: "April 12, 2025",
    amount: "$5/Month",
    extraLabel: "Job Role",
    extraValue: "Security Analyst",
  },
  {
    name: "Natasha Williams",
    email: "natash3@gmail.com",
    plan: "Standard",
    date: "13 Mar 2025",
    status: "Expired",
    startDate: "March 13, 2025",
    endDate: "April 13, 2025",
    paymentMethod: "Card",
    category: "Cybersecurity",
    lastPayment: "March 13, 2025",
    amount: "$10/Month",
    extraLabel: "Job Role",
    extraValue: "SOC Analyst",
  },
  {
    name: "Adam Scott",
    email: "adam2@gmail.com",
    plan: "Premium",
    date: "2 Feb 2025",
    status: "Active",
    startDate: "March 25, 2025",
    endDate: "April 25, 2025",
    paymentMethod: "Card",
    category: "Cloud",
    lastPayment: "March 25, 2025",
    amount: "$10/Month",
    extraLabel: "Job Role",
    extraValue: "Infrastructure Engineer",
  },
  ...Array.from({ length: 9 }).map(() => ({
    name: "Harvey Biden",
    email: "harveybide@gmail.com",
    plan: "Premium",
    date: "12 Jan 2025",
    status: "Active",
    startDate: "January 12, 2025",
    endDate: "February 12, 2025",
    paymentMethod: "Card",
    category: "Cloud",
    lastPayment: "January 12, 2025",
    amount: "$10/Month",
    extraLabel: "Job Role",
    extraValue: "Cloud Engineer",
  })),
];

const statusStyle = {
  Active: "text-emerald-500",
  Expired: "text-red-500",
};

const sortOptions = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name-asc", label: "Name (A-Z)" },
  { value: "name-desc", label: "Name (Z-A)" },
];

const RowMenu = ({ row }) => {
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
        className="text-gray-400 hover:text-white transition-colors p-1"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-48 bg-[#2A2A2E] border border-white/10 rounded-lg shadow-xl overflow-hidden z-20 text-sm">
          <button
            onClick={() => {
              toast.success(`Subscription cancelled for ${row.name}`);
              setOpen(false);
            }}
            className="w-full text-left px-4 py-2.5 text-red-500 hover:bg-white/10 transition-colors flex items-center gap-2"
          >
            <XCircle className="w-4 h-4" />
            Cancel Subscription
          </button>
          <button
            onClick={() => {
              toast.success(`${row.name} downgraded to Basic`);
              setOpen(false);
            }}
            className="w-full text-left px-4 py-2.5 text-gray-200 hover:bg-white/10 transition-colors flex items-center gap-2"
          >
            <ArrowDownCircle className="w-4 h-4" />
            Downgrade Subscription
          </button>
          <button
            onClick={() => {
              toast.success(`Invoice sent to ${row.email}`);
              setOpen(false);
            }}
            className="w-full text-left px-4 py-2.5 text-gray-200 hover:bg-white/10 transition-colors flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            Send Invoice
          </button>
        </div>
      )}
    </div>
  );
};

const avatarFor = (name) =>
  `https://i.pravatar.cc/80?u=${encodeURIComponent(name)}`;

export const SubscribedCandidates = () => {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [active, setActive] = useState(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = candidates.filter(
      (c) =>
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.plan.toLowerCase().includes(q),
    );
    rows = [...rows].sort((a, b) => {
      switch (sort) {
        case "oldest":
          return new Date(a.date) - new Date(b.date);
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "newest":
        default:
          return new Date(b.date) - new Date(a.date);
      }
    });
    return rows;
  }, [search, sort]);

  return (
    <div className="min-h-screen bg-[#0E0E10] p-4 md:p-6 lg:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-8 bg-blue-600 rounded-full"></div>
        <h1 className="text-2xl md:text-3xl font-semibold text-white">
          Subscribed Candidates
        </h1>
      </div>

      <div className="bg-[#1A1A1E] rounded-lg p-6 border border-white/5">
        <ListToolbar
          search={search}
          onSearchChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Search by name, email or plan"
          sortOptions={sortOptions}
          sortValue={sort}
          onSortChange={setSort}
        />

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-white/5">
                <th className="pb-3 font-medium">Name</th>
                <th className="pb-3 font-medium">Email</th>
                <th className="pb-3 font-medium">Plan Type</th>
                <th className="pb-3 font-medium">Start date</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-gray-500 text-sm">
                    No subscribed candidates match "{search}"
                  </td>
                </tr>
              )}
              {filtered.map((row, i) => (
                <tr key={i} className="text-sm">
                  <td className="py-4 pr-4 text-white font-medium whitespace-nowrap">
                    {row.name}
                  </td>
                  <td className="py-4 pr-4 text-blue-400 whitespace-nowrap">
                    {row.email}
                  </td>
                  <td className="py-4 pr-4 text-gray-300 whitespace-nowrap">
                    {row.plan}
                  </td>
                  <td className="py-4 pr-4 text-gray-400 whitespace-nowrap">
                    {row.date}
                  </td>
                  <td
                    className={`py-4 pr-4 font-medium whitespace-nowrap ${statusStyle[row.status]}`}
                  >
                    {row.status}
                  </td>
                  <td className="py-4">
                    <div className="flex items-center justify-end gap-2">
                      <RowMenu row={row} />
                      <button
                        onClick={() => setActive(row)}
                        className="px-4 py-2 rounded-lg bg-[#2A2A2E] hover:bg-blue-600 text-white text-xs font-medium transition-colors whitespace-nowrap"
                      >
                        View Details
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <PaginationBar page={page} totalPages={5} onChange={setPage} />
      </div>

      <SubscriptionDetailModal
        subject={active}
        avatarSrc={active ? avatarFor(active.name) : null}
        onClose={() => setActive(null)}
      />
    </div>
  );
};

export default SubscribedCandidates;
