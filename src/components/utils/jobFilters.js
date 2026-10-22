export const SALARY_MIN = 0;
export const SALARY_MAX = 240000;

// Salary bands shown as radios. They write into the same [min, max] range the
// sidebar slider uses, so the two stay in step.
export const SALARY_BANDS = [
  { label: "All Salaries", range: [SALARY_MIN, SALARY_MAX] },
  { label: "$50,000+", range: [50000, SALARY_MAX] },
  { label: "$70,000+", range: [70000, SALARY_MAX] },
  { label: "$90,000+", range: [90000, SALARY_MAX] },
  { label: "$110,000+", range: [110000, SALARY_MAX] },
  { label: "$130,000+", range: [130000, SALARY_MAX] },
];

export const matchingBand = (range) =>
  SALARY_BANDS.find(
    (band) => band.range[0] === range[0] && band.range[1] === range[1],
  );

// Number of filters that differ from their defaults (used for the badge).
export const countActiveFilters = (f) =>
  [
    f.workType !== "",
    f.jobType !== "",
    f.salaryRange[0] !== SALARY_MIN || f.salaryRange[1] !== SALARY_MAX,
    f.posted !== "anytime",
    f.seniority !== "all",
    f.company !== "",
  ].filter(Boolean).length;

