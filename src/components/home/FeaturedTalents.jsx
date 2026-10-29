import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import { API_BASE_URL } from "../utils/api";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
};

const staggerContainer = {
  initial: {},
  animate: { transition: { staggerChildren: 0.12 } },
};

const marqueeCss = `
.talent-marquee { --cards: 4; container-type: inline-size; overflow: hidden; }
.talent-marquee-track {
  display: flex;
  width: max-content;
  animation: talent-marquee 30s linear infinite;
}
.talent-marquee.reverse .talent-marquee-track { animation-direction: reverse; }
.talent-marquee:hover .talent-marquee-track { animation-play-state: paused; }
.talent-marquee-slot { flex: none; width: calc(100cqw / var(--cards)); }
@keyframes talent-marquee { to { transform: translateX(-50%); } }
@media (max-width: 1024px) { .talent-marquee { --cards: 3; } }
@media (max-width: 768px) { .talent-marquee { --cards: 2; } }
@media (max-width: 480px) { .talent-marquee { --cards: 1; } }
@media (prefers-reduced-motion: reduce) {
  .talent-marquee { overflow-x: auto; }
  .talent-marquee-track { animation: none; }
}
`;

const MarqueeRow = ({ talents, reverse = false, label }) => (
  <div className={`talent-marquee${reverse ? " reverse" : ""}`}>
    <div className="talent-marquee-track">
      {/* The list is shown twice so the loop has no gap; the copy is hidden from screen readers. */}
      {[0, 1].map((copy) =>
        talents.map((talent, index) => (
          <div
            key={`${label}-${copy}-${index}`}
            className="talent-marquee-slot"
            aria-hidden={copy === 1 ? true : undefined}
          >
            <TalentCard talent={talent} />
          </div>
        )),
      )}
    </div>
  </div>
);

const initialsOf = (name) =>
  (name || "T")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

const TalentCard = ({ talent }) => {
  const [photoFailed, setPhotoFailed] = useState(false);
  const showPhoto = talent.avatar && !photoFailed;
  return (
    <div className="px-2 sm:px-3">
      <Link
        to={`/${encodeURIComponent(talent.username)}`}
        className="block rounded-2xl overflow-hidden relative h-64 sm:h-72 md:h-80 lg:h-80 w-full max-w-[250px] mx-auto bg-[#141a2b] hover:scale-105 transform transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-400"
        aria-label={`View ${talent.name}'s profile`}
      >
        {showPhoto ? (
          <img
            src={talent.avatar}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover"
            onError={() => setPhotoFailed(true)}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1b2a52] to-[#0c1226] text-5xl font-semibold text-white/80"
            aria-hidden="true"
          >
            {initialsOf(talent.name)}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
          <h3 className="font-semibold mb-1 truncate">{talent.name}</h3>
          {talent.jobTitle && (
            <p className="text-sm mb-2 text-gray-200 truncate">
              {talent.jobTitle}
            </p>
          )}
          {talent.location && (
            <p className="flex items-center gap-1 text-xs text-gray-300 truncate">
              <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{talent.location}</span>
            </p>
          )}
        </div>
      </Link>
    </div>
  );
};

// Real, public talents only: the same list as "Browse all talents" (verified, active and on a paid public profile).
const useFeaturedTalents = () => {
  const [talents, setTalents] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    axios
      .get(`${API_BASE_URL}/api/talents/public`, {
        params: { limit: 12 },
        signal: controller.signal,
      })
      .then(({ data }) =>
        setTalents(Array.isArray(data?.talents) ? data.talents : []),
      )
      .catch(() => {})
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);
  return { talents, loading };
};

export const FeaturedTalents = () => {
  const { talents, loading } = useFeaturedTalents();
  // A short list is repeated so the sliding rows always fill the width.
  const rowTalents =
    talents.length > 0 && talents.length < 8
      ? Array.from(
          { length: Math.ceil(8 / talents.length) * talents.length },
          (_, i) => talents[i % talents.length],
        )
      : talents;
  const hasTalents = talents.length > 0;

  return (
    <section className="max-w-7xl mx-auto px-6 lg:px-8 py-12 overflow-hidden">
      <style>{marqueeCss}</style>
      {/* Heading */}
      <motion.h2
        className="text-4xl lg:text-5xl text-center mb-12 text-white"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        Featured Talents
      </motion.h2>

      {loading && (
        <div
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16"
          aria-hidden="true"
        >
          {[0, 1, 2, 3].map((n) => (
            <div
              key={n}
              className={`h-64 md:h-80 rounded-2xl bg-white/5 animate-pulse ${n > 1 ? "hidden md:block" : ""}`}
            />
          ))}
        </div>
      )}

      {!loading && !hasTalents && (
        <p className="text-center text-gray-400 mb-12">
          Featured talents will appear here soon.
        </p>
      )}

      {/* Top Row */}
      {hasTalents && (
        <motion.div
          className="mb-6"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <MarqueeRow talents={rowTalents} label="top" />
        </motion.div>
      )}

      {/* Bottom Row */}
      {hasTalents && (
        <motion.div
          className="hidden md:block mb-16"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
        >
          <MarqueeRow
            talents={[...rowTalents].reverse()}
            reverse
            label="bottom"
          />
        </motion.div>
      )}

      {/* Link to the full public directory */}
      <div className="text-center mt-6 md:-mt-8">
        <Link
          to="/feature-talents"
          className="inline-block border border-gray-600 text-white px-8 py-3 rounded-full hover:bg-gray-800 transition-colors"
        >
          Browse all talents →
        </Link>
      </div>

      {/* Promotional Section */}
      <motion.div
        className="text-center mt-16"
        variants={staggerContainer}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, amount: 0.4 }}
      >
        <motion.p
          variants={fadeUp}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="text-2xl lg:text-3xl text-gray-300 mb-8"
        >
          The most affordable career move you'll make all
          <br className="hidden md:block" /> year.
          <span className="text-2xl lg:text-3xl text-[#F5C518]">
            &nbsp;Boost your profile for just $1.99/month.
          </span>
        </motion.p>

        <motion.div
          variants={fadeUp}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        >
          <Link
            to="/pricing"
            className="inline-block border border-gray-600 text-white px-8 py-3 rounded-full hover:bg-gray-800 transition-colors"
          >
            Boost profile for $1.99 →
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
};
