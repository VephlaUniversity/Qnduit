import { useState } from "react";
export const FAQSection = () => {
  const [faqToggle, setFaqToggle] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState(0);

  const faqData = {
    employers: [
      {
        question: "Do I need a subscription to post jobs?",
        answer:
          "Absolutely! Employers should implement a proactive strategy for posting job openings and reaching out to potential candidates. These plans are quite affordable, starting at just $6.99 per month, making it easy for businesses to attract top talent.",
      },
      {
        question: "Can I switch plans later?",
        answer:
          "Yes, you can upgrade or downgrade your plan at any time. Changes will be reflected in your next billing cycle.",
      },
      {
        question: "How do I contact talents?",
        answer:
          "You can contact talents directly through our messaging system once you have an active subscription. Premium plans offer additional contact features.",
      },
      {
        question: "Are there limits to job postings?",
        answer:
          "Basic plans have monthly limits, while premium plans offer unlimited job postings. Check our pricing page for detailed information.",
      },
    ],
    talents: [
      {
        question: "How do I get discovered by employers?",
        answer:
          "Complete your profile, upgrade to a Public Listing for $1.99/month, and stay active on the platform. Featured profiles get 10x more visibility.",
      },
      {
        question: "Can I apply to jobs for free?",
        answer:
          "Yes! Creating an account and applying to jobs is completely free. You can also view job details and build your profile at no cost.",
      },
      {
        question: "What's included in the Public Listing?",
        answer:
          "Public Listing gives you 24/7 discoverability, premium placement in search results, and showcases your skills to the right audience.",
      },
      {
        question: "How do I stand out from other candidates?",
        answer:
          "Complete your profile with a professional photo, detailed skills, portfolio samples, and client testimonials. Premium placement also helps significantly.",
      },
    ],
  };

  const currentFaqData = faqToggle ? faqData.talents : faqData.employers;

  return (
    <section className="max-w-4xl mx-auto px-6 lg:px-8 py-20">
      <div className="text-center mb-16">
        <h2 id="faq-section" className="text-4xl lg:text-5xl mb-8">
          Everything You Need to
          <br />
          Know to Get Started
        </h2>

        <div className="flex items-center justify-center mb-12">
          <span
            className={`text-lg mr-4 ${
              !faqToggle ? "text-white" : "text-gray-300"
            }`}
          >
            For Employers
          </span>
          <button
            onClick={() => {
              setFaqToggle(!faqToggle);
              setExpandedFaq(0);
            }}
            className="relative w-20 h-10 rounded-full focus:outline-none transition-colors duration-300 cursor-pointer"
            style={{ backgroundColor: faqToggle ? "#F5C518" : "#3B82F6" }}
          >
            <div
              className={`absolute top-1 w-8 h-8 bg-white rounded-full shadow-lg transition-all duration-300 ${
                faqToggle ? "left-11" : "left-1"
              }`}
            ></div>
          </button>
          <span
            className={`text-lg ml-4 ${
              faqToggle ? "text-white" : "text-gray-300"
            }`}
          >
            For Talents
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {currentFaqData.map((faq, index) => (
          <div
            key={index}
            className={`border border-gray-400 rounded-2xl hover:bg-[#1A1A1A] ${expandedFaq === index ? "bg-[#1A1A1A]" : "bg-transparent"}`}
          >
            <button
              onClick={() => setExpandedFaq(expandedFaq === index ? -1 : index)}
              className="w-full p-6 text-left flex items-center justify-between transition-colors rounded-2xl cursor-pointer"
            >
              <span className="text-lg font-medium">{faq.question}</span>
              <svg
                className={`w-6 h-6 text-gray-400 transition-transform duration-200 ${
                  expandedFaq === index ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            {expandedFaq === index && (
              <div className="px-6 pb-6">
                <p className="text-gray-300">{faq.answer}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-12 bg-transparent border border-gray-400 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-xl mb-2">Still have a question in mind?</h3>
          <p className="text-gray-400">
            Contact us if you have any other questions.
          </p>
        </div>
        <button className="bg-white cursor-pointer text-gray-900 px-6 py-3 rounded-full hover:bg-gray-100 transition-colors whitespace-nowrap">
          Contact us
        </button>
      </div>
    </section>
  );
};
