import { useEffect, useLayoutEffect, useRef, useState } from "react";
import axios from "axios";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { API_BASE_URL } from "../utils/api";
import { browserSessions } from "../utils/requestSafety";
import { badgeLabel } from "../utils/adminVerification";
import { createAdminProfileLoader, formatAdminProfileDate, safeAdminProfileUrl } from "../utils/adminProfile";
import { editorPlainText, profileName } from "../profiles/profileApi";
import { useAuth } from "../hooks/useAuth";

const readOwner = () => browserSessions().find(session => session.actor.startsWith("admin:"));
const statusMessages = {
  invalid: ["Invalid profile", "Check the selected account type and ID."],
  expired: ["Admin sign-in required", "Your admin session is unavailable or has expired. Sign in again."],
  forbidden: ["Profile access denied", "You do not have permission to inspect this account."],
  missing: ["Account not found", "This account no longer exists."],
  "service-error": ["Unable to load account details", "The service is unavailable. Please try again."],
};
const display = value => typeof value === "string" && value ? editorPlainText(value) : typeof value === "number" ? String(value) : "Not provided";
function Fields({ entries }) {
  return <dl className="grid gap-4 sm:grid-cols-2">{entries.map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-sm text-gray-400">{label}</dt><dd className="whitespace-pre-wrap break-words">{display(value)}</dd></div>)}</dl>;
}
function WebLink({ value, children }) {
  const href = safeAdminProfileUrl(value);
  return href ? <a href={href} target="_blank" rel="noopener noreferrer" className="inline-block min-h-11 break-all text-blue-400 underline">{children}</a> : null;
}
function ProfileDetails({ profile }) {
  const talent = profile.userType === "talent";
  return <div className="space-y-6 text-white">
    <h3 className="text-xl font-semibold break-words">{profileName(profile)}</h3>
    <Fields entries={[
      ["Badge", badgeLabel(profile)], ["Email confirmation", profile.emailConfirmed ? "Confirmed" : "Unconfirmed"],
      ["Account status", profile.accountStatus || "Unknown"], ["Profile visibility", profile.showProfile || "Unknown"],
      ["First name", profile.firstName], ["Last name", profile.lastName], ["Email", profile.email], ["Phone", profile.phone],
      ["Location", profile.location], ["Address", profile.address], ["Categories", profile.categories?.join(", ")],
      ["Joined", formatAdminProfileDate(profile.createdAt)], ["Profile updated", formatAdminProfileDate(profile.profileUpdatedAt)],
    ]} />
    {talent ? <>
      <Fields entries={[["Full name", profile.fullName], ["Job title", profile.jobTitle], ["About", profile.aboutMe],
        ["Qualification", profile.qualification], ["Experience", profile.experienceTime], ["Language", profile.language],
        ["Tags", profile.tags?.join(", ")], ["Offered salary", profile.offeredSalary], ["Salary type", profile.salaryType],
        ["Username", profile.username], ["Public listing enabled", profile.publicProfileEnabled ? "Yes" : "No"]]} />
      <div className="flex flex-wrap gap-x-5"><WebLink value={profile.avatar}>Avatar</WebLink><WebLink value={profile.introVideo}>Introduction video</WebLink><WebLink value={profile.resume}>Resume</WebLink><WebLink value={profile.portfolioUrl}>Portfolio website</WebLink></div>
      {!!profile.experience?.length && <section><h3 className="mb-3 font-semibold">Experience history</h3><div className="space-y-4">{profile.experience.map((item, index) => <Fields key={index} entries={[["Title", item.title], ["Company", item.company], ["Description", item.description], ["Start", formatAdminProfileDate(item.startDate, { dateOnly: true })], ["End", formatAdminProfileDate(item.endDate, { dateOnly: true })]]} />)}</div></section>}
      {!!profile.portfolio?.length && <section><h3 className="mb-3 font-semibold">Portfolio</h3><div className="space-y-4">{profile.portfolio.map((item, index) => <div key={index}><Fields entries={[["Title", item.title], ["Description", item.description]]} /><div className="flex gap-5"><WebLink value={item.imageUrl}>Project image</WebLink><WebLink value={item.projectUrl}>Project website</WebLink></div></div>)}</div></section>}
    </> : <>
      <Fields entries={[["Account type", profile.accountType], ["Company", profile.companyName], ["Display name", profile.displayName],
        ["About company", profile.aboutCompany], ["About individual", profile.aboutYou], ["Industry", profile.companyIndustry],
        ["Company email", profile.companyEmail], ["Company size", profile.companySize], ["Founded", profile.foundedYear]]} />
      <div className="flex flex-wrap gap-x-5"><WebLink value={profile.companyWebsite}>Company website</WebLink><WebLink value={profile.logo}>Logo</WebLink><WebLink value={profile.introVideo}>Introduction video</WebLink></div>
      {!!profile.gallery?.length && <section><h3 className="mb-3 font-semibold">Gallery</h3><ul>{profile.gallery.map((item, index) => <li key={index}><WebLink value={item.url}>{item.type || "Media"} {index + 1}</WebLink></li>)}</ul></section>}
    </>}
    <section><h3 className="mb-3 font-semibold">Social links</h3><div className="flex flex-wrap gap-x-5">{Object.entries(profile.socialNetworks || {}).map(([name, value]) => <WebLink key={name} value={value}>{name}</WebLink>)}</div></section>
  </div>;
}

export function AdminProfileDialog({ subject, onClose }) {
  const { adminUser } = useAuth();
  const adminId = adminUser?.id || adminUser?._id;
  const [result, setResult] = useState({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [loader] = useState(() => createAdminProfileLoader({ client: axios, baseUrl: API_BASE_URL, readOwner }));
  const opener = useRef(null), heading = useRef(null);
  const selectionOwner = useRef(null);
  const close = useRef(onClose);
  useLayoutEffect(() => { close.current = onClose; if (subject?.trigger) opener.current = subject.trigger; }, [onClose, subject]);
  useLayoutEffect(() => { selectionOwner.current = subject ? JSON.stringify(readOwner()) : null; }, [subject]);
  useEffect(() => {
    if (!subject) return;
    const owner = readOwner();
    const ownerKey = JSON.stringify(owner);
    if (selectionOwner.current !== ownerKey) { loader.cancel(); close.current(); return; }
    const changed = () => {
      if (JSON.stringify(readOwner()) !== ownerKey) { loader.cancel(); close.current(); }
    };
    window.addEventListener("storage", changed);
    window.addEventListener("qnduit:polling-session-changed", changed);
    loader.load(subject, state => setResult({ ...state, subject, owner: ownerKey }));
    return () => {
      loader.cancel();
      window.removeEventListener("storage", changed);
      window.removeEventListener("qnduit:polling-session-changed", changed);
    };
  }, [subject, adminId, attempt, loader]);
  const state = subject && result.subject === subject && result.owner === JSON.stringify(readOwner()) ? result : { status: "loading" };
  const error = statusMessages[state.status];
  return <Dialog open={!!subject} onOpenChange={open => { if (!open) { loader.cancel(); onClose(); } }}>
    <DialogContent className="max-h-[85vh] overflow-y-auto border-white/10 bg-[#1A1A1E] text-white sm:max-w-3xl"
      onOpenAutoFocus={event => { event.preventDefault(); heading.current?.focus({ preventScroll: true }); }}
      onCloseAutoFocus={event => { event.preventDefault(); opener.current?.focus({ preventScroll: true }); }}>
      <DialogHeader><DialogTitle ref={heading} tabIndex={-1}>Admin profile details</DialogTitle><DialogDescription>Read-only {subject?.type === "employer" ? "Employer" : "Talent"} account details</DialogDescription></DialogHeader>
      {state.status === "loading" && <p role="status">Loading account details…</p>}
      {error && <div role="alert"><h3 className="font-semibold">{error[0]}</h3><p className="mt-2 text-gray-300">{error[1]}</p>{state.status === "service-error" && <button type="button" onClick={() => setAttempt(value => value + 1)} className="mt-4 min-h-11 text-blue-400 underline">Try again</button>}{state.status === "expired" && <a href="/admin-signin" className="mt-4 inline-block min-h-11 text-blue-400 underline">Admin sign in</a>}</div>}
      {state.status === "ready" && <ProfileDetails profile={state.profile} />}
    </DialogContent>
  </Dialog>;
}
