export const EmployerHero = () => {
  return (
    <section className="relative min-h-[60vh] flex items-center">
      <div className="absolute inset-0 bg-gradient-to-b from-[rgba(6,67,167,0.20)] via-[rgba(59,130,246,0.20)] to-[#0E0E10]/95"></div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-8 py-12 lg:py-20">
        <div className="text-center mb-12">
          <h1 className="text-4xl lg:text-6xl xl:text-7xl mb-6 leading-tight">
            Hire Top Talents
            <br />
            <span className="text-[#F5C518]">Faster</span>
          </h1>
          <p className="text-xl lg:text-2xl text-gray-300 mb-8">
            Search thousands of talents. Join now to apply
            <br className="hidden sm:block" />
            and get great talents today
          </p>
        </div>
      </div>
    </section>
  );
};
