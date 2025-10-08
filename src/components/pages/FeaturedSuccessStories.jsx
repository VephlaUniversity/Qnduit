import React, { useState } from "react";
import { CTA } from "../home/CTA";

const TestimonialCard = ({ text, name, title, rating, isEmployer, image }) => (
  <div
    className={`${
      isEmployer
        ? "bg-[radial-gradient(ellipse_50.33%_65.73%_at_11.51%_2.24%,#00368C_0%,#00112D_100%)]"
        : "bg-[#1A1A1A]"
    } border border-gray-700 rounded-2xl p-8 mb-6`}
  >
    <p className="text-gray-100 text-base leading-relaxed mb-6">{text}</p>
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <img
          src={image}
          alt={name}
          className="w-12 h-12 rounded-full object-cover"
        />
        <div>
          <h4 className="font-semibold text-white">{name}</h4>
          <p className="text-gray-400 text-sm">{title}</p>
        </div>
      </div>
      {isEmployer && (
        <div className="flex flex-col items-end gap-1">
          <div className="flex gap-0.5">
            {[...Array(5)].map((_, i) => (
              <span key={i} className="text-yellow-400 text-sm">
                ★
              </span>
            ))}
          </div>
          <span className="text-gray-400 text-xs">{rating}</span>
        </div>
      )}
    </div>
  </div>
);

