import { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import TextEditor from "../TextEditor";
import JobFormSelect from "./JobFormSelect";
import { lagosDateKey } from "../utils/jobDeadline";
import { COUNTRIES } from "../data/countries";

// Each mounted preview owns only its temporary URL, never a saved media URL.
function JobMediaPreview({ media, imageOnly = false }) {
  const [temporary, setTemporary] = useState(null);
  const file = media instanceof File ? media : media.file instanceof File ? media.file : null;
  useEffect(() => {
    if (!file) return;
    const type = /\.mp4$/i.test(file.name) ? "video/mp4"
      : file.type || (/\.png$/i.test(file.name) ? "image/png" : "image/jpeg");
    const url = URL.createObjectURL(file.type === type ? file : file.slice(0, file.size, type));
    setTemporary({ file, url });
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const src = file ? (temporary?.file === file ? temporary.url : undefined) : media.preview;
  if (!src) return null;
  const video = !imageOnly && (media.type === "video" || (file && (file.type.startsWith("video/") || /\.mp4$/i.test(file.name))));
  const className = "w-full h-full object-cover rounded-lg border border-white/10";
  return video
    ? <video key={src} src={src} controls playsInline preload="metadata" className={className} />
    : <img src={src} alt="preview" className={className} />;
}

export default function JobForm({ isEditing, formData, setFormData, featuredImage, featuredImageRef, photos, photosRef,
  handleFeaturedImage, handlePhotosUpload, removePhoto, setFeaturedImage, handleInputChange,
  salaryErrors = {}, applicationErrors = {}, deadlineMessage = "", savedDeadline = "", saving, onCancel, onSubmit, formError = "" }) {
  const [featuredImageError, setFeaturedImageError] = useState("");
  const selectFeaturedImage = event => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!/\.(png|jpe?g)$/i.test(file.name)) {
      setFeaturedImageError("Choose a PNG, JPG or JPEG featured image.");
      event.target.value = "";
      return;
    }
    setFeaturedImageError("");
    handleFeaturedImage(event);
    event.target.value = "";
  };
  const inputClass = "w-full px-4 py-3 bg-[#0E0E10] border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500";
  const selectClass = inputClass;
  return (
    <div className="min-h-screen bg-[#0E0E10] p-4 md:p-6 lg:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-8 bg-blue-600 rounded-full" />
        <h1 className="text-2xl md:text-3xl font-semibold text-white">
          {isEditing ? "Edit Job" : "Submit Job"}
        </h1>
      </div>

      <div className="bg-[#1A1A1E] rounded-lg border border-white/5 p-6 md:p-8 max-w-5xl">
        {formError && <p role="alert" className="mb-6 text-sm text-red-400">{formError}</p>}
        {/* Featured Image */}
        <div className="mb-8">
          <label className="block text-white font-medium mb-2">
            Featured Image <span className="text-red-500">*</span>
          </label>
          <div className="flex flex-wrap items-center gap-4">
            <input
              ref={featuredImageRef}
              type="file"
              accept=".png,.jpg,.jpeg,image/png,image/jpeg"
              onChange={selectFeaturedImage}
              aria-describedby="job-featured-image-help"
              aria-invalid={Boolean(featuredImageError)}
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
          <p id="job-featured-image-help" role={featuredImageError ? "alert" : undefined}
            className={`mt-2 text-sm ${featuredImageError ? "text-red-400" : "text-gray-400"}`}>
            {featuredImageError || "PNG, JPG or JPEG."}
          </p>
          {featuredImage && (
            <div className="mt-3 relative w-32 h-20">
              <JobMediaPreview media={featuredImage} imageOnly />
              <button
                aria-label="Remove featured image"
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
          <TextEditor
            value={formData.jobDescription}
            onChange={(val) =>
              setFormData((prev) => ({ ...prev, jobDescription: val }))
            }
            placeholder="Are you a User Experience Designer with a track record of delivering intuitive digital experiences..."
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
            <JobFormSelect
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
            </JobFormSelect>
          </div>
        </div>

        {/* Job Apply Type & Salary Type */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-gray-400 text-sm mb-2">
              Job Apply Type
            </label>
            <JobFormSelect
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
            </JobFormSelect>
          </div>
          <div>
            <label className="block text-gray-400 text-sm mb-2">
              Salary Type
            </label>
            <JobFormSelect
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
            </JobFormSelect>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="min-w-0">
            <label htmlFor="job-applicationType" className="block text-gray-400 text-sm mb-2">Application Type</label>
            <JobFormSelect id="job-applicationType" name="applicationType" value={formData.applicationType ?? "internal"}
              onChange={handleInputChange} className={selectClass} aria-invalid={Boolean(applicationErrors.applicationType)}
              aria-describedby={applicationErrors.applicationType ? "job-applicationType-error" : undefined}>
              <option value="internal">Internal</option>
              <option value="external">External</option>
            </JobFormSelect>
            {applicationErrors.applicationType && <p id="job-applicationType-error" role="alert" className="mt-2 text-sm text-red-400">{applicationErrors.applicationType}</p>}
          </div>
          {formData.applicationType === "external" && <div className="min-w-0">
            <label htmlFor="job-applicationUrl" className="block text-gray-400 text-sm mb-2">Application URL <span className="text-red-500">*</span></label>
            <input id="job-applicationUrl" name="applicationUrl" type="url" value={formData.applicationUrl || ""}
              onChange={handleInputChange} placeholder="https://example.com/careers/apply" className={`${inputClass} min-w-0`}
              aria-invalid={Boolean(applicationErrors.applicationUrl)} aria-describedby={applicationErrors.applicationUrl ? "job-applicationUrl-error" : undefined} />
            {applicationErrors.applicationUrl && <p id="job-applicationUrl-error" role="alert" className="mt-2 text-sm text-red-400 break-words">{applicationErrors.applicationUrl}</p>}
          </div>}
        </div>

        {/* Min & Max Salary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label htmlFor="job-minSalary" className="block text-gray-400 text-sm mb-2">
              Min. Salary
            </label>
            <input
              type="text"
              name="minSalary"
              id="job-minSalary"
              inputMode="decimal"
              aria-invalid={Boolean(salaryErrors.minSalary)}
              aria-describedby={salaryErrors.minSalary ? "job-minSalary-error" : undefined}
              value={formData.minSalary}
              onChange={handleInputChange}
              className={inputClass}
            />
            {salaryErrors.minSalary && <p id="job-minSalary-error" className="text-red-400 text-sm mt-2">{salaryErrors.minSalary}</p>}
          </div>
          <div>
            <label htmlFor="job-maxSalary" className="block text-gray-400 text-sm mb-2">
              Max. Salary
            </label>
            <input
              type="text"
              name="maxSalary"
              id="job-maxSalary"
              inputMode="decimal"
              aria-invalid={Boolean(salaryErrors.maxSalary)}
              aria-describedby={salaryErrors.maxSalary ? "job-maxSalary-error" : undefined}
              value={formData.maxSalary}
              onChange={handleInputChange}
              className={inputClass}
            />
            {salaryErrors.maxSalary && <p id="job-maxSalary-error" className="text-red-400 text-sm mt-2">{salaryErrors.maxSalary}</p>}
          </div>
        </div>

        {/* Experience & Career Level */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-gray-400 text-sm mb-2">
              Experience
            </label>
            <JobFormSelect
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
            </JobFormSelect>
          </div>
          <div>
            <label className="block text-gray-400 text-sm mb-2">
              Career Level
            </label>
            <JobFormSelect
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
            </JobFormSelect>
          </div>
        </div>

        {/* Qualification & Deadline */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="block text-gray-400 text-sm mb-2">
              Qualification
            </label>
            <JobFormSelect
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
            </JobFormSelect>
          </div>
          <div>
            <label htmlFor="job-deadlineDate" className="block text-gray-400 text-sm mb-2">
              Applicant Deadline Date
            </label>
            <input
              type="date"
              name="deadlineDate"
              id="job-deadlineDate"
              min={lagosDateKey()}
              aria-invalid={Boolean(deadlineMessage)}
              aria-describedby={deadlineMessage ? "job-deadlineDate-error" : undefined}
              value={formData.deadlineDate}
              onChange={handleInputChange}
              className={inputClass}
            />
            {deadlineMessage && <p id="job-deadlineDate-error" className="text-red-400 text-sm mt-2">{deadlineMessage}</p>}
            {savedDeadline && savedDeadline < lagosDateKey() && <p className="text-gray-400 text-sm mt-2">You may keep the existing expired deadline unchanged.</p>}
          </div>
        </div>

        {/* Photo */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Gallery</h2>
          {photos.length > 0 && (
            <div className="flex flex-wrap gap-4 mb-4">
              {photos.map((photo, index) => (
                <div key={photo.key} className="relative w-full max-w-64 h-44">
                  <JobMediaPreview media={photo} />
                  <button
                    aria-label={`Remove gallery item ${index + 1}`}
                    onClick={() => removePhoto(index)}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-4">
            <input
              ref={photosRef}
              type="file"
              name="photos"
              accept=".png,.jpg,.jpeg,.mp4,image/png,image/jpeg,video/mp4"
              multiple
              onChange={handlePhotosUpload}
              className="hidden"
            />
            <button
              onClick={() => photosRef.current?.click()}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
            >
              Add gallery files
            </button>
            <span className="text-gray-400 text-sm">PNG, JPG, JPEG or MP4. Selections append (up to 10 new files per save).</span>
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
              <JobFormSelect
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                className={selectClass}
              >
                <option value="">Select Location</option>
                {COUNTRIES.map(country => (
                  <option key={country} value={country}>{country}</option>
                ))}
                <option>Tokyo</option>
                <option>New York</option>
                <option>London</option>
                <option>Berlin</option>
                <option>Paris</option>
                <option>Sydney</option>
                <option>Lagos</option>
                <option>Remote</option>
              </JobFormSelect>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex flex-wrap justify-end gap-3">
          <button onClick={() => onCancel()} disabled={saving}
            className="min-h-[44px] px-6 py-3 border border-white/20 text-white rounded-lg focus-visible:outline focus-visible:outline-2 disabled:opacity-70">
            Cancel
          </button>
          <button
            onClick={onSubmit}
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
}
