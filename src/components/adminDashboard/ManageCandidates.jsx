import React, { useState, useEffect } from "react";
import { Eye, MapPin } from "lucide-react";
import { toast } from "sonner";
import { ListToolbar } from "./ListToolbar";
import { PaginationBar } from "./PaginationBar";
import { FaXmark } from "react-icons/fa6";
import { RxReload } from "react-icons/rx";
import axios from "axios";
import { API_BASE_URL } from "../utils/api";

const statusStyle = {
  Active: "bg-emerald-600/15 text-emerald-500",
  Suspended: "bg-red-600/15 text-red-500",
};

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

const sortOptions = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name-asc", label: "Name (A-Z)" },
  { value: "name-desc", label: "Name (Z-A)" },
];

export const ManageCandidates = () => {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  // const [candidates, setCandidates] = useState(seedCandidates);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const fetchCandidates = async () => {
    try {
      setLoading(true);

      const token = localStorage.getItem("adminToken");

      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        search,
        sort:
          sort === "oldest"
            ? "createdAt"
            : sort === "name-asc"
            ? "firstName"
            : sort === "name-desc"
            ? "-firstName"
            : "-createdAt",
      });

      const res = await axios.get(
        `${API_BASE_URL}/api/admin/talents?${params}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setCandidates(res.data.data || []);
      setPagination(res.data.pagination);
    } catch (error) {
      console.error("Fetch candidates error:", error);

      toast.error(
        error.response?.data?.message ||
          "Failed to load candidates"
      );
    } finally {
      setLoading(false);
    }
  };

  // const setStatus = (id, status) => {
  //   setCandidates((prev) =>
  //     prev.map((c) => (c.id === id ? { ...c, status } : c)),
  //   );
  //   toast.success(`Candidate marked as ${status}`);
  // };

  useEffect(() => {
    fetchCandidates();
  }, [page, sort, search]);

  const setStatus = async (id, status) => {
    try {
      const token = localStorage.getItem("adminToken");

      await axios.patch(
        `${API_BASE_URL}/api/admin/talents/${id}/status`,
        {
          status,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      toast.success(
        status === "suspended"
          ? "Candidate suspended"
          : "Candidate reactivated"
      );

      fetchCandidates();
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Failed to update candidate"
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#0E0E10] p-4 md:p-6 lg:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-8 bg-blue-600 rounded-full"></div>
        <h1 className="text-2xl md:text-3xl font-semibold text-white">
          Candidates
        </h1>
      </div>

      <div className="bg-[#1A1A1E] rounded-lg p-6 border border-white/5">
        <ListToolbar
          search={search}
          onSearchChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Search by name or role"
          sortOptions={sortOptions}
          sortValue={sort}
          onSortChange={setSort}
        />

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-white/5">
                <th className="pb-3 font-medium">Candidates</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Applied Date</th>
                <th className="pb-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {candidates.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="py-10 text-center text-gray-500 text-sm"
                  >
                    {loading
                      ? "Loading candidates..."
                      : `No candidates match "${search}"`}
                  </td>
                </tr>
              )}

              {candidates.map((c) => {
                const candidateName =
                  c.fullName ||
                  `${c.firstName || ""} ${c.lastName || ""}`.trim() ||
                  "Unnamed Candidate";

                const candidateStatus =
                  c.accountStatus === "suspended"
                    ? "Suspended"
                    : "Active";

                return (
                  <tr key={c._id}>
                    <td className="py-5 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full bg-gray-600 flex-shrink-0 overflow-hidden">
                          {c.avatar?.url ? (
                            <img
                              src={c.avatar.url}
                              alt={candidateName}
                              className="w-full h-full object-cover"
                            />
                          ) : null}
                        </div>

                        <div>
                          <div className="text-blue-400 text-sm">
                            {c.jobTitle || "No job title"}
                          </div>

                          <div className="text-white font-semibold">
                            {candidateName}
                          </div>

                          <div className="flex items-center gap-2 mt-1">
                            <span className="px-2 py-0.5 rounded-md bg-emerald-600/15 text-emerald-500 text-xs">
                              Available now
                            </span>

                            <span className="flex items-center gap-1 text-gray-500 text-xs">
                              <MapPin className="w-3 h-3" />
                              {c.location || "Location not specified"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-5 pr-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${statusStyle[candidateStatus]}`}
                      >
                        {candidateStatus}
                      </span>
                    </td>

                    <td className="py-5 pr-4 text-gray-400 text-sm whitespace-nowrap">
                      {formatDate(c.createdAt)}
                    </td>

                    <td className="py-5">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          title="View Profile"
                          onClick={() =>
                            toast.info(
                              `Viewing profile for ${candidateName}`
                            )
                          }
                          className="w-9 h-9 rounded-lg bg-blue-600 hover:bg-blue-700 flex items-center justify-center text-white transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          title={
                            c.accountStatus === "suspended"
                              ? "Reactivate candidate"
                              : "Suspend candidate"
                          }
                          onClick={() =>
                            setStatus(
                              c._id,
                              c.accountStatus === "active"
                                ? "suspended"
                                : "active"
                            )
                          }
                          className="w-9 h-9 rounded-lg bg-blue-600 hover:bg-blue-700 flex items-center justify-center text-white transition-colors"
                        >
                          {c.accountStatus === "active" ? (
                            <FaXmark className="w-4 h-4" />
                          ) : (
                            <RxReload className="w-4 h-4" />
                          )}
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

export default ManageCandidates;
