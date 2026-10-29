import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../hooks/useAuth";
import "./HeroSection.css";

import talentA from "../../assets/hero/talent-a.jpg";
import talentB from "../../assets/hero/talent-b.jpg";
import talentC from "../../assets/hero/talent-c.jpg";
import talentD from "../../assets/hero/talent-d.jpg";
import talentE from "../../assets/hero/talent-e.jpg";
import talentF from "../../assets/hero/talent-f.jpg";
import talentG from "../../assets/hero/talent-g.jpg";
import talentH from "../../assets/hero/talent-h.jpg";
import talentI from "../../assets/hero/talent-i.jpg";
import talentJ from "../../assets/hero/talent-j.jpg";

// Card positions come from the design (x / y as a share of the 2000 x 1247 stage).
// Names and roles are sample data until these cards are driven by real talents.
const CARDS = [
  {
    id: "a",
    name: "Oreoluwa Ajayi",
    role: "Frontend Developer",
    img: talentA,
    x: 1614,
    y: 55,
  },
  {
    id: "b",
    name: "Sophie Laurent",
    role: "Product Designer",
    img: talentB,
    x: 1214,
    y: 221,
  },
  {
    id: "c",
    name: "Sarah Mitchell",
    role: "Data Analyst",
    img: talentC,
    x: 1614,
    y: 497,
  },
  {
    id: "d",
    name: "Daniel Reyes",
    role: "Backend Engineer",
    img: talentD,
    x: 814,
    y: 414,
  },
  {
    id: "e",
    name: "Emma Lindberg",
    role: "Project Manager",
    img: talentE,
    x: 1214,
    y: 662,
  },
  {
    id: "f",
    name: "Isabella Moreno",
    role: "UI/UX Designer",
    img: talentF,
    x: 414,
    y: 797,
  },
  {
    id: "g",
    name: "Lucas Bennett",
    role: "DevOps Engineer",
    img: talentG,
    x: 814,
    y: 855,
  },
  {
    id: "h",
    name: "Emily Carter",
    role: "Content Strategist",
    img: talentH,
    x: 14,
    y: 920,
  },
  {
    id: "i",
    name: "Marco Rinaldi",
    role: "Mobile Developer",
    img: talentI,
    x: 1614,
    y: 938,
  },
  {
    id: "j",
    name: "Hannah Fischer",
    role: "QA Engineer",
    img: talentJ,
    x: 1214,
    y: 1104,
    partial: true,
  },
];

const Star = () => (
  <svg viewBox="0 0 20 20" aria-hidden="true">
    <path d="M10 1.2l2.6 5.6 6.1.7-4.5 4.2 1.2 6L10 14.7 4.6 17.7l1.2-6L1.3 7.5l6.1-.7z" />
  </svg>
);

const TalentCard = ({ card, style, hidden }) => (
  <article
    className={`qh-card${card.partial ? " is-partial" : ""}`}
    style={style}
    aria-hidden={hidden || undefined}
  >
    <img src={card.img} alt="" loading="eager" decoding="async" />
    <div className="qh-cap">
      <div className="qh-row">
        <span className="qh-nm">{card.name}</span>
        <span className="qh-stars">
          {[0, 1, 2, 3, 4].map((n) => (
            <Star key={n} />
          ))}
        </span>
      </div>
      <div className="qh-row">
        <span className="qh-rl">{card.role}</span>
        <span className="qh-rt">100% Rated</span>
      </div>
    </div>
  </article>
);

// "small" = phones and tablets, where the cards become drifting columns
const useSmallScreen = () => {
  const query = "(max-width: 900px)";
  const [small, setSmall] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches,
  );
  const [cols, setCols] = useState(() =>
    typeof window !== "undefined" && window.innerWidth >= 600 ? 4 : 3,
  );
  useEffect(() => {
    const update = () => {
      setSmall(window.matchMedia(query).matches);
      setCols(window.innerWidth >= 600 ? 4 : 3);
    };
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return { small, cols };
};

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
};
const stagger = {
  initial: {},
  animate: { transition: { staggerChildren: 0.1 } },
};
const ease = [0.16, 1, 0.3, 1];

export const HeroSection = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { small, cols } = useSmallScreen();

  const handleDashboardClick = () => {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    navigate(user?.userType === "talent" ? "/talent-dashboard" : "/dashboard");
  };

  const full = CARDS.filter((c) => !c.partial);

  const renderCards = () => {
    if (!small) {
      return CARDS.map((c) => (
        <TalentCard
          key={c.id}
          card={c}
          style={{
            "--x": `${(c.x / 2000) * 100}%`,
            "--y": `${(c.y / 1247) * 100}%`,
          }}
        />
      ));
    }
    // Each column repeats its cards three times, then once more as an aria-hidden copy so the loop never shows a gap.
    return Array.from({ length: cols }, (_, col) => {
      const mine = full.filter((_, i) => i % cols === col);
      const set = (suffix, hidden) =>
        [0, 1, 2].flatMap((rep) =>
          mine.map((c) => (
            <TalentCard
              key={`${c.id}-${rep}-${suffix}`}
              card={c}
              hidden={hidden}
            />
          )),
        );
      return (
        <div className="qh-col" key={col}>
          <div className="qh-col-in">
            {set("a", false)}
            {set("b", true)}
          </div>
        </div>
      );
    });
  };

  return (
    <section className="qh" aria-labelledby="hero-title">
      <div className="qh-dots" aria-hidden="true" />
      <div className="qh-inner">
        <div className="qh-stage">
          <motion.div
            className="qh-copy"
            variants={stagger}
            initial="initial"
            animate="animate"
          >
            <motion.h1
              id="hero-title"
              className="qh-title"
              variants={fadeUp}
              transition={{ duration: 0.7, ease }}
            >
              Where Talents Get Seen, Valued, and <em>Hired Fast!</em>
            </motion.h1>
            <motion.p
              className="qh-lede"
              variants={fadeUp}
              transition={{ duration: 0.65, ease }}
            >
              Qnduit connects skilled professionals with teams ready to hire,
              turning visibility into opportunity.
            </motion.p>
            <motion.div
              className="qh-cta"
              variants={fadeUp}
              transition={{ duration: 0.65, ease }}
            >
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={handleDashboardClick}
                  className="qh-btn qh-btn-blue"
                >
                  Go to your Dashboard
                </button>
              ) : (
                <Link to="/talent-signup" className="qh-btn qh-btn-blue">
                  Join as Talent
                </Link>
              )}
              <Link to="/employers" className="qh-btn qh-btn-white">
                Hire Talent
              </Link>
            </motion.div>
          </motion.div>
          <div className="qh-cards">{renderCards()}</div>
        </div>
      </div>
    </section>
  );
};
