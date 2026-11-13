import { useId, useState } from "react";
import PublicTalentPresentation from "./PublicTalentPresentation";
import { Link } from "react-router-dom";
import { MapPin, Briefcase, ExternalLink } from "lucide-react";
import SkillBars from "./SkillBars";
import { PublicTalentGallery, PublicTalentImage, PublicTalentVideo } from "./PublicTalentMedia";
import JobDescriptionText from "../utils/JobDescriptionText";
import { portfolioExternalUrl, publicExternalUrl, publicPortfolioProjects, publicVideoUrl } from "../../../backend/src/utils/publicTalentProfile.js";
import { portfolioOverview } from "../../../backend/src/utils/portfolioCaseStudy.js";

const dateLabel = value => {
  if (!value) return "";
  if (/^present$/i.test(value) || /^\d{4}$/.test(value)) return value;
  if (/^\d{4}-\d{2}(?:-\d{2})?$/.test(value)) {
    const date = new Date(value.length === 7 ? `${value}-01T00:00:00Z` : `${value}T00:00:00Z`);
    if (Number.isFinite(date.getTime())) return new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric", ...(value.length === 10 ? { day: "numeric" } : {}), timeZone: "UTC" }).format(date);
  }
  return "";
};
const period = row => [dateLabel(row.startDate), dateLabel(row.endDate)].filter(Boolean).join(" – ");
const sectionClass = "rounded-2xl border border-white/5 bg-[#191D23] p-6 md:p-8";
const headingClass = "mb-5 text-xl font-semibold text-white";
const buttonClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm text-blue-400 transition-colors hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2";
const textClass = "break-words text-sm leading-7 text-gray-300 [overflow-wrap:anywhere]";
function History({ title, rows, owner }) {
  if (!rows?.length) return null;
  return <section className={sectionClass} aria-label={title}><h2 className={headingClass}>{title}</h2><div className="space-y-7">{rows.map((row, index) => <article key={index} className="border-l-2 border-blue-600 pl-5">
    {period(row) && <p className="mb-2 text-xs text-gray-400">{period(row)}</p>}
    {row.title && <h3 className="break-words font-semibold text-white">{owner === "academy" && <span className="sr-only">Degree level: </span>}{row.title}</h3>}{row[owner] && <p className="mt-1 break-words text-sm text-blue-400">{owner === "academy" && <span className="sr-only">Institution: </span>}{row[owner]}</p>}
    {row.description && <JobDescriptionText value={row.description} className={`mt-3 ${textClass}`} />}
  </article>)}</div></section>;
}
// Shared project presentation stays with the existing portfolio renderer. Native
// details supplies keyboard expansion and avoids an additional modal/route.
function ProjectCaseStudy({ item, number }) {
  const title = item.title || `Project ${number}`;
  const images = Array.isArray(item.images) ? item.images : [];
  const tools = item.toolsUsed || [], skills = item.skillsDemonstrated || [];
  const links = (item.links || []).map(link => ({ label: link.label, url: portfolioExternalUrl(link.url) })).filter(link => link.label && link.url);
  const legacyLink = portfolioExternalUrl(item.projectUrl);
  const video = publicVideoUrl(item.video);
  const comparison = images.some(image => image.comparisonLabel === "before") && images.some(image => image.comparisonLabel === "after");
  const cover = images[0];
  const overviewSource = ["canonical", "legacy", "none"].includes(item.overviewSource)
    ? item.overviewSource : portfolioOverview(item).source;
  const overview = overviewSource === "legacy" ? item.description || "" : item.overview;
  // Legacy content is displayed once in expanded details. Equality is used only
  // to omit redundant original text, never to choose an HTML/plain renderer.
  const showLegacyDescription = overviewSource !== "legacy" && item.description && item.description !== item.overview;
  const narrative = (heading, value) => value ? <section className="space-y-2" aria-label={heading}>
    <h4 className="font-semibold text-white">{heading}</h4><p className={`whitespace-pre-line ${textClass}`}>{value}</p>
  </section> : null;
  const chips = (values, label, selected = false) => values.length > 0 ? <ul aria-label={label} className="flex min-w-0 flex-wrap gap-2">
    {(selected ? values.slice(0, 3) : values).map(value => <li key={value} className="max-w-full break-words rounded-full bg-blue-500/10 px-3 py-1.5 text-xs text-blue-300 [overflow-wrap:anywhere]">{value}</li>)}
  </ul> : null;
  const hasDetails = item.overview || item.description || item.problemStatement || item.approach || item.results || item.role
    || tools.length || skills.length || item.skills?.length || images.length || links.length || legacyLink || video;
  return <article className="min-w-0 self-start overflow-hidden rounded-xl border border-white/10 bg-[#0F1419]" aria-label={title}>
    <header className="space-y-2 p-4">
      {item.featured === true && <p className="text-xs font-semibold uppercase tracking-wide text-blue-300">Featured project</p>}
      <h3 className="break-words font-semibold [overflow-wrap:anywhere]">{title}</h3>
    </header>
    {(cover?.url || item.imageUrl) && <PublicTalentImage src={cover?.url || item.imageUrl} alt={cover?.alt || `${title} cover`} className="aspect-video w-full" />}
    <div className="space-y-3 p-4">
      {overview ? overviewSource === "legacy"
        ? <JobDescriptionText value={overview} className={`line-clamp-3 ${textClass}`} />
        : <p className={`line-clamp-3 whitespace-pre-line ${textClass}`}>{overview}</p> : null}
      {item.role && <p className={`line-clamp-2 ${textClass}`}><span className="font-medium text-white">Role: </span>{item.role}</p>}
      {chips(tools, "Selected project tools", true)}
      {chips(skills, "Selected demonstrated skills", true)}
      {links[0] && <a href={links[0].url} target="_blank" rel="noopener noreferrer" className={`${buttonClass} max-w-full break-words [overflow-wrap:anywhere]`}>
        <span className="min-w-0">{links[0].label}<span className="sr-only"> (opens in a new tab)</span></span><ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
      </a>}
      {hasDetails && <details className="group min-w-0 border-t border-white/10 pt-2">
        <summary className="min-h-11 cursor-pointer rounded py-3 text-sm font-medium text-blue-400 focus-visible:outline-2 focus-visible:outline-offset-2">
          View case study<span className="sr-only">: {title}</span>
        </summary>
        <div className="min-w-0 space-y-6 pb-2 pt-3">
          {overviewSource === "legacy" && overview ? <section className="space-y-2" aria-label="Overview">
            <h4 className="font-semibold text-white">Overview</h4><JobDescriptionText value={overview} className={textClass} />
          </section> : narrative("Overview", overview)}
          {narrative("Problem statement", item.problemStatement)}
          {narrative("Approach", item.approach)}
          {narrative("Results", item.results)}
          {narrative("Role", item.role)}
          {tools.length > 0 && <section className="space-y-2" aria-label="Tools used"><h4 className="font-semibold text-white">Tools used</h4>{chips(tools, "Project tools")}</section>}
          {skills.length > 0 && <section className="space-y-2" aria-label="Skills demonstrated"><h4 className="font-semibold text-white">Skills demonstrated</h4>{chips(skills, "Demonstrated project skills")}</section>}
          {images.length > 0 && <section className="space-y-3" aria-label="Project gallery">
            <h4 className="font-semibold text-white">Project gallery</h4>
            {comparison && <p className={textClass}>Before and after comparison</p>}
            <PublicTalentGallery images={images} title={title} />
          </section>}
          {links.length > 0 && <nav aria-label="Project links" className="space-y-2"><h4 className="font-semibold text-white">Project links</h4>
            {links.map((link, index) => <a key={`${link.url}:${index}`} href={link.url} target="_blank" rel="noopener noreferrer"
              className={`${buttonClass} mr-2 max-w-full break-words [overflow-wrap:anywhere]`}>
              <span className="min-w-0">{link.label}<span className="sr-only"> (opens in a new tab)</span></span><ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
            </a>)}
          </nav>}
          {video && <section aria-label="Project video" className="space-y-3"><h4 className="font-semibold text-white">Project video</h4><PublicTalentVideo url={video} title={`${title}: project video`} /></section>}
          {(showLegacyDescription || item.skills?.length > 0 || legacyLink && !links.some(link => link.url === legacyLink)) && <section className="space-y-3" aria-label="Original project details">
            <h4 className="font-semibold text-white">Original project details</h4>
            {showLegacyDescription && <JobDescriptionText value={item.description} className={textClass} />}
            {chips(item.skills || [], "Related project skills")}
            {legacyLink && !links.some(link => link.url === legacyLink) && <a href={legacyLink} target="_blank" rel="noopener noreferrer" className={`${buttonClass} max-w-full break-words`}>
              View original project<span className="sr-only"> (opens in a new tab)</span><ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
            </a>}
          </section>}
        </div>
      </details>}
    </div>
  </article>;
}

