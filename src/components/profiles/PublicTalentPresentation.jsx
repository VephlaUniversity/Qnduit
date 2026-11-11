import { Link } from "react-router-dom";

// Shared only by public Talent profile, portfolio and CV presentations.
// Only portfolio content supplies the boolean. Other shared surfaces retain
// their existing footer without receiving the free-portfolio watermark.
export default function PublicTalentPresentation({
  children, requiresQnduitBranding, centerContent = false,
}) {
  return <main className="min-h-screen bg-[#0F1419] text-white">
    <div className={`mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-12${centerContent ? " flex min-h-screen w-full flex-col" : ""}`}>
      {centerContent ? <div className="flex flex-1 flex-col items-center justify-center text-center">{children}</div> : children}
      {requiresQnduitBranding !== false && <footer className={`mt-10 border-t border-white/10 py-8 text-center${centerContent ? " shrink-0" : ""}`}>
        <a href="https://qnduit.com" className="mb-8 inline-flex min-h-11 items-center text-sm font-medium text-gray-300 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4">{requiresQnduitBranding === true ? "Built with Qnduit" : "Powered by qnduit.com"}</a>
      </footer>}
    </div>
  </main>;
}
