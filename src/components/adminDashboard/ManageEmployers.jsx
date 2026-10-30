import { useAdminSubscriptionAction } from "../hooks/useAdminSubscriptionAction";
import { AdminEmployerPlanRequestDialog } from "./AdminEmployerPlanRequestDialog";
import { AdminProfileDialog } from "./AdminProfileDialog";
import React, { useCallback, useState, useEffect, useRef } from "react";
import {
  MoreHorizontal,
  MapPin,
  Eye,
  BadgeCheck,
  BadgeMinus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { ListToolbar } from "./ListToolbar";
import { PaginationBar } from "./PaginationBar";
import axios from "axios";
import { API_BASE_URL } from "../utils/api";
import { badgeLabel } from "../utils/adminVerification";
import { useAdminBadgeActions } from "../hooks/useAdminBadgeActions";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "../ui/dropdown-menu";

const statusStyle = {
  Verified: "bg-emerald-600/15 text-emerald-500",
  "Unverified": "bg-gray-600/15 text-gray-400",
};

const SORT_OPTIONS = [
  { value: "name-asc", label: "Name (A-Z)" },
  { value: "name-desc", label: "Name (Z-A)" },
  { value: "status", label: "Status" },
];

const formatDate = (date) =>
  date
    ? new Date(date).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "-";

const RowMenu = ({ onVerify, onUnverify, onDelete, onDowngrade, pending }) => {
  const trigger = useRef(null);
  return (
  <DropdownMenu modal={false}>
    <DropdownMenuTrigger asChild>
      <button
        type="button"
        aria-label="Employer actions"
        ref={trigger}
        className="w-9 h-9 rounded-lg bg-[#2A2A2E] hover:bg-blue-600 flex items-center justify-center text-white"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent
      align="end"
      sideOffset={6}
      avoidCollisions
      collisionPadding={8}
      sticky="always"
      className="w-44 max-w-[calc(100vw-1rem)] bg-[#2A2A2E] border-white/10 text-white"
    >
      <DropdownMenuItem disabled={pending} onSelect={onVerify} className="cursor-pointer focus:bg-white/10 focus:text-white">
        <BadgeCheck className="w-4 h-4 text-emerald-500" />
        Verify User
      </DropdownMenuItem>
      <DropdownMenuItem disabled={pending} onSelect={onUnverify} className="cursor-pointer focus:bg-white/10 focus:text-white">
        <BadgeMinus className="w-4 h-4 text-yellow-500" />
        Unverify User
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => onDowngrade(trigger.current)} className="cursor-pointer focus:bg-white/10 focus:text-white">Downgrade</DropdownMenuItem>
      <DropdownMenuItem disabled={pending} onSelect={onDelete} className="cursor-pointer text-red-400 focus:bg-white/10 focus:text-red-400">
        <Trash2 className="w-4 h-4" />
        Delete
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);
};