const FeaturedSuccessStories = () => {
  const [showTalents, setShowTalents] = useState(false);

  const employerTestimonials = [
    {
      text: "Qnduit gave my agency instant access to top-tier talent. Hiring was smooth, and projects were delivered ahead of schedule.",
      name: "David Kim",
      title: "CEO at BrightLabs",
      image: "/images/avatar1.png",
      rating: "100% Rated",
    },
    {
      text: "Before Qnduit, finding a direct visual designers who understood our brand was a nightmare. Now, it's a 2-click process.",
      name: "Maya S.",
      title: "Marketing Director at Nexon",
      image: "/images/avatar1.png",
      rating: "100% Rated",
    },
    {
      text: "Before Qnduit, finding a direct visual designers who understood our brand was a nightmare. Now, it's a 2-click process.",
      name: "Maya S.",
      title: "Marketing Director at Nexon",
      image: "/images/avatar1.png",
      rating: "100% Rated",
    },
    {
      text: "Qnduit gave my agency instant access to top-tier talent. Hiring was smooth, and projects were delivered ahead of schedule.",
      name: "David Kim",
      title: "CEO at BrightLabs",
      image: "/images/avatar1.png",
      rating: "100% Rated",
    },
    {
      text: "Before Qnduit, finding a direct visual designers who understood our brand was a nightmare. Now, it's a 2-click process.",
      name: "Maya S.",
      title: "Marketing Director at Nexon",
      image: "/images/avatar1.png",
      rating: "100% Rated",
    },
    {
      text: "Before Qnduit, finding a direct visual designers who understood our brand was a nightmare. Now, it's a 2-click process.",
      name: "Maya S.",
      title: "Marketing Director at Nexon",
      image: "/images/avatar1.png",
      rating: "100% Rated",
    },
    {
      text: "Qnduit gave my agency instant access to top-tier talent. Hiring was smooth, and projects were delivered ahead of schedule.",
      name: "David Kim",
      title: "CEO at BrightLabs",
      image: "/images/avatar1.png",
      rating: "100% Rated",
    },
    {
      text: "Before Qnduit, finding a direct visual designers who understood our brand was a nightmare. Now, it's a 2-click process.",
      name: "Maya S.",
      title: "Marketing Director at Nexon",
      image: "/images/avatar1.png",
      rating: "100% Rated",
    },
    {
      text: "Before Qnduit, finding a direct visual designers who understood our brand was a nightmare. Now, it's a 2-click process.",
      name: "Maya S.",
      title: "Marketing Director at Nexon",
      image: "/images/avatar1.png",
      rating: "100% Rated",
    },
    {
      text: "Qnduit gave my agency instant access to top-tier talent. Hiring was smooth, and projects were delivered ahead of schedule.",
      name: "David Kim",
      title: "CEO at BrightLabs",
      image: "/images/avatar1.png",
      rating: "100% Rated",
    },
    {
      text: "Before Qnduit, finding a direct visual designers who understood our brand was a nightmare. Now, it's a 2-click process.",
      name: "Maya S.",
      title: "Marketing Director at Nexon",
      image: "/images/avatar1.png",
      rating: "100% Rated",
    },
    {
      text: "Before Qnduit, finding a direct visual designers who understood our brand was a nightmare. Now, it's a 2-click process.",
      name: "Maya S.",
      title: "Marketing Director at Nexon",
      image: "/images/avatar1.png",
      rating: "100% Rated",
    },
  ];

  const talentTestimonials = [
    {
      text: "I landed my first big agency project within a week of joining Qnduit, the visibility is unmatched. One other thing is also profile boost, it helped!",
      name: "Amake J.",
      title: "Brand Designer",

      image: "/images/avatar1.png",
    },
    {
      text: "I landed my first big agency project within a week of joining Qnduit, the visibility is unmatched. One other thing is also profile boost, it helped!",
      name: "Amake J.",
      title: "Brand Designer",

      image: "/images/avatar1.png",
    },
    {
      text: "I landed my first big agency project within a week of joining Qnduit, the visibility is unmatched. One other thing is also profile boost, it helped!",
      name: "Amake J.",
      title: "Brand Designer",

      image: "/images/avatar1.png",
    },
    {
      text: "I landed my first big agency project within a week of joining Qnduit, the visibility is unmatched. One other thing is also profile boost, it helped!",
      name: "Amake J.",
      title: "Brand Designer",

      image: "/images/avatar1.png",
    },
    {
      text: "I landed my first big agency project within a week of joining Qnduit, the visibility is unmatched. One other thing is also profile boost, it helped!",
      name: "Amake J.",
      title: "Brand Designer",

      image: "/images/avatar1.png",
    },
    {
      text: "I landed my first big agency project within a week of joining Qnduit, the visibility is unmatched. One other thing is also profile boost, it helped!",
      name: "Amake J.",
      title: "Brand Designer",

      image: "/images/avatar1.png",
    },
    {
      text: "I landed my first big agency project within a week of joining Qnduit, the visibility is unmatched. One other thing is also profile boost, it helped!",
      name: "Amake J.",
      title: "Brand Designer",

      image: "/images/avatar1.png",
    },
    {
      text: "I landed my first big agency project within a week of joining Qnduit, the visibility is unmatched. One other thing is also profile boost, it helped!",
      name: "Amake J.",
      title: "Brand Designer",

      image: "/images/avatar1.png",
    },
    {
      text: "I landed my first big agency project within a week of joining Qnduit, the visibility is unmatched. One other thing is also profile boost, it helped!",
      name: "Amake J.",
      title: "Brand Designer",

      image: "/images/avatar1.png",
    },
    {
      text: "I landed my first big agency project within a week of joining Qnduit, the visibility is unmatched. One other thing is also profile boost, it helped!",
      name: "Amake J.",
      title: "Brand Designer",

      image: "/images/avatar1.png",
    },
    {
      text: "I landed my first big agency project within a week of joining Qnduit, the visibility is unmatched. One other thing is also profile boost, it helped!",
      name: "Amake J.",
      title: "Brand Designer",

      image: "/images/avatar1.png",
    },
    {
      text: "I landed my first big agency project within a week of joining Qnduit, the visibility is unmatched. One other thing is also profile boost, it helped!",
      name: "Amake J.",
      title: "Brand Designer",

      image: "/images/avatar1.png",
    },
  ];

  const testimonials = showTalents ? talentTestimonials : employerTestimonials;

  return (
    <>
      <section className="relative min-h-[40vh] flex items-center">
        <div className="absolute inset-0 bg-gradient-to-b from-[rgba(6,67,167,0.20)] via-[rgba(59,130,246,0.20)] to-[#0E0E10]/95"></div>

        {/* Content */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-8 py-12 lg:py-20">
          <div className="text-center mb-12">
            <h1 className="text-4xl lg:text-6xl xl:text-7xl mb-6 leading-tight">
              Featured Success
              <br />
              <span className="text-[#F5C518]">Stories</span>
            </h1>
          </div>
        </div>
      </section>
      <div>
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            {/* Toggle Switch */}
            <div className="flex items-center justify-center mb-12">
              <span
                className={`text-lg mr-4 ${
                  !showTalents ? "text-white" : "text-gray-300"
                }`}
              >
                For Employers
              </span>
              <button
                onClick={() => setShowTalents(!showTalents)}
                className="relative w-20 h-10 rounded-full focus:outline-none transition-colors duration-300 cursor-pointer"
                style={{ backgroundColor: showTalents ? "#F5C518" : "#3B82F6" }}
              >
                <div
                  className={`absolute top-1 w-8 h-8 bg-white rounded-full shadow-lg transition-all duration-300 ${
                    showTalents ? "left-11" : "left-1"
                  }`}
                ></div>
              </button>
              <span
                className={`text-lg ml-4 ${
                  showTalents ? "text-white" : "text-gray-300"
                }`}
              >
                For Talents
              </span>
            </div>
          </div>

          {/* Testimonials Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1 mb-8 p-8 lg:p-0">
            {testimonials.map((testimonial, index) => (
              <TestimonialCard
                key={index}
                text={testimonial.text}
                name={testimonial.name}
                title={testimonial.title}
                rating={testimonial.rating}
                image={testimonial.image}
                isEmployer={!showTalents}
              />
            ))}
          </div>
        </div>
      </div>
      <CTA />
    </>
  );
};

export default FeaturedSuccessStories;
