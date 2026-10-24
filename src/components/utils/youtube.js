// Returns the 11-character YouTube video id from a watch, share or embed link,
// or null when the link is empty or not a YouTube link.
export const getYouTubeVideoId = (url) => {
  if (typeof url !== "string" || !url.trim()) return null;
  const match = url.match(
    /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/,
  );
  return match && match[2].length === 11 ? match[2] : null;
};
