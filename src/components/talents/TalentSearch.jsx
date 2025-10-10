import { JobSearchForm } from "../home/JobsSearchForm";

export const TalentSearch = () => {
  return (
    <section>
      {/* Search */}
      <JobSearchForm />
      <div className="text-center mt-16">
        <p className="text-2xl lg:text-3xl text-gray-300 mb-8">
          Want employers to find you instead?
          <br className="hidden md:block" />
          <span className="text-2xl lg:text-3xl text-[#F5C518]">
            &nbsp;Upgrade for just $1.99/month.
          </span>
        </p>

        <button className="border border-gray-600 text-white px-8 py-3 rounded-full hover:bg-gray-800 transition-colors">
          Boost profile for $1.99 →
        </button>
      </div>
    </section>
  );
};