export const ManageEmployers = () => {
  const planRequest = useAdminSubscriptionAction("plan-request");
  const [profileSubject, setProfileSubject] = useState(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("name-asc");
  const [page, setPage] = useState(1);
  const [employers, setEmployers] = useState([]);
  const [loading, setLoading] = useState(false);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const badges = useAdminBadgeActions({
    refresh: () => fetchEmployers(),
    onSaved(_type, account) {
      setEmployers(rows => rows.map(row => String(row._id) === account._id ? { ...row, ...account } : row));
    },
  });
  const beginBadgeRead = badges.beginRead;

  const fetchEmployers = useCallback(async () => {
    const read = beginBadgeRead();
    try {
      setLoading(true);

      const token = read.token;

      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        search,
        sort:
          sort === "oldest"
            ? "createdAt"
            : sort === "name-asc"
              ? "companyName"
              : sort === "name-desc"
                ? "-companyName"
                : "-createdAt",
      });

      const res = await axios.get(
        `${API_BASE_URL}/api/admin/employers?${params}`,
        {
          signal: read.signal,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (!read.current()) return false;

      setEmployers(res.data.data || []);
      setPagination(res.data.pagination);
      return true;
    } catch (error) {
      if (!read.current()) return false;
      console.error("Fetch employers error:", error);

      toast.error(error.response?.data?.message || "Failed to load employers");
    } finally {
      if (read.current()) setLoading(false);
      read.finish();
    }
  }, [beginBadgeRead, page, sort, search]);


  useEffect(() => {
    fetchEmployers();
  }, [fetchEmployers]);

  const deleteEmployer = async (id) => {
    try {
      const token = localStorage.getItem("adminToken");

      await axios.delete(`${API_BASE_URL}/api/admin/employers/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      toast.success("Employer deleted successfully");

      fetchEmployers();
    } catch (error) {
      console.error("Delete employer error:", error);

      toast.error(error.response?.data?.message || "Failed to delete employer");
    }
  };

  return (
    <div className="min-h-screen bg-[#0E0E10] p-4 md:p-6 lg:p-8">
      <AdminEmployerPlanRequestDialog flow={planRequest} />
      <AdminProfileDialog subject={profileSubject} onClose={() => setProfileSubject(null)} />
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-8 bg-blue-600 rounded-full"></div>
        <h1 className="text-2xl md:text-3xl font-semibold text-white">
          Employers
        </h1>
      </div>

      <div className="bg-[#1A1A1E] rounded-lg p-6 border border-white/5">
        <ListToolbar
          search={search}
          onSearchChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Search by name, email or address"
          sortOptions={SORT_OPTIONS}
          sortValue={sort}
          onSortChange={setSort}
        />

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-white/5">
                <th className="pb-3 font-medium">Employers</th>
                <th className="pb-3 font-medium">Badge</th>
                <th className="pb-3 font-medium">Date Joined</th>
                <th className="pb-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {employers.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="py-8 text-center text-gray-500 text-sm"
                  >
                    {loading
                      ? "Loading employers..."
                      : `No employers match "${search}"`}
                  </td>
                </tr>
              )}

              {employers.map((employer) => {
                const employerName =
                  employer.companyName ||
                  employer.displayName ||
                  `${employer.firstName || ""} ${
                    employer.lastName || ""
                  }`.trim() ||
                  "Unnamed Employer";

                const employerStatus = badgeLabel(employer);

                return (
                  <tr key={employer._id}>
                    <td className="py-5 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-lg bg-gray-600 flex-shrink-0 overflow-hidden">
                          {employer.logo?.url ? (
                            <img
                              src={employer.logo.url}
                              alt={employerName}
                              className="w-full h-full object-cover"
                            />
                          ) : null}
                        </div>

                        <div>
                          <div className="text-white font-semibold">
                            {employerName}
                          </div>

                          <div className="flex items-center gap-1 text-gray-500 text-sm">
                            <MapPin className="w-3.5 h-3.5" />

                            {employer.location ||
                              employer.address ||
                              "Location not specified"}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-5 pr-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${statusStyle[employerStatus]}`}
                      >
                        {employerStatus}
                      </span>
                    </td>

                    <td className="py-5 pr-4 text-gray-400 text-sm whitespace-nowrap">
                      {formatDate(employer.createdAt)}
                    </td>

                    <td className="py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <RowMenu
                          pending={badges.pending("employer", employer._id)}
                          onDowngrade={trigger => planRequest.open({ type: "employer", accountId: String(employer._id) }, trigger, "downgrade")}
                          onVerify={() => badges.setBadge("employer", employer._id, true)}
                          onUnverify={() => badges.setBadge("employer", employer._id, false)}
                          onDelete={() => deleteEmployer(employer._id)}
                        />
                        <button type="button" title="View Profile" aria-label={`View profile for ${employerName}`}
                          onClick={event => setProfileSubject({ type: "employer", id: employer._id, trigger: event.currentTarget })}
                          className="w-9 h-9 rounded-lg bg-blue-600 hover:bg-blue-700 flex items-center justify-center text-white">
                          <Eye className="w-4 h-4" />
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
          page={pagination.page}
          totalPages={pagination.totalPages}
          onChange={setPage}
        />
      </div>
    </div>
  );
};

export default ManageEmployers;
