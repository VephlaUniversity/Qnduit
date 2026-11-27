
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { browserSessions } from "../utils/requestSafety";
import { API_BASE_URL } from "../utils/api";
import { friendlyError } from "../utils/userMessage";
import { useToast } from "../hooks/useToast";
import axios from "axios";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  ExternalLink,
  Globe,
  Loader2,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";

const emptyForm = () => ({
  title: "",
  slug: "",
  targetRole: "",
  introduction: "",
  selectedProjects: [],
});

const referenceKey = project =>
  JSON.stringify([
    project.source,
    project.identityType,
    project.projectId,
  ]);

const inputClass =
  "w-full rounded-lg border border-white/10 bg-[#0E0E10] px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500";

const actionClass =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-gray-200 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40";

export default function TalentPortfolioVersions() {
  const { user } = useAuth();
  const { toast } = useToast();

  const actor = user?.userType === "talent"
    ? `talent:${user.id || user._id}`
    : null;

  const token = browserSessions().find(
    owner => owner.actor === actor
  )?.token;

  const ownerKey = actor && token ? `${actor}:${token}` : null;

  const [versions, setVersions] = useState([]);
  const [projects, setProjects] = useState([]);
  const [unavailableProjects, setUnavailableProjects] = useState(0);

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [error, setError] = useState("");
  const [accessDenied, setAccessDenied] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);

  const options = useMemo(
    () => ({
      headers: { Authorization: `Bearer ${token}` },
    }),
    [token]
  );

  const currentOwner = useCallback(
    () => Boolean(
      ownerKey &&
      browserSessions().some(
        owner => owner.actor === actor && owner.token === token
      )
    ),
    [ownerKey, actor, token]
  );

  const loadData = useCallback(async (signal) => {
    if (!ownerKey || !currentOwner()) {
      setLoading(false);
      setError("Sign in with your Talent account to manage portfolio versions.");
      return;
    }

    setLoading(true);
    setError("");
    setAccessDenied(false);

    try {
      const requestOptions = { ...options, signal };

      const [versionsResponse, projectsResponse] = await Promise.all([
        axios.get(
          `${API_BASE_URL}/api/talents/portfolio-versions`,
          requestOptions
        ),
        axios.get(
          `${API_BASE_URL}/api/talents/portfolio-versions/projects`,
          requestOptions
        ),
      ]);

      if (signal?.aborted || !currentOwner()) return;

      setVersions(versionsResponse.data?.versions || []);
      setProjects(projectsResponse.data?.projects || []);
      setUnavailableProjects(
        projectsResponse.data?.unavailableProjects || 0
      );
    } catch (requestError) {
      if (signal?.aborted) return;

      if (
        requestError.response?.status === 403 &&
        requestError.response?.data?.code === "PAID_SUBSCRIPTION_REQUIRED"
      ) {
        setAccessDenied(true);
        setError("An active paid Talent subscription is required to use Targeted Portfolio Versions.");
      } else {
        setError(
          friendlyError(
            requestError,
            "We couldn't load your portfolio versions. Please try again."
          )
        );
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [ownerKey, currentOwner, options]);

  useEffect(() => {
    const controller = new AbortController();
    loadData(controller.signal);
    return () => controller.abort();
  }, [loadData]);

  const closeEditor = () => {
    setEditorOpen(false);
    setEditingId(null);
    setForm(emptyForm());
    };

    const startCreate = () => {
    setEditorOpen(true);
    setEditingId(null);
    setForm(emptyForm());
    setError("");
    };

    const startEdit = version => {
    setEditorOpen(true);
    setEditingId(version.id);
    setForm({
        title: version.title || "",
        slug: version.slug || "",
        targetRole: version.targetRole || "",
        introduction: version.introduction || "",
        selectedProjects: version.selectedProjects || [],
    });
    setError("");
    };

  const updateField = (field, value) => {
    setForm(previous => ({ ...previous, [field]: value }));
  };

  const isSelected = project =>
    form.selectedProjects.some(
      selected => referenceKey(selected) === referenceKey(project)
    );

  const toggleProject = project => {
    setForm(previous => {
      const exists = previous.selectedProjects.some(
        selected => referenceKey(selected) === referenceKey(project)
      );

      if (exists) {
        return {
          ...previous,
          selectedProjects: previous.selectedProjects.filter(
            selected => referenceKey(selected) !== referenceKey(project)
          ),
        };
      }

      if (previous.selectedProjects.length >= 20) {
        toast({
          title: "Project limit reached",
          description: "A targeted version can contain up to 20 projects.",
          variant: "destructive",
        });
        return previous;
      }

      return {
        ...previous,
        selectedProjects: [
          ...previous.selectedProjects,
          {
            source: project.source,
            identityType: project.identityType,
            projectId: project.projectId,
          },
        ],
      };
    });
  };

  const moveProject = (index, direction) => {
    setForm(previous => {
      const target = index + direction;

      if (
        target < 0 ||
        target >= previous.selectedProjects.length
      ) {
        return previous;
      }

      const selectedProjects = [...previous.selectedProjects];

      [
        selectedProjects[index],
        selectedProjects[target],
      ] = [
        selectedProjects[target],
        selectedProjects[index],
      ];

      return { ...previous, selectedProjects };
    });
  };

  const saveVersion = async event => {
    event.preventDefault();

    if (!currentOwner() || saving) return;

    const title = form.title.trim();
    const targetRole = form.targetRole.trim();
    const introduction = form.introduction.trim();

    if (title.length < 2) {
      setError("Enter a portfolio version title.");
      return;
    }

    const payload = {
      title,
      targetRole,
      introduction,
      selectedProjects: form.selectedProjects,
    };

    const slug = form.slug.trim().toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    if (slug) payload.slug = slug;

    setSaving(true);
    setError("");

    try {
      const response = editingId
        ? await axios.patch(
            `${API_BASE_URL}/api/talents/portfolio-versions/${editingId}`,
            payload,
            options
          )
        : await axios.post(
            `${API_BASE_URL}/api/talents/portfolio-versions`,
            payload,
            options
          );

      if (!currentOwner()) return;

      const saved = response.data.version;

      setVersions(previous => {
        const exists = previous.some(row => row.id === saved.id);

        return exists
          ? previous.map(row => row.id === saved.id ? saved : row)
          : [saved, ...previous];
      });

      closeEditor();

      toast({
        title: "Saved",
        description: editingId
          ? "Your portfolio version has been updated."
          : "Your portfolio version has been created as a draft.",
      });
    } catch (requestError) {
      const message = friendlyError(
        requestError,
        "Unable to save this portfolio version."
      );
      setError(message);

      toast({
        title: "Unable to save",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const runVersionAction = async (version, action) => {
    if (!currentOwner() || actionId) return;

    setActionId(version.id);
    setError("");

    try {
      if (action === "delete") {
        await axios.delete(
          `${API_BASE_URL}/api/talents/portfolio-versions/${version.id}`,
          options
        );

        setVersions(previous =>
          previous.filter(row => row.id !== version.id)
        );

        if (editingId === version.id) closeEditor();

      } else {
        const response = await axios.post(
          `${API_BASE_URL}/api/talents/portfolio-versions/${version.id}/${action}`,
          {},
          options
        );

        setVersions(previous =>
          previous.map(row =>
            row.id === version.id ? response.data.version : row
          )
        );
      }

      toast({
        title: "Updated",
        description: action === "publish"
          ? "Your targeted portfolio is now published."
          : action === "unpublish"
            ? "Your targeted portfolio is now a draft."
            : "Your portfolio version has been deleted.",
      });
    } catch (requestError) {
      const message = friendlyError(
        requestError,
        "We couldn't complete that action."
      );

      setError(message);

      toast({
        title: "Action failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setActionId(null);
    }
  };

  const copyLink = async version => {
    if (!version.sharePath) return;

    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}${version.sharePath}`
      );

      toast({
        title: "Link copied",
        description: "Your targeted portfolio link is ready to share.",
      });
    } catch {
      toast({
        title: "Unable to copy link",
        description: "Open the published portfolio and copy its URL from the browser.",
        variant: "destructive",
      });
    }
  };

  const previewVersion = version => {
    if (!version.sharePath) return;

    window.open(
      version.sharePath,
      "_blank",
      "noopener,noreferrer"
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center gap-3 text-gray-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading targeted portfolio versions...
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-[#0E0E10] p-4 md:p-8">
        <div className="mx-auto max-w-4xl space-y-4 rounded-xl border border-white/10 bg-[#1A1A1E] p-6">
          <h1 className="text-2xl font-semibold text-white">
            Targeted Portfolio Versions
          </h1>
          <p className="text-sm leading-6 text-gray-300">{error}</p>
          <a
            href="/talent-dashboard/my-plan"
            className="inline-flex min-h-11 items-center rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-500"
          >
            View subscription
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0E0E10] p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-white md:text-3xl">
              Targeted Portfolio Versions
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
              Create tailored portfolios for different roles using your existing projects.
              Each version has its own introduction, project selection and shareable link.
            </p>
          </div>

          {!editorOpen && (
            <button
              type="button"
              onClick={startCreate}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500"
            >
              <Plus className="h-4 w-4" />
              Create version
            </button>
          )}
        </header>

        {error && (
          <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </p>
        )}

        {unavailableProjects > 0 && (
          <p className="text-sm text-amber-300">
            {unavailableProjects} project(s) have identifiers that need review and cannot currently be selected.
          </p>
        )}

        {editorOpen && (
          <form
            onSubmit={saveVersion}
            className="space-y-6 rounded-xl border border-white/10 bg-[#1A1A1E] p-5 md:p-6"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-white">
                {editingId ? "Edit portfolio version" : "Create portfolio version"}
              </h2>
              <button
                type="button"
                onClick={closeEditor}
                className="rounded-lg p-2 text-gray-400 hover:bg-white/5 hover:text-white"
                aria-label="Close editor"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm text-gray-300">
                Portfolio title
                <input
                  className={inputClass}
                  value={form.title}
                  onChange={event => updateField("title", event.target.value)}
                  maxLength={100}
                  required
                  placeholder="Data Analyst Portfolio"
                />
              </label>

              <label className="space-y-2 text-sm text-gray-300">
                URL slug
                <input
                  className={inputClass}
                  value={form.slug}
                  onChange={event => updateField("slug", event.target.value)}
                  maxLength={64}
                  placeholder="data-analyst"
                />
                <span className="block text-xs text-gray-500">
                  Leave blank to generate it from the title when creating.
                </span>
              </label>

              <label className="space-y-2 text-sm text-gray-300 md:col-span-2">
                Target role
                <input
                  className={inputClass}
                  value={form.targetRole}
                  onChange={event => updateField("targetRole", event.target.value)}
                  maxLength={100}
                  placeholder="Data Analyst"
                />
              </label>
            </div>

            <label className="block space-y-2 text-sm text-gray-300">
              Custom introduction
              <textarea
                className={`${inputClass} min-h-32 resize-y`}
                value={form.introduction}
                onChange={event => updateField("introduction", event.target.value)}
                maxLength={5000}
                placeholder="Introduce yourself for this particular opportunity..."
              />
              <span className="block text-right text-xs text-gray-500">
                {form.introduction.length}/5000
              </span>
            </label>

            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-white">Selected projects</h3>
                  <p className="mt-1 text-xs text-gray-400">
                    Arrange these in the order you want employers to see them.
                  </p>
                </div>
                <span className="text-sm text-gray-400">
                  {form.selectedProjects.length}/20 selected
                </span>
              </div>

              {form.selectedProjects.length === 0 && (
                <p className="rounded-lg border border-dashed border-white/15 p-4 text-sm text-gray-500">
                  No projects selected yet.
                </p>
              )}

              <div className="space-y-2">
                {form.selectedProjects.map((selected, index) => {
                  const project = projects.find(
                    item => referenceKey(item) === referenceKey(selected)
                  );

                  return (
                    <div
                      key={referenceKey(selected)}
                      className="flex flex-wrap items-center gap-3 rounded-lg border border-white/10 bg-[#0E0E10] p-3"
                    >
                      <span className="w-6 text-sm text-gray-500">{index + 1}.</span>

                      {project?.imageUrl ? (
                        <img
                          src={project.imageUrl}
                          alt=""
                          className="h-12 w-16 rounded object-cover"
                        />
                      ) : (
                        <div className="h-12 w-16 rounded bg-white/5" />
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="break-words text-sm font-medium text-white">
                          {project?.title || "Unavailable project"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {selected.source === "talent" ? "Talent portfolio" : "Resume gallery"}
                        </p>
                      </div>

                      <button
                        type="button"
                        className={actionClass}
                        disabled={index === 0}
                        onClick={() => moveProject(index, -1)}
                        aria-label={`Move ${project?.title || "project"} up`}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        className={actionClass}
                        disabled={index === form.selectedProjects.length - 1}
                        onClick={() => moveProject(index, 1)}
                        aria-label={`Move ${project?.title || "project"} down`}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        className={actionClass}
                        onClick={() => updateField(
                          "selectedProjects",
                          form.selectedProjects.filter(
                            (_, selectedIndex) => selectedIndex !== index
                          )
                        )}
                      >
                        <X className="h-4 w-4" />
                        Remove
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="font-semibold text-white">Choose from your projects</h3>

              {projects.length === 0 ? (
                <p className="text-sm text-gray-400">
                  You don't have any selectable portfolio projects yet.
                  Add projects on your Resumes page first.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {projects.map(project => {
                    const selected = isSelected(project);

                    return (
                      <label
                        key={referenceKey(project)}
                        className={`flex cursor-pointer gap-3 rounded-lg border p-3 transition ${
                          selected
                            ? "border-blue-500 bg-blue-500/10"
                            : "border-white/10 bg-[#0E0E10] hover:border-white/25"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleProject(project)}
                          className="mt-1 h-4 w-4 accent-blue-500"
                        />

                        {project.imageUrl ? (
                          <img
                            src={project.imageUrl}
                            alt=""
                            className="h-16 w-20 shrink-0 rounded object-cover"
                          />
                        ) : (
                          <div className="h-16 w-20 shrink-0 rounded bg-white/5" />
                        )}

                        <span className="min-w-0">
                          <span className="block break-words text-sm font-medium text-white">
                            {project.title}
                          </span>
                          <span className="mt-1 block text-xs text-gray-500">
                            {project.source === "talent" ? "Talent portfolio" : "Resume gallery"}
                          </span>
                          {project.description && (
                            <span className="mt-1 line-clamp-2 block text-xs text-gray-400">
                              {project.description}
                            </span>
                          )}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </section>

            <div className="flex flex-wrap gap-3 border-t border-white/10 pt-5">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
              >
                {saving
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Save className="h-4 w-4" />}
                {editingId ? "Save changes" : "Create draft"}
              </button>

              <button
                type="button"
                onClick={closeEditor}
                disabled={saving}
                className={actionClass}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-white">
            Your portfolio versions
          </h2>

          {versions.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-[#1A1A1E] p-8 text-center">
              <Globe className="mx-auto h-8 w-8 text-blue-400" />
              <p className="mt-3 font-medium text-white">
                No targeted versions yet
              </p>
              <p className="mt-2 text-sm text-gray-400">
                Create a version to tailor your portfolio to a specific opportunity.
              </p>
              <button
                type="button"
                onClick={startCreate}
                className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500"
              >
                <Plus className="h-4 w-4" />
                Create your first version
              </button>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {versions.map(version => (
                <article
                  key={version.id}
                  className="space-y-4 rounded-xl border border-white/10 bg-[#1A1A1E] p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="break-words font-semibold text-white">
                        {version.title}
                      </h3>
                      {version.targetRole && (
                        <p className="mt-1 text-sm text-gray-400">
                          {version.targetRole}
                        </p>
                      )}
                      <p className="mt-2 text-xs text-gray-500">
                        /portfolio/{user?.username || "your-username"}/{version.slug}
                      </p>
                    </div>

                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs ${
                      version.status === "published"
                        ? "bg-green-500/10 text-green-300"
                        : "bg-white/5 text-gray-400"
                    }`}>
                      {version.status === "published" ? "Published" : "Draft"}
                    </span>
                  </div>

                  <p className="text-sm text-gray-400">
                    {version.selectedProjects?.length || 0} selected project(s)
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={actionClass}
                      onClick={() => startEdit(version)}
                    >
                      Edit
                    </button>

                    {version.status === "draft" ? (
                      <button
                        type="button"
                        className={actionClass}
                        disabled={actionId === version.id}
                        onClick={() => runVersionAction(version, "publish")}
                      >
                        Publish
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          className={actionClass}
                          onClick={() => previewVersion(version)}
                        >
                          <ExternalLink className="h-4 w-4" />
                          Preview
                        </button>
                        <button
                          type="button"
                          className={actionClass}
                          onClick={() => copyLink(version)}
                        >
                          <Copy className="h-4 w-4" />
                          Copy link
                        </button>
                        <button
                          type="button"
                          className={actionClass}
                          disabled={actionId === version.id}
                          onClick={() => runVersionAction(version, "unpublish")}
                        >
                          Unpublish
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      className={`${actionClass} text-red-300`}
                      disabled={actionId === version.id}
                      onClick={() => {
                        if (window.confirm(`Delete "${version.title}"? This will not delete its original projects.`)) {
                          runVersionAction(version, "delete");
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
