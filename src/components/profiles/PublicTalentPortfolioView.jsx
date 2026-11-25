import { Fragment, useId, useState } from "react";
import PublicTalentPresentation from "./PublicTalentPresentation";
import { Link } from "react-router-dom";
import { MapPin, Briefcase, ExternalLink } from "lucide-react";
import SkillBars from "./SkillBars";
import { PublicTalentGallery, PublicTalentImage, PublicTalentVideo } from "./PublicTalentMedia";
import JobDescriptionText from "../utils/JobDescriptionText";
import { portfolioExternalUrl, publicExternalUrl, publicPortfolioProjects, publicVideoUrl } from "../../../backend/src/utils/publicTalentProfile.js";
import { publicPortfolioStyles, publicPortfolioTheme } from "./publicPortfolioThemes";
import { cn } from "../../lib/utils";
import { portfolioOverview } from "../../../backend/src/utils/portfolioCaseStudy.js";
import PublicTalentEnquiryForm from "./PublicTalentEnquiryForm";

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
const buttonClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm text-blue-400 transition-colors hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2";
function History({ title, rows, owner, styles }) {
  const { section: sectionClass, heading: headingClass, text: textClass } = styles;
  if (!rows?.length) return null;
  return <section data-portfolio-surface={styles.surface} className={sectionClass} aria-label={title}><h2 className={headingClass}>{title}</h2><div className="space-y-7">{rows.map((row, index) => <article key={index} className="border-l-2 border-blue-600 pl-5">
    {period(row) && <p className="mb-2 text-xs text-gray-400">{period(row)}</p>}
    {row.title && <h3 className="break-words font-semibold text-white">{owner === "academy" && <span className="sr-only">Degree level: </span>}{row.title}</h3>}{row[owner] && <p className="mt-1 break-words text-sm text-blue-400">{owner === "academy" && <span className="sr-only">Institution: </span>}{row[owner]}</p>}
    {row.description && <JobDescriptionText value={row.description} className={`mt-3 ${textClass}`} />}
  </article>)}</div></section>;
}
// Shared project presentation stays with the existing portfolio renderer. Native
// details supplies keyboard expansion and avoids an additional modal/route.
function ProjectCaseStudy({ item, number, track, styles, prominent = false }) {
  const textClass = styles.text;
  const trackLink = () => { if (item.analyticsKey) track("project_link_click", { projectKey: item.analyticsKey }); };
  const title = item.title || `Project ${number}`;
  const images = Array.isArray(item.images) ? item.images : [];
  const tools = item.toolsUsed || [], skills = item.skillsDemonstrated || [];
  const links = (item.links || []).map(link => ({ label: link.label, url: portfolioExternalUrl(link.url) })).filter(link => link.label && link.url);
  const legacyLink = portfolioExternalUrl(item.projectUrl);
  const video = publicVideoUrl(item.video);
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
  return <article data-portfolio-surface="project" data-project-prominent={prominent || undefined} className={cn("min-w-0 self-start overflow-hidden rounded-xl border border-white/10 bg-[#0F1419]", styles.project, prominent && "sm:col-span-2 border-blue-400/40")} aria-label={title}>
    <header className="space-y-2 p-4">
      {item.featured === true && <p className="text-xs font-semibold uppercase tracking-wide text-blue-300">Featured project</p>}
      <h3 className={cn("break-words font-semibold [overflow-wrap:anywhere]", styles.projectTitle)}>{title}</h3>
    </header>
    {(cover?.url || item.imageUrl) && <PublicTalentImage src={cover?.url || item.imageUrl} alt={cover?.alt || `${title} cover`} className={styles.cover} />}
    <div className="space-y-3 p-4">
      {overview ? overviewSource === "legacy"
        ? <JobDescriptionText value={overview} className={`line-clamp-3 ${textClass}`} />
        : <p className={`line-clamp-3 whitespace-pre-line ${textClass}`}>{overview}</p> : null}
      {item.role && <p className={`line-clamp-2 ${textClass}`}><span className="font-medium text-white">Role: </span>{item.role}</p>}
      {chips(tools, "Selected project tools", true)}
      {chips(skills, "Selected demonstrated skills", true)}
      {links[0] && <a onClick={trackLink} href={links[0].url} target="_blank" rel="noopener noreferrer" className={`${buttonClass} max-w-full break-words [overflow-wrap:anywhere]`}>
        <span className="min-w-0">{links[0].label}<span className="sr-only"> (opens in a new tab)</span></span><ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
      </a>}
      {hasDetails && <details className="group min-w-0 border-t border-white/10 pt-2" onToggle={event => { if (event.currentTarget.open && item.analyticsKey) track("project_view", { projectKey: item.analyticsKey }); }}>
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
          {(tools.length > 0 || skills.length > 0) && <div className={styles.technical}>
          {tools.length > 0 && <section className="space-y-2" aria-label="Tools used"><h4 className="font-semibold text-white">Tools used</h4>{chips(tools, "Project tools")}</section>}
          {skills.length > 0 && <section className="space-y-2" aria-label="Skills demonstrated"><h4 className="font-semibold text-white">Skills demonstrated</h4>{chips(skills, "Demonstrated project skills")}</section>}
          </div>}
          {images.length > 0 && <section className="space-y-3" aria-label="Project gallery">
            <h4 className="font-semibold text-white">Project gallery</h4>
            <PublicTalentGallery images={images} title={title} />
          </section>}
          {links.length > 0 && <nav aria-label="Project links" className="space-y-2"><h4 className="font-semibold text-white">Project links</h4>
            {links.map((link, index) => <a key={`${link.url}:${index}`} onClick={trackLink} href={link.url} target="_blank" rel="noopener noreferrer"
              className={`${buttonClass} mr-2 max-w-full break-words [overflow-wrap:anywhere]`}>
              <span className="min-w-0">{link.label}<span className="sr-only"> (opens in a new tab)</span></span><ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
            </a>)}
          </nav>}
          {video && <section aria-label="Project video" className="space-y-3"><h4 className="font-semibold text-white">Project video</h4><PublicTalentVideo url={video} title={`${title}: project video`} /></section>}
          {(showLegacyDescription || item.skills?.length > 0 || legacyLink && !links.some(link => link.url === legacyLink)) && <section className="space-y-3" aria-label="Original project details">
            <h4 className="font-semibold text-white">Original project details</h4>
            {showLegacyDescription && <JobDescriptionText value={item.description} className={textClass} />}
            {chips(item.skills || [], "Related project skills")}
            {legacyLink && !links.some(link => link.url === legacyLink) && <a onClick={trackLink} href={legacyLink} target="_blank" rel="noopener noreferrer" className={`${buttonClass} max-w-full break-words`}>
              View original project<span className="sr-only"> (opens in a new tab)</span><ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
            </a>}
          </section>}
        </div>
      </details>}
    </div>
  </article>;
}

