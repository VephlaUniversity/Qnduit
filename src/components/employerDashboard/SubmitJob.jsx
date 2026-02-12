import React, { useState, useRef, useEffect } from "react";
import { Camera, X, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../hooks/useToast";

const SubmitJob = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const featuredImageRef = useRef(null);
  const photosRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingJobId, setEditingJobId] = useState(null);

  const [formData, setFormData] = useState({
    jobTitle: "",
    jobDescription: "",
    category: "",
    jobCategory: "",
    jobApplyType: "",
    salaryType: "",
    minSalary: "",
    maxSalary: "",
    experience: "",
    careerLevel: "",
    qualification: "",
    deadlineDate: "",
    address: "",
    location: "",
  });

  const [featuredImage, setFeaturedImage] = useState(null);
  const [photos, setPhotos] = useState([]);

  // Load job data if editing
  useEffect(() => {
    const jobToEdit = localStorage.getItem("jobToEdit");
    if (jobToEdit) {
      const job = JSON.parse(jobToEdit);
      setIsEditing(true);
      setEditingJobId(job.id);

      // Populate form data
      setFormData({
        jobTitle: job.jobTitle || "",
        jobDescription: job.jobDescription || "",
        category: job.category || "",
        jobCategory: job.jobCategory || "",
        jobApplyType: job.jobApplyType || "",
        salaryType: job.salaryType || "",
        minSalary: job.minSalary || "",
        maxSalary: job.maxSalary || "",
        experience: job.experience || "",
        careerLevel: job.careerLevel || "",
        qualification: job.qualification || "",
        deadlineDate: job.deadlineDate || "",
        address: job.address || "",
        location: job.location || "",
      });

      // Set images
      if (job.featuredImage) {
        setFeaturedImage(job.featuredImage);
      }
      if (job.photos && job.photos.length > 0) {
        setPhotos(job.photos);
      }

      // Clear the jobToEdit from localStorage
      localStorage.removeItem("jobToEdit");
    }
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFeaturedImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Upload Error",
        description: "File exceeds 5MB limit",
        variant: "destructive",
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setFeaturedImage(event.target?.result);
    };
    reader.readAsDataURL(file);
  };

  const handlePhotosUpload = (e) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      if (file.size > 5 * 1024 * 1024) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        setPhotos((prev) => [...prev, event.target?.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!formData.jobTitle.trim()) {
      toast({
        title: "Error",
        description: "Job Title is required",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const existing = JSON.parse(localStorage.getItem("postedJobs") || "[]");

    if (isEditing) {
      // Update existing job
      const updatedJobs = existing.map((job) => {
        if (job.id === editingJobId) {
          return {
            ...job,
            featuredImage,
            ...formData,
            photos,
          };
        }
        return job;
      });
      localStorage.setItem("postedJobs", JSON.stringify(updatedJobs));

      // Trigger custom event for real-time sync
      window.dispatchEvent(new Event("postedJobsUpdated"));

      toast({ title: "Success!", description: "Job updated successfully." });
    } else {
      // Create new job
      const job = {
        id: Date.now().toString(),
        featuredImage,
        ...formData,
        photos,
        status: "Published",
        applicants: 0,
        created: new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        verified: true,
      };
      existing.push(job);
      localStorage.setItem("postedJobs", JSON.stringify(existing));

      // Trigger custom event for real-time sync
      window.dispatchEvent(new Event("postedJobsUpdated"));

      toast({ title: "Success!", description: "Job posted successfully." });
    }

    setSaving(false);
    navigate("/dashboard/my-job");
  };

  const inputClass =
    "w-full px-4 py-3 bg-[#0E0E10] border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500";
  const selectClass =
    "w-full px-4 py-3 bg-[#0E0E10] border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500 appearance-none";

  return (
    <div className="min-h-screen bg-[#0E0E10] p-4 md:p-6 lg:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-8 bg-blue-600 rounded-full" />
        <h1 className="text-2xl md:text-3xl font-semibold text-white">
          {isEditing ? "Edit Job" : "Submit Job"}
        </h1>
      </div>

      <div className="bg-[#1A1A1E] rounded-lg border border-white/5 p-6 md:p-8 max-w-5xl">
        {/* Featured Image */}
        <div className="mb-8">
          <label className="block text-white font-medium mb-2">
            Featured Image <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-4">
            <input
              ref={featuredImageRef}
              type="file"
              accept="image/*"
              onChange={handleFeaturedImage}
              className="hidden"
            />
            <button
              onClick={() => featuredImageRef.current?.click()}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
            >
              Browse
            </button>
            <span className="text-gray-400 text-sm">
              {featuredImage ? "Image selected" : "Upload Image"}
            </span>
          </div>
          {featuredImage && (
            <div className="mt-3 relative w-32 h-20">
              <img
                src={featuredImage}
                alt="Featured"
                className="w-full h-full object-cover rounded-lg border border-white/10"
              />
              <button
                onClick={() => setFeaturedImage(null)}
                className="absolute -top-2 -right-2 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          )}
        </div>

        {/* Job Title */}
        <div className="mb-8">
          <label className="block text-white font-medium mb-2">
            Job Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="jobTitle"
            value={formData.jobTitle}
            onChange={handleInputChange}
            placeholder="UI UX Designer"
            className={inputClass}
          />
        </div>

        {/* Job Description */}
        <div className="mb-8">
          <label className="block text-white font-medium mb-2">
            Job Description <span className="text-red-500">*</span>
          </label>
          <textarea
            name="jobDescription"
            value={formData.jobDescription}
            onChange={handleInputChange}
            rows={6}
            placeholder="Are you a User Experience Designer with a track record of delivering intuitive digital experiences..."
            className={`${inputClass} resize-y`}
          />
        </div>

        {/* Category & Job Category */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-gray-400 text-sm mb-2">Category</label>
            <input
              type="text"
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              placeholder="Accounting/ Finance"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-gray-400 text-sm mb-2">
              Job Category
            </label>
            <select
              name="jobCategory"
              value={formData.jobCategory}
              onChange={handleInputChange}
              className={selectClass}
            >
              <option value="">Select Category</option>
              <option>Freelance</option>
              <option>Full Time</option>
              <option>Part Time</option>
              <option>Contract</option>
              <option>Internship</option>
            </select>
          </div>
        </div>

        {/* Job Apply Type & Salary Type */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-gray-400 text-sm mb-2">
              Job Apply Type
            </label>
            <select
              name="jobApplyType"
              value={formData.jobApplyType}
              onChange={handleInputChange}
              className={selectClass}
            >
              <option value="">Select Type</option>
              <option>Full Time</option>
              <option>Part Time</option>
              <option>Contract</option>
              <option>Freelance</option>
              <option>Internship</option>
            </select>
          </div>
          <div>
            <label className="block text-gray-400 text-sm mb-2">
              Salary Type
            </label>
            <select
              name="salaryType"
              value={formData.salaryType}
              onChange={handleInputChange}
              className={selectClass}
            >
              <option value="">Select Type</option>
              <option>Hour</option>
              <option>Day</option>
              <option>Week</option>
              <option>Month</option>
              <option>Year</option>
              <option>Project</option>
            </select>
          </div>
        </div>

        {/* Min & Max Salary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-gray-400 text-sm mb-2">
              Min. Salary
            </label>
            <input
              type="text"
              name="minSalary"
              value={formData.minSalary}
              onChange={handleInputChange}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-gray-400 text-sm mb-2">
              Max. Salary
            </label>
            <input
              type="text"
              name="maxSalary"
              value={formData.maxSalary}
              onChange={handleInputChange}
              className={inputClass}
            />
          </div>
        </div>

        {/* Experience & Career Level */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-gray-400 text-sm mb-2">
              Experience
            </label>
            <select
              name="experience"
              value={formData.experience}
              onChange={handleInputChange}
              className={selectClass}
            >
              <option value="">Select Experience</option>
              <option>Fresh</option>
              <option>1 Year</option>
              <option>2 Years</option>
              <option>3 Years</option>
              <option>5 Years+</option>
            </select>
          </div>
          <div>
            <label className="block text-gray-400 text-sm mb-2">
              Career Level
            </label>
            <select
              name="careerLevel"
              value={formData.careerLevel}
              onChange={handleInputChange}
              className={selectClass}
            >
              <option value="">Select Level</option>
              <option>Entry</option>
              <option>Junior</option>
              <option>Mid</option>
              <option>Senior</option>
              <option>Manager</option>
              <option>Director</option>
            </select>
          </div>
        </div>

        {/* Qualification & Deadline */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="block text-gray-400 text-sm mb-2">
              Qualification
            </label>
            <select
              name="qualification"
              value={formData.qualification}
              onChange={handleInputChange}
              className={selectClass}
            >
              <option value="">Select Qualification</option>
              <option>Certificate</option>
              <option>Diploma</option>
              <option>Bachelor Degree</option>
              <option>Master Degree</option>
              <option>PhD</option>
            </select>
          </div>
          <div>
            <label className="block text-gray-400 text-sm mb-2">
              Applicant Deadline Date
            </label>
            <input
              type="date"
              name="deadlineDate"
              value={formData.deadlineDate}
              onChange={handleInputChange}
              className={inputClass}
            />
          </div>
        </div>

        {/* Photo */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Photo</h2>
          {photos.length > 0 && (
            <div className="flex flex-wrap gap-4 mb-4">
              {photos.map((photo, index) => (
                <div key={index} className="relative w-44 h-28">
                  <img
                    src={photo}
                    alt={`Photo ${index + 1}`}
                    className="w-full h-full object-cover rounded-lg border border-white/10"
                  />
                  <button
                    onClick={() => removePhoto(index)}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-4">
            <input
              ref={photosRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handlePhotosUpload}
              className="hidden"
            />
            <button
              onClick={() => photosRef.current?.click()}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
            >
              Browse
            </button>
            <span className="text-gray-400 text-sm">Upload image, video</span>
          </div>
        </div>

        {/* Location */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Location</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-gray-400 text-sm mb-2">
                Address
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="Las Vegas, NV 89107, USA"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-2">
                Location
              </label>
              <select
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                className={selectClass}
              >
                <option value="">Select Location</option>
                <option>Tokyo</option>
                <option>New York</option>
                <option>London</option>
                <option>Berlin</option>
                <option>Paris</option>
                <option>Sydney</option>
                <option>Lagos</option>
                <option>Remote</option>
              </select>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-70 flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving
              ? isEditing
                ? "Updating..."
                : "Submitting..."
              : isEditing
                ? "Update Job"
                : "Submit Job"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubmitJob;
