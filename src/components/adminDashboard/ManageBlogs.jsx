import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { Button } from "../ui/button";
import JobFormSelect from "../jobs/JobFormSelect";
import { PaginationBar } from "./PaginationBar";
import { API_BASE_URL } from "../utils/api";
import { browserSessions } from "../utils/requestSafety";
import { friendlyError, safeText } from "../utils/userMessage";
import { formatAdminProfileDate } from "../utils/adminProfile";
import { createAdminBlogClient, validateBlogDraft, blogFormData, blogEditDraft } from "../utils/adminBlog";
import { BLOG_LIMITS } from "../../../backend/src/utils/blogValidation.js";

const readOwner = () => browserSessions().find(row => row.actor.startsWith("admin:"));
const inputClass = "w-full min-w-0 rounded-lg border border-white/10 bg-[#0E0E10] p-3 text-sm text-white focus:border-blue-500 focus:outline-none";
const primaryClass = "min-h-11 bg-blue-600 px-4 text-white hover:bg-blue-700";
const secondaryClass = "min-h-11 border border-white/10 px-4 text-gray-300 hover:bg-white/5";
const blank = author => ({ title: "", excerpt: "", category: "", author: author || "", status: "draft", content: [{ type: "paragraph", text: "" }] });

export default function ManageBlogs() {
  const { adminUser } = useAuth();
  return <BlogManagement key={adminUser?.id || adminUser?._id} author={adminUser?.name} />;
}

