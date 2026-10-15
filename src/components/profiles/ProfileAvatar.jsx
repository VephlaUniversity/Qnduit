import { useState } from "react";
import { UserRound } from "lucide-react";
import { profileImageUrl } from "./profileApi";

export default function ProfileAvatar({ image, name }) {
  const [failed, setFailed] = useState(false);
  const url = profileImageUrl(image);
  return (
    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-500/10 text-blue-400">
      {url && !failed ? (
        <img
          src={url}
          alt={`${name} profile`}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <UserRound className="h-8 w-8" aria-hidden="true" />
      )}
    </div>
  );
}
