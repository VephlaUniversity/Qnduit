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

export const TalentFAQ = () => {
  const [expandedFaq, setExpandedFaq] = useState(0);

  const faqData = {
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

  const currentFaqData = faqData.talents;

  return (
    <section className="max-w-4xl mx-auto px-6 lg:px-8 py-20">
      {/* Heading */}
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
