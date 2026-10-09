import React, { useState, useMemo } from "react";
import { MapPin } from "lucide-react";
import { toast } from "sonner";
import { ListToolbar } from "./ListToolbar";
import { PaginationBar } from "./PaginationBar";
import { UserActionMenu } from "./UserActionMenu";
import { Modal } from "./Modal";

const seedEmployers = [
  {
    id: 0,
    name: "Avitex Agency",
    address: "Las Vegas, NV 89107, USA",
    date: "2023-12-18",
    status: "Verified",
  },
  {
    id: 1,
    name: "Cybrary",
    address: "Reston, VA 20190, USA",
    date: "2023-12-14",
    status: "Unverified",
  },
  {
    id: 2,
    name: "Coana",
    address: "Austin, TX 78701, USA",
    date: "2023-12-10",
    status: "Pending",
  },
  {
    id: 3,
    name: "Azure Talent",
    address: "Seattle, WA 98101, USA",
    date: "2023-12-07",
    status: "Pending",
  },
  {
    id: 4,
    name: "Skate Recruiting",
    address: "Denver, CO 80202, USA",
    date: "2023-12-03",
    status: "Pending",
  },
  {
    id: 5,
    name: "Northwind Group",
    address: "Chicago, IL 60601, USA",
    date: "2023-11-29",
    status: "Verified",
  },
];

const statusStyle = {
  Verified: "bg-emerald-600/15 text-emerald-500",
  Unverified: "bg-red-600/15 text-red-500",
  Pending: "bg-yellow-500/15 text-yellow-500",
};

const SORT_OPTIONS = [
  { value: "name-asc", label: "Name (A-Z)" },
  { value: "name-desc", label: "Name (Z-A)" },
  { value: "status", label: "Status" },
];

const PAGE_SIZE = 5;

export const ManageEmployers = () => {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("name-asc");
  const [page, setPage] = useState(1);
  const [employers, setEmployers] = useState(seedEmployers);
  const [profile, setProfile] = useState(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = employers.filter(
      (e) =>
        !q ||
        e.name.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        e.address.toLowerCase().includes(q),
    );
    rows = [...rows].sort((a, b) => {
      if (sort === "name-asc") return a.name.localeCompare(b.name);
      if (sort === "name-desc") return b.name.localeCompare(a.name);
      if (sort === "status") return a.status.localeCompare(b.status);
      return 0;
    });
    return rows;
  }, [employers, search, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  // Clamp so a delete/cancel on the last page never strands you on an
  // empty page while earlier pages still have rows.
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  const setStatus = (id, status) => {
    setEmployers((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status } : e)),
    );
    toast.success(`Employer marked as ${status}`);
  };

  const deleteEmployer = (id) => {
    setEmployers((prev) => prev.filter((e) => e.id !== id));
    toast.success("Employer deleted");
  };

  return (
    <div className="min-h-screen bg-[#0E0E10] p-4 md:p-6 lg:p-8">
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
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Date Joined</th>
                <th className="pb-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {pageRows.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="py-8 text-center text-gray-500 text-sm"
                  >
                    No employers match your search.
                  </td>
                </tr>
              )}
              {pageRows.map((employer) => (
                <tr key={employer.id}>
                  <td className="py-5 pr-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-lg bg-gray-600 flex-shrink-0" />
                      <div>
                        <div className="text-white font-semibold">
                          {employer.name}
                        </div>
                        <div className="flex items-center gap-1 text-gray-500 text-sm">
                          <MapPin className="w-3.5 h-3.5" />
                          {employer.address}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-5 pr-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${statusStyle[employer.status]}`}
                    >
                      {employer.status}
                    </span>
                  </td>
                  <td className="py-5 pr-4 text-gray-400 text-sm whitespace-nowrap">
                    {employer.date}
                  </td>
                  <td className="py-5">
                    <div className="flex items-center justify-end gap-2">
                      <UserActionMenu
                        onVerify={() => setStatus(employer.id, "Verified")}
                        onUnverify={() => setStatus(employer.id, "Unverified")}
                        onResetPassword={() =>
                          toast.success(
                            `Password reset link sent to ${employer.email}`,
                          )
                        }
                        onDelete={() => deleteEmployer(employer.id)}
                      />
                      <button
                        onClick={() => setProfile(employer)}
                        className="px-4 py-2 rounded-lg bg-[#2A2A2E] hover:bg-blue-600 text-white text-xs font-medium transition-colors whitespace-nowrap"
                      >
                        View Profile
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

      <Modal
        open={!!profile}
        onClose={() => setProfile(null)}
        maxWidth="max-w-lg"
      >
        {profile && (
          <div className="p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-lg bg-gray-600 flex-shrink-0" />
              <div>
                <h2 className="text-xl font-semibold text-white">
                  {profile.name}
                </h2>
                <p className="text-gray-400 text-sm">{profile.address}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6 text-sm">
              <div>
                <div className="text-gray-500 text-xs uppercase">Email</div>
                <div className="text-white font-medium">{profile.email}</div>
              </div>
              <div>
                <div className="text-gray-500 text-xs uppercase">Status</div>
                <div className="text-white font-medium">{profile.status}</div>
              </div>
              <div>
                <div className="text-gray-500 text-xs uppercase">
                  Date Joined
                </div>
                <div className="text-white font-medium">{profile.date}</div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ManageEmployers;
