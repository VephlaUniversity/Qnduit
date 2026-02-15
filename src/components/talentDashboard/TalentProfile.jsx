import React, { useState, useRef } from "react";
import { Camera, MapPin, Plus, X } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { TextEditor } from "../TextEditor";
import {
  talentProfileSchema,
  validateFormData,
  validateFile,
} from "../utils/formValidation";
import { useToast } from "../hooks/useToast";
import { Facebook, Twitter, Instagram, Linkedin, Youtube } from "lucide-react";
import { FaPinterest } from "react-icons/fa";

export const TalentProfile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const avatarInputRef = useRef(null);
  const [avatar, setAvatar] = useState(user?.avatar || null);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    fullName: user?.name || "",
    dateOfBirth: "1997-04-08",
    phone: user?.phone || "",
    email: user?.email || "",
    gender: "Male",
    age: "18 - 24",
    offeredSalary: "2000",
    salaryType: "Month",
    experienceTime: "5 Years",
    qualification: "Master Degree",
    location: "Tokyo, Japan",
    language: "English",
    jobTitle: "UI UX Designer",
    categories: "Design",
    showProfile: "show",
    aboutMe: "",
    facebook: "",
    twitter: "",
    instagram: "",
    linkedin: "",
    pinterest: "",
    youtube: "",
    address: "71 St. Takayamio, Tokyo",
    mapLocation: "243- 235 St. Takayamio Tokyo",
    latitude: "",
    longitude: "",
    introVideo: "",
  });

  const [tags, setTags] = useState([
    "Figma",
    "Photoshop",
    "AI",
    "Python",
    "Cinema",
  ]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleAvatarUpload = (e) => {
    const file = e.target.files[0];
    const validation = validateFile(file, {
      maxSize: 5 * 1024 * 1024,
      allowedTypes: ["image/jpeg", "image/png", "image/jpg"],
    });

    if (!validation.valid) {
      toast({
        title: "Upload Error",
        description: validation.error,
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setAvatar(event.target.result);
      toast({
        title: "Success",
        description: "Avatar uploaded successfully",
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleSaveProfile = () => {
    const validation = validateFormData(talentProfileSchema, formData);

    if (!validation.success) {
      setErrors(validation.errors);
      toast({
        title: "Validation Error",
        description: "Please check all required fields",
        variant: "destructive",
      });
      return;
    }

    // Save logic here
    toast({
      title: "Success",
      description: "Profile saved successfully",
    });
  };

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
      name: "pinterest",
      icon: FaPinterest,
      placeholder: "http://www.pinterest.com",
    },
    {
      name: "instagram",
      icon: Instagram,
      placeholder: "http://www.instagram.com",
    },
    { name: "youtube", icon: Youtube, placeholder: "http://www.youtube.com" },
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-8 bg-blue-600 rounded-full"></div>
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
            <p className="text-gray-400 text-sm mb-4">.jpg or .png (max 5MB)</p>
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
            onClick={handleSaveProfile}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Save Profile
          </button>
        </div>

        {/* Information Section */}
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
                className={`w-full px-4 py-3 bg-[#0E0E10] border ${
                  errors.fullName ? "border-red-500" : "border-white/10"
                } rounded-lg text-white focus:outline-none focus:border-blue-500`}
              />
              {errors.fullName && (
                <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>
              )}
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
                className={`w-full px-4 py-3 bg-[#0E0E10] border ${
                  errors.dateOfBirth ? "border-red-500" : "border-white/10"
                } rounded-lg text-white focus:outline-none focus:border-blue-500`}
              />
              {errors.dateOfBirth && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.dateOfBirth}
                </p>
              )}
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
                className={`w-full px-4 py-3 bg-[#0E0E10] border ${
                  errors.phone ? "border-red-500" : "border-white/10"
                } rounded-lg text-white focus:outline-none focus:border-blue-500`}
              />
              {errors.phone && (
                <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
              )}
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-2">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 bg-[#0E0E10] border ${
                  errors.email ? "border-red-500" : "border-white/10"
                } rounded-lg text-white focus:outline-none focus:border-blue-500`}
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email}</p>
              )}
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-2">Gender</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-[#0E0E10] border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-2">Age</label>
              <select
                name="age"
                value={formData.age}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-[#0E0E10] border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option>18 - 24</option>
                <option>25 - 34</option>
                <option>35 - 44</option>
                <option>45+</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-2">
                Offered Salary ($)
              </label>
              <input
                type="text"
                name="offeredSalary"
                value={formData.offeredSalary}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 bg-[#0E0E10] border ${
                  errors.offeredSalary ? "border-red-500" : "border-white/10"
                } rounded-lg text-white focus:outline-none focus:border-blue-500`}
              />
              {errors.offeredSalary && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.offeredSalary}
                </p>
              )}
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-2">
                Salary type
              </label>
              <select
                name="salaryType"
                value={formData.salaryType}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-[#0E0E10] border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option>Month</option>
                <option>Year</option>
                <option>Hour</option>
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
                className="w-full px-4 py-3 bg-[#0E0E10] border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option>5 Years</option>
                <option>3-5 Years</option>
                <option>1-3 Years</option>
                <option>Less than 1 Year</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-2">
                Qualification
              </label>
              <select
                name="qualification"
                value={formData.qualification}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-[#0E0E10] border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option>Master Degree</option>
                <option>Bachelor Degree</option>
                <option>High School</option>
              </select>
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
                className={`w-full px-4 py-3 bg-[#0E0E10] border ${
                  errors.location ? "border-red-500" : "border-white/10"
                } rounded-lg text-white focus:outline-none focus:border-blue-500`}
              />
              {errors.location && (
                <p className="text-red-500 text-xs mt-1">{errors.location}</p>
              )}
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-2">
                Language
              </label>
              <select
                name="language"
                value={formData.language}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-[#0E0E10] border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option>English</option>
                <option>Spanish</option>
                <option>French</option>
                <option>Japanese</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-2">
                Job title
              </label>
              <input
                type="text"
                name="jobTitle"
                value={formData.jobTitle}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 bg-[#0E0E10] border ${
                  errors.jobTitle ? "border-red-500" : "border-white/10"
                } rounded-lg text-white focus:outline-none focus:border-blue-500`}
              />
              {errors.jobTitle && (
                <p className="text-red-500 text-xs mt-1">{errors.jobTitle}</p>
              )}
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
                className={`w-full px-4 py-3 bg-[#0E0E10] border ${
                  errors.categories ? "border-red-500" : "border-white/10"
                } rounded-lg text-white focus:outline-none focus:border-blue-500`}
              />
              {errors.categories && (
                <p className="text-red-500 text-xs mt-1">{errors.categories}</p>
              )}
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
            <div className="flex flex-wrap gap-2">
              {tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2"
                >
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-gray-300 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* About Me with Text Editor */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">About Me</h2>
          <TextEditor
            value={formData.aboutMe}
            onChange={(html) =>
              setFormData((prev) => ({ ...prev, aboutMe: html }))
            }
          />
          {errors.aboutMe && (
            <p className="text-red-500 text-xs mt-1">{errors.aboutMe}</p>
          )}
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
                  {Icon && (
                    <div className="w-12 h-12 bg-[#0E0E10] border border-white/10 rounded-lg flex items-center justify-center text-gray-400">
                      <Icon className="w-5 h-5" />
                    </div>
                  )}
                  <input
                    type="url"
                    name={social.name}
                    value={formData[social.name]}
                    onChange={handleInputChange}
                    placeholder={social.placeholder}
                    className={`flex-1 px-4 py-3 bg-[#0E0E10] border ${
                      errors[social.name] ? "border-red-500" : "border-white/10"
                    } rounded-lg text-white focus:outline-none focus:border-blue-500`}
                  />
                  {formData[social.name] && (
                    <button
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, [social.name]: "" }))
                      }
                      className="w-12 h-12 bg-[#0E0E10] border border-white/10 rounded-lg flex items-center justify-center text-gray-400 hover:text-white"
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
                className={`w-full px-4 py-3 bg-[#0E0E10] border ${
                  errors.address ? "border-red-500" : "border-white/10"
                } rounded-lg text-white focus:outline-none focus:border-blue-500`}
              />
              {errors.address && (
                <p className="text-red-500 text-xs mt-1">{errors.address}</p>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-gray-400 text-sm mb-2">
                  Location
                </label>
                <select className="w-full px-4 py-3 bg-[#0E0E10] border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500">
                  <option>Tokyo</option>
                  <option>New York</option>
                  <option>London</option>
                  <option>Berlin</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">
                  Map Location
                </label>
                <input
                  type="text"
                  name="mapLocation"
                  value={formData.mapLocation}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 bg-[#0E0E10] border ${
                    errors.mapLocation ? "border-red-500" : "border-white/10"
                  } rounded-lg text-white focus:outline-none focus:border-blue-500`}
                />
                {errors.mapLocation && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.mapLocation}
                  </p>
                )}
              </div>
            </div>

            {/* Map Placeholder */}
            <div className="w-full h-64 bg-gray-300 rounded-lg flex items-center justify-center relative overflow-hidden"></div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <input
                  type="text"
                  name="latitude"
                  value={formData.latitude}
                  onChange={handleInputChange}
                  placeholder="Latitude"
                  className={`w-full px-4 py-3 bg-[#0E0E10] border ${
                    errors.latitude ? "border-red-500" : "border-white/10"
                  } rounded-lg text-white focus:outline-none focus:border-blue-500`}
                />
                {errors.latitude && (
                  <p className="text-red-500 text-xs mt-1">{errors.latitude}</p>
                )}
              </div>
              <div>
                <input
                  type="text"
                  name="longitude"
                  value={formData.longitude}
                  onChange={handleInputChange}
                  placeholder="Longitude"
                  className={`w-full px-4 py-3 bg-[#0E0E10] border ${
                    errors.longitude ? "border-red-500" : "border-white/10"
                  } rounded-lg text-white focus:outline-none focus:border-blue-500`}
                />
                {errors.longitude && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.longitude}
                  </p>
                )}
              </div>
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
                className={`w-full px-4 py-3 bg-[#0E0E10] border ${
                  errors.introVideo ? "border-red-500" : "border-white/10"
                } rounded-lg text-white focus:outline-none focus:border-blue-500`}
              />
              {errors.introVideo && (
                <p className="text-red-500 text-xs mt-1">{errors.introVideo}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TalentProfile;
