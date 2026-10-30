import { useAdminSubscriptionAction } from "../hooks/useAdminSubscriptionAction";
import { AdminEmployerPlanRequestDialog } from "./AdminEmployerPlanRequestDialog";
import { useAdminCancellation } from "../hooks/useAdminCancellation";
import { AdminCancelSubscriptionDialog } from "./AdminCancelSubscriptionDialog";
import { useAdminInvoice } from "../hooks/useAdminInvoice";
import { AdminInvoiceDialog } from "./AdminInvoiceDialog";
import React, { useEffect, useState } from "react";
import {
  Building2,
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { ListToolbar } from "./ListToolbar";
import { PaginationBar } from "./PaginationBar";
import { SubscriptionActionMenu } from "./SubscriptionActionMenu";
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

const formatPlan = (plan) => {
  const labels = {
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
    canceled: "Cancelled",
    expired: "Expired",
  };

  return labels[status] || status || "-";
};

const statusStyle = {
  Active: "text-emerald-500",
  Expired: "text-red-500",
  Cancelled: "text-red-500",
  Pending: "text-yellow-500",
  "Past Due": "text-orange-500",
};

const sortOptions = [
  {
    value: "newest",
    label: "Newest first",
  },
  {
    value: "oldest",
    label: "Oldest first",
  },
];

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
});

const getLogoUrl = (logo) => {
  if (!logo) return null;

  if (typeof logo === "string") {
    return logo;
  }

  return logo.url || null;
};


export const SubscribedEmployers = () => {
  const invoice = useAdminInvoice();
  const [revision, setRevision] = useState(0);
  const cancellation = useAdminCancellation(() => setRevision(value => value + 1));
  const planRequest = useAdminSubscriptionAction("plan-request", () => setRevision(value => value + 1));
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const loadEmployers = async () => {
      try {
        if (!revision) setLoading(true);

        const response = await axios.get(
          `${API_BASE_URL}/api/admin/subscriptions`,
          {
            params: {
              type: "employer",
              page,
              limit: 10,
              search: search.trim(),
              sort,
            },
            headers: getAuthHeaders(),
          },
        );

        if (!response.data.success) {
          throw new Error(response.data.message || "Failed to load employers");
        }

        if (cancelled) return;

        setRows(response.data.data || []);

        setPagination(
          response.data.pagination || {
            page,
            limit: 10,
            total: 0,
            totalPages: 1,
          },
        );
      } catch (error) {
        if (cancelled) return;

        console.error("Failed to load subscribed employers:", error);

        toast.error(
          error.response?.data?.message ||
            error.message ||
            "Failed to load subscribed employers",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadEmployers();

    return () => {
      cancelled = true;
    };
  }, [page, search, sort, revision]);

  const handleSearchChange = (value) => {
    setSearch(value);
    setPage(1);
  };

  const handleSortChange = (value) => {
    setSort(value);
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-[#0E0E10] p-4 md:p-6 lg:p-8">
      <AdminInvoiceDialog flow={invoice} />
      <AdminCancelSubscriptionDialog flow={cancellation} />
      <AdminEmployerPlanRequestDialog flow={planRequest} />
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-8 bg-blue-600 rounded-full" />

        <h1 className="text-2xl md:text-3xl font-semibold text-white">
          Subscribed Employers
        </h1>
      </div>

      <div className="bg-[#1A1A1E] rounded-lg p-6 border border-white/5">
        <ListToolbar
          search={search}
          onSearchChange={handleSearchChange}
          placeholder="Search by name, email or plan"
          sortOptions={sortOptions}
          sortValue={sort}
          onSortChange={handleSortChange}
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
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-10 text-center text-gray-500 text-sm"
                  >
                    Loading subscribed employers...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-10 text-center text-gray-500 text-sm"
                  >
                    {search
                      ? `No subscribed employers match "${search}"`
                      : "No subscribed employers found."}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="text-sm">
                    <td className="py-4 pr-4 text-white font-medium whitespace-nowrap">
                      {row.name || "-"}
                    </td>

                    <td className="py-4 pr-4 text-blue-400 whitespace-nowrap">
                      {row.email || "-"}
                    </td>

                    <td className="py-4 pr-4 text-gray-300 whitespace-nowrap">
                      {formatPlan(row.plan)}
                    </td>

                    <td className="py-4 pr-4 text-gray-400 whitespace-nowrap">
                      {formatDate(row.startDate)}
                    </td>

                    <td
                      className={`py-4 pr-4 font-medium whitespace-nowrap ${
                        statusStyle[formatStatus(row.status)] || "text-gray-400"
                      }`}
                    >
                      {formatStatus(row.status)}
                    </td>

                    <td className="py-4">
                      <div className="flex items-center justify-end gap-2">
                        <SubscriptionActionMenu onDowngrade={trigger => planRequest.open(row, trigger, "downgrade")} onCancel={trigger => cancellation.open(row, trigger)} onSendInvoice={trigger => invoice.open(row, trigger)} />

                        <button
                          onClick={() => setActive(row)}
                          className="px-4 py-2 rounded-lg bg-[#2A2A2E] hover:bg-blue-600 text-white text-xs font-medium transition-colors whitespace-nowrap"
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

        <PaginationBar
          page={pagination.page || page}
          totalPages={pagination.totalPages || 1}
          onChange={setPage}
        />
      </div>

      {active && (
        <SubscriptionDetailModal
          subject={active}
          avatarSrc={getLogoUrl(active.logo)}
          avatarIcon={Building2}
          onClose={() => setActive(null)}
        />
      )}
    </div>
  );
};

export default SubscribedEmployers;
