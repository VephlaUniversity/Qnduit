import PublicTalentPresentation from './PublicTalentPresentation';
// Keep bookmarked legacy URLs inert; do not fetch CV metadata or file assets.
export default function PublicTalentCv() {
  return <PublicTalentPresentation>
    <section className="rounded-2xl border border-white/10 bg-[#191D23] p-6 md:p-8">
      <h1 className="text-2xl font-bold">CV unavailable</h1>
      <p className="mt-4 text-gray-300">CV access is available to authorized Employers through their applications dashboard.</p>
    </section>
  </PublicTalentPresentation>;
}
