import React, { useMemo, useState } from "react";
import { Eye, MapPin } from "lucide-react";
import { toast } from "sonner";
import { ListToolbar } from "./ListToolbar";
import { PaginationBar } from "./PaginationBar";
import { FaXmark } from "react-icons/fa6";
import { RxReload } from "react-icons/rx";

const seedCandidates = [
  {
    id: 1,
    role: "Computational Wizard",
    name: "Arlene McCoy",
    date: "2023-12-18",
    status: "Active",
  },
  {
    id: 2,
    role: "Computational Wizard",
    name: "Mrs Dianne Russell",
    date: "2023-12-14",
    status: "Suspended",
  },
  {
    id: 3,
    role: "Computational Wizard",
    name: "Mr Guy Hawkins",
    date: "2023-12-10",
    status: "Active",
  },
  {
    id: 4,
    role: "Computational Wizard",
    name: "Lady Darlene Robertson",
    date: "2023-12-08",
    status: "Active",
  },
  {
    id: 5,
    role: "Computational Wizard",
    name: "Esther Howard",
    date: "2023-12-05",
    status: "Active",
  },
  {
    id: 6,
    role: "Computational Wizard",
    name: "Jenny Wilson",
    date: "2023-12-02",
    status: "Suspended",
  },
  {
    id: 7,
    role: "Computational Wizard",
    name: "Cody Fisher",
    date: "2023-11-28",
    status: "Active",
  },
];

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

const PAGE_SIZE = 4;

export const ManageCandidates = () => {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [candidates, setCandidates] = useState(seedCandidates);

  const setStatus = (id, status) => {
    setCandidates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status } : c)),
    );
    toast.success(`Candidate marked as ${status}`);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = candidates.filter(
      (c) =>
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.role.toLowerCase().includes(q),
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
  }, [candidates, search, sort]);

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
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="py-10 text-center text-gray-500 text-sm"
                  >
                    No candidates match "{search}"
                  </td>
                </tr>
              )}
              {paginated.map((c) => (
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
                    {formatDate(c.date)}
                  </td>
                  <td className="py-5">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        title="View Profile"
                        onClick={() =>
                          toast.info(`Viewing profile for ${c.name}`)
                        }
                        className="w-9 h-9 rounded-lg bg-blue-600 hover:bg-blue-700 flex items-center justify-center text-white transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        title={
                          c.status === "Active"
                            ? "Suspend User"
                            : "Reactivate User"
                        }
                        onClick={() =>
                          setStatus(
                            c.id,
                            c.status === "Active" ? "Suspended" : "Active",
                          )
                        }
                        className="w-9 h-9 rounded-lg bg-blue-600 hover:bg-blue-700 flex items-center justify-center text-white transition-colors"
                      >
                        {c.status === "Active" ? (
                          <FaXmark className="w-4 h-4" />
                        ) : (
                          <RxReload className="w-4 h-4" />
                        )}
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
    </div>
  );
};

export default ManageCandidates;
