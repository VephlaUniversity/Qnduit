import React, { useState, useRef } from "react";
import { Camera, X, Loader2 } from "lucide-react";
import { Facebook, Twitter, Instagram, Linkedin, Youtube } from "lucide-react";
import { useToast } from "../hooks/useToast";
import { useNavigate } from "react-router-dom";
import TextEditor from "../TextEditor";

const TalentAbout = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const avatarInputRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [avatar, setAvatar] = useState(null);
  const [tagInput, setTagInput] = useState("");

  const [formData, setFormData] = useState({
    fullName: "",
    dateOfBirth: "",
    phone: "",
    email: "",
    gender: "",
    age: "",
    offeredSalary: "",
    salaryType: "",
    experienceTime: "",
    qualification: "",
    location: "",
    language: "",
    jobTitle: "",
    categories: "",
    showProfile: "",
    aboutMe: "",
    facebook: "",
    twitter: "",
    instagram: "",
    linkedin: "",
    pinterest: "",
    youtube: "",
    address: "",
    introVideo: "",
  });

  const [tags, setTags] = useState([]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAboutMeChange = (content) => {
    setFormData((prev) => ({ ...prev, aboutMe: content }));
  };

  const handleAvatarUpload = (e) => {
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
      setAvatar(event.target?.result);
      toast({ title: "Success", description: "Avatar uploaded successfully" });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleTagKeyDown = (e) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput("");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const data = { ...formData, avatar, tags };
    localStorage.setItem("aboutData", JSON.stringify(data));
    setSaving(false);
    toast({ title: "Saved!", description: "Profile saved successfully." });
    navigate("/talent-dashboard/profile");
  };

  const inputClass =
    "w-full px-4 py-3 bg-[#0E0E10] border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500";
  const selectClass =
    "w-full px-4 py-3 bg-[#0E0E10] border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500";

  const socialIcons = [
    {
      name: "facebook",
      icon: Facebook,
      placeholder: "http://www.facebook.com",
    },
    {
      name: "linkedin",
      icon: Linkedin,
      placeholder: "http://www.linkedin.com",
    },
    { name: "twitter", icon: Twitter, placeholder: "http://www.x.com" },
    {
      name: "instagram",
      icon: Instagram,
      placeholder: "http://www.instagram.com",
    },
    { name: "youtube", icon: Youtube, placeholder: "http://www.youtube.com" },
  ];

  return (
    <div className="min-h-screen bg-[#0E0E10] p-4 md:p-6 lg:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-8 bg-blue-600 rounded-full" />
        <h1 className="text-2xl md:text-3xl font-semibold text-white">
          Profile Setting
        </h1>
      </div>

      <div className="bg-[#1A1A1E] rounded-lg border border-white/5 p-6 md:p-8 max-w-5xl">
        {/* Avatar Upload */}
        <div className="flex items-start gap-6 mb-8">
          <div className="relative w-32 h-32 bg-[#2A2A2E] rounded-lg flex items-center justify-center border border-white/10">
            {avatar ? (
              <img
                src={avatar}
                alt="Avatar"
                className="w-full h-full object-cover rounded-lg"
              />
            ) : (
              <Camera className="w-12 h-12 text-gray-500" />
            )}
          </div>
          <div className="flex-1">
            <label className="block text-white font-medium mb-2">
              Upload a new avatar:
            </label>
            <p className="text-gray-400 text-sm mb-4">JPG 80×80px</p>
            <div className="flex gap-3">
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/jpg"
                onChange={handleAvatarUpload}
                className="hidden"
              />
              <button
                onClick={() => avatarInputRef.current?.click()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
              >
                Choose File
              </button>
              <span className="px-4 py-2 bg-transparent border border-white/10 text-gray-400 rounded-lg text-sm">
                {avatar ? "File selected" : "No file chosen"}
              </span>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-70 flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </div>

        {/* Information */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-6">Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-gray-400 text-sm mb-2">
                Full Name
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-2">
                Date Of Birth
              </label>
              <input
                type="date"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleInputChange}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-2">
                Phone Number
              </label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-2">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-2">Gender</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleInputChange}
                className={selectClass}
              >
                <option value="">Select Gender</option>
                <option>Male</option>
                <option>Female</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-2">Age</label>
              <select
                name="age"
                value={formData.age}
                onChange={handleInputChange}
                className={selectClass}
              >
                <option value="">Select Age</option>
                <option>18 - 24</option>
                <option>25 - 34</option>
                <option>35 - 44</option>
                <option>45+</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-2">
                Rate Card ($)
              </label>
              <input
                type="text"
                name="offeredSalary"
                value={formData.offeredSalary}
                onChange={handleInputChange}
                className={inputClass}
              />
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
            <div>
              <label className="block text-gray-400 text-sm mb-2">
                Experience time
              </label>
              <select
                name="experienceTime"
                value={formData.experienceTime}
                onChange={handleInputChange}
                className={selectClass}
              >
                <option>5 Years+</option>
                <option>3-5 Years</option>
                <option>1-3 Years</option>
                <option>Less than 1 Year</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-2">
                Qualification
              </label>
              <input
                type="text"
                name="qualification"
                value={formData.qualification}
                onChange={handleInputChange}
                placeholder="e.g., Bachelor Degree, Master Degree, PhD"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-2">
                Location
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-2">
                Language
              </label>
              <input
                type="text"
                name="language"
                value={formData.language}
                onChange={handleInputChange}
                placeholder="e.g., English, Spanish, French"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-2">
                Job Title
              </label>
              <input
                type="text"
                name="jobTitle"
                value={formData.jobTitle}
                onChange={handleInputChange}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-2">
                Categories
              </label>
              <input
                type="text"
                name="categories"
                value={formData.categories}
                onChange={handleInputChange}
                className={inputClass}
              />
            </div>
          </div>

          {/* Show my profile */}
          <div className="mt-6">
            <label className="block text-gray-400 text-sm mb-3">
              Show my profile
            </label>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="showProfile"
                  value="show"
                  checked={formData.showProfile === "show"}
                  onChange={handleInputChange}
                  className="w-4 h-4 accent-blue-600"
                />
                <span className="text-white">Show</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="showProfile"
                  value="hidden"
                  checked={formData.showProfile === "hidden"}
                  onChange={handleInputChange}
                  className="w-4 h-4 accent-blue-600"
                />
                <span className="text-white">Hidden</span>
              </label>
            </div>
          </div>

          {/* Tag Skill */}
          <div className="mt-6">
            <label className="block text-gray-400 text-sm mb-3">
              Tag Skill
            </label>
            <div className="flex flex-wrap items-center gap-2 w-full px-4 py-3 bg-[#0E0E10] border border-white/10 rounded-lg min-h-[48px]">
              {tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-blue-600 text-white rounded-md flex items-center gap-2 text-sm"
                >
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-gray-300 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder={
                  tags.length === 0 ? "Type a skill and press Enter" : ""
                }
                className="flex-1 min-w-[120px] bg-transparent text-white focus:outline-none placeholder:text-gray-500"
              />
            </div>
          </div>
        </div>

        {/* About Me */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">About Me</h2>
          <TextEditor value={formData.aboutMe} onChange={handleAboutMeChange} />
        </div>

        {/* Social Network */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">
            Social Network
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {socialIcons.map((social) => {
              const Icon = social.icon;
              return (
                <div key={social.name} className="flex gap-3">
                  <div className="w-12 h-12 bg-[#0E0E10] border border-white/10 rounded-lg flex items-center justify-center text-gray-400 shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <input
                    type="url"
                    name={social.name}
                    value={formData[social.name]}
                    onChange={handleInputChange}
                    placeholder={social.placeholder}
                    className="flex-1 px-4 py-3 bg-[#0E0E10] border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                  {formData[social.name] && (
                    <button
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, [social.name]: "" }))
                      }
                      className="w-12 h-12 bg-[#0E0E10] border border-white/10 rounded-lg flex items-center justify-center text-gray-400 hover:text-white shrink-0"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Contact Information */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">
            Contact Information
          </h2>
          <div className="space-y-6">
            <div>
              <label className="block text-gray-400 text-sm mb-2">
                Address
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-2">
                Introduction Video
              </label>
              <input
                type="text"
                name="introVideo"
                value={formData.introVideo}
                onChange={handleInputChange}
                placeholder="https://www.youtube.com/watch?v=..."
                className={inputClass}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TalentAbout;
