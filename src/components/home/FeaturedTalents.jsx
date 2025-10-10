import { Star } from "lucide-react";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

export const FeaturedTalents = () => {
  const featuredTalents = [
    {
      name: "Oreoluwa Ajayi",
      role: "Frontend Developer",
      rating: "100% Rated",
      gradient: "/images/1.jpg",
    },
    {
      name: "Oreoluwa Ajayi",
      role: "Frontend Developer",
      rating: "100% Rated",
      gradient: "/images/2.jpg",
    },
    {
      name: "Oreoluwa Ajayi",
      role: "Frontend Developer",
      rating: "100% Rated",
      gradient: "/images/3.jpg",
    },
    {
      name: "Oreoluwa Ajayi",
      role: "Frontend Developer",
      rating: "100% Rated",
      gradient: "/images/4.jpg",
    },
    {
      name: "Oreoluwa Ajayi",
      role: "Frontend Developer",
      rating: "100% Rated",
      gradient: "/images/5.jpg",
    },
    {
      name: "Oreoluwa Ajayi",
      role: "Frontend Developer",
      rating: "100% Rated",
      gradient: "/images/6.jpg",
    },
    {
      name: "Oreoluwa Ajayi",
      role: "Frontend Developer",
      rating: "100% Rated",
      gradient: "/images/7.jpg",
    },
  ];

  // Settings for the top slider (left to right)
  const topSliderSettings = {
    dots: false,
    infinite: true,
    speed: 4000,
    slidesToShow: 4,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 0,
    cssEase: "linear",
    arrows: false,
    pauseOnHover: false,
    pauseOnFocus: false,
    rtl: false,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 3,
        },
      },
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 2,
        },
      },
      {
        breakpoint: 480,
        settings: {
          slidesToShow: 1,
        },
      },
    ],
  };

  // Settings for the bottom slider (right to left)
  const bottomSliderSettings = {
    dots: false,
    infinite: true,
    speed: 4000,
    slidesToShow: 4,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 0,
    cssEase: "linear",
    arrows: false,
    pauseOnHover: false,
    pauseOnFocus: false,
    rtl: true,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 3,
        },
      },
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 2,
        },
      },
      {
        breakpoint: 480,
        settings: {
          slidesToShow: 1,
        },
      },
    ],
  };

  const TalentCard = ({ talent }) => (
    <div className="px-2 sm:px-3">
      <div className="rounded-2xl overflow-hidden relative h-64 sm:h-72 md:h-80 lg:h-80 w-full max-w-[250px] mx-auto bg-gray-800 hover:scale-105 transform transition-all duration-300">
        <img
          src={talent.gradient}
          alt={talent.name}
          className="w-full h-full object-cover"
        />
        {/*  gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent"></div>

        {/* Content overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
          <h3 className="font-semibold mb-1">{talent.name}</h3>
          <p className="text-sm mb-2 text-gray-200">{talent.role}</p>
          <div className="flex items-center">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className="w-4 h-4 fill-[#F5C518] text-[#F5C518]"
                />
              ))}
            </div>
            <span className="ml-2 text-sm text-gray-200">{talent.rating}</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <section className="max-w-7xl mx-auto px-6 lg:px-8 py-12 overflow-hidden">
      <h2 className="text-4xl lg:text-5xl  text-center mb-12 text-white">
        Featured Talents
      </h2>

      {/* Top Row - Scroll Left to Right */}
      <div className="mb-6">
        <Slider {...topSliderSettings}>
          {[...featuredTalents, ...featuredTalents].map((talent, index) => (
            <TalentCard key={`top-${index}`} talent={talent} />
          ))}
        </Slider>
      </div>

      {/* Bottom Row - Scroll Right to Left */}
      <div className="hidden md:block mb-16">
        <Slider {...bottomSliderSettings}>
          {[...featuredTalents, ...featuredTalents].map((talent, index) => (
            <TalentCard key={`bottom-${index}`} talent={talent} />
          ))}
        </Slider>
      </div>

      {/* Promotional Section */}
      <div className="text-center mt-16">
        <p className="text-2xl lg:text-3xl text-gray-300 mb-8">
          The most affordable career move you'll make all
          <br className="hidden md:block" /> year.
          <span className="text-2xl lg:text-3xl text-[#F5C518]">
            &nbsp;Boost your profile for just $1.99/month.
          </span>
        </p>

        <button className="border border-gray-600 text-white px-8 py-3 rounded-full hover:bg-gray-800 transition-colors">
          Boost profile for $1.99 →
        </button>
      </div>
    </section>
  );
};
