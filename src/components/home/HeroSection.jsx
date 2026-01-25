import { Link } from "react-router-dom";
export const HeroSection = () => {
  const popularTitles = [
    "UI/UX Designer",
    "Full Stack Engineer",
    "Motion Designer",
    "Ghost Writer",
  ];

  return (
    <section className="relative min-h-screen flex items-center">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src="/images/hero-bg.png"
          alt=""
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[rgba(6,67,167,0.20)] via-[#0E0E10]/90 to-[#0E0E10]/95"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-8 py-12 lg:py-20">
        <div className="text-center mb-12">
          <h1 className="text-4xl lg:text-6xl xl:text-7xl mb-6 leading-tight">
            Where Talents Get Seen,
            <br />
            Valued, and <span className="text-[#F5C518]">Hired Fast!</span>
          </h1>
          <p className="text-xl lg:text-2xl text-gray-300 mb-8">
            Qnduit connects skilled professionals with teams
            <br className="hidden sm:block" />
            ready to hire, turning visibility into opportunity.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pb-6">
            <button className="bg-[#3B82F6] text-white px-8 py-3 rounded-full  hover:bg-[#5F8DD7] transition-colors cursor-pointer">
              <Link to="/talent-signup">Join as Talent</Link>
            </button>
            <button className="bg-white text-black px-8 py-3 rounded-full  hover:bg-gray-100 transition-colors cursor-pointer">
              <Link to="/employer-signup">Hire Talent</Link>
            </button>
          </div>
          <div className="max-w-4xl mx-auto mb-12">
            <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4">
              <span className="text-gray-400 text-sm md:text-base w-full sm:w-auto mb-2 sm:mb-0">
                Popular Titles
              </span>
              {popularTitles.map((title, index) => (
                <span
                  key={index}
                  className="px-4 py-2 md:px-6 md:py-2 text-sm md:text-base bg-[#666666] text-[#fff] rounded-full border border-gray-700 hover:bg-gray-700 hover:text-white transition-all duration-200"
                >
                  {title}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
