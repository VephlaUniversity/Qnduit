// Skill name + level bars, shown on profiles that other people can see.
const SkillBars = ({ skills }) => {
  const rows = (Array.isArray(skills) ? skills : []).filter(
    (skill) => typeof skill?.title === "string" && skill.title.trim(),
  );
  if (rows.length === 0) return null;

  return (
    <ul className="mt-3 grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
      {rows.map((skill, index) => {
        const percent = Math.min(
          100,
          Math.max(0, Number.parseInt(skill.percent, 10) || 0),
        );
        return (
          <li key={`${skill.title}-${index}`} className="min-w-0">
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <span className="truncate text-sm font-medium text-white">
                {skill.title}
              </span>
              <span className="whitespace-nowrap text-xs font-medium text-gray-300">
                {percent}%
              </span>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full bg-white/10"
              role="progressbar"
              aria-label={`${skill.title} level`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
            >
              <div
                className="h-full rounded-full bg-blue-600"
                style={{ width: `${percent}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
};

export default SkillBars;