export default function PublicTalentContent({ talent }) {
  const name = talent.fullName || "Talent", skills = talent.skills || [], tags = talent.tags || [];
  const levels = skills.filter(row => Number.isFinite(row.percent));
  const rated = new Set(levels.map(row => row.title.toLowerCase()));
  const labels = [...new Set([...skills.filter(row => !Number.isFinite(row.percent)).map(row => row.title), ...tags])].filter(label => !rated.has(label.toLowerCase()));
  const projects = publicPortfolioProjects(talent);
  const projectGridId = useId();
  const projectListKey = JSON.stringify([talent.id, talent.username, projects]);
  const [projectPage, setProjectPage] = useState({ key: projectListKey, page: 1 });
  // Adjust during rendering so profile/list changes never paint an empty or
  // stale page. This also resets A -> B -> A navigation, without scrolling.
  if (projectPage.key !== projectListKey)
    setProjectPage({ key: projectListKey, page: 1 });
  const pageCount = Math.max(1, Math.ceil(projects.length / 6));
  const page = projectPage.key === projectListKey ? Math.min(projectPage.page, pageCount) : 1;
  const offset = (page - 1) * 6;
  const visibleProjects = projects.slice(offset, offset + 6);
  const video = publicVideoUrl(talent.introVideo);
  const portfolioUrl = publicExternalUrl(talent.portfolioUrl);
  const socials = Object.entries(talent.socialNetworks || {}).filter(([, url]) => publicExternalUrl(url));
  return <PublicTalentPresentation requiresQnduitBranding={talent.requiresQnduitBranding}>

    <div className="mb-6 flex justify-end">
      <Link
        to="/talent-signup"
        className="inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
      >
        Create your own public profile on QNDUIT. It’s free
      </Link>
    </div>

    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
      <aside className={`${sectionClass} min-w-0`} aria-label="Talent identity and skills">
        <PublicTalentImage src={talent.avatar} alt={`${name} profile`} avatar className="mb-5 h-24 w-24 rounded-full border border-white/10" />
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-blue-400">Talent on QNDUIT</p><h1 className="break-words text-2xl font-bold [overflow-wrap:anywhere]">{name}</h1>
        {talent.jobTitle && <p className="mt-3 break-words text-base text-gray-300">{talent.jobTitle}</p>}
        {talent.location && <p className="mt-3 flex items-start gap-2 text-sm text-gray-400"><MapPin className="mt-0.5 h-4 w-4 shrink-0" /><span className="min-w-0 break-words">{talent.location}</span></p>}
        {talent.experienceTime && <p className="mt-2 flex items-start gap-2 text-sm text-gray-400"><Briefcase className="mt-0.5 h-4 w-4 shrink-0" />{talent.experienceTime}</p>}
        {talent.qualification && <p className="mt-2 text-sm text-gray-400">{talent.qualification}</p>}
        {talent.aboutMe && <section className="mt-8" aria-label="About"><h2 className={headingClass}>About</h2><JobDescriptionText value={talent.aboutMe} className={textClass} /></section>}
        {(levels.length > 0 || labels.length > 0) && <section className="mt-8" aria-label="Skills"><h2 className={headingClass}>Skills</h2>{levels.length > 0 && <div className="[&_ul]:grid-cols-1"><SkillBars skills={levels} /></div>}{labels.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{labels.map(label => <span key={label} className="max-w-full break-words rounded-full bg-blue-500/10 px-3 py-1.5 text-xs text-blue-300">{label}</span>)}</div>}</section>}
        {(portfolioUrl || socials.length > 0) && <nav aria-label="Talent links" className="mt-8 flex flex-wrap gap-2">{portfolioUrl && <a className={buttonClass} href={portfolioUrl} target="_blank" rel="noopener noreferrer">Portfolio<ExternalLink className="h-3.5 w-3.5" /></a>}{socials.map(([label, url]) => <a key={label} className={`${buttonClass} capitalize`} href={publicExternalUrl(url)} target="_blank" rel="noopener noreferrer">{label}<ExternalLink className="h-3.5 w-3.5" /></a>)}</nav>}
      </aside>
      <div className="min-w-0 space-y-6">
        {projects.length === 0 && <section className={sectionClass} aria-label="Projects"><h2 className={headingClass}>Projects</h2><p className={textClass}>No projects to display yet.</p></section>}
        {projects.length > 0 && <section className={sectionClass} aria-label="Projects and gallery"><h2 className={headingClass}>Projects &amp; gallery</h2><div id={projectGridId} className="grid grid-cols-1 gap-5 sm:grid-cols-2">{visibleProjects.map((item, index) =>
          <ProjectCaseStudy key={`${talent.id || talent.username || "talent"}:${item.presentationKey}`} item={item} number={offset + index + 1} />)}</div>
          {pageCount > 1 && <nav aria-label="Portfolio project pages" className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              aria-controls={projectGridId}
              disabled={page === 1}
              onClick={() => setProjectPage({ key: projectListKey, page: Math.max(1, page - 1) })}
              className={`${buttonClass} focus-visible:outline-2 focus-visible:outline-offset-4 disabled:cursor-not-allowed disabled:opacity-50`}>Previous</button>
            <p role="status" aria-live="polite" aria-atomic="true" className="text-center text-sm text-gray-300">Page {page} of {pageCount}</p>
            <button
              type="button"
              aria-controls={projectGridId}
              disabled={page === pageCount}
              onClick={() => setProjectPage({ key: projectListKey, page: Math.min(pageCount, page + 1) })}
              className={`${buttonClass} focus-visible:outline-2 focus-visible:outline-offset-4 disabled:cursor-not-allowed disabled:opacity-50`}>Next</button>
          </nav>}
        </section>}
        {video && <section className={sectionClass} aria-label="Introduction video"><h2 className={headingClass}>Introduction video</h2><PublicTalentVideo url={video} title="Introduction video" /></section>}
        {talent.cvs?.length > 0 && <section className={sectionClass} aria-label="CVs"><h2 className={headingClass}>CVs</h2><ul className="space-y-3">{talent.cvs.map(cv => <li key={cv.id}><Link to={cv.viewPath} className={`${buttonClass} max-w-full break-words [overflow-wrap:anywhere]`}>View CV: {cv.name} ({cv.format})</Link></li>)}</ul></section>}
        <History title="Experience" rows={talent.experience} owner="company" />
        <History title="Education" rows={talent.education} owner="academy" />
      </div>
    </div>
  </PublicTalentPresentation>;
}
