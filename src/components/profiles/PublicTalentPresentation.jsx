import { Link } from "react-router-dom";

// Shared only by public Talent profile, portfolio and CV presentations.
export default function PublicTalentPresentation({ children }) {
  return <main className="min-h-screen bg-[#0F1419] text-white">
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-12">
      {children}
      <footer className="mt-10 border-t border-white/10 py-8 text-center">
        <a href="https://qnduit.com" className="mb-8 inline-flex min-h-11 items-center text-sm font-medium text-gray-300 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4">Powered by qnduit.com</a>
      </footer>
    </div>
  </main>;
}
