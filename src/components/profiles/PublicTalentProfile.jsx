import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import { motion } from "framer-motion";
import {
  MapPin,
  Briefcase,
  ExternalLink,
  Linkedin,
  Globe,
} from "lucide-react";

import { API_BASE_URL } from "../utils/api";
import { profileImageUrl } from "./profileApi";

const safeExternalUrl = (value) => {
  if (typeof value !== "string") return "";
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
};

const PublicTalentProfile = () => {
  const { username } = useParams();
  const [talent, setTalent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const fetchProfile = async () => {
      setLoading(true);
      setNotFound(false);
      setLoadError(false);
      setTalent(null);

      try {
        const response = await axios.get(
          `${API_BASE_URL}/api/talents/public/${encodeURIComponent(username)}`,
          { signal: controller.signal }
        );

        if (!cancelled) {
          setTalent(response.data?.talent ?? response.data);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(true);
          setNotFound(
            error.response?.status === 404 ||
            error.response?.status === 403
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchProfile();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [username]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0F1419] text-white flex items-center justify-center">
        <p className="text-gray-400">Loading talent profile...</p>
      </main>
    );
  }

  if (notFound || !talent) {
    return (
      <main className="min-h-screen bg-[#0F1419] text-white flex flex-col items-center justify-center px-6 text-center">
        <h1 className="text-3xl font-bold mb-3">
          Profile unavailable
        </h1>
        <p className="text-gray-400 mb-6">
          {loadError && !notFound
            ? "We couldn’t load this profile. Please try again."
            : "This public listing does not exist or is not currently available."}
        </p>
        <Link
          to="/"
          className="bg-blue-500 hover:bg-blue-600 px-5 py-3 rounded-lg"
        >
          Return to QNDUIT
        </Link>
      </main>
    );
  }

  const displayName = talent.fullName?.trim() ||
    [talent.firstName, talent.lastName].filter(value => typeof value === "string" && value.trim()).map(value => value.trim()).join(" ") || "Talent";
  const avatar = profileImageUrl(talent.avatar);
  const portfolioUrl = safeExternalUrl(talent.portfolioUrl);
  const linkedinUrl = safeExternalUrl(talent.socialNetworks?.linkedin);
  const skills = Array.isArray(talent.tags) ? talent.tags : [];
  const experience = Array.isArray(talent.experience)
    ? talent.experience
    : [];
  const portfolio = Array.isArray(talent.portfolio)
    ? talent.portfolio
    : [];

  return (
    <main className="min-h-screen bg-[#0F1419] text-white">
      <div className="max-w-5xl mx-auto px-4 py-10 md:py-16">
        <motion.section
          className="bg-[#191D23] rounded-2xl p-6 md:p-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            {avatar ? (
              <img
                src={avatar}
                alt={displayName}
                className="w-24 h-24 rounded-2xl object-cover"
              />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-blue-600 flex items-center justify-center text-3xl font-bold">
                {displayName?.charAt(0)?.toUpperCase() || "T"}
              </div>
            )}

            <div className="flex-1">
              <p className="text-blue-400 text-sm mb-2">
                Talent on QNDUIT
              </p>
              <h1 className="text-3xl md:text-4xl font-bold">
                {displayName}
              </h1>
              {talent.jobTitle && (
                <p className="text-lg text-gray-300 mt-2">
                  {talent.jobTitle}
                </p>
              )}

              <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-400">
                {talent.location && (
                  <span className="flex items-center gap-2">
                    <MapPin size={16} />
                    {talent.location}
                  </span>
                )}
                {talent.experienceTime && (
                  <span className="flex items-center gap-2">
                    <Briefcase size={16} />
                    {talent.experienceTime}
                  </span>
                )}
              </div>
            </div>
          </div>

          {talent.aboutMe && (
            <section className="mt-10">
              <h2 className="text-xl font-bold mb-3">About</h2>
              <p className="text-gray-300 leading-7 whitespace-pre-line">
                {talent.aboutMe}
              </p>
            </section>
          )}

          {skills.length > 0 && (
            <section className="mt-10">
              <h2 className="text-xl font-bold mb-4">Skills</h2>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill, index) => (
                  <span
                    key={`${skill}-${index}`}
                    className="bg-[#0F1419] border border-gray-700 px-3 py-2 rounded-full text-sm"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </section>
          )}

          {experience.length > 0 && (
            <section className="mt-10">
              <h2 className="text-xl font-bold mb-5">Experience</h2>
              <div className="space-y-6">
                {experience.map((item, index) => (
                  <article
                    key={item._id || index}
                    className="border-l-2 border-blue-500 pl-5"
                  >
                    <h3 className="font-semibold">
                      {item.position || item.title}
                    </h3>
                    <p className="text-gray-400 text-sm mt-1">
                      {item.company}
                      {item.year ? ` · ${item.year}` : ""}
                    </p>
                    {item.description && (
                      <p className="text-gray-300 mt-3 leading-6">
                        {item.description}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            </section>
          )}

          {portfolio.length > 0 && (
            <section className="mt-10">
              <h2 className="text-xl font-bold mb-5">Portfolio</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {portfolio.map((item, index) => (
                  <article
                    key={item._id || index}
                    className="bg-[#0F1419] border border-gray-800 rounded-xl overflow-hidden"
                  >
                    {item.imageUrl && (
                      <img
                        src={profileImageUrl(item.imageUrl)}
                        alt={item.title || "Portfolio project"}
                        className="w-full h-48 object-cover"
                        loading="lazy"
                      />
                    )}
                    <div className="p-4">
                      <h3 className="font-semibold">
                        {item.title || "Portfolio project"}
                      </h3>
                      {item.description && (
                        <p className="text-gray-400 text-sm mt-2">
                          {item.description}
                        </p>
                      )}
                      {safeExternalUrl(item.projectUrl) && (
                        <a
                          href={safeExternalUrl(item.projectUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-blue-400 mt-4 text-sm"
                        >
                          View project <ExternalLink size={15} />
                        </a>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {portfolioUrl && (
            <a
              href={portfolioUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-8 text-blue-400 hover:text-blue-300"
            >
              <Globe size={18} /> Visit portfolio
            </a>
          )}

          {linkedinUrl && (
            <a
              href={linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-5 ml-5 text-blue-400 hover:text-blue-300"
            >
              <Linkedin size={18} /> LinkedIn
            </a>
          )}
        </motion.section>

        <p className="text-center text-gray-500 text-sm mt-8">
          Public talent profile powered by QNDUIT
        </p>
      </div>
    </main>
  );
};

export default PublicTalentProfile;