const number = (value) => {
  if (value == null || (typeof value === "string" && !value.trim())) return undefined;
  return ["string", "number"].includes(typeof value) ? Number(value) : NaN;
};

// Accept the form's flat fields and the existing update API's nested salary object.
// Blank/omitted bounds stay optional; on edits they preserve saved values.
export function jobSalaryUpdate(body, existing = {}) {
  const errors = {};
  const salary = {};
  if (Object.hasOwn(body, "salary") && (!body.salary || typeof body.salary !== "object" || Array.isArray(body.salary))) {
    return { errors: { minSalary: "Enter valid salary details." }, salary };
  }
  const nested = body.salary || {};
  let changedBound = false;
  for (const [field, key, label] of [["minSalary", "min", "Minimum"], ["maxSalary", "max", "Maximum"]]) {
    const flat = number(body[field]);
    const inner = number(nested[key]);
    if ((flat !== undefined && !Number.isFinite(flat)) || (inner !== undefined && !Number.isFinite(inner))) {
      errors[field] = `${label} salary must be a finite number.`;
    } else if (flat !== undefined && inner !== undefined && flat !== inner) {
      errors[field] = `Provide one consistent ${label.toLowerCase()} salary.`;
    } else {
      const value = flat ?? inner;
      if (value !== undefined) { salary[key] = value; changedBound = true; }
    }
  }
  const type = body.salaryType ?? nested.type;
  if (type != null && !(typeof type === "string" && !type.trim())) salary.type = type;
  const min = salary.min ?? existing.min;
  const max = salary.max ?? existing.max;
  if (!Object.keys(errors).length && changedBound && min != null && max != null && max < min)
    errors.maxSalary = "Maximum salary must be greater than or equal to minimum salary.";
  return { errors, salary };
}

export function jobSaveError(res, error) {
  const invalid = ["ValidationError", "CastError"].includes(error.name);
  return res.status(invalid ? 400 : 500).json({
    success: false,
    message: invalid ? "Please check the job details and try again." : "Unable to save this job. Please try again.",
  });
}
