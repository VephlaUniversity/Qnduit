export const CTA = () => (
  <section className="relative py-20 overflow-hidden">
    {/* Background Image */}
    <div className="absolute inset-0 z-0">
      <img
        src="/images/cta-bg.png"
        alt=""
        className="w-full h-full object-cover"
      />
    </div>

    {/* Gradient Overlay */}
    <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10  to-blue-900/10 z-10"></div>

    {/* Blur Effects */}
    <div className="absolute inset-0 opacity-10 z-10">
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500 rounded-full blur-3xl"></div>
    </div>

    <div className="relative z-20 max-w-5xl mx-auto px-6 lg:px-8 text-center">
      <h2 className="text-4xl lg:text-6xl mb-6">
        Your next opportunity starts here.
        <br />
        <span className="text-yellow-400">Hire now or get discovered</span>
      </h2>

      <p className="text-xl text-gray-300 mb-12">
        Qnduit connects employers with skilled professionals
        <br />
        in one place. It's simple, fast, and built for results.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button className="bg-blue-500 text-white px-8 py-4 rounded-full hover:bg-blue-600 transition-colors">
          Join as Talent
        </button>
        <button className="bg-white text-gray-900 px-8 py-4 rounded-full  hover:bg-gray-100 transition-colors">
          Hire Talent
        </button>
      </div>
    </div>
  </section>
);
