import React, { useMemo, useState } from "react";
import {
  Flag,
  Trash2,
  Zap,
  MapPin,
  X,
  Users,
  CalendarClock,
} from "lucide-react";
import { toast } from "sonner";
import { ListToolbar } from "./ListToolbar";
import { PaginationBar } from "./PaginationBar";
import { Modal } from "./Modal";

const seedJobs = [
  {
    id: 1,
    title: "Junior Marketing",
    location: "Tokyo, Japan",
    applicants: 213,
    created: "2022-10-18",
    expiry: "2023-09-05",
    status: "Published",
    featured: true,
    flagged: false,
  },
  {
    id: 2,
    title: "Ui UX Designer",
    location: "Tokyo, Japan",
    applicants: 178,
    created: "2022-10-12",
    expiry: "2023-09-01",
    status: "Expired",
    featured: true,
    flagged: false,
  },
  {
    id: 3,
    title: "Intern Digital Marketing",
    location: "Tokyo, Japan",
    applicants: 95,
    created: "2022-10-06",
    expiry: "2023-08-20",
    status: "Published",
    featured: false,
    flagged: false,
  },
  {
    id: 4,
    title: "Content Marketing",
    location: "Tokyo, Japan",
    applicants: 64,
    created: "2022-09-28",
    expiry: "2023-08-15",
    status: "Published",
    featured: true,
    flagged: false,
  },
  {
    id: 5,
    title: "Senior Backend Engineer",
    location: "Lagos, Nigeria",
    applicants: 301,
    created: "2022-09-20",
    expiry: "2023-08-10",
    status: "Published",
    featured: true,
    flagged: false,
  },
];

const statusStyle = {
  Published: "bg-emerald-600/15 text-emerald-500",
  Expired: "bg-red-600/15 text-red-500",
};

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const sortOptions = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "applicants-desc", label: "Most applicants" },
  { value: "title-asc", label: "Title (A-Z)" },
];

const PAGE_SIZE = 4;

export const ManageJobs = () => {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [jobs, setJobs] = useState(seedJobs);
  const [activeJob, setActiveJob] = useState(null);

  const toggleFlag = (id) => {
    setJobs((prev) =>
      prev.map((j) => (j.id === id ? { ...j, flagged: !j.flagged } : j)),
    );
    const job = jobs.find((j) => j.id === id);
    toast.success(
      job && !job.flagged
        ? `"${job.title}" flagged for review`
        : `Flag removed from "${job?.title}"`,
    );
  };

  const deleteJob = (job) => {
    setJobs((prev) => prev.filter((j) => j.id !== job.id));
    toast.success(`"${job.title}" deleted`);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = jobs.filter(
      (j) =>
        !q ||
        j.title.toLowerCase().includes(q) ||
        j.location.toLowerCase().includes(q),
    );
    rows = [...rows].sort((a, b) => {
      switch (sort) {
        case "oldest":
          return new Date(a.created) - new Date(b.created);
        case "applicants-desc":
          return b.applicants - a.applicants;
        case "title-asc":
          return a.title.localeCompare(b.title);
        case "newest":
        default:
          return new Date(b.created) - new Date(a.created);
      }
    });
    return rows;
  }, [jobs, search, sort]);

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
          Manage Job
        </h1>
      </div>

      <div className="bg-[#1A1A1E] rounded-lg p-6 border border-white/5">
        <ListToolbar
          search={search}
          onSearchChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Search by title or location"
          sortOptions={sortOptions}
          sortValue={sort}
          onSortChange={setSort}
        />

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px]">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-white/5">
                <th className="pb-3 font-medium">Jobs</th>
                <th className="pb-3 font-medium">Applicants</th>
                <th className="pb-3 font-medium">Created &amp; Expiry</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="py-10 text-center text-gray-500 text-sm"
                  >
                    No jobs match "{search}"
                  </td>
                </tr>
              )}
              {paginated.map((job) => (
                <tr key={job.id}>
                  <td className="py-5 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-semibold">
                        {job.title}
                      </span>
                      {job.featured && (
                        <span className="w-5 h-5 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                          <Zap className="w-3 h-3 text-white fill-white" />
                        </span>
                      )}
                      {job.flagged && (
                        <span className="px-2 py-0.5 rounded-md bg-orange-500/15 text-orange-400 text-xs">
                          Flagged
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-gray-500 text-sm mt-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {job.location}
                    </div>
                  </td>
                  <td className="py-5 pr-4 text-gray-300 text-sm whitespace-nowrap">
                    {job.applicants} Applicants
                  </td>
                  <td className="py-5 pr-4 text-sm whitespace-nowrap">
                    <div className="text-gray-300">
                      Created: {formatDate(job.created)}
                    </div>
                    <div className="text-gray-500">
                      Expiry date: {formatDate(job.expiry)}
                    </div>
                  </td>
                  <td className="py-5 pr-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${statusStyle[job.status]}`}
                    >
                      {job.status}
                    </span>
                  </td>
                  <td className="py-5">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        title={job.flagged ? "Remove Flag" : "Flag Job"}
                        onClick={() => toggleFlag(job.id)}
                        className={`w-9 h-9 rounded-sm flex items-center justify-center text-white transition-colors ${
                          job.flagged
                            ? "bg-orange-500 hover:bg-orange-600"
                            : "bg-blue-600 hover:bg-blue-700"
                        }`}
                      >
                        <Flag className="w-4 h-4" />
                      </button>
                      <button
                        title="Delete Job"
                        onClick={() => deleteJob(job)}
                        className="w-9 h-9 rounded-sm bg-red-600 hover:bg-red-700 flex items-center justify-center text-white transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setActiveJob(job)}
                        className="px-4 py-2 rounded-sm bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium whitespace-nowrap transition-colors"
                      >
                        View Job Info
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

      <Modal
        open={!!activeJob}
        onClose={() => setActiveJob(null)}
        maxWidth="max-w-lg"
      >
        {activeJob && (
          <div className="p-6">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold text-white">
                {activeJob.title}
              </h3>
              {activeJob.featured && (
                <span className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-3 h-3 text-white fill-white" />
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-gray-500 text-sm mb-5">
              <MapPin className="w-3.5 h-3.5" />
              {activeJob.location}
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <span className="flex items-center gap-2 text-gray-400">
                  <Users className="w-4 h-4" /> Applicants
                </span>
                <span className="text-white font-medium">
                  {activeJob.applicants}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <span className="flex items-center gap-2 text-gray-400">
                  <CalendarClock className="w-4 h-4" /> Created
                </span>
                <span className="text-white font-medium">
                  {formatDate(activeJob.created)}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <span className="flex items-center gap-2 text-gray-400">
                  <CalendarClock className="w-4 h-4" /> Expiry date
                </span>
                <span className="text-white font-medium">
                  {formatDate(activeJob.expiry)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Status</span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${statusStyle[activeJob.status]}`}
                >
                  {activeJob.status}
                </span>
              </div>
            </div>

            <button
              onClick={() => setActiveJob(null)}
              className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#2A2A2E] hover:bg-white/10 text-white text-sm font-medium transition-colors"
            >
              <X className="w-4 h-4" /> Close
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ManageJobs;
