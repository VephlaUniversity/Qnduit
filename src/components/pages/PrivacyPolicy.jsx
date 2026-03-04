import { CTA } from "../home/CTA";
import { FAQSection } from "../home/FAQ";
import { motion } from "framer-motion";

const PrivacyPolicy = () => {
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
              Qnduit
              <br />
              Privacy <span className="text-[#F5C518]">Policy</span>
            </h1>
            <p className="text-white text-[1rem] mx-auto">
              Your privacy matters. Here's how we collect, use, and protect{" "}
              <br className="hidden sm:block" />
              your information when you use our platform.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Privacy Policy Content Section */}
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
                title: "1. Introduction",
                content: (
                  <p className="text-gray-300 text-[1rem] leading-relaxed">
                    At Qnduit, we value your privacy and are committed to
                    protecting your personal information. This Privacy Policy
                    explains what information we collect, why we collect it, how
                    we use it, and your rights regarding your data. By using our
                    platform, you consent to the practices described here.
                  </p>
                ),
              },
              {
                title: "2. Information We Collect",
                content: (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-gray-200 text-lg mb-2">
                        a. Information You Provide Directly
                      </h3>
                      <ul className="space-y-2 text-gray-300 text-[1rem] ml-4">
                        {[
                          "Name, email, and login credentials",
                          "Profile details (resume, skills, experience, education)",
                          "Job applications and messages",
                        ].map((item, i) => (
                          <li key={i} className="flex items-start">
                            <span className="text-blue-400 mr-3 mt-1">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h3 className="text-gray-200 text-lg mb-2">
                        b. Information We Collect Automatically
                      </h3>
                      <ul className="space-y-2 text-gray-300 text-[1rem] ml-4">
                        {[
                          "Device and browser information",
                          "IP address and location data",
                          "Usage data (pages visited, clicks, time spent on the platform)",
                        ].map((item, i) => (
                          <li key={i} className="flex items-start">
                            <span className="text-blue-400 mr-3 mt-1">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h3 className="text-gray-200 text-lg mb-2">
                        c. Information from Third Parties
                      </h3>
                      <ul className="space-y-2 text-gray-300 text-[1rem] ml-4">
                        {[
                          "References, background checks, or verification services (if used)",
                          "Data shared by employers or partners for recruitment purposes",
                        ].map((item, i) => (
                          <li key={i} className="flex items-start">
                            <span className="text-blue-400 mr-3 mt-1">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ),
              },
              {
                title: "3. How We Use Your Information",
                content: (
                  <ul className="space-y-3 text-gray-300 text-[1rem]">
                    {[
                      "To provide and improve our platform and services",
                      "To match job seekers with relevant job opportunities",
                      "To communicate with you about applications, job listings, updates, or support",
                      "To detect and prevent fraud, abuse, or unauthorized activity",
                      "To comply with legal obligations",
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
                title: "4. Sharing Your Information",
                content: (
                  <>
                    <p className="text-gray-300 text-[1rem] leading-relaxed mb-3">
                      We do not sell your personal data. We may share your
                      information:
                    </p>
                    <ul className="space-y-3 text-gray-300 text-[1rem]">
                      {[
                        "With employers or partners as part of job applications or recruitment processes",
                        "With service providers who help us operate the platform",
                        "If required by law or to protect our rights and the safety of users",
                      ].map((item, i) => (
                        <li key={i} className="flex items-start">
                          <span className="text-blue-400 mr-3 mt-1">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                ),
              },
              {
                title: "5. Cookies and Tracking",
                content: (
                  <p className="text-gray-300 text-[1rem] leading-relaxed">
                    We use cookies and similar technologies to enhance your
                    experience, analyze usage, and serve relevant content. You
                    can manage your cookie preferences through your browser
                    settings.
                  </p>
                ),
              },
              {
                title: "6. Data Security",
                content: (
                  <p className="text-gray-300 text-[1rem] leading-relaxed">
                    We implement appropriate technical and organizational
                    measures to protect your information from unauthorized
                    access, alteration, disclosure, or destruction. However, no
                    system is completely secure, and we cannot guarantee
                    absolute protection.
                  </p>
                ),
              },
              {
                title: "7. Your Rights",
                content: (
                  <>
                    <p className="text-gray-300 text-[1rem] leading-relaxed mb-3">
                      Depending on your location, you may have the right to:
                    </p>
                    <ul className="space-y-3 text-gray-300 text-[1rem]">
                      {[
                        "Access the personal data we hold about you",
                        "Correct or update your information",
                        "Delete your account and personal data",
                        "Restrict or object to certain processing of your data",
                      ].map((item, i) => (
                        <li key={i} className="flex items-start">
                          <span className="text-blue-400 mr-3 mt-1">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="text-gray-300 text-[1rem] leading-relaxed mt-3">
                      To exercise these rights, please contact us at{" "}
                      <a
                        href="mailto:support@qnduit.com"
                        className="text-[#F5C518] hover:underline"
                      >
                        [support@qnduit.com]
                      </a>
                      .
                    </p>
                  </>
                ),
              },
              {
                title: "8. Retention of Data",
                content: (
                  <p className="text-gray-300 text-[1rem] leading-relaxed">
                    We retain your personal information as long as necessary to
                    provide our services, comply with legal obligations, and
                    resolve disputes.
                  </p>
                ),
              },
              {
                title: "9. Third-Party Links",
                content: (
                  <p className="text-gray-300 text-[1rem] leading-relaxed">
                    Our platform may contain links to external websites. We are
                    not responsible for the privacy practices of these third
                    parties.
                  </p>
                ),
              },
              {
                title: "10. Changes to this Policy",
                content: (
                  <p className="text-gray-300 text-[1rem] leading-relaxed">
                    We may update this Privacy Policy from time to time. Changes
                    will be posted on this page with the effective date.
                    Continued use of the platform means you accept the updated
                    policy.
                  </p>
                ),
              },
              {
                title: "11. Contact Us",
                content: (
                  <p className="text-gray-300 text-[1rem] leading-relaxed">
                    If you have questions, concerns, or requests regarding your
                    privacy, contact us at:
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

export default PrivacyPolicy;
