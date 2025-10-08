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
    <section className=" text-white py-16 px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <h2 className="text-4xl md:text-5xl lg:text-6xl text-center mb-12">
          Featured Success
          <br />
          Stories
        </h2>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-8">
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.id}
              className="bg-[radial-gradient(ellipse_50.33%_65.73%_at_11.51%_2.24%,#00368C_0%,#00112D_100%)] border border-gray-700 rounded-3xl p-8"
            >
              {/* Testimonial Text */}
              <p className="text-gray-200 text-base mb-6 leading-relaxed">
                {testimonial.text}
              </p>

              {/* Author Info */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full  flex items-center justify-center text-white font-semibold">
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

                {/* Rating */}
                <div className="text-right">
                  <StarRating />
                  <p className="text-gray-400 text-xs mt-1">
                    {testimonial.ratedPercentage}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Button */}
        <div className="flex justify-center">
          <button className="bg-transparent border border-gray-600 text-white px-8 py-3 rounded-full font-medium hover:bg-white/10 hover:border-white transition-all duration-300 flex items-center gap-2">
            Read more Customer Reviews
            <span className="text-xl">→</span>
          </button>
        </div>
      </div>
    </section>
  );
};
