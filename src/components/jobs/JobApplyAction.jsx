import { Link } from "react-router-dom";
import { jobApplicationAction } from "../utils/jobApplicationAction";

// External navigation never calls the Internal submission handler or changes Applied state.
export default function JobApplyAction({ job, onApply, applying = false, applied = false, internalHref, internalLabel = "Apply Now", className = "", children }) {
  const action = jobApplicationAction(job);
  const classes = `${className} max-w-full disabled:opacity-60 disabled:cursor-not-allowed`;
  if (action.kind === "external") return <a href={action.url} target="_blank" rel="noopener noreferrer"
    className={classes} onClick={event => { event.stopPropagation(); if (jobApplicationAction(job).kind !== "external") event.preventDefault(); }}>{children}Apply Externally</a>;
  if (action.kind === "internal" && internalHref) return <Link to={internalHref} className={classes}>{children}{internalLabel}</Link>;
  return <button type="button" onClick={action.kind === "internal" ? onApply : undefined}
    disabled={action.kind !== "internal" || applying || applied} aria-busy={applying} className={classes}>
    {children}{action.kind !== "internal" ? "Application unavailable" : applying ? "Applying..." : applied ? "Applied" : internalLabel}
  </button>;
}

export function ExternalJobApplyAction({ job, className = "" }) {
  if ((job.applicationType ?? "internal") === "internal") return null;
  return <div className={`flex justify-end min-w-0 ${className}`}><JobApplyAction job={job}
    className="bg-blue-600 text-white text-sm px-3.5 py-1.5 rounded-md hover:bg-blue-700 transition-colors text-center" /></div>;
}
