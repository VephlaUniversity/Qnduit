import { CTA } from "../home/CTA";
import { FAQSection } from "../home/FAQ";

const PrivacyPolicy = () => {
  return (
    <>
      {/* Hero Section */}
      <section className="relative flex items-center">
        {/* Content */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-8 py-12">
          <div className="text-center mb-12">
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
          </div>
        </div>
      </section>

      {/* Privacy Policy Content Section */}
      <section className="py-10">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          {/* Main Content Box */}
          <div className="bg-[#1A1A1C] rounded-3xl p-8 lg:p-12 space-y-10">
            {/* 1. Introduction */}
            <div>
              <h2 className="text-white text-xl lg:text-2xl mb-4">
                1. Introduction
              </h2>
              <p className="text-gray-300 text-[1rem] leading-relaxed">
                At Qnduit, we value your privacy and are committed to protecting
                your personal information. This Privacy Policy explains what
                information we collect, why we collect it, how we use it, and
                your rights regarding your data. By using our platform, you
                consent to the practices described here.
              </p>
            </div>

            {/* 2. Information We Collect */}
            <div>
              <h2 className="text-white text-xl lg:text-2xl mb-4">
                2. Information We Collect
              </h2>

              <div className="space-y-4">
                <div>
                  <h3 className="text-gray-200 text-lg mb-2">
                    a. Information You Provide Directly
                  </h3>
                  <ul className="space-y-2 text-gray-300 text-[1rem] ml-4">
                    <li className="flex items-start">
                      <span className="text-blue-400 mr-3 mt-1">•</span>
                      <span>Name, email, and login credentials</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-400 mr-3 mt-1">•</span>
                      <span>
                        Profile details (resume, skills, experience, education)
                      </span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-400 mr-3 mt-1">•</span>
                      <span>Job applications and messages</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-gray-200 text-lg mb-2">
                    b. Information We Collect Automatically
                  </h3>
                  <ul className="space-y-2 text-gray-300 text-[1rem] ml-4">
                    <li className="flex items-start">
                      <span className="text-blue-400 mr-3 mt-1">•</span>
                      <span>Device and browser information</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-400 mr-3 mt-1">•</span>
                      <span>IP address and location data</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-400 mr-3 mt-1">•</span>
                      <span>
                        Usage data (pages visited, clicks, time spent on the
                        platform)
                      </span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-gray-200 text-lg mb-2">
                    c. Information from Third Parties
                  </h3>
                  <ul className="space-y-2 text-gray-300 text-[1rem] ml-4">
                    <li className="flex items-start">
                      <span className="text-blue-400 mr-3 mt-1">•</span>
                      <span>
                        References, background checks, or verification services
                        (if used)
                      </span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-400 mr-3 mt-1">•</span>
                      <span>
                        Data shared by employers or partners for recruitment
                        purposes
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 3. How We Use Your Information */}
            <div>
              <h2 className="text-white text-xl lg:text-2xl mb-4">
                3. How We Use Your Information
              </h2>
              <ul className="space-y-3 text-gray-300 text-[1rem]">
                <li className="flex items-start">
                  <span className="text-blue-400 mr-3 mt-1">•</span>
                  <span>To provide and improve our platform and services</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-3 mt-1">•</span>
                  <span>
                    To match job seekers with relevant job opportunities
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-3 mt-1">•</span>
                  <span>
                    To communicate with you about applications, job listings,
                    updates, or support
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-3 mt-1">•</span>
                  <span>
                    To detect and prevent fraud, abuse, or unauthorized activity
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-3 mt-1">•</span>
                  <span>To comply with legal obligations</span>
                </li>
              </ul>
            </div>

            {/* 4. Sharing Your Information */}
            <div>
              <h2 className="text-white text-xl lg:text-2xl mb-4">
                4. Sharing Your Information
              </h2>
              <p className="text-gray-300 text-[1rem] leading-relaxed mb-3">
                We do not sell your personal data. We may share your
                information:
              </p>
              <ul className="space-y-3 text-gray-300 text-[1rem]">
                <li className="flex items-start">
                  <span className="text-blue-400 mr-3 mt-1">•</span>
                  <span>
                    With employers or partners as part of job applications or
                    recruitment processes
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-3 mt-1">•</span>
                  <span>
                    With service providers who help us operate the platform
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-3 mt-1">•</span>
                  <span>
                    If required by law or to protect our rights and the safety
                    of users
                  </span>
                </li>
              </ul>
            </div>

            {/* 5. Cookies and Tracking */}
            <div>
              <h2 className="text-white text-xl lg:text-2xl mb-4">
                5. Cookies and Tracking
              </h2>
              <p className="text-gray-300 text-[1rem] leading-relaxed">
                We use cookies and similar technologies to enhance your
                experience, analyze usage, and serve relevant content. You can
                manage your cookie preferences through your browser settings.
              </p>
            </div>

            {/* 6. Data Security */}
            <div>
              <h2 className="text-white text-xl lg:text-2xl mb-4">
                6. Data Security
              </h2>
              <p className="text-gray-300 text-[1rem] leading-relaxed">
                We implement appropriate technical and organizational measures
                to protect your information from unauthorized access,
                alteration, disclosure, or destruction. However, no system is
                completely secure, and we cannot guarantee absolute protection.
              </p>
            </div>

            {/* 7. Your Rights */}
            <div>
              <h2 className="text-white text-xl lg:text-2xl mb-4">
                7. Your Rights
              </h2>
              <p className="text-gray-300 text-[1rem] leading-relaxed mb-3">
                Depending on your location, you may have the right to:
              </p>
              <ul className="space-y-3 text-gray-300 text-[1rem]">
                <li className="flex items-start">
                  <span className="text-blue-400 mr-3 mt-1">•</span>
                  <span>Access the personal data we hold about you</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-3 mt-1">•</span>
                  <span>Correct or update your information</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-3 mt-1">•</span>
                  <span>Delete your account and personal data</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-3 mt-1">•</span>
                  <span>
                    Restrict or object to certain processing of your data
                  </span>
                </li>
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
            </div>

            {/* 8. Retention of Data */}
            <div>
              <h2 className="text-white text-xl lg:text-2xl mb-4">
                8. Retention of Data
              </h2>
              <p className="text-gray-300 text-[1rem] leading-relaxed">
                We retain your personal information as long as necessary to
                provide our services, comply with legal obligations, and resolve
                disputes.
              </p>
            </div>

            {/* 9. Third-Party Links */}
            <div>
              <h2 className="text-white text-xl lg:text-2xl mb-4">
                9. Third-Party Links
              </h2>
              <p className="text-gray-300 text-[1rem] leading-relaxed">
                Our platform may contain links to external websites. We are not
                responsible for the privacy practices of these third parties.
              </p>
            </div>

            {/* 10. Changes to this Policy */}
            <div>
              <h2 className="text-white text-xl lg:text-2xl mb-4">
                10. Changes to this Policy
              </h2>
              <p className="text-gray-300 text-[1rem] leading-relaxed">
                We may update this Privacy Policy from time to time. Changes
                will be posted on this page with the effective date. Continued
                use of the platform means you accept the updated policy.
              </p>
            </div>

            {/* 11. Contact Us */}
            <div>
              <h2 className="text-white text-xl lg:text-2xl mb-4">
                11. Contact Us
              </h2>
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
            </div>
          </div>
        </div>
      </section>

      <FAQSection />
      <CTA />
    </>
  );
};

export default PrivacyPolicy;