export default function PublicTalentPortfolioView({ talent, onEvent }) {
  const track = (type, details) => onEvent?.(type, details);
  const theme = publicPortfolioTheme(talent.theme);
  const customOrder = Array.isArray(talent.layout?.sectionOrder) && talent.layout.sectionOrder.length > 0;
  const themeStyles = publicPortfolioStyles(theme, talent.layout?.standardGrouping === true);
  const styles = customOrder ? {
    ...themeStyles, identity: "", introduction: "", projects: "",
    about: themeStyles.section, skills: themeStyles.section, links: themeStyles.section,
  } : themeStyles;
  const hiddenSections = new Set(talent.layout?.hiddenSections || []);
  const { section: sectionClass, heading: headingClass, text: textClass } = styles;
  const name = talent.fullName || "Talent", skills = talent.skills || [], tags = talent.tags || [];
  const levels = skills.filter(row => Number.isFinite(row.percent));
  const rated = new Set(levels.map(row => row.title.toLowerCase()));
  const labels = [...new Set([...skills.filter(row => !Number.isFinite(row.percent)).map(row => row.title), ...tags])].filter(label => !rated.has(label.toLowerCase()));
  const projects = publicPortfolioProjects(talent);
  const requestedProjectLayout = talent.layout?.projectLayout;
  const projectLayout = requestedProjectLayout === "featured" && !projects.some(item => item.featured === true)
    ? "grid" : ["grid", "list", "featured"].includes(requestedProjectLayout) ? requestedProjectLayout : null;
  const projectGrid = projectLayout === "list" ? "grid grid-cols-1 gap-5"
    : projectLayout ? "grid grid-cols-1 gap-5 sm:grid-cols-2" : styles.projectGrid;
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

  const engagement = talent.portfolioEngagement;

  const isPaidEngagement =
    Boolean(engagement && typeof engagement === "object");

  const availability = Array.isArray(engagement?.availability)
    ? engagement.availability.filter(
        item =>
          item &&
          typeof item.value === "string" &&
          typeof item.label === "string"
      )
    : [];

  const contactFormEnabled =
    engagement?.contactFormEnabled === true;

  const primaryAction = engagement?.primaryAction;

  const primaryActionUrl =
    primaryAction?.type === "external"
      ? portfolioExternalUrl(primaryAction.url)
      : "";

  const showPrimaryAction =
    primaryAction?.label &&
    (
      primaryAction.type === "contact"
        ? contactFormEnabled
        : primaryAction.type === "external" && Boolean(primaryActionUrl)
    );

  const sections = {
    about: talent.aboutMe && <section className={styles.about} aria-label="About"><h2 className={headingClass}>About</h2><JobDescriptionText value={talent.aboutMe} className={textClass} /></section>,
    skills: (levels.length > 0 || labels.length > 0) && <section className={styles.skills} aria-label="Skills"><h2 className={headingClass}>Skills</h2>{levels.length > 0 && <div className="[&_ul]:grid-cols-1"><SkillBars skills={levels} /></div>}{labels.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{labels.map(label => <span key={label} className="max-w-full break-words rounded-full bg-blue-500/10 px-3 py-1.5 text-xs text-blue-300">{label}</span>)}</div>}</section>,
    links: (portfolioUrl || socials.length > 0) && <nav aria-label="Talent links" className={`${styles.links} flex flex-wrap gap-2`}>{portfolioUrl && <a className={buttonClass} href={portfolioUrl} target="_blank" rel="noopener noreferrer">Portfolio<ExternalLink className="h-3.5 w-3.5" /></a>}{socials.map(([label, url]) => <a key={label} className={`${buttonClass} capitalize`} href={publicExternalUrl(url)} target="_blank" rel="noopener noreferrer">{label}<ExternalLink className="h-3.5 w-3.5" /></a>)}</nav>,
    projects: <>{projects.length === 0 && <section data-portfolio-surface={styles.surface} className={`${sectionClass} ${styles.projects}`} aria-label="Projects"><h2 className={headingClass}>Projects</h2><p className={textClass}>No projects to display yet.</p></section>}
        {projects.length > 0 && <section data-portfolio-surface={styles.surface} className={`${sectionClass} ${styles.projects}`} aria-label="Projects and gallery"><h2 className={headingClass}>Projects &amp; gallery</h2><div id={projectGridId} data-project-layout={projectLayout || "theme"} className={projectGrid}>{visibleProjects.map((item, index) =>
          <ProjectCaseStudy key={`${talent.id || talent.username || "talent"}:${item.presentationKey}`} item={item} number={offset + index + 1} track={track} styles={styles} prominent={projectLayout === "featured" && item.featured === true} />)}</div>
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
        </section>}</>,
    introVideo: video && <section data-portfolio-surface={styles.surface} className={sectionClass} aria-label="Introduction video"><h2 className={headingClass}>Introduction video</h2><PublicTalentVideo url={video} title="Introduction video" /></section>,
    experience: <History title="Experience" rows={talent.experience} owner="company" styles={styles} />,
    education: <History title="Education" rows={talent.education} owner="academy" styles={styles} />,
  };
  const renderSection = id => hiddenSections.has(id) ? null : sections[id];
  return <PublicTalentPresentation requiresQnduitBranding={talent.requiresQnduitBranding} portfolioTheme={theme} portfolioColors={talent.colors} portfolioFont={talent.font} portfolioBackground={talent.backgroundColor} portfolioCover={talent.cover}>

    {!isPaidEngagement && (
      <div className="mb-6 flex justify-end">
        <Link
          to="/talent-signup"
          className="portfolio-primary-action inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
        >
          Create your own public profile on QNDUIT. It’s free
        </Link>
      </div>
    )}

    {isPaidEngagement && showPrimaryAction && (
      <div className="mb-6 flex justify-end">
        {primaryAction.type === "contact" ? (
          <a
            href="#portfolio-contact-form"
            className="portfolio-primary-action inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            {primaryAction.label}
          </a>
        ) : (
          <a
            href={primaryActionUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="portfolio-primary-action inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            {primaryAction.label}
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>
    )}

    <div className={styles.layout}>
      <aside data-portfolio-surface={styles.surface} className={`${sectionClass} min-w-0 ${styles.identity}`} aria-label="Talent identity and skills">
        <div className={styles.introduction}>
        <PublicTalentImage src={talent.avatar} alt={`${name} profile`} avatar className="mb-5 h-24 w-24 rounded-full border border-white/10" />
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-blue-400">Talent on QNDUIT</p><h1 className={`break-words [overflow-wrap:anywhere] ${styles.name}`}>{name}</h1>
        {talent.jobTitle && <p className="mt-3 break-words text-base text-gray-300">{talent.jobTitle}</p>}
        {availability.length > 0 && (
          <div
            className="mt-4 flex flex-wrap gap-2"
            aria-label="Professional availability"
          >
            {availability.map(item => (
              <span
                key={item.value}
                className="inline-flex max-w-full items-center rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-300"
              >
                {item.label}
              </span>
            ))}
          </div>
        )}
        {talent.location && <p className="mt-3 flex items-start gap-2 text-sm text-gray-400"><MapPin className="mt-0.5 h-4 w-4 shrink-0" /><span className="min-w-0 break-words">{talent.location}</span></p>}
        {talent.experienceTime && <p className="mt-2 flex items-start gap-2 text-sm text-gray-400"><Briefcase className="mt-0.5 h-4 w-4 shrink-0" />{talent.experienceTime}</p>}
        {talent.qualification && <p className="mt-2 text-sm text-gray-400">{talent.qualification}</p>}
        </div>
        {!customOrder && ["about", "skills", "links"].map(id => <Fragment key={id}>{renderSection(id)}</Fragment>)}
      </aside>
      <div className={customOrder ? "grid min-w-0 grid-cols-1 gap-6" : styles.content}>
        {customOrder
          ? talent.layout.sectionOrder.map(id => <Fragment key={id}>{renderSection(id)}</Fragment>)
          : ["projects", "introVideo", "experience", "education"].map(id => <Fragment key={id}>{renderSection(id)}</Fragment>)}
      </div>
    </div>
    {contactFormEnabled && (
      <PublicTalentEnquiryForm
        username={talent.username}
        sectionClass={sectionClass}
        headingClass={headingClass}
        textClass={textClass}
        surface={styles.surface}
      />
    )}
  </PublicTalentPresentation>;
}
