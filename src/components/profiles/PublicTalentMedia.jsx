import { useState } from "react";
import { ImageOff, UserRound } from "lucide-react";
import { publicImageUrl } from "../../../backend/src/utils/publicTalentProfile.js";
import { API_BASE_URL } from "../utils/api";

export function PublicTalentImage({ src, alt, className = "", avatar = false }) {
  const [failed, setFailed] = useState("");
  const safe = publicImageUrl(src);
  const url = safe.startsWith("/uploads/") ? `${API_BASE_URL}${safe}` : safe;
  return <div className={`flex shrink-0 items-center justify-center overflow-hidden bg-blue-500/10 text-blue-400 ${className}`}>
    {url && failed !== url ? <img src={url} alt={alt} loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-cover" onError={() => setFailed(url)} />
      : avatar ? <UserRound className="h-1/2 w-1/2" aria-label="Profile photo unavailable" />
        : <span className="flex items-center gap-2 p-4 text-sm text-gray-400"><ImageOff className="h-5 w-5" aria-hidden="true" />Image unavailable</span>}
  </div>;
}
