import { useState } from "react";
import { API_BASE_URL } from "../utils/api";
import { jobImageSources } from "../utils/jobImage";

export default function JobImage({ job, className = "" }) {
  const [failed, setFailed] = useState([]);
  const image = jobImageSources(job).find(item => !failed.includes(item.url));
  const name = job?.employer?.companyName || job?.organization || job?.company || "Job";
  const title = job?.jobTitle || job?.title || "Job";
  const url = image?.url.startsWith("/uploads/") ? `${API_BASE_URL}${image.url}` : image?.url;

  return <div className={`flex shrink-0 items-center justify-center overflow-hidden ${className}`}>
    {image ? <img key={url} src={url}
      alt={image.kind === "logo" ? `${name} logo` : `${title} image`}
      loading="lazy" decoding="async" referrerPolicy="no-referrer"
      className="h-full w-full object-cover"
      onError={() => setFailed(previous => previous.includes(image.url) ? previous : [...previous, image.url])} />
      : <span role="img" aria-label={`${title} image unavailable`}
        className="flex h-full w-full items-center justify-center bg-gray-700 text-white/80">
        {String(name).trim().charAt(0).toUpperCase() || "J"}
      </span>}
  </div>;
}
