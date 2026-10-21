import { Link } from "react-router-dom";
import { useEmployerMessagingAccess } from "../hooks/useEmployerMessagingAccess";

export default function EmployerMessagingGate({ children }) {
  const { status, refresh } = useEmployerMessagingAccess();
  if (status === "allowed") return children;
  return <div className="p-6 text-gray-400" role={status === "error" ? "alert" : "status"}>
    {status === "loading" ? "Checking messaging access..." : status === "restricted" ? <>
      <p>Messaging requires an active Silver or Platinum subscription.</p>
      <Link to="/dashboard/packages" className="inline-block mt-4 text-blue-400">View Packages</Link>
    </> : <>
      <p>Messaging access could not be checked. Please try again.</p>
      <button type="button" onClick={refresh} className="mt-4 text-blue-400">Try again</button>
    </>}
  </div>;
}
