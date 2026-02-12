import React, { useState } from "react";
import RecentApplication from "./RecentApplication";

export const ApplicantsJobs = () => {
  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-8 bg-blue-600 rounded-full"></div>
        <h1 className="text-2xl md:text-3xl font-semibold text-white">
          Applicants Jobs
        </h1>
      </div>
      <RecentApplication />
    </div>
  );
};

export default ApplicantsJobs;
