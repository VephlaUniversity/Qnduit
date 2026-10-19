// Salaries are optional and retain Number's existing decimal/exponent semantics.
// No new unit, sign, precision or digit-count restrictions.
export function salaryNumber(value) {
  if (value == null || (typeof value === "string" && !value.trim())) return undefined;
  return ["string", "number"].includes(typeof value) ? Number(value) : NaN;
}

export function validateJobSalary(data) {
  const errors = {};
  const min = salaryNumber(data.minSalary);
  const max = salaryNumber(data.maxSalary);
  if (min !== undefined && !Number.isFinite(min)) errors.minSalary = "Minimum salary must be a finite number.";
  if (max !== undefined && !Number.isFinite(max)) errors.maxSalary = "Maximum salary must be a finite number.";
  if (!Object.keys(errors).length && min !== undefined && max !== undefined && max < min)
    errors.maxSalary = "Maximum salary must be greater than or equal to minimum salary.";
  return errors;
}
