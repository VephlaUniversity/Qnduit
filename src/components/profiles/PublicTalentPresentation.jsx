import { Link } from "react-router-dom";

// Shared only by public Talent profile, portfolio and CV presentations.
export default function PublicTalentPresentation({ children }) {
  return <main className="min-h-screen bg-[#0F1419] text-white">
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-12">
      <a href="https://qnduit.com" className="mb-8 inline-flex min-h-11 items-center text-sm font-medium text-gray-300 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4">Powered by qnduit.com</a>
      {children}
      <footer className="mt-10 border-t border-white/10 py-8 text-center">
        <Link to="/talent-signup" className="inline-flex min-h-11 max-w-full items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-base font-medium text-white hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-4">Create your own public profile on Qnduit.</Link>
      </footer>
    </div>
  </main>;
}
