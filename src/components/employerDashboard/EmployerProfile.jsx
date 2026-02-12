import React, { useState, useEffect } from "react";
import {
  MapPin,
  Edit,
  Star,
  Heart,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Facebook, Twitter, Instagram, Linkedin, Youtube } from "lucide-react";
import { FaPinterest } from "react-icons/fa";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Helper function to extract YouTube video ID
const getYouTubeVideoId = (url) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
};

export const EmployerProfile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [availableJobs, setAvailableJobs] = useState([]);
  const [currentGalleryIndex, setCurrentGalleryIndex] = useState(0);

  useEffect(() => {
    const savedProfile = localStorage.getItem("employerProfile");
    if (savedProfile) {
      setProfile(JSON.parse(savedProfile));
    }
    const savedJobs = JSON.parse(localStorage.getItem("postedJobs") || "[]");
    setAvailableJobs(savedJobs);
  }, []);

  const socialIconMap = {
    facebook: Facebook,
    linkedin: Linkedin,
    twitter: Twitter,
    pinterest: FaPinterest,
    instagram: Instagram,
    youtube: Youtube,
  };

  const activeSocials = profile
    ? Object.entries(profile.socialNetworks || {}).filter(([_, url]) => url)
    : [];

  const youtubeVideoId = getYouTubeVideoId(profile?.introVideo);

  const galleryItems = profile?.gallery || [];
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
                  src={profile.logo}
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
                  {profile?.employerName || "Company Name"}
                </h2>
                <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </div>
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
            {profile?.lat && profile?.lng && (
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
                <a
                  href={`https://${profile?.website}`}
                  className="text-blue-500 hover:underline"
                >
                  {profile?.website || "N/A"}
                </a>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Email</span>
                <span className="text-white">{profile?.email || "N/A"}</span>
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
                  {profile?.foundedDate || "N/A"}
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
              {profile?.aboutCompany ? (
                <div
                  className="text-gray-400 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: profile.aboutCompany }}
                />
              ) : (
                <p className="text-gray-400 leading-relaxed">
                  No company description added yet. Click Edit Profile to add
                  one.
                </p>
              )}
            </div>

            {/* Video Gallery */}
            <div>
              <h3 className="text-xl font-semibold text-white mb-4">
                Video Gallery
              </h3>
              <div
                className="bg-[#0E0E10] rounded-lg overflow-hidden mb-4"
                style={{ height: "320px" }}
              >
                {hasGallery ? (
                  // Show gallery items
                  galleryItems[currentGalleryIndex].type === "video" ? (
                    <video
                      key={currentGalleryIndex}
                      src={galleryItems[currentGalleryIndex].url}
                      className="w-full h-full object-cover"
                      controls
                      autoPlay
                      muted
                      loop
                    />
                  ) : (
                    <img
                      key={currentGalleryIndex}
                      src={galleryItems[currentGalleryIndex].url}
                      alt={`Gallery ${currentGalleryIndex + 1}`}
                      className="w-full h-full object-cover"
                    />
                  )
                ) : youtubeVideoId ? (
                  // Fallback to YouTube intro video
                  <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1&mute=1`}
                    title="Company Introduction Video"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  ></iframe>
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
                        {item.type === "video" ? (
                          <video
                            src={item.url}
                            className="w-full h-full object-cover"
                            muted
                          />
                        ) : (
                          <img
                            src={item.url}
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

            {/* Available Jobs */}
            <div>
              <h3 className="text-xl font-semibold text-white mb-4">
                Available Jobs
              </h3>
              {availableJobs.length === 0 ? (
                <p className="text-gray-400">No jobs posted yet.</p>
              ) : (
                <div className="space-y-4">
                  {availableJobs.map((job) => (
                    <div
                      key={job.id}
                      className="bg-[#0E0E10] rounded-lg p-6 border border-white/5 hover:border-blue-600/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="w-16 h-16 rounded bg-gray-600 flex-shrink-0 overflow-hidden">
                            {profile?.logo ? (
                              <img
                                src={profile.logo}
                                alt="Company"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-600" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-blue-500 text-sm mb-1">
                              {profile?.employerName || "Company"}
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
                              <span>{job.created}</span>
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
                        <button className="p-2 hover:bg-white/5 rounded-lg transition-colors flex-shrink-0">
                          <Heart className="w-6 h-6 text-gray-400 hover:text-red-500" />
                        </button>
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
                            ? `Expires: ${job.deadlineDate}`
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
