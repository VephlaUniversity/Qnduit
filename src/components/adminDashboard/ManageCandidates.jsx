import React, { useState, useMemo } from "react";
import { MapPin } from "lucide-react";
import { toast } from "sonner";
import { ListToolbar } from "./ListToolbar";
import { PaginationBar } from "./PaginationBar";
import { UserActionMenu } from "./UserActionMenu";
import { Modal } from "./Modal";

const seedCandidates = [
  {
    id: 1,
    role: "Computational Wizard",
    name: "Arlene McCoy",
    email: "arlene.mccoy@gmail.com",
    date: "December 18, 2023",
    status: "Active",
  },
  {
    id: 2,
    role: "Computational Wizard",
    name: "Mrs Dianne Russell",
    email: "dianne.russell@gmail.com",
    date: "December 18, 2023",
    status: "Suspended",
  },
  {
    id: 3,
    role: "Computational Wizard",
    name: "Mr Guy Hawkins",
    email: "guy.hawkins@gmail.com",
    date: "December 18, 2023",
    status: "Active",
  },
  {
    id: 4,
    role: "Computational Wizard",
    name: "Lady Darlene Robertson",
    email: "darlene.robertson1@gmail.com",
    date: "December 18, 2023",
    status: "Active",
  },
  {
    id: 5,
    role: "Computational Wizard",
    name: "Lady Darlene Robertson",
    email: "darlene.robertson2@gmail.com",
    date: "December 18, 2023",
    status: "Active",
  },
  {
    id: 6,
    role: "Computational Wizard",
    name: "Lady Darlene Robertson",
    email: "darlene.robertson3@gmail.com",
    date: "December 18, 2023",
    status: "Active",
  },
  {
    id: 7,
    role: "Computational Wizard",
    name: "Lady Darlene Robertson",
    email: "darlene.robertson4@gmail.com",
    date: "December 18, 2023",
    status: "Active",
  },
];

const statusStyle = {
  Active: "bg-emerald-600/15 text-emerald-500",
  Suspended: "bg-red-600/15 text-red-500",
};

const SORT_OPTIONS = [
  { value: "name-asc", label: "Name (A-Z)" },
  { value: "name-desc", label: "Name (Z-A)" },
  { value: "status", label: "Status" },
];

const PAGE_SIZE = 5;

export const ManageCandidates = () => {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("name-asc");
  const [page, setPage] = useState(1);
  const [candidates, setCandidates] = useState(seedCandidates);
  const [profile, setProfile] = useState(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = candidates.filter(
      (c) =>
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.role.toLowerCase().includes(q),
    );
    rows = [...rows].sort((a, b) => {
      if (sort === "name-asc") return a.name.localeCompare(b.name);
      if (sort === "name-desc") return b.name.localeCompare(a.name);
      if (sort === "status") return a.status.localeCompare(b.status);
      return 0;
    });
    return rows;
  }, [candidates, search, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  // Clamp so a delete/cancel on the last page never strands you on an
  // empty page while earlier pages still have rows.
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  const setStatus = (id, status) => {
    setCandidates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status } : c)),
    );
    toast.success(`Candidate marked as ${status}`);
  };

  const deleteCandidate = (id) => {
    setCandidates((prev) => prev.filter((c) => c.id !== id));
    toast.success("Candidate deleted");
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
          placeholder="Search by name, email or role"
          sortOptions={SORT_OPTIONS}
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
              {pageRows.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="py-8 text-center text-gray-500 text-sm"
                  >
                    No candidates match your search.
                  </td>
                </tr>
              )}
              {pageRows.map((c) => (
                <tr key={c.id}>
                  <td className="py-5 pr-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-gray-600 flex-shrink-0" />
                      <div>
                        <div className="text-blue-400 text-sm">{c.role}</div>
                        <div className="text-white font-semibold">{c.name}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="px-2 py-0.5 rounded-md bg-emerald-600/15 text-emerald-500 text-xs">
                            Available now
                          </span>
                          <span className="flex items-center gap-1 text-gray-500 text-xs">
                            <MapPin className="w-3 h-3" />
                            Tokyo, Japan
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-5 pr-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${statusStyle[c.status]}`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="py-5 pr-4 text-gray-400 text-sm whitespace-nowrap">
                    {c.date}
                  </td>
                  <td className="py-5">
                    <div className="flex items-center justify-end gap-2">
                      <UserActionMenu
                        onVerify={() => setStatus(c.id, "Active")}
                        onUnverify={() => setStatus(c.id, "Suspended")}
                        onResetPassword={() =>
                          toast.success(
                            `Password reset link sent to ${c.email}`,
                          )
                        }
                        onDelete={() => deleteCandidate(c.id)}
                      />
                      <button
                        onClick={() => setProfile(c)}
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
              <div className="w-16 h-16 rounded-full bg-gray-600 flex-shrink-0" />
              <div>
                <h2 className="text-xl font-semibold text-white">
                  {profile.name}
                </h2>
                <p className="text-blue-400 text-sm">{profile.role}</p>
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
                  Applied Date
                </div>
                <div className="text-white font-medium">{profile.date}</div>
              </div>
              <div>
                <div className="text-gray-500 text-xs uppercase">Location</div>
                <div className="text-white font-medium">Tokyo, Japan</div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ManageCandidates;
