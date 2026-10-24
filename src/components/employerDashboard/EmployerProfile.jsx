import React, { useState, useEffect, useMemo } from "react";
import {
  MapPin,
  Edit,
  Star,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Facebook, Twitter, Instagram, Linkedin, Youtube } from "lucide-react";
import { FaPinterest } from "react-icons/fa";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import axios from "axios";
import { API_BASE_URL } from "../utils/api";
import { formatJobDeadline } from "../utils/jobDeadline";
import { useEmployerJobs } from "../hooks/useEmployerJobs";
import { profileImageUrl } from "../profiles/profileApi";
import { hasValidCoordinates } from "../utils/employerProfileValidation";
import { sanitizeEmployerAbout } from "../utils/sanitizeEmployerAbout";
import { getYouTubeVideoId } from "../utils/youtube";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Helper function to extract YouTube video ID

export const EmployerProfile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const aboutCompanyHtml = useMemo(() => sanitizeEmployerAbout(profile?.aboutCompany), [profile?.aboutCompany]);
  const { jobs: allJobs, deleteJob, loaded: jobsLoaded } = useEmployerJobs();
  const [profileLoading, setProfileLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const RECENT_JOBS = 5;
  const recentJobs = [...allJobs]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, RECENT_JOBS);
  const [currentGalleryIndex, setCurrentGalleryIndex] = useState(0);

  useEffect(() => {

    const fetchProfile = async () => {
      setProfileLoading(true);
      setLoadError("");
      try {

        const user = JSON.parse(localStorage.getItem("user"));
        const token = localStorage.getItem("token");

        if (!user?.id) return;

        const { data } = await axios.get(
          `${API_BASE_URL}/api/employers/profile`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setProfile(data.profile);

      } catch (error) {
        console.log("Profile fetch error:", error);
        setLoadError("We couldn't load your profile. Please try again.");
      } finally {
        setProfileLoading(false);
      }
    };

    fetchProfile();

  }, [reloadKey]);

  const socialIconMap = {
    facebook: Facebook,
    linkedin: Linkedin,
    twitter: Twitter,
    pinterest: FaPinterest,
    instagram: Instagram,
    youtube: Youtube,
  };

  const activeSocials = profile
    ? Object.entries(profile.socialNetworks || {}).filter(([, url]) => url)
    : [];

  const youtubeVideoId = getYouTubeVideoId(profile?.introVideo);
  const website = typeof profile?.companyWebsite === "string" ? profile.companyWebsite.trim() : "";
  let websiteHref = "";
  try {
    const url = new URL(website);
    if (website.toLowerCase().startsWith("https://") && url.protocol === "https:"
      && url.hostname && !url.username && !url.password
      && !Array.from(website).some(char => char.charCodeAt(0) <= 32 || char.charCodeAt(0) === 127)) {
      websiteHref = website;
    }
  } catch { /* Missing or invalid websites remain plain text. */ }

  // The introduction video is the first slide, followed by uploaded media.
  const galleryItems = [
    ...(youtubeVideoId
      ? [{ type: "youtube", id: youtubeVideoId, url: `youtube:${youtubeVideoId}` }]
      : []),
    ...(profile?.gallery || []),
  ];
  const hasGallery = galleryItems.length > 0;

  const handlePreviousGallery = () => {
    setCurrentGalleryIndex((prev) =>
      prev === 0 ? galleryItems.length - 1 : prev - 1,
    );
  };

  const handleNextGallery = () => {
    setCurrentGalleryIndex((prev) =>
      prev === galleryItems.length - 1 ? 0 : prev + 1,
    );
  };

  const handleThumbnailClick = (index) => {
    setCurrentGalleryIndex(index);
  };

  if (profileLoading || loadError) {
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1 h-8 bg-blue-600 rounded-full"></div>
          <h1 className="text-2xl md:text-3xl font-semibold text-white">
            Profile
          </h1>
        </div>
        <div className="bg-[#1A1A1E] rounded-lg border border-white/5 p-10 flex flex-col items-center justify-center gap-4 text-gray-400">
          {profileLoading ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Loading your profile...</span>
            </>
          ) : (
            <>
              <p>{loadError}</p>
              <button
                type="button"
                onClick={() => setReloadKey((key) => key + 1)}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Try again
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-8 bg-blue-600 rounded-full"></div>
        <h1 className="text-2xl md:text-3xl font-semibold text-white">
          Profile
        </h1>
      </div>

      <div className="bg-[#1A1A1E] rounded-lg p-6 border border-white/5 mb-6">
        {/* Profile Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-lg bg-gray-600 flex-shrink-0 overflow-hidden">
              {profile?.logo ? (
                <img
                  src={profileImageUrl(profile.logo)}
                  alt="Logo"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-600" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold text-white">
                  {profile?.companyName || "Company Name"}
                </h2>
                {profile?.hasVerificationBadge === true && (
                  <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center" role="img" aria-label="Admin verification badge">
                    <span className="text-white text-xs">✓</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 text-gray-400 text-sm mt-1">
                <MapPin className="w-4 h-4" />
                <span>{profile?.address || "No address set"}</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate("/dashboard/profile-settings")}
            className="px-6 py-2 border border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Edit className="w-4 h-4" />
            Edit Profile
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Company Info */}
          <div className="space-y-4">
            {/* Map - shows saved location */}
            {hasValidCoordinates(profile?.lat, profile?.lng) && (
              <div
                className="rounded-lg overflow-hidden"
                style={{ height: "200px", zIndex: 0 }}
              >
                <MapContainer
                  center={[parseFloat(profile.lat), parseFloat(profile.lng)]}
                  zoom={13}
                  style={{
                    height: "200px",
                    width: "100%",
                    borderRadius: "8px",
                  }}
                  zoomControl={false}
                  dragging={false}
                  scrollWheelZoom={false}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker
                    position={[
                      parseFloat(profile.lat),
                      parseFloat(profile.lng),
                    ]}
                  >
                    <Popup>{profile?.address || "Company Location"}</Popup>
                  </Marker>
                </MapContainer>
              </div>
            )}

            {/* Company Details */}
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Website</span>
                {websiteHref ? <a
                  href={websiteHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  {website}
                </a> : <span className="text-white">{website || "N/A"}</span>}
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Email</span>
                <span className="text-white">{profile?.companyEmail || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Industry</span>
                <span className="text-white">
                  {profile?.categories?.[0] || "N/A"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Company size</span>
                <span className="text-white">
                  {profile?.companySize
                    ? `${profile.companySize} Employees`
                    : "N/A"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Headquarters</span>
                <span className="text-white">
                  {profile?.mapLocation || "N/A"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Founded</span>
                <span className="text-white">
                  {profile?.foundedYear || "N/A"}
                </span>
              </div>
            </div>

            {/* Active Socials */}
            {activeSocials.length > 0 && (
              <div>
                <p className="text-gray-400 text-sm mb-3">Socials:</p>
                <div className="flex gap-2 flex-wrap">
                  {activeSocials.map(([platform, url]) => {
                    const Icon = socialIconMap[platform];
                    return Icon ? (
                      <a
                        key={platform}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-10 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center transition-colors"
                      >
                        <Icon className="w-5 h-5 text-white" />
                      </a>
                    ) : null;
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - About, Gallery, Jobs */}
          <div className="lg:col-span-2 space-y-6">
            {/* About Company */}
            <div>
              <h3 className="text-xl font-semibold text-white mb-4">
                About Company
              </h3>
              {aboutCompanyHtml ? (
                <div
                  className="text-gray-400 leading-relaxed [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-6 [&_ol]:pl-6"
                  dangerouslySetInnerHTML={{ __html: aboutCompanyHtml }}
                />
              ) : (
                <p className="text-gray-400 leading-relaxed">
                  No company description added yet. Click Edit Profile to add
                  one.
                </p>
              )}
            </div>

            {/* Gallery */}
            <div>
              <h3 className="text-xl font-semibold text-white mb-4">
                Gallery
              </h3>
              <div
                className="bg-[#0E0E10] rounded-lg overflow-hidden mb-4"
                style={{ height: "320px" }}
              >
                {hasGallery ? (
                  // Show the current slide
                  galleryItems[currentGalleryIndex].type === "youtube" ? (
                    <iframe
                      key={galleryItems[currentGalleryIndex].url}
                      width="100%"
                      height="100%"
                      src={`https://www.youtube.com/embed/${galleryItems[currentGalleryIndex].id}?mute=1`}
                      title="Company Introduction Video"
                      frameBorder="0"
                      allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full"
                    ></iframe>
                  ) : galleryItems[currentGalleryIndex].type === "video" ? (
                    <video
                      key={galleryItems[currentGalleryIndex].url}
                      src={profileImageUrl(galleryItems[currentGalleryIndex].url)}
                      className="w-full h-full object-cover"
                      controls
                      autoPlay
                      muted
                      loop
                    />
                  ) : (
                    <img
                      key={galleryItems[currentGalleryIndex].url}
                      src={profileImageUrl(galleryItems[currentGalleryIndex].url)}
                      alt={`Gallery ${currentGalleryIndex + 1}`}
                      className="w-full h-full object-cover"
                    />
                  )
                ) : (
                  // No gallery or video
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center mx-auto mb-3">
                        <span className="text-2xl text-white">▶</span>
                      </div>
                      <p className="text-gray-400">No media uploaded yet</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-center items-center gap-4">
                <button
                  onClick={handlePreviousGallery}
                  disabled={!hasGallery}
                  className="p-3 bg-blue-600 hover:bg-blue-700 rounded-full text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex gap-4 overflow-x-auto max-w-md">
                  {hasGallery ? (
                    galleryItems.map((item, index) => (
                      <button
                        key={index}
                        onClick={() => handleThumbnailClick(index)}
                        className={`w-32 h-20 bg-gray-700 rounded-lg overflow-hidden flex-shrink-0 transition-all ${
                          currentGalleryIndex === index
                            ? "ring-2 ring-blue-500 ring-offset-2 ring-offset-[#1A1A1E]"
                            : "opacity-60 hover:opacity-100"
                        }`}
                      >
                        {item.type === "youtube" ? (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-[#0E0E10] text-white">
                            <span className="text-xl">▶</span>
                            <span className="text-xs text-gray-400 mt-1">
                              Intro video
                            </span>
                          </div>
                        ) : item.type === "video" ? (
                          <video
                            src={profileImageUrl(item.url)}
                            className="w-full h-full object-cover"
                            muted
                          />

                        ) : (
                          <img
                            src={profileImageUrl(item.url)}
                            alt={`Thumbnail ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </button>
                    ))
                  ) : (
                    <>
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="w-32 h-20 bg-gray-700 rounded-lg flex-shrink-0"
                        ></div>
                      ))}
                    </>
                  )}
                </div>
                <button
                  onClick={handleNextGallery}
                  disabled={!hasGallery}
                  className="p-3 bg-blue-600 hover:bg-blue-700 rounded-full text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Jobs Recently Posted */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-white">
                  Jobs Recently Posted
                </h3>
                {allJobs.length > RECENT_JOBS && (
                  <button
                    type="button"
                    onClick={() => navigate("/dashboard/my-job")}
                    className="text-sm text-blue-500 hover:text-blue-400 hover:underline"
                  >
                    View all ({allJobs.length})
                  </button>
                )}
              </div>
              {!jobsLoaded ? (
                <div className="flex items-center gap-2 text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading jobs...</span>
                </div>
              ) : recentJobs.length === 0 ? (
                <p className="text-gray-400">No jobs posted yet.</p>
              ) : (
                <div className="space-y-4">
                  {recentJobs.map((job) => (
                    <div
                      key={job._id || job.id}
                      className="bg-[#0E0E10] rounded-lg p-6 border border-white/5 hover:border-blue-600/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="w-16 h-16 rounded bg-gray-600 flex-shrink-0 overflow-hidden">
                            {profile?.logo ? (
                              <img
                                src={profileImageUrl(profile.logo)}
                                alt="Company"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-600" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-blue-500 text-sm mb-1">
                              {profile?.companyName || "Company"}
                            </p>
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="text-white font-semibold text-lg">
                                {job.jobTitle}
                              </h4>
                              {job.verified && (
                                <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                                  <span className="text-white text-xs">✓</span>
                                </div>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400 mb-3">
                              <div className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                <span>
                                  {job.location || job.address || "N/A"}
                                </span>
                              </div>
                              <span>•</span>
                              <span>
                                {job.createdAt
                                  ? new Date(job.createdAt).toLocaleDateString()
                                  : ""}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2 mb-3">
                              {job.jobCategory && (
                                <span className="px-3 py-1 bg-blue-600 text-white rounded-full text-xs">
                                  {job.jobCategory}
                                </span>
                              )}
                              {job.jobApplyType && (
                                <span className="px-3 py-1 bg-blue-600 text-white rounded-full text-xs">
                                  {job.jobApplyType}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className="w-4 h-4 fill-yellow-500 text-yellow-500"
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {confirmDeleteId === job._id ? (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  deleteJob(job._id);
                                  setConfirmDeleteId(null);
                                }}
                                className="px-3 py-2 bg-red-600 hover:bg-red-700 rounded text-white text-sm transition-colors"
                              >
                                Confirm delete
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-3 py-2 border border-white/10 hover:bg-white/5 rounded text-gray-300 text-sm transition-colors"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  navigate(`/dashboard/submit-job?edit=${job._id}`)
                                }
                                className="p-2 bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors"
                                title="Edit Job"
                                aria-label={`Edit ${job.jobTitle}`}
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(job._id)}
                                className="p-2 bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors"
                                title="Delete Job"
                                aria-label={`Delete ${job.jobTitle}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                        <div className="flex items-center gap-2 text-gray-400 text-sm">
                          {job.minSalary && job.maxSalary ? (
                            <>
                              <span className="font-semibold text-white">
                                ${job.minSalary} - ${job.maxSalary}
                              </span>
                              <span>/{job.salaryType || "year"}</span>
                            </>
                          ) : (
                            <span className="text-gray-400">
                              Salary not specified
                            </span>
                          )}
                        </div>
                        <span className="text-gray-400 text-sm">
                          {job.deadlineDate
                            ? `Expires: ${formatJobDeadline(job.deadlineDate)}`
                            : "No deadline set"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployerProfile;
