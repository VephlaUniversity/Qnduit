import { useId } from "react";
import TalentOptionPicker from "./TalentOptionPicker";

export default function PortfolioItemFields({ item, onChange, error }) {
  const id = useId();
  const inputClass = "w-full min-w-0 rounded-lg border border-white/10 bg-[#1A1A1E] px-4 py-2 text-white focus:outline-none focus:border-blue-500";
  return <div className="min-w-0 space-y-4">
    <div>
      <label htmlFor={`${id}-description`} className="mb-2 block text-sm text-gray-400">Project description (optional)</label>
      <textarea id={`${id}-description`} value={item.description || ""} maxLength={2000} rows={3}
        onChange={event => onChange("description", event.target.value)} className={`${inputClass} resize-y`} />
      <p className="mt-1 text-xs text-gray-400">{(item.description || "").length}/2,000 characters</p>
    </div>
    <div>
      <label htmlFor={`${id}-url`} className="mb-2 block text-sm text-gray-400">Project URL (optional)</label>
      <input id={`${id}-url`} type="url" inputMode="url" autoCapitalize="none" autoCorrect="off" maxLength={2048}
        placeholder="https://example.com/project" value={item.projectUrl || ""}
        onChange={event => onChange("projectUrl", event.target.value)} className={inputClass} />
    </div>
    <TalentOptionPicker label="Related skills (optional)" kind="skills" value={item.skills || []}
      onChange={value => onChange("skills", value)} />
    <p className="text-xs text-gray-400">Up to 20 project skills, 80 characters each. Your profile skills stay unchanged.</p>
    {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
  </div>;
}
