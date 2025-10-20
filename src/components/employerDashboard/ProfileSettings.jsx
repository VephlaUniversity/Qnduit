import React, { useState, useEffect } from "react";
import { Image as ImageIcon, X, Plus, ExternalLink } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

export const ProfileSettings = () => {
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    employerName: "Avitex Agency",
    email: "hi.avitex@gmail.com",
    phone: "123 456 7890",
    website: "avitex.com",
    foundedDate: "2018",
    companySize: "50 - 120",
    showProfile: "show",
    categories: ["Developer", "Graphic Designer", "VFX Artist", "3D Modeling"],
    profileURL: "https://www.avitex.vn",
    aboutCompany:
      "Are you a User Experience Designer with a track record of delivering intuitive digital experiences that drive results? Are you a strategic storyteller and systems thinker who can concept and craft smart, world-class campaigns across a variety of mediums?",
    socialNetworks: {
      facebook: "http://www.facebook.com/avitex",
      linkedin: "",
      twitter: "",
      pinterest: "",
      instagram: "",
      youtube: "",
    },
    introVideo: "https://www.youtube.com/watch?v=4kZLqk9k",
    address: "71 St. Takayamio, Tokyo)",
    location: "Tokyo",
    mapLocation: "245 - 235 St. Takayamio, Tokyo",
    lat: "40.69499198068389",
    lng: "-73.99599761719189",
  });

  // Update form data when user data is available
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        employerName: user.name || prev.employerName,
        email: user.email || prev.email,
        phone: user.phone || prev.phone,
        website: user.website || prev.website,
        foundedDate: user.founded || prev.foundedDate,
        companySize: user.teamSize || prev.companySize,
        address: user.address || prev.address,
        lat: user.lat || prev.lat,
        lng: user.lng || prev.lng,
      }));
    }
  }, [user]);

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSocialChange = (platform, value) => {
    setFormData({
      ...formData,
      socialNetworks: { ...formData.socialNetworks, [platform]: value },
    });
  };

  const handleSave = () => {
    console.log("Profile saved:", formData);
    // TODO: Implement actual save logic
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-8 bg-blue-600 rounded-full"></div>
        <h1 className="text-2xl md:text-3xl font-semibold text-white">
          Profile Setting
        </h1>
      </div>

      <div className="bg-[#1A1A1E] rounded-lg border border-white/5">
        {/* Image Upload Section */}
        <div className="p-6 border-b border-white/5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-white font-medium mb-3 block">
                Upload a Logo:
              </label>
              <p className="text-gray-400 text-sm mb-3">JPG 80x80px</p>
              <div className="w-32 h-32 bg-[#0E0E10] rounded border border-dashed border-gray-600 flex items-center justify-center mb-3">
                <ImageIcon className="w-8 h-8 text-gray-500" />
              </div>
              <div className="flex gap-2">
                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors">
                  Choose File
                </button>
                <span className="text-gray-400 text-sm self-center">
                  No file chosen
                </span>
              </div>
            </div>
            <div>
              <label className="text-white font-medium mb-3 block">
                Upload a new cover:
              </label>
              <p className="text-gray-400 text-sm mb-3">JPG 1920x400px</p>
              <div className="w-full h-32 bg-[#0E0E10] rounded border border-dashed border-gray-600 flex items-center justify-center mb-3">
                <ImageIcon className="w-8 h-8 text-gray-500" />
              </div>
              <div className="flex gap-2">
                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors">
                  Choose File
                </button>
                <span className="text-gray-400 text-sm self-center">
                  No file chosen
                </span>
              </div>
            </div>
          </div>
          <div className="flex justify-end mt-6">
            <button
              onClick={handleSave}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Save Profile
            </button>
          </div>
        </div>

        {/* Information Section */}
        <div className="p-6 border-b border-white/5">
          <h2 className="text-xl font-semibold text-white mb-6">Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-white text-sm mb-2 block">
                Employer Name
              </label>
              <input
                type="text"
                value={formData.employerName}
                onChange={(e) =>
                  handleInputChange("employerName", e.target.value)
                }
                className="w-full bg-[#0E0E10] border border-gray-700 text-white rounded px-4 py-3 focus:border-blue-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-white text-sm mb-2 block">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                className="w-full bg-[#0E0E10] border border-gray-700 text-white rounded px-4 py-3 focus:border-blue-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-white text-sm mb-2 block">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                className="w-full bg-[#0E0E10] border border-gray-700 text-white rounded px-4 py-3 focus:border-blue-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-white text-sm mb-2 block">Website</label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => handleInputChange("website", e.target.value)}
                className="w-full bg-[#0E0E10] border border-gray-700 text-white rounded px-4 py-3 focus:border-blue-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-white text-sm mb-2 block">
                Founded Date
              </label>
              <select
                value={formData.foundedDate}
                onChange={(e) =>
                  handleInputChange("foundedDate", e.target.value)
                }
                className="w-full bg-[#0E0E10] border border-gray-700 text-white rounded px-4 py-3 focus:border-blue-600 focus:outline-none"
              >
                <option value="2018">2018</option>
                <option value="2019">2019</option>
                <option value="2020">2020</option>
                <option value="2021">2021</option>
                <option value="2022">2022</option>
                <option value="2023">2023</option>
              </select>
            </div>
            <div>
              <label className="text-white text-sm mb-2 block">
                Company Size
              </label>
              <select
                value={formData.companySize}
                onChange={(e) =>
                  handleInputChange("companySize", e.target.value)
                }
                className="w-full bg-[#0E0E10] border border-gray-700 text-white rounded px-4 py-3 focus:border-blue-600 focus:outline-none"
              >
                <option value="50 - 120">50 - 120</option>
                <option value="1-10">1-10</option>
                <option value="11-50">11-50</option>
                <option value="121-200">121-200</option>
                <option value="200+">200+</option>
              </select>
            </div>
          </div>

          <div className="mt-6">
            <label className="text-white text-sm mb-3 block">
              Show profile
            </label>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-white cursor-pointer">
                <input
                  type="radio"
                  name="showProfile"
                  value="show"
                  checked={formData.showProfile === "show"}
                  onChange={(e) =>
                    handleInputChange("showProfile", e.target.value)
                  }
                  className="w-4 h-4"
                />
                Show
              </label>
              <label className="flex items-center gap-2 text-white cursor-pointer">
                <input
                  type="radio"
                  name="showProfile"
                  value="hidden"
                  checked={formData.showProfile === "hidden"}
                  onChange={(e) =>
                    handleInputChange("showProfile", e.target.value)
                  }
                  className="w-4 h-4"
                />
                Hidden
              </label>
            </div>
          </div>

          <div className="mt-6">
            <label className="text-white text-sm mb-3 block">
              Categories <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {formData.categories.map((cat, i) => (
                <span
                  key={i}
                  className="px-3 py-1 bg-blue-600 text-white rounded-full text-sm flex items-center gap-2"
                >
                  {cat}
                  <button className="hover:text-red-400">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <button className="px-3 py-1 border border-blue-600 text-blue-600 rounded-full text-sm hover:bg-blue-600 hover:text-white transition-colors">
                + Add Category
              </button>
            </div>
            <div className="mt-2 bg-[#0E0E10] border border-gray-700 rounded p-2">
              <p className="text-gray-400 text-sm">3D Modeling</p>
              <p className="text-gray-400 text-sm">Modeling</p>
              <p className="text-gray-400 text-sm">UI UX Designer</p>
            </div>
          </div>

          <div className="mt-6">
            <label className="text-white text-sm mb-3 block">Profile URL</label>
            <div className="relative">
              <input
                type="url"
                value={formData.profileURL}
                onChange={(e) =>
                  handleInputChange("profileURL", e.target.value)
                }
                className="w-full bg-[#0E0E10] border border-gray-700 text-white rounded px-4 py-3 pr-10 focus:border-blue-600 focus:outline-none"
              />
              <button className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 hover:text-blue-400">
                <ExternalLink className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* About Company */}
        <div className="p-6 border-b border-white/5">
          <h2 className="text-xl font-semibold text-white mb-6">
            About Company
          </h2>
          <div className="bg-[#0E0E10] border border-gray-700 rounded-lg">
            <div className="flex gap-2 p-3 border-b border-gray-700">
              {["B", "I", "U", "S", "T", "link", "attach", "img", "emoji"].map(
                (tool, i) => (
                  <button
                    key={i}
                    className="w-8 h-8 hover:bg-white/5 rounded flex items-center justify-center text-gray-400"
                  >
                    {tool}
                  </button>
                )
              )}
            </div>
            <textarea
              value={formData.aboutCompany}
              onChange={(e) =>
                handleInputChange("aboutCompany", e.target.value)
              }
              rows={6}
              className="w-full bg-transparent text-white p-4 focus:outline-none resize-none"
            />
          </div>
        </div>

        {/* Profile Photo */}
        <div className="p-6 border-b border-white/5">
          <h2 className="text-xl font-semibold text-white mb-6">
            Profile Photo
          </h2>
          <div className="flex gap-4 mb-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="relative w-40 h-28 bg-gray-700 rounded border border-gray-600"
              >
                <button className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 rounded-full flex items-center justify-center hover:bg-red-700">
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-[#0E0E10] border border-gray-700 text-white rounded hover:bg-white/5 transition-colors">
              Browse
            </button>
            <button className="px-4 py-2 text-gray-400">Upload image</button>
          </div>
        </div>

        {/* Introduction Video */}
        <div className="p-6 border-b border-white/5">
          <h2 className="text-xl font-semibold text-white mb-6">
            Introduction Video
          </h2>
          <input
            type="url"
            value={formData.introVideo}
            onChange={(e) => handleInputChange("introVideo", e.target.value)}
            placeholder="https://www.youtube.com/watch?v="
            className="w-full bg-[#0E0E10] border border-gray-700 text-white rounded px-4 py-3 focus:border-blue-600 focus:outline-none"
          />
        </div>

        {/* Social Network */}
        <div className="p-6 border-b border-white/5">
          <h2 className="text-xl font-semibold text-white mb-6">
            Social Network
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(formData.socialNetworks).map(
              ([platform, value]) => (
                <div key={platform} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                    <span className="text-gray-800 font-bold text-sm">
                      {platform[0]}
                    </span>
                  </div>
                  <div className="flex-1 relative">
                    <input
                      type="url"
                      value={value}
                      onChange={(e) =>
                        handleSocialChange(platform, e.target.value)
                      }
                      placeholder="URL"
                      className="w-full bg-[#0E0E10] border border-gray-700 text-white rounded px-4 py-3 pr-10 focus:border-blue-600 focus:outline-none"
                    />
                    {value && (
                      <button
                        onClick={() => handleSocialChange(platform, "")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        </div>

        {/* Contact Information */}
        <div className="p-6">
          <h2 className="text-xl font-semibold text-white mb-6">
            Contact Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="text-white text-sm mb-2 block">Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
                className="w-full bg-[#0E0E10] border border-gray-700 text-white rounded px-4 py-3 focus:border-blue-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-white text-sm mb-2 block">
                Map Location
              </label>
              <input
                type="text"
                value={formData.mapLocation}
                onChange={(e) =>
                  handleInputChange("mapLocation", e.target.value)
                }
                className="w-full bg-[#0E0E10] border border-gray-700 text-white rounded px-4 py-3 focus:border-blue-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-white text-sm mb-2 block">Location</label>
              <select
                value={formData.location}
                onChange={(e) => handleInputChange("location", e.target.value)}
                className="w-full bg-[#0E0E10] border border-gray-700 text-white rounded px-4 py-3 focus:border-blue-600 focus:outline-none"
              >
                <option value="Tokyo">Tokyo</option>
                <option value="New York">New York</option>
                <option value="London">London</option>
              </select>
            </div>
          </div>

          {/* Map Placeholder */}
          <div className="bg-gray-700 rounded-lg h-80 flex items-center justify-center mb-6">
            <div className="text-center">
              <p className="text-white mb-2">Map View</p>
              <p className="text-gray-400 text-sm">
                Interactive map would be displayed here
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <input
              type="text"
              value={formData.lat}
              onChange={(e) => handleInputChange("lat", e.target.value)}
              placeholder="Latitude"
              className="w-full bg-[#0E0E10] border border-gray-700 text-white rounded px-4 py-3 focus:border-blue-600 focus:outline-none"
            />
            <input
              type="text"
              value={formData.lng}
              onChange={(e) => handleInputChange("lng", e.target.value)}
              placeholder="Longitude"
              className="w-full bg-[#0E0E10] border border-gray-700 text-white rounded px-4 py-3 focus:border-blue-600 focus:outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;
