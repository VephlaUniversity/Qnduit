import Talent from "../models/Talent.js";

export const generateTalentUsername = async (
  name,
  { excludeId, session } = {}
) => {
  const slug = (name || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const baseUsername = slug || "talent";

  let username = baseUsername;
  let suffix = 2;

  const queryOptions = session ? { session } : {};

  while (
    await Talent.exists({
      username,
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    }).setOptions(queryOptions)
  ) {
    username = `${baseUsername}-${suffix++}`;
  }

  return username;
};