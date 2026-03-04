import { useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
};

const staggerContainer = {
  initial: {},
  animate: { transition: { staggerChildren: 0.1 } },
};

export const Testimonials = () => {
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @keyframes slideTestimonials {
        0% { transform: translateX(0); }
        100% { transform: translateX(-50%); }
      }
      .animate-testimonial-slide {
        animation: slideTestimonials 30s linear infinite;
      }
    `;
    document.head.appendChild(style);
    return () => {
      if (document.head.contains(style)) document.head.removeChild(style);
    };
  }, []);

  const topTestimonials = [
    {
      text: "Qnduit gave my agency instant access to top-tier talent. Hiring was smooth, and projects were delivered ahead of schedule.",
      name: "David Kim",
      role: "CEO at BrightLabs",
      avatar: "/images/avatar1.png",
    },
    {
      text: "I landed my first big agency project within a week of joining Qnduit, the visibility is unmatched. One other thing is also profile boost, it helped!",
      name: "Amake J.",
      role: "Brand Designer",
      rating: 5,
      avatar: "/images/avatar1.png",
      featured: true,
    },
    {
      text: "Before Qnduit, finding a direct visual designers who understood our brand was a nightmare. Now, it's a 2-click process.",
      name: "Maya S.",
      role: "Marketing Director at Nexon",
      avatar: "/images/avatar1.png",
    },
  ];

  const projectTestimonials = [
    {
      project: "TravelMate App UI Redesign",
      author: "Daniel Olajide",
      text: "Verta's designs elevated our brand presence, making a real impact with our audience.",
      avatar: "/images/avatar2.png",
    },
    {
      project: "Glow Cosmetics Ad Campaign",
      author: "Jane Doe",
      text: "Our Hired Animator from Qnduit made a motion graphics that was so good our campaign hit 1M views in 48 hours.",
      avatar: "/images/avatar2.png",
    },
    {
      project: "TravelMate App UI Redesign",
      author: "Daniel Olajide",
      text: "Verta's designs elevated our brand presence, making a real impact with our audience.",
      avatar: "/images/avatar2.png",
    },
    {
      project: "TravelMate App UI Redesign",
      author: "Daniel Olajide",
      text: "Verta's designs elevated our brand presence, making a real impact with our audience.",
      avatar: "/images/avatar2.png",
    },
  ];

  return (
    <section className="py-20 bg-[#0E0E10]">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Heading */}
        <motion.h2
          className="text-4xl lg:text-5xl text-center mb-16"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          What Our Creatives
          <br />& Clients Say
        </motion.h2>

        {/* Top Row */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-8"
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, amount: 0.2 }}
        >
          {topTestimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              variants={fadeUp}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className={`rounded-3xl p-8 ${
                testimonial.featured
                  ? "bg-[radial-gradient(ellipse_50.33%_65.73%_at_11.51%_2.24%,#00368C_0%,#00112D_100%)] border border-gray-700"
                  : "bg-[#1A1A1A] border border-gray-700"
              }`}
            >
              <p className="text-gray-100 mb-8 text-lg leading-relaxed">
                {testimonial.text}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-full mr-3 overflow-hidden">
                    <img
                      src={testimonial.avatar}
                      alt={testimonial.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="font-semibold">{testimonial.name}</div>
                    <div className="text-sm text-gray-400">
                      {testimonial.role}
                    </div>
                  </div>
                </div>
                {testimonial.rating && (
                  <div className="flex flex-col items-end">
                    <div className="flex mb-1">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <svg
                          key={i}
                          className="w-4 h-4 fill-yellow-400"
                          viewBox="0 0 20 20"
                        >
                          <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                        </svg>
                      ))}
                    </div>
                    <span className="text-xs text-gray-400">100% Rated</span>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom Row - Sliding */}
        <motion.div
          className="relative mb-12"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-[#0E0E10] to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[#0E0E10] to-transparent z-10 pointer-events-none" />
          <div className="overflow-hidden">
            <div className="flex animate-testimonial-slide">
              {[...projectTestimonials, ...projectTestimonials].map(
                (testimonial, index) => (
                  <div
                    key={index}
                    className="flex-shrink-0 w-80 mx-3 bg-[#1A1A1A] border border-gray-700 rounded-3xl p-6"
                  >
                    <div className="flex items-center mb-4">
                      <div className="w-10 h-10 rounded-full mr-3 overflow-hidden">
                        <img
                          src={testimonial.avatar}
                          alt={testimonial.author}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <div className="font-semibold text-sm">
                          {testimonial.project}
                        </div>
                        <div className="text-xs text-gray-400">
                          Project by {testimonial.author}
                        </div>
                      </div>
                    </div>
                    <p className="text-gray-300 text-sm leading-relaxed">
                      {testimonial.text}
                    </p>
                  </div>
                ),
              )}
            </div>
          </div>
        </motion.div>

        {/* Read More Button */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <Link to="/testimonials">
            <button className="border border-gray-600 text-white px-8 py-3 rounded-full hover:bg-gray-800 transition-colors">
              Read more Customer Reviews →
            </button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
};
