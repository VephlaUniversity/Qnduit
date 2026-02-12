import { CTA } from "../home/CTA";

const Contact = () => {
  return (
    <>
      <section className="relative min-h-[40vh] flex items-center">
        <div className="absolute inset-0 bg-gradient-to-b from-[rgba(6,67,167,0.20)] via-[rgba(59,130,246,0.20)] to-[#0E0E10]/95"></div>

        {/* Content */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-8 py-12 lg:py-20">
          <div className="text-center mb-12">
            <h1 className="text-4xl lg:text-6xl xl:text-7xl mb-6 leading-tight">
              Start the conversation that <br /> moves you{" "}
              <span className="text-[#F5C518]">adead</span>
            </h1>
            <p className="text-sm">
              Whether you're hiring or job hunting, we're here <br /> to help
            </p>
          </div>
        </div>
      </section>
      <div></div>
      <CTA />
    </>
  );
};

export default Contact;
