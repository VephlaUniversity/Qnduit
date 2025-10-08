import { Crown, Stars } from "lucide-react";
export const EmployerPricing = () => {
  return (
    <section className="max-w-7xl mx-auto px-6 lg:px-8 py-20">
      <div className="text-center mb-16">
        <h2 className="text-4xl lg:text-5xl mb-4">
          Pricing based on
          <br />
          your Success
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {/* Bronze */}
        <div className="bg-[#2A2A2A] rounded-3xl p-8">
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 text-gray-400 mr-3">
              <Stars className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold">Bronze</h3>
          </div>
          <p className="text-gray-400 mb-6">For straightforward hires</p>

          <div className="mb-8">
            <span className="text-5xl font-bold">$6.99</span>
            <span className="text-gray-400 ml-2">/month</span>
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex items-center">
              <svg
                className="w-5 h-5 text-green-400 mr-3 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-gray-300">Post unlimited jobs</span>
            </div>
            <div className="flex items-center">
              <svg
                className="w-5 h-5 text-green-400 mr-3 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-gray-300">
                Attract applicants organically
              </span>
            </div>
            <div className="flex items-center">
              <svg
                className="w-5 h-5 text-green-400 mr-3 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-gray-300">
                Great for steady, ongoing recruitment
              </span>
            </div>
          </div>

          <button className="w-full border border-[#5F8DD7] text-gray-100 py-4 rounded-full hover:bg-[#313131] hover:text-white transition-all duration-200 cursor-pointer">
            Post My Jobs Now →
          </button>
        </div>

        {/* Silver */}
        <div
          className="rounded-3xl p-8"
          style={{
            background: "#182232",
          }}
        >
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 text-blue-400 mr-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  d="M21.2502 18.4701L19.6002 18.8601C19.2302 18.9501 18.9402 19.2301 18.8602 19.6001L18.5102 21.0701C18.3202 21.8701 17.3002 22.1201 16.7702 21.4901L13.7802 18.0501C13.5402 17.7701 13.6702 17.3301 14.0302 17.2401C15.8002 16.8101 17.3902 15.8201 18.5602 14.4101C18.7502 14.1801 19.0902 14.1501 19.3002 14.3601L21.5202 16.5801C22.2802 17.3401 22.0102 18.2901 21.2502 18.4701Z"
                  fill="#B2CFFF"
                />
                <path
                  d="M2.69919 18.4701L4.34919 18.8601C4.71919 18.9501 5.00919 19.2301 5.08919 19.6001L5.43919 21.0701C5.62919 21.8701 6.64919 22.1201 7.17919 21.4901L10.1692 18.0501C10.4092 17.7701 10.2792 17.3301 9.91919 17.2401C8.14919 16.8101 6.55919 15.8201 5.38919 14.4101C5.19919 14.1801 4.85919 14.1501 4.64919 14.3601L2.42919 16.5801C1.66919 17.3401 1.93919 18.2901 2.69919 18.4701Z"
                  fill="#B2CFFF"
                />
                <path
                  d="M12 2C8.13 2 5 5.13 5 9C5 10.45 5.43 11.78 6.17 12.89C7.25 14.49 8.96 15.62 10.95 15.91C11.29 15.97 11.64 16 12 16C12.36 16 12.71 15.97 13.05 15.91C15.04 15.62 16.75 14.49 17.83 12.89C18.57 11.78 19 10.45 19 9C19 5.13 15.87 2 12 2ZM15.06 8.78L14.23 9.61C14.09 9.75 14.01 10.02 14.06 10.22L14.3 11.25C14.49 12.06 14.06 12.38 13.34 11.95L12.34 11.36C12.16 11.25 11.86 11.25 11.68 11.36L10.68 11.95C9.96 12.37 9.53 12.06 9.72 11.25L9.96 10.22C10 10.03 9.93 9.75 9.79 9.61L8.94 8.78C8.45 8.29 8.61 7.8 9.29 7.69L10.36 7.51C10.54 7.48 10.75 7.32 10.83 7.16L11.42 5.98C11.74 5.34 12.26 5.34 12.58 5.98L13.17 7.16C13.25 7.32 13.46 7.48 13.65 7.51L14.72 7.69C15.39 7.8 15.55 8.29 15.06 8.78Z"
                  fill="#B2CFFF"
                />
              </svg>
            </div>
            <h3 className="text-2xl font-bold">Silver</h3>
          </div>
          <p className="text-gray-300 mb-6">For straightforward hires</p>

          <div className="mb-8">
            <span className="text-5xl font-bold">$8.99</span>
            <span className="text-gray-300 ml-2">/month</span>
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex items-center">
              <svg
                className="w-5 h-5 text-green-400 mr-3 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-gray-200">
                Directly contact talent profiles
              </span>
            </div>
            <div className="flex items-center">
              <svg
                className="w-5 h-5 text-green-400 mr-3 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-gray-200">
                Skip the wait, reach out instantly
              </span>
            </div>
            <div className="flex items-center">
              <svg
                className="w-5 h-5 text-green-400 mr-3 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-gray-200">
                Ideal for time-sensitive hiring needs
              </span>
            </div>
          </div>

          <button className="w-full bg-[#09111F] text-white py-4 rounded-full hover:bg-[#071123] transition-colors border border-[#5F8DD7] cursor-pointer">
            Start Contacting Talent →
          </button>
        </div>

        {/* Platinum */}
        <div className="bg-[#2A2A2A] rounded-3xl p-8">
          <div className="flex items-center mb-4">
            <div className="text-gray-400 mr-3">
              <Crown className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold">Platinum</h3>
          </div>
          <p className="text-gray-400 mb-6">All-in hiring advantage</p>

          <div className="mb-8">
            <span className="text-5xl font-bold">$12.99</span>
            <span className="text-gray-400 ml-2">/month</span>
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex items-center">
              <svg
                className="w-5 h-5 text-green-400 mr-3 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-gray-300">Post unlimited jobs</span>
            </div>
            <div className="flex items-center">
              <svg
                className="w-5 h-5 text-green-400 mr-3 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-gray-300">
                Attract applicants organically
              </span>
            </div>
            <div className="flex items-center">
              <svg
                className="w-5 h-5 text-green-400 mr-3 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-gray-300">
                Maximum visibility + outreach control
              </span>
            </div>
          </div>

          <button className="w-full border border-[#5F8DD7] text-gray-100 py-4 rounded-full hover:bg-[#313131] hover:text-white transition-all duration-200 cursor-pointer">
            Unlock Full Hiring Access →
          </button>
        </div>
      </div>
    </section>
  );
};
