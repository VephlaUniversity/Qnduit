import { useState } from "react";
import { ChevronDown } from "lucide-react";
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

export const SourceTalentForm = () => {
  const [jobTitle, setJobTitle] = useState("");
  const [workType, setWorkType] = useState("");
  const [location, setLocation] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const validateForm = () => {
    const toasts = {
      all: {
        title: "Fields are empty",
        description: "Please fill in all fields before searching for talents.",
      },
      jobTitle: {
        title: "Job title is required",
        description: "Enter a job title or keyword to find the right talents.",
      },
      workType: {
        title: "Work type is required",
        description:
          "Select a work type such as Full-time, Part-time, or Contract.",
      },
      location: {
        title: "Location is required",
        description:
          "Select a location to find talents available in that region.",
      },
    };

    const key =
      !jobTitle.trim() && !workType && !location
        ? "all"
        : !jobTitle.trim()
          ? "jobTitle"
          : !workType
            ? "workType"
            : !location
              ? "location"
              : null;

    if (key) {
      toast({ ...toasts[key], variant: "error" });
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
          jobTitle,
          location,
          workType,
        });
        navigate(`/find-talents?${searchParams.toString()}`);
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
          <p className="text-gray-600 text-lg">Searching for talents...</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="w-full max-w-2xl bg-white rounded-3xl p-8 sm:p-12 shadow-2xl mx-auto"
      variants={staggerContainer}
      initial="initial"
      whileInView="animate"
      viewport={{ once: true, amount: 0.2 }}
    >
      {/* Job Title */}
      <motion.div
        variants={fadeUp}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="mb-6"
      >
        <label className="block text-gray-900 font-medium mb-3 text-base">
          Job Title
        </label>
        <input
          type="text"
          value={jobTitle}
          onChange={(e) => setJobTitle(e.target.value)}
          placeholder="Title, Keyword e.g Product..."
          className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700 placeholder-gray-400 transition-all"
        />
      </motion.div>

      {/* Work Type */}
      <motion.div
        variants={fadeUp}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="mb-6"
      >
        <label className="block text-gray-900 font-medium mb-3 text-base">
          Work Type
        </label>
        <div className="relative">
          <select
            value={workType}
            onChange={(e) => setWorkType(e.target.value)}
            className={`w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none transition-all cursor-pointer ${
              !workType ? "text-gray-400" : "text-gray-700"
            }`}
          >
            <option value="" disabled>
              ---Select Work Type---
            </option>
            <option value="full-time">Full-time</option>
            <option value="part-time">Part-time</option>
            <option value="contract">Contract</option>
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
        </div>
      </motion.div>

      {/* Location */}
      <motion.div
        variants={fadeUp}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="mb-8"
      >
        <label className="block text-gray-900 font-medium mb-3 text-base">
          Location
        </label>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g. New York, USA"
          className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700 placeholder-gray-400 transition-all"
        />
      </motion.div>

      {/* Submit */}
      <motion.button
        variants={fadeUp}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        type="submit"
        className="w-full bg-blue-500 hover:bg-blue-600 text-white py-4 rounded-xl transition-colors duration-200 mb-4"
      >
        Source Talents
      </motion.button>
    </motion.form>
  );
};
