import { useState } from "react";
export const EmployerFAQ = () => {
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
  };

  const currentFaqData = faqData.employers;

  return (
    <section className="max-w-4xl mx-auto px-6 lg:px-8 py-20">
      <div className="text-center mb-16">
        <h2 className="text-4xl lg:text-5xl mb-8">
          Everything You Need to
          <br />
          Know to Get Started
        </h2>
      </div>

      <div className="space-y-4">
        {currentFaqData.map((faq, index) => (
          <div
            key={index}
            className="bg-gray-800 rounded-2xl hover:bg-gray-900"
          >
            <button
              onClick={() => setExpandedFaq(expandedFaq === index ? -1 : index)}
              className="w-full p-6 text-left flex items-center justify-between hover:bg-gray-750 transition-colors rounded-2xl cursor-pointer"
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

      <div className="mt-12 bg-gray-800 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold mb-2">
            Still have a question in mind?
          </h3>
          <p className="text-gray-400">
            Contact us if you have any other questions.
          </p>
        </div>
        <button className="bg-white text-gray-900 px-6 py-3 rounded-full font-semibold hover:bg-gray-100 transition-colors whitespace-nowrap">
          Contact us
        </button>
      </div>
    </section>
  );
};
