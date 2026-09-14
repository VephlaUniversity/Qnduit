import { useState, useEffect, useRef } from "react";
import { JobSearchForm } from "./JobsSearchForm";
import { motion } from "framer-motion";

export const LogoSection = () => {
  const scrollContainerRef = useRef(null);
  const [isPaused, setIsPaused] = useState(false);

  const companyLogos = [
    "/images/vis.png",
    "/images/sig.png",
    "/images/dexi.png",
    "/images/vectra.png",
    "/images/optimal.png",
    "/images/iconic.png",
    "/images/emb.png",
  ];

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    let scrollPosition = 0;
    let animationFrameId;

    const scroll = () => {
      if (!isPaused) {
        scrollPosition += 0.5;

        // Get the width of one set of logos
        const firstChild = scrollContainer.firstChild;
        if (firstChild) {
          const itemWidth = firstChild.offsetWidth;
          const totalWidth = itemWidth * companyLogos.length;

          // Reset position when we've scrolled through one complete set
          if (scrollPosition >= totalWidth) {
            scrollPosition = 0;
          }
        }

        scrollContainer.style.transform = `translateX(-${scrollPosition}px)`;
      }
      animationFrameId = requestAnimationFrame(scroll);
    };

    animationFrameId = requestAnimationFrame(scroll);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isPaused, companyLogos.length]);

  return (
    <div className="mt-8">
      {/* Logo Slider with Fade Effect */}
      <div className="relative mb-16 overflow-hidden max-w-6xl mx-auto px-4">
        {/* Left Fade */}
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[#0E0E10] to-transparent z-10 pointer-events-none"></div>

        {/* Right Fade */}
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#0E0E10] to-transparent z-10 pointer-events-none"></div>

        {/* Sliding Logos Container */}
        <div
          ref={scrollContainerRef}
          className="flex"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* First Set */}
          {companyLogos.map((logo, index) => (
            <div key={`first-${index}`} className="flex-shrink-0 px-8">
              <img
                src={logo}
                alt={`Company logo ${index + 1}`}
                className="h-8 w-auto opacity-60 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-300"
              />
            </div>
          ))}
          {/* Duplicate Set for Seamless Loop */}
          {companyLogos.map((logo, index) => (
            <div key={`second-${index}`} className="flex-shrink-0 px-8">
              <img
                src={logo}
                alt={`Company logo ${index + 1}`}
                className="h-8 w-auto opacity-60 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-300"
              />
            </div>
          ))}
          {/* Third Set for Extra Smooth Loop */}
          {companyLogos.map((logo, index) => (
            <div key={`third-${index}`} className="flex-shrink-0 px-8">
              <img
                src={logo}
                alt={`Company logo ${index + 1}`}
                className="h-8 w-auto opacity-60 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-300"
              />
            </div>
          ))}
        </div>
      </div>

        {/* Section Heading */}
      <div className="flex flex-col items-center">
      {/* Members online badge */}
      <motion.div
        className="flex items-center gap-2 mb-6 px-4 py-2 rounded-full bg-white/5 border border-white/10"
        initial={{ opacity: 0, y: -10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
        </span>
        <span className="text-sm text-white/80">458 members online</span>
      </motion.div>
 
      {/* Heading */}
      <motion.h2
        className="text-4xl lg:text-5xl text-center mb-16"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      >
        Find Your Next Big <br /> Career Move
      </motion.h2>
    </div>

      <JobSearchForm />

      <div className="text-center mb-20">
        <h2 className="text-3xl lg:text-4xl font-semibold mb-4">
          <span className="text-[#F5C518]">
            Trusted by Startups and Global brands&nbsp;
          </span>
          hiring
          <br />
          now with over <span className="text-[#F5C518]"> 12,000+ Jobs</span>
          &nbsp;posted by verified
          <br />
          companies, updated daily.
        </h2>
      </div>
    </div>
  );
};
