// Queue files without allocating previews until the current owner's allowance is known.
const key = file =>
  JSON.stringify([file.name, file.size, file.type, file.lastModified]);

export function queuePortfolioFiles(queue, files, selected = []) {
  const seen = new Set([...queue, ...selected].map(key));
  const problems = [];
  for (const file of files) {
    if (!["image/png", "image/jpeg", "image/jpg"].includes(file.type))
      problems.push("Choose a PNG or JPG image.");
    else if (file.size > 5 * 1024 * 1024)
      problems.push("Images must be 5 MB or smaller.");
    else if (!seen.has(key(file))) {
      queue.push(file);
      seen.add(key(file));
    }
  }
  return [...new Set(problems)];
}

export function takePortfolioFiles(queue, { ready, currentOwner, room }) {
  if (!currentOwner) {
    queue.splice(0);
    return { files: [], rejected: 0 };
  }
  if (!ready) return { files: [], rejected: 0 };
  const pending = queue.splice(0);
  return {
    files: pending.slice(0, room),
    rejected: Math.max(0, pending.length - room),
  };
}
