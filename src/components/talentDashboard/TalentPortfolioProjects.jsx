import PortfolioItemFields from "./PortfolioItemFields";

export default function TalentPortfolioProjects({ projects, onChange, onRemove, errors }) {
  if (!projects.length) return null;
  return <section aria-label="Existing Talent projects" className="mb-6 min-w-0 space-y-4">
    <h3 className="text-lg font-semibold text-white">Existing Talent projects</h3>
    <p className="text-sm text-gray-400">Changes to these projects and uploaded items are saved together with Save Changes.</p>
    <div className="grid min-w-0 grid-cols-1 gap-6 md:grid-cols-2">
      {projects.map((item, index) => <article key={item.id} aria-label={`Existing Talent project ${index + 1}`}
        className="min-w-0 space-y-4 rounded-lg border border-white/10 p-4">
        {item.title && <h4 className="break-words font-semibold text-white">{item.title}</h4>}
        {item.imageUrl && <img src={item.imageUrl} alt={item.title || `Existing Talent project ${index + 1}`} className="h-32 w-40 max-w-full rounded-lg border border-white/10 object-cover" />}
        {item.removed ? <p className="text-sm text-gray-400">Removal pending. Save Changes to apply.</p>
          : <PortfolioItemFields item={item} error={errors[`talent:${item.id}`]} onChange={(field, value) => onChange(item.id, field, value)} />}
        <button type="button" onClick={() => onRemove(item.id)} className="min-h-11 rounded-lg border border-white/10 px-4 py-2 text-sm text-blue-400 hover:bg-white/5">
          {item.removed ? "Undo removal" : "Remove project"}
        </button>
      </article>)}
    </div>
  </section>;
}
