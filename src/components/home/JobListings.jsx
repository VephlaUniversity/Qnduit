import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { MapPin, Briefcase, DollarSign } from "lucide-react";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
};

const staggerContainer = {
  initial: {},
  animate: { transition: { staggerChildren: 0.08 } },
};

export const JobListings = () => {
  const jobListings = [
    {
      id: 1,
      company: "DaVinci Resolve",
      title: "Product Designer",
      location: "Spain",
      type: "Hybrid / Remote",
      category: "Design",
      salary: "$65,000/annual",
      description:
        "We're looking for a creative Product Designer to join our design team. You'll be responsible for crafting user-centric experiences, from re...",
      logo: "/images/Asana.png",
      posted: "2 days ago",
    },
    {
      id: 2,
      company: "Evernote",
      title: "Frontend Engineer",
      location: "USA",
      type: "Remote",
      salary: "$90,000/annual",
      description:
        "Join our engineering team to build beautiful, performant web experiences using React and modern tooling.",
      logo: "/images/Evernote.png",
      category: "Engineering",
      posted: "1 day ago",
    },
    {
      id: 3,
      company: "3D Tool",
      title: "3D Motion Designer",
      location: "Germany",
      type: "On-site",
      salary: "$75,000/annual",
      description:
        "We need a talented 3D motion designer to help bring our product visuals and marketing materials to life.",
      logo: "/images/Linear.png",
      category: "Design",
      posted: "3 days ago",
    },
    {
      id: 4,
      company: "Figma",
      title: "Product Manager",
      location: "USA",
      type: "Hybrid / Remote",
      salary: "$120,000/annual",
      description:
        "Lead cross-functional teams to define, build, and ship world-class product experiences at scale.",
      logo: "/images/Slack.png",
      category: "Product",
      posted: "5 days ago",
    },
    {
      id: 5,
      company: "Loom",
      title: "Backend Engineer",
      location: "Canada",
      type: "Remote",
      salary: "$95,000/annual",
      description:
        "Build and scale the infrastructure that powers millions of async video communications worldwide.",
      logo: "/images/Loom.png",
      category: "Engineering",
      posted: "1 day ago",
    },
    {
      id: 6,
      company: "Monday",
      title: "UX Researcher",
      location: "Israel",
      type: "Hybrid / Remote",
      salary: "$80,000/annual",
      description:
        "Drive research initiatives that inform product decisions and improve the overall user experience.",
      logo: "/images/Monday.png",
      category: "Design",
      posted: "4 days ago",
    },
  ];

  return (
    <section
      id="search-jobs"
      className="max-w-7xl mx-auto px-6 lg:px-12 py-10 bg-[#0A0F17] rounded-3xl mt-10"
    >
      {/* Heading */}
      <motion.h2
        className="text-4xl lg:text-5xl text-center mb-12"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        Latest Jobs of the Week
      </motion.h2>

      {/* Job Cards */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12"
        variants={staggerContainer}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, amount: 0.1 }}
      >
        {jobListings.map((job) => (
          <motion.div
            key={job.id}
            variants={fadeUp}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="bg-[#191D23] rounded-2xl p-6 hover:bg-[#1E2430] transition-colors group"
          >
            {/* Top Row */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#0F1419] rounded-xl flex items-center justify-center flex-shrink-0">
                  <img
                    src={job.logo}
                    alt={job.company}
                    className="w-8 h-8 object-contain"
                  />
                </div>
                <div>
                  <p className="text-[#3B82F6] text-xs font-medium">
                    {job.company}
                  </p>
                  <p className="text-gray-500 text-xs">{job.posted}</p>
                </div>
              </div>
              <span className="text-xs bg-[#0F1419] text-gray-400 px-3 py-1 rounded-full border border-gray-700">
                {job.type}
              </span>
            </div>

            {/* Title */}
            <h3 className="text-white text-lg font-semibold mb-1 group-hover:text-[#3B82F6] transition-colors">
              {job.title}
            </h3>

            {/* Meta */}
            <div className="flex items-center gap-3 text-gray-400 text-xs mb-3">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {job.location}
              </span>
              <span className="flex items-center gap-1">
                <Briefcase className="w-3 h-3" />
                {job.category}
              </span>
            </div>

            {/* Description */}
            <p className="text-gray-400 text-sm mb-5 leading-relaxed line-clamp-2">
              {job.description}
            </p>

            {/* Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-700/50">
              <span className="text-white font-semibold text-sm flex items-center gap-1">
                <DollarSign className="w-4 h-4 text-[#3B82F6]" />
                {job.salary}
              </span>
              <Link to={`/job/${job.id}`}>
                <button className="bg-[#3B82F6] hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm transition-colors">
                  Apply Now →
                </button>
              </Link>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Show All Button */}
      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <Link to="/all-jobs">
          <button className="border border-gray-600 text-white px-8 py-3 rounded-full hover:bg-gray-800 transition-colors">
            Show all Jobs →
          </button>
        </Link>
      </motion.div>
    </section>
  );
};
