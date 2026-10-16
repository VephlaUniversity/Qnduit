import { z } from "zod";

// Only editable Settings fields; never round-trip account or database metadata.
export const employerEditableFields = [
  "companyName",
  "companyEmail",
  "phone",
  "companyWebsite",
  "companyIndustry",
  "foundedYear",
  "companySize",
  "showProfile",
  "profileURL",
  "aboutCompany",
  "introVideo",
  "address",
  "location",
  "mapLocation",
  "lat",
  "lng",
];

export function coordinateError(value, label, max) {
  if (typeof value !== "string" && typeof value !== "number")
    return `${label} is required.`;
  const input = String(value).trim();
  if (!input) return `${label} is required.`;
  if (
    !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(input) ||
    !Number.isFinite(Number(input))
  )
    return `${label} must be a number.`;
  if (Number(input) < -max || Number(input) > max)
    return `${label} must be between ${-max} and ${max}.`;
  return "";
}

export function coordinatesAreBlank(lat, lng) {
  return [lat, lng].every((value) => value == null || (typeof value === "string" && !value.trim()));
}

export function hasValidCoordinates(lat, lng) {
  return !coordinateError(lat, "Latitude", 90) && !coordinateError(lng, "Longitude", 180);
}

export function validateEmployerProfile(data) {
  const errors = {};
  for (const [field, label, max] of [
    ["lat", "Latitude", 90],
    ["lng", "Longitude", 180],
  ]) {
    const error = coordinatesAreBlank(data.lat, data.lng) ? "" : coordinateError(data[field], label, max);
    if (error) errors[field] = error;
  }
  if (
    data.companyEmail?.trim() &&
    !z.email().safeParse(data.companyEmail.trim()).success
  )
    errors.companyEmail = "Enter a valid company email address.";
  for (const field of ["companyWebsite", "profileURL", "introVideo"]) {
    if (data[field]?.trim() && !isWebUrl(data[field]))
      errors[field] = "Enter a valid http:// or https:// URL.";
  }
  for (const [name, value] of Object.entries(data.socialNetworks || {})) {
    if (value?.trim() && !isWebUrl(value))
      errors[`social-${name}`] = "Enter a valid http:// or https:// URL.";
  }
  // Model casts this optional field to Number; reject malformed input before submission.
  if (
    String(data.foundedYear ?? "").trim() &&
    !Number.isFinite(Number(data.foundedYear))
  )
    errors.foundedYear = "Founded year must be a number.";
  return errors;
}

function isWebUrl(value) {
  try {
    return ["http:", "https:"].includes(new URL(value.trim()).protocol);
  } catch {
    return false;
  }
}

export function employerProfileFormData(data) {
  const body = new FormData();
  body.append("updateContext", "profile-settings");
  for (const key of employerEditableFields) {
    // Blank pairs preserve saved geometry; they never mean zero or removal.
    if (["lat", "lng"].includes(key) && coordinatesAreBlank(data.lat, data.lng)) continue;
    body.append(key, data[key] ?? "");
  }
  body.append("categories", JSON.stringify(data.categories));
  body.append("socialNetworks", JSON.stringify(data.socialNetworks));
  if (data.logo instanceof File) body.append("logo", data.logo);
  for (const file of data.gallery || [])
    if (file instanceof File) body.append("gallery", file);
  return body;
}
