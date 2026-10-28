import { Link } from "react-router-dom";
import { ArrowLeft, MapPin, Briefcase, ExternalLink } from "lucide-react";
import SkillBars from "./SkillBars";
import { PublicTalentImage } from "./PublicTalentMedia";
import JobDescriptionText from "../utils/JobDescriptionText";
import { publicExternalUrl } from "../../../backend/src/utils/publicTalentProfile.js";
import { getYouTubeVideoId } from "../utils/youtube";

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
const buttonClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm text-blue-400 transition-colors hover:bg-white/5";
const textClass = "break-words text-sm leading-7 text-gray-300 [overflow-wrap:anywhere]";
function History({ title, rows, owner }) {
  if (!rows?.length) return null;
  return <section className={sectionClass} aria-label={title}><h2 className={headingClass}>{title}</h2><div className="space-y-7">{rows.map((row, index) => <article key={index} className="border-l-2 border-blue-600 pl-5">
    {period(row) && <p className="mb-2 text-xs text-gray-400">{period(row)}</p>}
    {row.title && <h3 className="break-words font-semibold text-white">{row.title}</h3>}{row[owner] && <p className="mt-1 break-words text-sm text-blue-400">{row[owner]}</p>}
    {row.description && <JobDescriptionText value={row.description} className={`mt-3 ${textClass}`} />}
  </article>)}</div></section>;
}
export default function PublicTalentContent({ talent }) {
  const name = talent.fullName || "Talent", skills = talent.skills || [], tags = talent.tags || [];
  const levels = skills.filter(row => Number.isFinite(row.percent));
  const rated = new Set(levels.map(row => row.title.toLowerCase()));
  const labels = [...new Set([...skills.filter(row => !Number.isFinite(row.percent)).map(row => row.title), ...tags])].filter(label => !rated.has(label.toLowerCase()));
  const projects = [...(talent.portfolio || []), ...(talent.gallery || [])];
  const video = getYouTubeVideoId(talent.introVideo);
  const portfolioUrl = publicExternalUrl(talent.portfolioUrl);
  const socials = Object.entries(talent.socialNetworks || {}).filter(([, url]) => publicExternalUrl(url));
  return <main className="min-h-screen bg-[#0F1419] text-white"><div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-12">
    <Link to="/feature-talents" className="mb-6 inline-flex min-h-11 items-center gap-2 text-sm text-blue-400 hover:text-blue-300"><ArrowLeft className="h-4 w-4" />Back to talents</Link>
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
        {projects.length > 0 && <section className={sectionClass} aria-label="Projects and gallery"><h2 className={headingClass}>Projects &amp; gallery</h2><div className="grid grid-cols-1 gap-5 sm:grid-cols-2">{projects.map((item, index) => <article key={index} className="min-w-0 overflow-hidden rounded-xl border border-white/10 bg-[#0F1419]">
          {item.imageUrl && <PublicTalentImage src={item.imageUrl} alt={item.title || "Portfolio image"} className="aspect-video w-full" />}
          {(item.title || item.description || publicExternalUrl(item.projectUrl)) && <div className="space-y-3 p-4">{item.title && <h3 className="break-words font-semibold">{item.title}</h3>}{item.description && <JobDescriptionText value={item.description} className={textClass} />}{publicExternalUrl(item.projectUrl) && <a href={publicExternalUrl(item.projectUrl)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-blue-400 hover:text-blue-300">View project<ExternalLink className="h-4 w-4" /></a>}</div>}
        </article>)}</div></section>}
        {video && <section className={sectionClass} aria-label="Introduction video"><h2 className={headingClass}>Introduction video</h2><div className="aspect-video overflow-hidden rounded-xl bg-black"><iframe className="h-full w-full" src={`https://www.youtube-nocookie.com/embed/${video}`} title="Introduction video" loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /></div></section>}
        <History title="Experience" rows={talent.experience} owner="company" />
        <History title="Education" rows={talent.education} owner="academy" />

        {(talent.gallery?.length > 0 || talent.portfolio?.length > 0) && (
          <section className={sectionClass} aria-label="Portfolio">
            <h2 className={headingClass}>Portfolio</h2>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {[...(talent.portfolio || []), ...(talent.gallery || [])].map(
                (item, index) => {
                  const imageUrl = item.imageUrl;
                  if (!imageUrl) return null;

                  return (
                    <article
                      key={`${imageUrl}-${index}`}
                      className="min-w-0 overflow-hidden rounded-xl border border-white/10 bg-[#0F1419]"
                    >
                      <PublicTalentImage
                        src={imageUrl}
                        alt={item.title || `Portfolio image ${index + 1}`}
                        className="aspect-video w-full"
                      />

                      {item.title && (
                        <div className="p-4">
                          <h3 className="break-words font-semibold text-white">
                            {item.title}
                          </h3>
                        </div>
                      )}
                    </article>
                  );
                },
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  </div></main>;
}
