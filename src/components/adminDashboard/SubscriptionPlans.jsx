import React, { useEffect, useState } from "react";
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
import axios from "axios";
import { SubscriptionDetailModal } from "./SubscriptionDetailModal";
import { API_BASE_URL } from "../utils/api";

const formatDate = (date) => {
  if (!date) return "-";

  return new Date(date).toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatMoney = (amount) => {
  return `$${Number(amount || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatPlan = (plan) => {
  const labels = {
    public: "Public",
    bronze: "Bronze",
    silver: "Silver",
    platinum: "Platinum",
  };

  return labels[plan] || plan || "-";
};

const formatStatus = (status) => {
  const labels = {
    active: "Active",
    pending: "Pending",
    past_due: "Past Due",
    canceled: "Canceled",
    expired: "Expired",
  };

  return labels[status] || status || "-";
};

const statusStyle = {
  Active: "text-emerald-500",
  Expired: "text-red-500",
  Canceled: "text-red-500",
  Pending: "text-yellow-500",
  "Past Due": "text-orange-500",
};

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
});

const getAvatarUrl = (avatar) => {
  if (!avatar) return null;

  if (typeof avatar === "string") {
    return avatar;
  }

  return avatar.url || null;
};

const RowMenu = ({ row }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((value) => !value)}
        className="text-gray-400 hover:text-white p-1"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-48 bg-[#2A2A2E] border border-white/10 rounded-lg shadow-xl overflow-hidden z-20">
          <button
            onClick={() => {
              toast.info(
                "Subscription cancellation will be connected to Flutterwave subscription management."
              );
              setOpen(false);
            }}
            className="w-full text-left px-4 py-2.5 text-red-500 hover:bg-white/10 flex items-center gap-2"
          >
            <XCircle className="w-4 h-4" />
            Cancel Subscription
          </button>

          <button
            onClick={() => {
              toast.info(
                "Downgrade will be connected after the Flutterwave subscription plan update flow is implemented."
              );
              setOpen(false);
            }}
            className="w-full text-left px-4 py-2.5 text-gray-200 hover:bg-white/10 flex items-center gap-2"
          >
            <ArrowDownCircle className="w-4 h-4" />
            Downgrade Subscription
          </button>

          <button
            onClick={() => {
              toast.info(
                "Invoice sending will be connected to the Qnduit email service."
              );
              setOpen(false);
            }}
            className="w-full text-left px-4 py-2.5 text-gray-200 hover:bg-white/10 flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            Send Invoice
          </button>
        </div>
      )}
    </div>
  );
};

const SubscriptionTable = ({
  title,
  rows,
  loading,
  onViewAll,
  onViewDetails,
}) => (
  <div className="mb-8">
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-semibold text-white">{title}</h2>

      <button
        onClick={onViewAll}
        className="text-sm text-blue-500 hover:text-blue-400"
      >
        View all →
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
          {loading ? (
            <tr>
              <td
                colSpan={6}
                className="py-8 text-center text-gray-500"
              >
                Loading subscriptions...
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td
                colSpan={6}
                className="py-8 text-center text-gray-500"
              >
                No subscriptions found.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id} className="text-sm">
                <td className="py-4 text-white font-medium">
                  {row.name || "-"}
                </td>

                <td className="py-4 text-blue-400">
                  {row.email || "-"}
                </td>

                <td className="py-4 text-gray-300">
                  {formatPlan(row.plan)}
                </td>

                <td className="py-4 text-gray-400">
                  {formatDate(row.startDate)}
                </td>

                <td
                  className={`py-4 font-medium ${
                    statusStyle[formatStatus(row.status)] ||
                    "text-gray-400"
                  }`}
                >
                  {formatStatus(row.status)}
                </td>

                <td className="py-4">
                  <div className="flex items-center justify-end gap-2">
                    <RowMenu row={row} />

                    <button
                      onClick={() => onViewDetails(row)}
                      className="px-4 py-2 rounded-lg bg-[#2A2A2E] hover:bg-blue-600 text-white text-xs font-medium"
                    >
                      View Details
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  </div>
);

export const SubscriptionPlans = () => {
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    revenue: 0,
    talentSubscribers: 0,
    employerSubscribers: 0,
  });

  const [candidateSubs, setCandidateSubs] = useState([]);
  const [employerSubs, setEmployerSubs] = useState([]);

  const [activeCandidate, setActiveCandidate] = useState(null);
  const [activeEmployer, setActiveEmployer] = useState(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        const headers = getAuthHeaders();

        const [
          statsResponse,
          talentResponse,
          employerResponse,
        ] = await Promise.all([
          axios.get(
            `${API_BASE_URL}/api/admin/subscriptions/stats`,
            { headers }
          ),

          axios.get(
            `${API_BASE_URL}/api/admin/subscriptions`,
            {
              params: {
                type: "talent",
                page: 1,
                limit: 5,
                sort: "newest",
              },
              headers,
            }
          ),

          axios.get(
            `${API_BASE_URL}/api/admin/subscriptions`,
            {
              params: {
                type: "employer",
                page: 1,
                limit: 5,
                sort: "newest",
              },
              headers,
            }
          ),
        ]);

        if (statsResponse.data.success) {
          setStats(statsResponse.data.stats);
        }

        if (talentResponse.data.success) {
          setCandidateSubs(talentResponse.data.data || []);
        }

        if (employerResponse.data.success) {
          setEmployerSubs(employerResponse.data.data || []);
        }
      } catch (error) {
        console.error(
          "Failed to load subscription data:",
          error
        );

        toast.error(
          error.response?.data?.message ||
            "Failed to load subscription data"
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-[#0E0E10] p-4 md:p-6 lg:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-8 bg-blue-600 rounded-full" />

        <h1 className="text-2xl md:text-3xl font-semibold text-white">
          Subscription & Plans
        </h1>
      </div>

      <div className="bg-[#1A1A1E] rounded-lg p-6 border border-white/5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-4 rounded-lg">
              <Briefcase className="w-6 h-6 text-white" />
            </div>

            <div>
              <div className="text-3xl font-bold text-white">
                {loading ? "..." : formatMoney(stats.revenue)}
              </div>

              <div className="text-gray-400 text-sm mt-1">
                In Revenue
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-red-600 p-4 rounded-lg">
              <ScanSearch className="w-6 h-6 text-white" />
            </div>

            <div>
              <div className="text-3xl font-bold text-white">
                {loading ? "..." : stats.talentSubscribers}
              </div>

              <div className="text-gray-400 text-sm mt-1">
                Job Seekers Subscribed
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-emerald-600 p-4 rounded-lg">
              <Gift className="w-6 h-6 text-white" />
            </div>

            <div>
              <div className="text-3xl font-bold text-white">
                {loading ? "..." : stats.employerSubscribers}
              </div>

              <div className="text-gray-400 text-sm mt-1">
                Employers Subscribed
              </div>
            </div>
          </div>
        </div>

        <SubscriptionTable
          title="Recently Subscribed Candidates"
          rows={candidateSubs}
          loading={loading}
          onViewAll={() =>
            navigate(
              "/admin-dashboard/subscription/candidates"
            )
          }
          onViewDetails={setActiveCandidate}
        />

        <SubscriptionTable
          title="Recently Subscribed Employers"
          rows={employerSubs}
          loading={loading}
          onViewAll={() =>
            navigate(
              "/admin-dashboard/subscription/employers"
            )
          }
          onViewDetails={setActiveEmployer}
        />
      </div>

      {activeCandidate && (
        <SubscriptionDetailModal
          subject={activeCandidate}
          avatarSrc={getAvatarUrl(activeCandidate.avatar)}
          onClose={() => setActiveCandidate(null)}
        />
      )}

      {activeEmployer && (
        <SubscriptionDetailModal
          subject={activeEmployer}
          avatarIcon={Building2}
          onClose={() => setActiveEmployer(null)}
        />
      )}
    </div>
  );
};

export default SubscriptionPlans;