function BlogManagement({ author }) {
  const client = useMemo(() => createAdminBlogClient({ client: axios, baseUrl: API_BASE_URL, readOwner, storage: sessionStorage }), []);
  const [posts, setPosts] = useState([]), [pagination, setPagination] = useState({ totalPages: 1, total: 0 });
  const [page, setPage] = useState(1), [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true), [error, setError] = useState("");
  const [editing, setEditing] = useState(false), [draft, setDraft] = useState(() => blank(author));
  const [savedPost, setSavedPost] = useState(null), [editBlocked, setEditBlocked] = useState(false), [editLoading, setEditLoading] = useState(false);
  const [cover, setCover] = useState(null), [preview, setPreview] = useState("");
  const [errors, setErrors] = useState({}), [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false), [expired, setExpired] = useState(false);
  const [uncertain, setUncertain] = useState(() => client.hasUncertain()), [reviewed, setReviewed] = useState(false);
  const mounted = useRef(false), writeLock = useRef(false), formHeading = useRef(null), fileInput = useRef(null);
  const keys = useRef([0]), nextKey = useRef(1);
  useEffect(() => {
    mounted.current = true;
    const owner = JSON.stringify(readOwner());
    const changed = () => {
      if (JSON.stringify(readOwner()) !== owner) {
        client.cancel(); setPosts([]); setEditing(false); setSavedPost(null); setDraft(blank("")); setCover(null); setExpired(true); setError("Your Admin session changed. Reload before continuing.");
      }
    };
    window.addEventListener("storage", changed); window.addEventListener("qnduit:polling-session-changed", changed);
    return () => { mounted.current = false; client.cancel(); window.removeEventListener("storage", changed); window.removeEventListener("qnduit:polling-session-changed", changed); };
  }, [client]);
  useEffect(() => {
    if (expired) return;
    let current = true;
    setLoading(true); setError("");
    client.list(page).then(data => {
      if (!current || !data) return;
      if (page > data.pagination.totalPages) { setPage(data.pagination.totalPages); return; }
      setPosts(data.data); setPagination(data.pagination);
      if (client.hasUncertain()) setReviewed(client.reviewReady());
    }).catch(problem => { if (current) { setPosts([]); setError(friendlyError(problem, "Unable to load blog posts. Try refreshing.")); } })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [client, expired, page, reload]);
  useEffect(() => {
    if (!cover) { setPreview(""); return; }
    const url = URL.createObjectURL(cover); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [cover]);
  const reset = () => { setSavedPost(null); setEditBlocked(false); setDraft(blank(author)); setCover(null); setErrors({}); setFormError(""); keys.current = [nextKey.current++]; if (fileInput.current) fileInput.current.value = ""; };
  const open = () => { reset(); setEditing(true); requestAnimationFrame(() => formHeading.current?.focus()); };
  const loadEdit = async (post, reviewing = false) => {
    if (writeLock.current || expired) return;
    writeLock.current = true; setPending(true); setEditLoading(true); setError("");
    try {
      const data = reviewing ? await client.reviewUpdate(post.id) : await client.details(post.id);
      if (!mounted.current || !data) return;
      reset(); setSavedPost(data.post); setDraft(blogEditDraft(data.post)); keys.current = data.post.content.map(() => nextKey.current++);
      setEditBlocked(client.hasUncertainUpdate(post.id)); setEditing(true);
      setPosts(rows => rows.map(row => row.id === data.post.id ? data.post : row));
      requestAnimationFrame(() => formHeading.current?.focus());
    } catch (problem) { if (mounted.current) { const message = friendlyError(problem, "Unable to load the saved post. Please try again."); if (reviewing) setFormError(message); else setError(message); } }
    finally { writeLock.current = false; if (mounted.current) { setPending(false); setEditLoading(false); } }
  };
  const clearError = key => { setErrors(previous => { const next = { ...previous }; delete next[key]; return next; }); setFormError(""); };
  const field = (key, value) => { setDraft(previous => ({ ...previous, [key]: value })); clearError(key); };
  const blockChange = (index, value) => { setDraft(previous => ({ ...previous, content: previous.content.map((block, i) => i === index ? value : block) })); clearError("content"); };
  const move = (index, offset) => {
    const content = [...draft.content], ids = [...keys.current];
    [content[index], content[index + offset]] = [content[index + offset], content[index]];
    [ids[index], ids[index + offset]] = [ids[index + offset], ids[index]];
    keys.current = ids; field("content", content);
  };
  const save = async event => {
    event.preventDefault();
    if (writeLock.current || expired || uncertain || editBlocked) return;
    const checked = validateBlogDraft(draft, cover, { editing: !!savedPost }); setErrors(checked.errors); setFormError("");
    if (Object.keys(checked.errors).length) { setFormError("Please check the highlighted blog fields."); requestAnimationFrame(() => document.getElementById(`blog-${Object.keys(checked.errors)[0]}`)?.focus()); return; }
    writeLock.current = true; setPending(true);
    try {
      const data = savedPost ? await client.update(savedPost, blogFormData(checked.data, cover, savedPost)) : await client.create(blogFormData(checked.data, cover));
      if (!mounted.current || !data) return;
      setEditing(false); reset(); if (!savedPost) setPage(1); setReload(value => value + 1); toast.success(savedPost ? "Blog post updated" : data.post.status === "draft" ? "Blog draft saved" : "Blog post published");
    } catch (problem) {
      if (!mounted.current) return;
      if (problem.uncertain) { setUncertain(true); setReviewed(false); setFormError(problem.message); }
      else if (savedPost && (problem.uncertainUpdate || problem.response?.status === 409)) { setEditBlocked(true); setFormError(problem.uncertainUpdate ? problem.message : "This post changed. Reload the saved post before editing again."); }
      else { setFormError(friendlyError(problem, "Unable to save the blog post.")); setErrors(Object.fromEntries(Object.entries(problem.response?.data?.errors || {}).map(([key, value]) => [key, safeText(value, "Please check this field.")]))); }
    } finally { writeLock.current = false; if (mounted.current) setPending(false); }
  };
  const publish = async post => {
    if (writeLock.current || expired) return;
    writeLock.current = true; setPending(true); setError("");
    try { const data = await client.publish(post.id); if (mounted.current && data) { setPosts(rows => rows.map(row => row.id === post.id ? data.post : row)); toast.success("Blog post published"); } }
    catch (problem) { if (mounted.current) setError(friendlyError(problem, "Publication could not be confirmed. Refresh the posts before trying again.")); }
    finally { writeLock.current = false; if (mounted.current) setPending(false); }
  };
  const fieldError = key => errors[key] && <p id={`blog-${key}-error`} role="alert" className="mt-2 text-sm text-red-400">{errors[key]}</p>;
  return <div className="min-w-0 p-4 md:p-6 lg:p-8">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div><h1 className="text-2xl font-semibold text-white">Blog Management</h1><p className="mt-2 text-sm text-gray-400">Create articles and publish saved drafts.</p></div>
      <Button type="button" className={primaryClass} disabled={pending || expired || uncertain || editing} onClick={open}><Plus aria-hidden="true" />Create post</Button>
    </div>
    {uncertain && <div role="alert" className="mb-6 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-200">
      <p>This post may have been saved. Refresh and review the posts before starting another creation. Do not submit it again.</p>
      <div className="mt-3 flex flex-wrap gap-3"><Button type="button" className={secondaryClass} disabled={loading || pending || expired} onClick={() => { setPage(1); setReload(value => value + 1); }}>Refresh posts</Button>
        <Button type="button" className={`${secondaryClass} h-auto max-w-full whitespace-normal py-2 text-left`} disabled={!reviewed || loading || !!error || pending || expired} onClick={() => { client.acknowledgeReview(); setUncertain(false); setReviewed(false); setEditing(false); reset(); }}>I reviewed the list — discard this form</Button></div>
    </div>}
    {editLoading && <p role="status" className="mb-4 text-sm text-gray-400">Loading saved post…</p>}
    {editing && <section className="mb-8 rounded-lg border border-white/10 bg-[#1A1A1E] p-4 md:p-6" aria-labelledby="blog-form-heading">
      <h2 id="blog-form-heading" ref={formHeading} tabIndex={-1} className="mb-5 text-xl font-semibold text-white">{savedPost ? "Edit blog post" : "Create blog post"}</h2>
      <form noValidate onSubmit={save}>
        {formError && <p role="alert" className="mb-4 text-sm text-red-400">{formError}</p>}
        {editBlocked && <div role="alert" className="mb-4 rounded-lg border border-yellow-500/30 p-4 text-sm text-yellow-200"><p>Reload the saved post to review its current contents before editing again. This will discard the current form.</p><Button type="button" className={`${secondaryClass} mt-3`} disabled={pending || expired} onClick={() => loadEdit(savedPost, true)}>Reload saved post</Button></div>}
        <fieldset disabled={pending || uncertain || editBlocked || expired} className="min-w-0 space-y-5 disabled:opacity-70">
          <div className="grid min-w-0 grid-cols-1 gap-5 md:grid-cols-2">
            {[['title', 'Title'], ['category', 'Category'], ['author', 'Author display name']].map(([key, label]) => <div key={key} className={key === 'title' ? 'md:col-span-2' : ''}>
              <label htmlFor={`blog-${key}`} className="mb-2 block text-sm text-white">{label} <span className="text-red-400">*</span></label>
              <input id={`blog-${key}`} name={key} value={draft[key]} onChange={event => field(key, event.target.value)} maxLength={BLOG_LIMITS[key]} required aria-invalid={!!errors[key]} aria-describedby={errors[key] ? `blog-${key}-error` : undefined} className={inputClass} />{fieldError(key)}
            </div>)}
          </div>
          <div><label htmlFor="blog-excerpt" className="mb-2 block text-sm text-white">Excerpt <span className="text-red-400">*</span></label><textarea id="blog-excerpt" value={draft.excerpt} onChange={event => field("excerpt", event.target.value)} maxLength={BLOG_LIMITS.excerpt} rows={3} required aria-invalid={!!errors.excerpt} aria-describedby={errors.excerpt ? "blog-excerpt-error" : undefined} className={inputClass} />{fieldError("excerpt")}</div>
          <div><label htmlFor="blog-coverImage" className="mb-2 block text-sm text-white">Featured cover image {!savedPost && <span className="text-red-400">*</span>}</label>
            <input ref={fileInput} id="blog-coverImage" type="file" accept=".png,.jpg,.jpeg,image/png,image/jpeg" onChange={event => { setCover(event.target.files?.[0] || null); clearError("coverImage"); }} aria-invalid={!!errors.coverImage} aria-describedby={`blog-cover-help${errors.coverImage ? " blog-coverImage-error" : ""}`} className={`${inputClass} file:mr-3 file:rounded file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-white`} />
            <p id="blog-cover-help" className="mt-2 text-xs text-gray-400">JPEG or PNG, up to 10 MiB and 40 megapixels. {savedPost ? "Leave blank to keep the existing cover." : "Required for drafts and published posts."}</p>{fieldError("coverImage")}
            {(preview || savedPost?.image) && <div className="mt-3 flex flex-wrap items-start gap-3"><img src={preview || savedPost.image} alt={preview ? "Selected blog cover preview" : "Current blog cover"} className="h-32 w-52 max-w-full rounded-lg object-cover" />{preview && <Button type="button" className={secondaryClass} onClick={() => { setCover(null); fileInput.current.value = ""; }}>Remove cover</Button>}</div>}
          </div>
          <div id="blog-content" tabIndex={-1} aria-describedby={errors.content ? "blog-content-error" : "blog-content-help"}>
            <h3 className="mb-2 text-sm font-medium text-white">Article content <span className="text-red-400">*</span></h3>
            <p id="blog-content-help" className="mb-4 text-xs text-gray-400">Add up to 100,000 characters</p>{fieldError("content")}
            <div className="space-y-4">{draft.content.map((block, index) => <div key={keys.current[index]} className="min-w-0 rounded-lg border border-white/10 bg-[#0E0E10] p-3 md:p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><label htmlFor={`blog-block-type-${keys.current[index]}`} className="text-sm text-gray-300">Block {index + 1}</label>
                <div className="flex flex-wrap gap-2"><Button type="button" variant="ghost" aria-label={`Move block ${index + 1} up`} disabled={index === 0} onClick={() => move(index, -1)} className="min-h-11 text-gray-300"><ArrowUp /></Button><Button type="button" variant="ghost" aria-label={`Move block ${index + 1} down`} disabled={index === draft.content.length - 1} onClick={() => move(index, 1)} className="min-h-11 text-gray-300"><ArrowDown /></Button><Button type="button" variant="ghost" aria-label={`Remove block ${index + 1}`} disabled={draft.content.length === 1} onClick={() => { keys.current.splice(index, 1); field("content", draft.content.filter((_, i) => i !== index)); }} className="min-h-11 text-gray-300"><Trash2 /></Button></div>
              </div>
              <JobFormSelect id={`blog-block-type-${keys.current[index]}`} aria-label={`Block ${index + 1} type`} value={block.type} onChange={event => blockChange(index, { type: event.target.value, [event.target.value === "image" ? "src" : "text"]: "" })} className={`${inputClass} mb-3`}>
                {['paragraph', 'heading', 'quote', 'image'].map(type => <option key={type} value={type}>{type[0].toUpperCase() + type.slice(1)}</option>)}
              </JobFormSelect>
              <label htmlFor={`blog-block-value-${keys.current[index]}`} className="mb-2 block text-sm text-gray-300">{block.type === "image" ? "Image URL" : "Text"} <span className="sr-only">for block {index + 1}</span></label>
              {block.type === "image" ? <input id={`blog-block-value-${keys.current[index]}`} type="url" value={block.src} maxLength={2048} placeholder="https://res.cloudinary.com/…" onChange={event => blockChange(index, { ...block, src: event.target.value })} className={inputClass} /> : <textarea id={`blog-block-value-${keys.current[index]}`} value={block.text} maxLength={BLOG_LIMITS.blockText} rows={block.type === "paragraph" ? 5 : 2} onChange={event => blockChange(index, { ...block, text: event.target.value })} className={inputClass} />}
            </div>)}</div>
            <Button type="button" className={`${secondaryClass} mt-4`} disabled={draft.content.length >= BLOG_LIMITS.blocks} onClick={() => { keys.current.push(nextKey.current++); field("content", [...draft.content, { type: "paragraph", text: "" }]); }}><Plus />Add block</Button>
          </div>
          {savedPost ? <p className="text-sm text-gray-400">Status: {savedPost.status === "draft" ? "Draft" : "Published"}. Publication is managed separately from editing.</p> : <div className="max-w-sm"><label htmlFor="blog-status" className="mb-2 block text-sm text-white">Status</label><JobFormSelect id="blog-status" value={draft.status} onChange={event => field("status", event.target.value)} className={inputClass}><option value="draft">Draft</option><option value="published">Published</option></JobFormSelect>{fieldError("status")}</div>}
        </fieldset>
        <div className="mt-6 flex flex-wrap gap-3"><Button type="submit" className={primaryClass} disabled={pending || uncertain || editBlocked || expired}>{pending ? "Saving…" : savedPost ? "Save changes" : draft.status === "published" ? "Publish post" : "Save draft"}</Button><Button type="button" className={secondaryClass} disabled={pending} onClick={() => { setEditing(false); reset(); }}>Cancel</Button></div>
      </form>
    </section>}
    <section aria-label="Admin blog posts" aria-busy={loading} className="min-w-0 rounded-lg border border-white/5 bg-[#1A1A1E] p-4 md:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold text-white">Posts</h2><Button type="button" className={secondaryClass} disabled={loading || pending || expired} onClick={() => setReload(value => value + 1)}>Refresh posts</Button></div>
      {error && <p role="alert" className="mb-4 text-sm text-red-400">{error}</p>}
      {loading ? <p role="status" className="py-8 text-center text-gray-400">Loading blog posts…</p> : !error && posts.length === 0 ? <p className="py-8 text-center text-gray-400">No blog posts yet. Create your first post.</p> : !error && <div className="space-y-3">{posts.map(post => <article key={post.id} className="flex min-w-0 flex-col gap-4 rounded-lg border border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0"><div className="flex flex-wrap items-center gap-3"><h3 className="break-words text-base font-medium text-white">{post.title}</h3><span className={`rounded-full px-3 py-1 text-xs ${post.status === "published" ? "bg-emerald-600/15 text-emerald-400" : "bg-yellow-500/15 text-yellow-400"}`}>{post.status === "published" ? "Published" : "Draft"}</span></div><p className="mt-2 break-words text-sm text-gray-400">{post.excerpt}</p><p className="mt-2 break-words text-xs text-gray-500">{post.category} · {post.author} · Created {formatAdminProfileDate(post.createdAt)}{post.publishedAt ? ` · Published ${formatAdminProfileDate(post.publishedAt)}` : ''}</p></div>
        <div className="flex shrink-0 flex-wrap gap-2"><Button type="button" aria-label={`Edit ${post.title}`} className={secondaryClass} disabled={pending || expired || loading || editing || uncertain} onClick={() => loadEdit(post)}>Edit</Button>{post.status === "draft" && <Button type="button" aria-label={`Publish ${post.title}`} className={`${primaryClass} self-start sm:self-auto`} disabled={pending || expired || loading || editing} onClick={() => publish(post)}>Publish</Button>}</div>
      </article>)}</div>}
      {!loading && !error && pagination.totalPages > 1 && <div className="max-w-full overflow-x-auto"><PaginationBar page={page} totalPages={pagination.totalPages} onChange={value => { if (!pending) setPage(value); }} /></div>}
    </section>
  </div>;
}
