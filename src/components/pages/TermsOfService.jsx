import { CTA } from "../home/CTA";
import { FAQSection } from "../home/FAQ";

const TermsOfService = () => {
  return (
    <>
      {/* Hero Section */}
      <section className="relative  flex items-cente">
        {/* Content */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-8 py-12 ">
          <div className="text-center mb-12">
            <h1 className="text-white text-4xl lg:text-6xl xl:text-7xl mb-6 leading-tight">
              Your Rights and <br />
              Responsibilities on <span className="text-[#F5C518]">Qnduit</span>
            </h1>
            <p className="text-white text-[1rem] mx-auto">
              By using our services, you agree to these rules that help us keep{" "}
              <br className="hidden sm:block" />
              the platform safe, fair, and effective for all users.
            </p>
          </div>
        </div>
      </section>

      {/* Terms Content Section */}
      <section className="py-10 ">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          {/* Main Content Box */}
          <div className="bg-[#1A1A1C] rounded-3xl p-8 lg:p-12 space-y-10">
            {/* 1. Acceptance of Terms */}
            <div>
              <h2 className="text-white text-xl lg:text-2xl mb-4">
                1. Acceptance of Terms
              </h2>
              <p className="text-gray-300 text-[1rem] leading-relaxed">
                By using Qnduit, you agree to these Terms of Service and any
                related policies. If you don't agree, you must not use the
                platform. These terms create a binding agreement between you and
                Qnduit.
              </p>
            </div>

            {/* 2. Eligibility */}
            <div>
              <h2 className="text-white text-xl lg:text-2xl mb-4">
                2. Eligibility
              </h2>
              <p className="text-gray-300 text-[1rem] leading-relaxed">
                You must be at least 18 years old to create an account or use
                Qnduit. By registering, you confirm that you meet this
                requirement and are legally able to enter into this agreement.
              </p>
            </div>

            {/* 3. Account Registration */}
            <div>
              <h2 className="text-white text-xl lg:text-2xl mb-4">
                3. Account Registration
              </h2>
              <ul className="space-y-3 text-gray-300 text-[1rem]">
                <li className="flex items-start">
                  <span className="text-blue-400 mr-3 mt-1">•</span>
                  <span>
                    Provide accurate and complete information when signing up.
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-3 mt-1">•</span>
                  <span>
                    Keep your login details secure. You're responsible for
                    activity under your account.
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-3 mt-1">•</span>
                  <span>
                    Notify us immediately if you suspect unauthorized access to
                    your account.
                  </span>
                </li>
              </ul>
            </div>

            {/* 4. Using the Platform */}
            <div>
              <h2 className="text-white text-xl lg:text-2xl mb-4">
                4. Using the Platform
              </h2>
              <ul className="space-y-3 text-gray-300 text-[1rem]">
                <li className="flex items-start">
                  <span className="text-blue-400 mr-3 mt-1">•</span>
                  <span>
                    Qnduit connects job seekers, employers, and partners. Use it
                    only for lawful purposes.
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-3 mt-1">•</span>
                  <span>
                    Do not post false, misleading, or harmful information.
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-3 mt-1">•</span>
                  <span>
                    Do not attempt to access other users' accounts or interfere
                    with the platform's operation.
                  </span>
                </li>
              </ul>
            </div>

            {/* 5. Job Listings and Applications */}
            <div>
              <h2 className="text-white text-xl lg:text-2xl mb-4">
                5. Job Listings and Applications
              </h2>
              <ul className="space-y-3 text-gray-300 text-[1rem]">
                <li className="flex items-start">
                  <span className="text-blue-400 mr-3 mt-1">•</span>
                  <span>
                    Employers are responsible for the accuracy of job postings.
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-3 mt-1">•</span>
                  <span>
                    Job seekers are responsible for the accuracy of their
                    profiles and applications.
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-3 mt-1">•</span>
                  <span>
                    Qnduit does not guarantee employment, hiring, or candidate
                    responses; we provide tools to facilitate connections.
                  </span>
                </li>
              </ul>
            </div>

            {/* 6. Fees and Payments */}
            <div>
              <h2 className="text-white text-xl lg:text-2xl mb-4">
                6. Fees and Payments (if applicable)
              </h2>
              <ul className="space-y-3 text-gray-300 text-[1rem]">
                <li className="flex items-start">
                  <span className="text-blue-400 mr-3 mt-1">•</span>
                  <span>
                    Paid services will clearly display the applicable fees.
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-3 mt-1">•</span>
                  <span>All payments are final unless otherwise stated.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-3 mt-1">•</span>
                  <span>
                    You agree to pay all fees according to the stated terms.
                  </span>
                </li>
              </ul>
            </div>

            {/* 7. Intellectual Property */}
            <div>
              <h2 className="text-white text-xl lg:text-2xl mb-4">
                7. Intellectual Property
              </h2>
              <ul className="space-y-3 text-gray-300 text-[1rem]">
                <li className="flex items-start">
                  <span className="text-blue-400 mr-3 mt-1">•</span>
                  <span>
                    The platform, including all content, branding, and software,
                    is owned by Qnduit or its licensors.
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-3 mt-1">•</span>
                  <span>
                    You may not copy, distribute, or modify any content without
                    explicit permission.
                  </span>
                </li>
              </ul>
            </div>

            {/* 8. Privacy */}
            <div>
              <h2 className="text-white text-xl lg:text-2xl mb-4">
                8. Privacy
              </h2>
              <p className="text-gray-300 text-[1rem] leading-relaxed">
                Your use of Qnduit is governed by our Privacy Policy, which
                explains how we collect, store, and protect your data.
              </p>
            </div>

            {/* 9. Termination */}
            <div>
              <h2 className="text-white text-xl lg:text-2xl mb-4">
                9. Termination
              </h2>
              <ul className="space-y-3 text-gray-300 text-[1rem]">
                <li className="flex items-start">
                  <span className="text-blue-400 mr-3 mt-1">•</span>
                  <span>
                    Qnduit may suspend or terminate accounts for violating these
                    terms or engaging in harmful behavior.
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-3 mt-1">•</span>
                  <span>
                    You may also terminate your account at any time by following
                    the instructions in your account settings.
                  </span>
                </li>
              </ul>
            </div>

            {/* 10. Disclaimers and Limitation of Liability */}
            <div>
              <h2 className="text-white text-xl lg:text-2xl mb-4">
                10. Disclaimers and Limitation of Liability
              </h2>
              <ul className="space-y-3 text-gray-300 text-[1rem]">
                <li className="flex items-start">
                  <span className="text-blue-400 mr-3 mt-1">•</span>
                  <span>
                    The platform is provided "as is" and "as available."
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-3 mt-1">•</span>
                  <span>
                    Qnduit does not guarantee uninterrupted service or complete
                    accuracy of listings or profiles.
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-3 mt-1">•</span>
                  <span>
                    Qnduit is not liable for damages arising from use of the
                    platform, including lost opportunities or data.
                  </span>
                </li>
              </ul>
            </div>

            {/* 11. Changes to Terms */}
            <div>
              <h2 className="text-white text-xl lg:text-2xl mb-4">
                11. Changes to Terms
              </h2>
              <p className="text-gray-300 text-[1rem] leading-relaxed">
                Qnduit may update these Terms occasionally. Changes will be
                posted with the effective date. Continuing to use the platform
                after updates means you accept the revised terms.
              </p>
            </div>

            {/* 12. Governing Law */}
            <div>
              <h2 className="text-white text-xl lg:text-2xl mb-4">
                12. Governing Law
              </h2>
              <p className="text-gray-300 text-[1rem] leading-relaxed">
                These Terms are governed by the laws of Nigeria. Any disputes
                will be resolved under these laws.
              </p>
            </div>

            {/* 13. Contact */}
            <div>
              <h2 className="text-white text-xl lg:text-2xl mb-4">
                13. Contact
              </h2>
              <p className="text-gray-300 text-[1rem] leading-relaxed">
                If you have questions or concerns about these Terms, contact us
                at:
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

export default TermsOfService;
