import React, { useMemo, useState, useRef, useEffect } from "react";
import {
  MoreHorizontal,
  MapPin,
  BadgeCheck,
  BadgeMinus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { ListToolbar } from "./ListToolbar";
import { PaginationBar } from "./PaginationBar";

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

const RowMenu = ({ onVerify, onUnverify, onDelete }) => {
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
        <MoreHorizontal className="w-5 h-5" />
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-48 bg-[#2A2A2E] border border-white/10 rounded-lg shadow-xl overflow-hidden z-20 text-sm">
          <button
            onClick={() => {
              onVerify();
              setOpen(false);
            }}
            className="w-full text-left px-4 py-2.5 text-gray-200 hover:bg-blue-600 hover:text-white transition-colors flex items-center gap-2"
          >
            <BadgeCheck className="w-4 h-4" />
            Verify User
          </button>
          <button
            onClick={() => {
              onUnverify();
              setOpen(false);
            }}
            className="w-full text-left px-4 py-2.5 text-gray-200 hover:bg-white/10 transition-colors flex items-center gap-2"
          >
            <BadgeMinus className="w-4 h-4" />
            Unverify User
          </button>
          <button
            onClick={() => {
              onDelete();
              setOpen(false);
            }}
            className="w-full text-left px-4 py-2.5 text-red-500 hover:bg-white/10 transition-colors flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete User
          </button>
        </div>
      )}
    </div>
  );
};

export const ManageEmployers = () => {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [employers, setEmployers] = useState(seedEmployers);

  const setStatus = (id, status) => {
    setEmployers((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status } : e)),
    );
    toast.success(`Employer marked as ${status}`);
  };

  const resetPassword = (e) =>
    toast.success(`Password reset link sent to ${e.name}`);

  const deleteEmployer = (e) => {
    setEmployers((prev) => prev.filter((row) => row.id !== e.id));
    toast.success(`${e.name} deleted`);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = employers.filter(
      (e) =>
        !q ||
        e.name.toLowerCase().includes(q) ||
        e.address.toLowerCase().includes(q),
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
  }, [employers, search, sort]);

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
          placeholder="Search by name or location"
          sortOptions={sortOptions}
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
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="py-10 text-center text-gray-500 text-sm"
                  >
                    No employers match "{search}"
                  </td>
                </tr>
              )}
              {filtered.map((employer) => (
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
                    {formatDate(employer.date)}
                  </td>
                  <td className="py-5 text-right">
                    <RowMenu
                      onVerify={() => setStatus(employer.id, "Verified")}
                      onUnverify={() => setStatus(employer.id, "Unverified")}
                      onResetPassword={() => resetPassword(employer)}
                      onDelete={() => deleteEmployer(employer)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <PaginationBar page={page} totalPages={5} onChange={setPage} />
      </div>
    </div>
  );
};

export default ManageEmployers;
