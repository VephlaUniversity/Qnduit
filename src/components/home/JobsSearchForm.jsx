import { ChevronDown, Search } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useToast } from "../hooks/useToast";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
};

const staggerContainer = {
  initial: {},
  animate: { transition: { staggerChildren: 0.08 } },
};

export const JobSearchForm = () => {
  const [selectedJobTitle, setSelectedJobTitle] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedWorkType, setSelectedWorkType] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const validateForm = () => {
    if (
      !selectedJobTitle.trim() &&
      !selectedLocation.trim() &&
      !selectedWorkType
    ) {
      toast({
        title: "Fields are empty",
        description:
          "Please fill in all fields before searching for opportunities.",
        variant: "error",
      });
      return false;
    }
    if (!selectedJobTitle.trim()) {
      toast({
        title: "Job title is required",
        description: "Enter a job title or keyword to narrow down your search.",
        variant: "error",
      });
      return false;
    }
    if (!selectedLocation.trim()) {
      toast({
        title: "Location is required",
        description: "Enter a city, country, or region to find jobs near you.",
        variant: "error",
      });
      return false;
    }
    if (!selectedWorkType) {
      toast({
        title: "Work type is required",
        description: "Select a work type such as Remote, On-site, or Hybrid.",
        variant: "error",
      });
      return false;
    }
    return true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        const searchParams = new URLSearchParams({
          jobTitle: selectedJobTitle,
          location: selectedLocation,
          workType: selectedWorkType,
        });
        navigate(`/jobs?${searchParams.toString()}`);
      }, 2000);
    }
  };

  if (isLoading) {
    return (
      <motion.div
        className="w-full max-w-2xl bg-white rounded-3xl p-8 sm:p-12 shadow-2xl mx-auto flex items-center justify-center min-h-[400px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4" />
          <p className="text-gray-600 text-lg">
            Searching for opportunities...
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="bg-white rounded-3xl p-8 mb-8 max-w-5xl mx-6 lg:mx-auto shadow-lg shadow-blue-100/10"
      variants={staggerContainer}
      initial="initial"
      whileInView="animate"
      viewport={{ once: true, amount: 0.2 }}
    >
      {/* Search hint */}
      <motion.div
        variants={fadeUp}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="mb-12"
      >
        <span className="bg-[#182232] p-2 md:p-4 text-white rounded-[10px] md:rounded-2xl">
          Search by job title, skill, or location...
        </span>
      </motion.div>

      <motion.hr
        variants={fadeUp}
        transition={{ duration: 0.4 }}
        className="text-gray-700 py-6"
      />

      {/* Form Fields */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
        variants={staggerContainer}
      >
        {/* Job Title */}
        <motion.div
          variants={fadeUp}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative"
        >
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Job Title
          </label>
          <input
            type="text"
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900 text-sm"
            placeholder="Title Keyword e.g Product..."
            value={selectedJobTitle}
            onChange={(e) => setSelectedJobTitle(e.target.value)}
          />
        </motion.div>

        {/* Location */}
        <motion.div
          variants={fadeUp}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative"
        >
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Location
          </label>
          <input
            type="text"
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900 text-sm"
            placeholder="e.g. New York, USA"
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
          />
        </motion.div>

        {/* Work Type */}
        <motion.div
          variants={fadeUp}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative"
        >
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Work Type
          </label>
          <select
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900 appearance-none text-sm"
            value={selectedWorkType}
            onChange={(e) => setSelectedWorkType(e.target.value)}
          >
            <option value="" disabled>
              ----Select Work Type----
            </option>
            <option value="on-site">On-site</option>
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
            <option value="full-time">Full-time</option>
            <option value="part-time">Part-time</option>
            <option value="contract">Contract</option>
            <option value="freelancer">Freelancer</option>
          </select>
          <ChevronDown className="absolute right-3 top-10 w-5 h-5 text-gray-400 pointer-events-none" />
        </motion.div>

        {/* Search Button */}
        <motion.button
          variants={fadeUp}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          type="button"
          onClick={handleSubmit}
          className="w-full md:w-auto bg-[#3B82F6] text-white px-2 py-3 rounded-xl font-semibold hover:bg-[#5F8DD7] transition-colors cursor-pointer md:mt-7 flex items-center justify-center gap-2"
        >
          <Search className="w-5 h-5" />
          Search Opportunities
        </motion.button>
      </motion.div>
    </motion.div>
  );
};
