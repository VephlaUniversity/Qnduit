import { motion } from "framer-motion";
export const TalentTestimonials = () => {
  const testimonials = [
    {
      id: 1,
      text: "I landed my first big agency project within a week of joining Qnduit, the visibility is unmatched. One other thing is also profile boost, it helped!",
      name: "Amake J.",
      role: "Brand Designer",
      rating: 5,
      ratedPercentage: "100% Rated",
      image: "/images/avatar1.png",
    },
    {
      id: 2,
      text: "I landed my first big agency project within a week of joining Qnduit, the visibility is unmatched. One other thing is also profile boost, it helped!",
      name: "Amake J.",
      role: "Brand Designer",
      rating: 5,
      ratedPercentage: "100% Rated",
      image: "/images/avatar1.png",
    },
    {
      id: 3,
      text: "I landed my first big agency project within a week of joining Qnduit, the visibility is unmatched. One other thing is also profile boost, it helped!",
      name: "Amake J.",
      role: "Brand Designer",
      rating: 5,
      ratedPercentage: "100% Rated",
      image: "/images/avatar1.png",
    },
    {
      id: 4,
      text: "I landed my first big agency project within a week of joining Qnduit, the visibility is unmatched. One other thing is also profile boost, it helped!",
      name: "Amake J.",
      role: "Brand Designer",
      rating: 5,
      ratedPercentage: "100% Rated",
      image: "/images/avatar1.png",
    },
    {
      id: 5,
      text: "I landed my first big agency project within a week of joining Qnduit, the visibility is unmatched. One other thing is also profile boost, it helped!",
      name: "Amake J.",
      role: "Brand Designer",
      rating: 5,
      ratedPercentage: "100% Rated",
      image: "/images/avatar1.png",
    },
    {
      id: 6,
      text: "I landed my first big agency project within a week of joining Qnduit, the visibility is unmatched. One other thing is also profile boost, it helped!",
      name: "Amake J.",
      role: "Brand Designer",
      rating: 5,
      ratedPercentage: "100% Rated",
      image: "/images/avatar1.png",
    },
  ];

  const fadeUp = {
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
  };

  const staggerContainer = {
    initial: {},
    animate: { transition: { staggerChildren: 0.1 } },
  };
  const StarRating = () => (
    <div className="flex gap-1">
      {[...Array(5)].map((_, i) => (
        <span key={i} className="text-yellow-400 text-sm">
          ★
        </span>
      ))}
    </div>
  );

  return (
    <section className="text-white py-16 px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.h2
          className="text-4xl md:text-5xl lg:text-6xl text-center mb-12"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          Featured Success
          <br />
          Stories
        </motion.h2>

        {/* Testimonials Grid */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-8"
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, amount: 0.1 }}
        >
          {testimonials.map((testimonial) => (
            <motion.div
              key={testimonial.id}
              variants={fadeUp}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="bg-[radial-gradient(ellipse_50.33%_65.73%_at_11.51%_2.24%,#00368C_0%,#00112D_100%)] border border-gray-700 rounded-3xl p-8"
            >
              <p className="text-gray-200 text-base mb-6 leading-relaxed">
                {testimonial.text}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold">
                    <img
                      src={testimonial.image}
                      alt={testimonial.name}
                      className="w-full h-full object-cover rounded-full"
                    />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">
                      {testimonial.name}
                    </h4>
                    <p className="text-gray-400 text-sm">{testimonial.role}</p>
                  </div>
                </div>
                <div className="text-right">
                  <StarRating />
                  <p className="text-gray-400 text-xs mt-1">
                    {testimonial.ratedPercentage}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA Button */}
        <motion.div
          className="flex justify-center"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <button className="border border-gray-600 text-white px-8 py-3 rounded-full hover:bg-gray-800 transition-colors">
            Read more Customer Reviews →
          </button>
        </motion.div>
      </div>
    </section>
  );
};
