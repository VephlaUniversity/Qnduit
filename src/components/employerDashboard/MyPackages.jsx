import { useAuth } from "../hooks/useAuth";

export const MyPackages = () => {
  const { user } = useAuth();

  // Map user package to packages list format
  const packages = user?.currentPackage
    ? [
        {
          id: 1,
          number: Math.floor(Math.random() * 9000) + 1000,
          package: user.currentPackage.name?.toLowerCase() || "professional",
          type: "Job Package",
          urgent: "Yes",
          featured: "Yes",
          posts: 0,
          limitPosts: user.currentPackage.jobPosts || 20,
          listingDuration: 30,
        },
      ]
    : [
        {
          id: 1,
          number: 6508,
          package: "professional",
          type: "Job Package",
          urgent: "Yes",
          featured: "Yes",
          posts: 0,
          limitPosts: 20,
          listingDuration: 30,
        },
      ];

  const getPackageColor = (pkg) => {
    switch (pkg.toLowerCase()) {
      case "basic":
        return "bg-blue-600/20 text-blue-400";
      case "standard":
      case "professional":
        return "bg-yellow-600/20 text-yellow-400";
      case "extended":
      case "premium":
        return "bg-blue-600/20 text-blue-400";
      default:
        return "bg-gray-600/20 text-gray-400";
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-8 bg-blue-600 rounded-full"></div>
        <h1 className="text-2xl md:text-3xl font-semibold text-white">
          My Packages
        </h1>
      </div>

      {/* Packages Table */}
      <div className="bg-[#1A1A1E] rounded-lg border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-gray-400 text-xs font-medium uppercase tracking-wider py-4 px-6">
                  #
                </th>
                <th className="text-left text-gray-400 text-xs font-medium uppercase tracking-wider py-4 px-6">
                  ID
                </th>
                <th className="text-left text-gray-400 text-xs font-medium uppercase tracking-wider py-4 px-6">
                  Package
                </th>
                <th className="text-left text-gray-400 text-xs font-medium uppercase tracking-wider py-4 px-6">
                  Package Type
                </th>
                <th className="text-left text-gray-400 text-xs font-medium uppercase tracking-wider py-4 px-6">
                  Package Information
                </th>
                <th className="text-left text-gray-400 text-xs font-medium uppercase tracking-wider py-4 px-6">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {packages.map((pkg, index) => (
                <tr
                  key={pkg.id}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <td className="py-4 px-6 text-white">{index + 1}</td>
                  <td className="py-4 px-6 text-white">{pkg.number}</td>
                  <td className="py-4 px-6">
                    <span
                      className={`px-3 py-1 rounded text-xs font-medium capitalize ${getPackageColor(
                        pkg.package
                      )}`}
                    >
                      {pkg.package}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-gray-400">{pkg.type}</td>
                  <td className="py-4 px-6">
                    <div className="text-sm text-gray-400 space-y-1">
                      <p>
                        Urgent: <span className="text-white">{pkg.urgent}</span>
                      </p>
                      <p>
                        Featured:{" "}
                        <span className="text-white">{pkg.featured}</span>
                      </p>
                      <p>
                        Posts: <span className="text-white">{pkg.posts}</span>
                      </p>
                      <p>
                        Limit Posts:{" "}
                        <span className="text-white">{pkg.limitPosts}</span>
                      </p>
                      <p>
                        Listing Duration:{" "}
                        <span className="text-white">
                          {pkg.listingDuration}
                        </span>
                      </p>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <button className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors">
                      Action
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MyPackages;
