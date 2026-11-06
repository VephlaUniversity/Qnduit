import { Link } from "react-router-dom";
import { hasTalentPublicAccess } from "../utils/talentEntitlements";

export default function TalentPublicProfileAccess({ state }) {
  if (!hasTalentPublicAccess(state)) return null;
  return <div role="status" className="mb-6 rounded-lg border border-green-500/30 bg-green-500/5 p-4 text-white">
    <Link to="/talent-dashboard/about" className="text-blue-400 underline underline-offset-4">
      You’re upgraded. Update your public profile here.
    </Link>
    {state.publicProfile?.reason === "hidden" && <p className="mt-2 text-sm text-gray-400">Your profile is hidden. Editing your profile does not publish it.</p>}
  </div>;
}
