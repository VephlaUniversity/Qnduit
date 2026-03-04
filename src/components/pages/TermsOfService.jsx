import { CTA } from "../home/CTA";
import { FAQSection } from "../home/FAQ";
import { motion } from "framer-motion";

const TermsOfService = () => {
  return (
    <>
      {/* Hero Section */}
      <section className="relative flex items-center">
        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-8 py-12">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <h1 className="text-white text-4xl lg:text-6xl xl:text-7xl mb-6 leading-tight">
              Your Rights and <br />
              Responsibilities on <span className="text-[#F5C518]">Qnduit</span>
            </h1>
            <p className="text-white text-[1rem] mx-auto">
              By using our services, you agree to these rules that help us keep{" "}
              <br className="hidden sm:block" />
              the platform safe, fair, and effective for all users.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Terms Content Section */}
      <section className="py-10">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <motion.div
            className="bg-[#1A1A1C] rounded-3xl p-8 lg:p-12 space-y-10"
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.05 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            {[
              {
                title: "1. Acceptance of Terms",
                content: (
                  <p className="text-gray-300 text-[1rem] leading-relaxed">
                    By using Qnduit, you agree to these Terms of Service and any
                    related policies. If you don't agree, you must not use the
                    platform. These terms create a binding agreement between you
                    and Qnduit.
                  </p>
                ),
              },
              {
                title: "2. Eligibility",
                content: (
                  <p className="text-gray-300 text-[1rem] leading-relaxed">
                    You must be at least 18 years old to create an account or
                    use Qnduit. By registering, you confirm that you meet this
                    requirement and are legally able to enter into this
                    agreement.
                  </p>
                ),
              },
              {
                title: "3. Account Registration",
                content: (
                  <ul className="space-y-3 text-gray-300 text-[1rem]">
                    {[
                      "Provide accurate and complete information when signing up.",
                      "Keep your login details secure. You're responsible for activity under your account.",
                      "Notify us immediately if you suspect unauthorized access to your account.",
                    ].map((item, i) => (
                      <li key={i} className="flex items-start">
                        <span className="text-blue-400 mr-3 mt-1">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ),
              },
              {
                title: "4. Using the Platform",
                content: (
                  <ul className="space-y-3 text-gray-300 text-[1rem]">
                    {[
                      "Qnduit connects job seekers, employers, and partners. Use it only for lawful purposes.",
                      "Do not post false, misleading, or harmful information.",
                      "Do not attempt to access other users' accounts or interfere with the platform's operation.",
                    ].map((item, i) => (
                      <li key={i} className="flex items-start">
                        <span className="text-blue-400 mr-3 mt-1">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ),
              },
              {
                title: "5. Job Listings and Applications",
                content: (
                  <ul className="space-y-3 text-gray-300 text-[1rem]">
                    {[
                      "Employers are responsible for the accuracy of job postings.",
                      "Job seekers are responsible for the accuracy of their profiles and applications.",
                      "Qnduit does not guarantee employment, hiring, or candidate responses; we provide tools to facilitate connections.",
                    ].map((item, i) => (
                      <li key={i} className="flex items-start">
                        <span className="text-blue-400 mr-3 mt-1">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ),
              },
              {
                title: "6. Fees and Payments (if applicable)",
                content: (
                  <ul className="space-y-3 text-gray-300 text-[1rem]">
                    {[
                      "Paid services will clearly display the applicable fees.",
                      "All payments are final unless otherwise stated.",
                      "You agree to pay all fees according to the stated terms.",
                    ].map((item, i) => (
                      <li key={i} className="flex items-start">
                        <span className="text-blue-400 mr-3 mt-1">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ),
              },
              {
                title: "7. Intellectual Property",
                content: (
                  <ul className="space-y-3 text-gray-300 text-[1rem]">
                    {[
                      "The platform, including all content, branding, and software, is owned by Qnduit or its licensors.",
                      "You may not copy, distribute, or modify any content without explicit permission.",
                    ].map((item, i) => (
                      <li key={i} className="flex items-start">
                        <span className="text-blue-400 mr-3 mt-1">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ),
              },
              {
                title: "8. Privacy",
                content: (
                  <p className="text-gray-300 text-[1rem] leading-relaxed">
                    Your use of Qnduit is governed by our Privacy Policy, which
                    explains how we collect, store, and protect your data.
                  </p>
                ),
              },
              {
                title: "9. Termination",
                content: (
                  <ul className="space-y-3 text-gray-300 text-[1rem]">
                    {[
                      "Qnduit may suspend or terminate accounts for violating these terms or engaging in harmful behavior.",
                      "You may also terminate your account at any time by following the instructions in your account settings.",
                    ].map((item, i) => (
                      <li key={i} className="flex items-start">
                        <span className="text-blue-400 mr-3 mt-1">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ),
              },
              {
                title: "10. Disclaimers and Limitation of Liability",
                content: (
                  <ul className="space-y-3 text-gray-300 text-[1rem]">
                    {[
                      'The platform is provided "as is" and "as available."',
                      "Qnduit does not guarantee uninterrupted service or complete accuracy of listings or profiles.",
                      "Qnduit is not liable for damages arising from use of the platform, including lost opportunities or data.",
                    ].map((item, i) => (
                      <li key={i} className="flex items-start">
                        <span className="text-blue-400 mr-3 mt-1">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ),
              },
              {
                title: "11. Changes to Terms",
                content: (
                  <p className="text-gray-300 text-[1rem] leading-relaxed">
                    Qnduit may update these Terms occasionally. Changes will be
                    posted with the effective date. Continuing to use the
                    platform after updates means you accept the revised terms.
                  </p>
                ),
              },
              {
                title: "12. Governing Law",
                content: (
                  <p className="text-gray-300 text-[1rem] leading-relaxed">
                    These Terms are governed by the laws of Nigeria. Any
                    disputes will be resolved under these laws.
                  </p>
                ),
              },
              {
                title: "13. Contact",
                content: (
                  <p className="text-gray-300 text-[1rem] leading-relaxed">
                    If you have questions or concerns about these Terms, contact
                    us at:
                    <br />
                    Email:{" "}
                    <a
                      href="mailto:support@qnduit.com"
                      className="text-[#F5C518] hover:underline"
                    >
                      support@qnduit.com
                    </a>
                  </p>
                ),
              },
            ].map((section, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{
                  duration: 0.5,
                  ease: "easeOut",
                  delay: index * 0.04,
                }}
              >
                <h2 className="text-white text-xl lg:text-2xl mb-4">
                  {section.title}
                </h2>
                {section.content}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <FAQSection />
      <CTA />
    </>
  );
};

export default TermsOfService;
