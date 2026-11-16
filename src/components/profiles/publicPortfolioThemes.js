import { isPortfolioTheme } from "../../../backend/src/utils/portfolioAppearance.js";

// Static classes scoped through existing portfolio components; no global theme
// switch, fetched fonts, arbitrary CSS or custom appearance controls.
const defaults = {
  font: "jakarta", surface: "card",
  container: "",
  section: "rounded-2xl border border-white/5 bg-[#191D23] p-6 md:p-8",
  heading: "mb-5 text-xl font-semibold text-white",
  text: "break-words text-sm leading-7 text-gray-300 [overflow-wrap:anywhere]",
  layout: "grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]",
  identity: "", introduction: "", name: "text-2xl font-bold",
  about: "mt-8", skills: "mt-8", links: "mt-8", content: "min-w-0 space-y-6",
  projects: "", projectGrid: "grid grid-cols-1 gap-5 sm:grid-cols-2",
  project: "", projectTitle: "", cover: "aspect-video w-full", technical: "space-y-6",
};
const themes = {
  minimalist: {
    surface: "page",
    container: "max-w-4xl", layout: "grid grid-cols-1 gap-10 md:gap-14",
    section: "rounded-none border-b border-white/10 pb-10 md:pb-14",
    heading: "mb-6 text-lg font-medium tracking-wide text-white",
    text: "break-words text-base leading-8 text-gray-300 [overflow-wrap:anywhere]",
    name: "text-3xl font-medium tracking-tight md:text-4xl",
    introduction: "max-w-2xl", content: "min-w-0 space-y-10 md:space-y-14",
    projectGrid: "grid grid-cols-1 gap-8", project: "rounded-none border-x-0 border-t-0",
    projectTitle: "text-lg font-medium", technical: "grid grid-cols-1 gap-6 sm:grid-cols-2",
  },
  creative: {
    layout: "grid grid-cols-1 gap-8",
    identity: "grid grid-cols-1 gap-x-10 md:grid-cols-2",
    introduction: "md:col-span-2", name: "text-4xl font-extrabold tracking-tight md:text-6xl",
    heading: "mb-6 text-2xl font-bold tracking-tight text-white",
    about: "mt-8", skills: "mt-8", links: "mt-8 md:col-span-2",
    content: "min-w-0 space-y-8", projectGrid: "grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3",
    projectTitle: "text-xl font-bold", cover: "aspect-[4/3] w-full",
  },
  developer: {
    container: "max-w-6xl",
    layout: "grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)]",
    section: "rounded-lg border border-white/10 bg-[#191D23] p-5",
    heading: "mb-4 font-mono text-base font-semibold text-white",
    name: "font-mono text-2xl font-semibold tracking-tight",
    about: "mt-5", skills: "mt-5", links: "mt-5 font-mono",
    content: "min-w-0 space-y-4", projectGrid: "grid grid-cols-1 gap-4",
    projectTitle: "font-mono text-lg", technical: "grid grid-cols-1 gap-4 font-mono sm:grid-cols-2",
  },
  "data-professional": {
    layout: "grid grid-cols-1 gap-6",
    section: "rounded-lg border border-white/10 bg-[#191D23] p-6 md:p-8",
    identity: "grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3",
    introduction: "min-w-0", name: "text-3xl font-semibold tracking-tight",
    about: "min-w-0 border-t border-white/10 pt-6 md:border-l md:border-t-0 md:pl-6 md:pt-0",
    skills: "min-w-0 border-t border-white/10 pt-6 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0",
    links: "md:col-span-2 lg:col-span-3",
    heading: "mb-4 text-lg font-semibold tracking-wide text-white",
    content: "grid min-w-0 grid-cols-1 items-start gap-6 md:grid-cols-2",
    projects: "md:col-span-2", projectGrid: "grid grid-cols-1 gap-6 sm:grid-cols-2",
    projectTitle: "text-lg font-semibold", technical: "grid grid-cols-1 gap-6 sm:grid-cols-2",
  },
};

export const publicPortfolioTheme = value => isPortfolioTheme(value) ? value : "default";
export const publicPortfolioStyles = value => ({ ...defaults, ...themes[publicPortfolioTheme(value)] });
