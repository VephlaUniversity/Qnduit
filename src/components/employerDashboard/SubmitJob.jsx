import React, { useState, useRef, useEffect } from "react";
import { Camera, X, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../hooks/useToast";
import axios from "axios";
import { API_BASE_URL } from "../utils/api";
import { useParams } from "react-router-dom";

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
  const { id } = useParams();

  useEffect(() => {

    if (!id) return;

    const fetchJob = async () => {
      try {

        const { data } = await axios.get(
          `${API_BASE_URL}/api/job/${id}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`
            }
          }
        );

        const job = data.job;

        // activate edit mode using your frontend setup
        setIsEditing(true);
        setEditingJobId(job._id);

        // map DB structure → your form structure
        setFormData({
          jobTitle: job.jobTitle || "",
          jobDescription: job.jobDescription || "",
          category: job.category || "",
          jobCategory: job.jobCategory || "",
          jobApplyType: job.jobApplyType || "",
          salaryType: job.salary?.type || "",
          minSalary: job.salary?.min || "",
          maxSalary: job.salary?.max || "",
          experience: job.experience || "",
          careerLevel: job.careerLevel || "",
          qualification: job.qualification || "",
          deadlineDate: job.deadlineDate
            ? job.deadlineDate.split("T")[0]
            : "",
          address: job.address || "",
          location: job.location || "",
        });

        // Featured Image Preview (important for your UI)
        if (job.featuredImage?.url) {
          setFeaturedImage({
            preview: `${API_BASE_URL}${job.featuredImage.url}`
          });
        }

        // Gallery Preview
        if (job.gallery?.length > 0) {
          setPhotos(
            job.gallery.map(item => ({
              preview: `${API_BASE_URL}${item.url}`
            }))
          );
        }

      } catch (error) {
        console.log(error);
      }
    };

    fetchJob();

  }, [id]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFeaturedImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFeaturedImage(file);
  };


  const handlePhotosUpload = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    setPhotos(files);
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

    const form = new FormData();

    Object.keys(formData).forEach(key => {
      form.append(key, formData[key]);
    });

    if(featuredImage instanceof File){
      form.append("featuredImage", featuredImage);
    }

    photos.forEach(photo => {
      if(photo instanceof File){
        form.append("photos", photo);
      }
    });

    try {

      setSaving(true);

      const url = isEditing
        ? `${API_BASE_URL}/api/job/update/${editingJobId}`
        : `${API_BASE_URL}/api/job/create`;

      const token = localStorage.getItem("token");

      const { data } = await axios({
        method: isEditing ? "put" : "post",
        url: url,
        data: form,
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });

      toast({
        title:"Success",
        description:isEditing
          ? "Job updated successfully"
          : "Job created successfully"
      });

      navigate("/dashboard/my-job");

    } catch (err) {

      toast({
        title:"Error",
        description:err.response?.data?.message || err.message,
        variant:"destructive"
      });

    }

    setSaving(false);
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
              name="featuredImage"
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
                src={
                  featuredImage instanceof File
                    ? URL.createObjectURL(featuredImage)
                    : featuredImage.preview
                }
                alt="preview"
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
                    src={URL.createObjectURL(photo)}
                    alt="preview"
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
              name="photos"
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
