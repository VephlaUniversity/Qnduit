import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Briefcase,
  ScanSearch,
  Gift,
  MoreVertical,
  XCircle,
  ArrowDownCircle,
  Send,
  Building2,
} from "lucide-react";
import { toast } from "sonner";
import { SubscriptionDetailModal } from "./SubscriptionDetailModal";

const stats = [
  {
    icon: Briefcase,
    label: "In Revenue",
    value: "$58000",
    color: "bg-blue-600",
  },
  {
    icon: ScanSearch,
    label: "Job Seekers Subscribed",
    value: "2068",
    color: "bg-red-600",
  },
  {
    icon: Gift,
    label: "Employers Subscribed",
    value: "21",
    color: "bg-emerald-600",
  },
];

const candidateSubs = [
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
  {
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
  },
];

const employerSubs = [
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
  {
    name: "Skale",
    email: "skale@gmail.com",
    plan: "Standard",
    date: "20 Jan 2025",
    status: "Active",
    startDate: "January 20, 2025",
    endDate: "February 20, 2025",
    paymentMethod: "Card",
    category: "Cloud",
    lastPayment: "January 20, 2025",
    amount: "$50/Month",
    extraLabel: "Organization Type",
    extraValue: "Private Company",
  },
];

const statusStyle = {
  Active: "text-emerald-500",
  Expired: "text-red-500",
};

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

const SubscriptionTable = ({ title, rows, onViewAll, onViewDetails }) => (
  <div className="mb-8">
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <button
        onClick={onViewAll}
        className="text-sm text-blue-500 hover:text-blue-400 flex items-center gap-1"
      >
        View all <span aria-hidden>→</span>
      </button>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px]">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-y border-white/5">
            <th className="py-3 font-medium">Name</th>
            <th className="py-3 font-medium">Email</th>
            <th className="py-3 font-medium">Plan Type</th>
            <th className="py-3 font-medium">Start date</th>
            <th className="py-3 font-medium">Status</th>
            <th className="py-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {rows.map((row) => (
            <tr key={row.email} className="text-sm">
              <td className="py-4 text-white font-medium">{row.name}</td>
              <td className="py-4 text-blue-400">{row.email}</td>
              <td className="py-4 text-gray-300">{row.plan}</td>
              <td className="py-4 text-gray-400">{row.date}</td>
              <td className={`py-4 font-medium ${statusStyle[row.status]}`}>
                {row.status}
              </td>
              <td className="py-4">
                <div className="flex items-center justify-end gap-2">
                  <RowMenu row={row} />
                  <button
                    onClick={() => onViewDetails(row)}
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
  </div>
);

export const SubscriptionPlans = () => {
  const navigate = useNavigate();
  const [activeCandidate, setActiveCandidate] = useState(null);
  const [activeEmployer, setActiveEmployer] = useState(null);

  return (
    <div className="min-h-screen bg-[#0E0E10] p-4 md:p-6 lg:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-8 bg-blue-600 rounded-full"></div>
        <h1 className="text-2xl md:text-3xl font-semibold text-white">
          Subscription &amp; Plans
        </h1>
      </div>

      <div className="bg-[#1A1A1E] rounded-lg p-6 border border-white/5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="flex items-center gap-4">
                <div className={`${stat.color} p-4 rounded-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-3xl font-bold text-white">
                    {stat.value}
                  </div>
                  <div className="text-gray-400 text-sm mt-1">{stat.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        <SubscriptionTable
          title="Recently Subscribed Candidates"
          rows={candidateSubs}
          onViewAll={() => navigate("/admin-dashboard/subscription/candidates")}
          onViewDetails={setActiveCandidate}
        />
        <SubscriptionTable
          title="Recently Subscribed Employers"
          rows={employerSubs}
          onViewAll={() => navigate("/admin-dashboard/subscription/employers")}
          onViewDetails={setActiveEmployer}
        />
      </div>

      <SubscriptionDetailModal
        subject={activeCandidate}
        avatarSrc={
          activeCandidate
            ? `https://i.pravatar.cc/80?u=${encodeURIComponent(activeCandidate.name)}`
            : null
        }
        onClose={() => setActiveCandidate(null)}
      />
      <SubscriptionDetailModal
        subject={activeEmployer}
        avatarIcon={Building2}
        onClose={() => setActiveEmployer(null)}
      />
    </div>
  );
};

export default SubscriptionPlans;
