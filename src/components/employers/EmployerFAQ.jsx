import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
};

const staggerContainer = {
  initial: {},
  animate: { transition: { staggerChildren: 0.1 } },
};

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
      {/* Header */}
      <motion.div
        className="text-center mb-16"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <h2 className="text-4xl lg:text-5xl mb-8">
          Everything You Need to
          <br />
          Know to Get Started
        </h2>
      </motion.div>

      {/* FAQ Items */}
      <motion.div
        className="space-y-4"
        variants={staggerContainer}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, amount: 0.1 }}
      >
        {currentFaqData.map((faq, index) => (
          <motion.div
            key={index}
            variants={fadeUp}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className={`border border-gray-400 rounded-2xl hover:bg-[#1A1A1A] ${
              expandedFaq === index ? "bg-[#1A1A1A]" : "bg-transparent"
            }`}
          >
            <button
              onClick={() => setExpandedFaq(expandedFaq === index ? -1 : index)}
              className="w-full p-6 text-left flex items-center justify-between transition-colors rounded-2xl cursor-pointer"
            >
              <span className="text-lg font-medium">{faq.question}</span>
              <motion.svg
                animate={{ rotate: expandedFaq === index ? 180 : 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="w-6 h-6 text-gray-400 flex-shrink-0"
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
              </motion.svg>
            </button>

            <AnimatePresence initial={false}>
              {expandedFaq === index && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <p className="text-gray-300 px-6 pb-6">{faq.answer}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </motion.div>

      {/* Contact Box */}
      <motion.div
        className="mt-12 bg-transparent border border-gray-400 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <div>
          <h3 className="text-xl mb-2">Still have a question in mind?</h3>
          <p className="text-gray-400">
            Contact us if you have any other questions.
          </p>
        </div>
        <button className="bg-white text-gray-900 px-6 py-3 rounded-full cursor-pointer hover:bg-gray-100 transition-colors whitespace-nowrap">
          Contact us
        </button>
      </motion.div>
    </section>
  );
};
