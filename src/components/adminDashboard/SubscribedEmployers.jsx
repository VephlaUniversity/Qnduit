import React, { useMemo, useState, useRef, useEffect } from "react";
import {
  MoreVertical,
  Building2,
  XCircle,
  ArrowDownCircle,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { ListToolbar } from "./ListToolbar";
import { PaginationBar } from "./PaginationBar";
import { SubscriptionDetailModal } from "./SubscriptionDetailModal";

const employers = [
  {
    name: "PerimeterX",
    email: "perimeterx@gmail.com",
    plan: "Basic",
    date: "15 Apr 2025",
    status: "Active",
    startDate: "March 15, 2025",
    endDate: "April 15, 2025",
    paymentMethod: "Card",
    category: "Cybersecurity",
    lastPayment: "March 15, 2025",
    amount: "$20/Month",
    extraLabel: "Organization Type",
    extraValue: "Private Company",
  },
  {
    name: "Cybrary",
    email: "cybrary@gmail.com",
    plan: "Standard",
    date: "10 Mar 2025",
    status: "Expired",
    startDate: "March 30, 2025",
    endDate: "April 30, 2025",
    paymentMethod: "Card",
    category: "Cybersecurity",
    lastPayment: "March 30, 2025",
    amount: "$50/Month",
    extraLabel: "Organization Type",
    extraValue: "Private Company",
    detailStatus: "Active",
  },
  {
    name: "Azure",
    email: "azure@gmail.com",
    plan: "Premium",
    date: "6 Feb 2025",
    status: "Active",
    startDate: "February 6, 2025",
    endDate: "March 6, 2025",
    paymentMethod: "Card",
    category: "Cloud",
    lastPayment: "February 6, 2025",
    amount: "$100/Month",
    extraLabel: "Organization Type",
    extraValue: "Public Company",
  },
  ...Array.from({ length: 8 }).map((_, i) => ({
    name: "Skale",
    email: "skale@gmail.com",
    plan: "Standard",
    date: "20 Jan 2025",
    status: i % 3 === 2 ? "Active" : i % 2 === 0 ? "Active" : "Expired",
    startDate: "January 20, 2025",
    endDate: "February 20, 2025",
    paymentMethod: "Card",
    category: "Cloud",
    lastPayment: "January 20, 2025",
    amount: "$50/Month",
    extraLabel: "Organization Type",
    extraValue: "Private Company",
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

const PAGE_SIZE = 5;

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
        <div className="absolute right-0 mt-1 w-48 bg-[#2A2A2E] border border-white/10 rounded-lg shadow-xl overflow-hidden z-20 text-[10px]">
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

export const SubscribedEmployers = () => {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [active, setActive] = useState(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = employers.filter(
      (e) =>
        !q ||
        e.name.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        e.plan.toLowerCase().includes(q),
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

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  return (
    <div className="min-h-screen bg-[#0E0E10] p-4 md:p-6 lg:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-8 bg-blue-600 rounded-full"></div>
        <h1 className="text-2xl md:text-3xl font-semibold text-white">
          Subscribed Employers
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
                  <td
                    colSpan={6}
                    className="py-10 text-center text-gray-500 text-sm"
                  >
                    No subscribed employers match "{search}"
                  </td>
                </tr>
              )}
              {paginated.map((row, i) => (
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
                        onClick={() =>
                          setActive({
                            ...row,
                            status: row.detailStatus || row.status,
                          })
                        }
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

        <PaginationBar
          page={currentPage}
          totalPages={totalPages}
          onChange={setPage}
        />
      </div>

      <SubscriptionDetailModal
        subject={active}
        avatarIcon={Building2}
        onClose={() => setActive(null)}
      />
    </div>
  );
};

export default SubscribedEmployers;
