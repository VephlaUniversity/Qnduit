import React, { useState, useRef, useEffect } from "react";
import { Image as ImageIcon, X, ExternalLink, Loader2 } from "lucide-react";
import { Facebook, Linkedin, Youtube, Twitter, Instagram } from "lucide-react";
import { FaPinterest } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import TextEditor from "../TextEditor";
import { useToast } from "../hooks/useToast";
import axios from "axios";
import { API_BASE_URL } from "../utils/api";

// Fix leaflet default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const DraggableMarker = ({ position, onPositionChange }) => {
  useMapEvents({
    click(e) {
      onPositionChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return position[0] && position[1] ? <Marker position={position} /> : null;
};

const socialIcons = [
  { name: "facebook", icon: Facebook, placeholder: "http://www.facebook.com" },
  { name: "linkedin", icon: Linkedin, placeholder: "http://www.linkedin.com" },
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

const ProfileSettings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [categoryInput, setCategoryInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState(null);
  const [galleryItems, setGalleryItems] = useState([]);
  const [mapPosition, setMapPosition] = useState([35.6762, 139.6503]);
  const logoInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const [formData, setFormData] = useState({
    companyName: "",
    companyEmail: "",
    phone: "",
    companyWebsite: "",
    industry: "",
    foundedDate: "2023",
    companySize: "50-120",
    showProfile: "show",
    categories: [],
    profileURL: "",
    aboutCompany: "",
    socialNetworks: {
      facebook: "",
      linkedin: "",
      twitter: "",
      pinterest: "",
      instagram: "",
      youtube: "",
    },
    introVideo: "",
    address: "",
    location: "",
    mapLocation: "",
    lat: "",
    lng: "",
    logo: null,
    gallery: [],
  });

  // Load saved profile data
  useEffect(() => {
    try {
      const saved = localStorage.getItem("employerProfile");
      if (saved) {
        const parsed = JSON.parse(saved);

        // Ensure gallery is always an array
        if (!Array.isArray(parsed.gallery)) {
          parsed.gallery = [];
        }

        // Ensure socialNetworks exists
        if (
          !parsed.socialNetworks ||
          typeof parsed.socialNetworks !== "object"
        ) {
          parsed.socialNetworks = {
            facebook: "",
            linkedin: "",
            twitter: "",
            pinterest: "",
            instagram: "",
            youtube: "",
          };
        }

        // Ensure categories is an array
        if (!Array.isArray(parsed.categories)) {
          parsed.categories = [];
        }

        setFormData(parsed);
        setIsUpdating(true);
        if (parsed.logo) setLogoPreview(parsed.logo);
        if (
          parsed.gallery &&
          Array.isArray(parsed.gallery) &&
          parsed.gallery.length > 0
        ) {
          setGalleryItems(parsed.gallery);
        }
        if (parsed.lat && parsed.lng) {
          const lat = parseFloat(parsed.lat);
          const lng = parseFloat(parsed.lng);
          if (!isNaN(lat) && !isNaN(lng)) {
            setMapPosition([lat, lng]);
          }
        }
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      // Clear corrupted data and start fresh
      localStorage.removeItem("employerProfile");
      toast({
        title: "Error",
        description: "Failed to load profile data. Starting fresh.",
        variant: "destructive",
      });
    }
  }, []);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSocialChange = (platform, value) => {
    setFormData((prev) => ({
      ...prev,
      socialNetworks: { ...prev.socialNetworks, [platform]: value },
    }));
  };

  const handleRemoveCategory = (cat) => {
    setFormData((prev) => ({
      ...prev,
      categories: prev.categories.filter((c) => c !== cat),
    }));
    toast({ title: "Removed", description: `${cat} removed.` });
  };

  const handleCategoryKeyDown = (e) => {
    if (e.key === "Enter" && categoryInput.trim()) {
      e.preventDefault();
      if (!formData.categories.includes(categoryInput.trim())) {
        setFormData((prev) => ({
          ...prev,
          categories: [...prev.categories, categoryInput.trim()],
        }));
        toast({
          title: "Added",
          description: `${categoryInput.trim()} added.`,
        });
      }
      setCategoryInput("");
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB limit for logo

    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "File too large",
        description: "Logo must be less than 1MB. Please use a smaller image.",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const result = event.target?.result;
        setLogoPreview(result);
        setFormData((prev) => ({ ...prev, logo: file }));
      } catch (error) {
        console.error("Error processing logo:", error);
        toast({
          title: "Error",
          description: "Failed to process logo. Try a smaller file.",
          variant: "destructive",
        });
      }
    };

    reader.onerror = () => {
      toast({
        title: "Error",
        description: "Failed to read logo file",
        variant: "destructive",
      });
    };

    reader.readAsDataURL(file);
  };

  const handleGalleryUpload = (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB limit per file
    let processedCount = 0;
    const newItems = [];
    let hasError = false;

    // Validate file sizes first
    for (const file of fileArray) {
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds 2MB limit. Please use smaller files.`,
          variant: "destructive",
        });
        hasError = true;
      }
    }

    if (hasError) return;

    fileArray.forEach((file) => {
      const isVideo = file.type.startsWith("video/");
      const isImage = file.type.startsWith("image/");

      if (!isVideo && !isImage) {
        toast({
          title: "Invalid file",
          description: `${file.name} is not a valid image or video file`,
          variant: "destructive",
        });
        processedCount++;
        if (processedCount === fileArray.length && newItems.length > 0) {
          updateGalleryState(newItems);
        }
        return;
      }

      const newItems = fileArray.map((file) => ({
        url: URL.createObjectURL(file),
        type: file.type.startsWith("video/") ? "video" : "image",
      }));

      setGalleryItems((prev) => [...prev, ...newItems]);

      setFormData((prev) => ({
        ...prev,
        gallery: [...prev.gallery, ...fileArray], // 🔥 RAW FILES ONLY CHANGE
      }));

    });
  };

  const updateGalleryState = (newItems) => {
    try {
      setGalleryItems((prev) => {
        const updated = [...prev, ...newItems];
        // Check if we're approaching localStorage limit
        if (updated.length > 10) {
          toast({
            title: "Warning",
            description:
              "Too many gallery items may cause storage issues. Consider removing some.",
            variant: "destructive",
          });
        }
        return updated;
      });

      setFormData((prev) => {
        // Ensure prev.gallery is always an array
        const currentGallery = Array.isArray(prev.gallery) ? prev.gallery : [];
        return {
          ...prev,
          gallery: [...currentGallery, ...newItems],
        };
      });

      toast({
        title: "Success!",
        description: `${newItems.length} file(s) added to gallery`,
      });
    } catch (error) {
      console.error("Error updating gallery:", error);
      toast({
        title: "Error",
        description:
          "Failed to add files to gallery. Storage limit may be reached.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveGalleryItem = (index) => {
    setGalleryItems((prev) => prev.filter((_, i) => i !== index));
    setFormData((prev) => {
      const currentGallery = Array.isArray(prev.gallery) ? prev.gallery : [];
      return {
        ...prev,
        gallery: currentGallery.filter((_, i) => i !== index),
      };
    });

    toast({
      title: "Success!",
      description: "Item removed from gallery",
    });
  };

  const handleMapPositionChange = (lat, lng) => {
    const rLat = parseFloat(lat.toFixed(6));
    const rLng = parseFloat(lng.toFixed(6));
    setMapPosition([rLat, rLng]);
    setFormData((prev) => ({ ...prev, lat: String(rLat), lng: String(rLng) }));
  };

  const handleLatLngInput = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    const lat = field === "lat" ? parseFloat(value) : parseFloat(formData.lat);
    const lng = field === "lng" ? parseFloat(value) : parseFloat(formData.lng);
    if (!isNaN(lat) && !isNaN(lng)) setMapPosition([lat, lng]);
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const user = JSON.parse(localStorage.getItem("user"));
      const employerId = user?.id;
      const token = localStorage.getItem("token");

      if (!employerId) throw new Error("An error occured. Please try again.");

      const data = new FormData();

      Object.keys(formData).forEach((key) => {
        if (
          key !== "logo" &&
          key !== "gallery" &&
          key !== "socialNetworks"
        ) {
          data.append(key, formData[key]);
        }
      });

      data.append(
        "socialNetworks",
        JSON.stringify(formData.socialNetworks)
      );

      if (formData.logo) {
        data.append("logo", formData.logo);
      }

      if (formData.gallery?.length) {
        formData.gallery.forEach((file) => {
          data.append("gallery", file);
        });
      }

      const response = await axios.put(
        `${API_BASE_URL}/api/employers/update/${employerId}`,
        data,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const result = response.data;


      toast({
        title: "Success!",
        description: isUpdating
          ? "Profile updated successfully!"
          : "Profile saved successfully!",
      });

      navigate("/dashboard/profile");

    } catch (error) {
      console.error("Save error:", error);

      toast({
        title: "Error",
        description: error.message || "Failed to save profile. Please try again later.",
        variant: "destructive",
      });

    } finally {
      setIsSaving(false);
    }
  };

  const inputClass =
    "w-full bg-[#0E0E10] border border-gray-700 text-white rounded-lg px-4 py-3 focus:border-blue-600 focus:outline-none";
  const selectClass = inputClass;

  return (
    <div className="min-h-screen bg-[#0E0E10] p-4 md:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1 h-8 bg-blue-600 rounded-full" />
          <h1 className="text-2xl md:text-3xl font-semibold text-white">
            Profile Setting
          </h1>
        </div>

        <div className="bg-[#1A1A1E] rounded-lg border border-white/5">
          {/* Image Upload Section */}
          <div className="p-6 border-b border-white/5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Logo */}
              <div>
                <label className="text-white font-medium mb-3 block">
                  Upload a Logo:
                </label>
                <p className="text-gray-400 text-sm mb-3">JPG 80x80px</p>
                <div className="w-32 h-32 bg-[#0E0E10] rounded border border-dashed border-gray-600 flex items-center justify-center mb-3 overflow-hidden">
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Logo"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-gray-500" />
                  )}
                </div>
                <div className="flex gap-2 items-center">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => logoInputRef.current?.click()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
                  >
                    Choose File
                  </button>
                  <span className="text-gray-400 text-sm">
                    {logoPreview ? "Logo selected" : "No file chosen"}
                  </span>
                </div>
              </div>
              {/* Gallery */}
              <div>
                <label className="text-white font-medium mb-3 block">
                  Gallery (Images/Videos):
                </label>
                <p className="text-gray-400 text-sm mb-3">
                  Multiple files supported
                </p>
                {galleryItems.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {galleryItems.map((item, index) => (
                      <div
                        key={index}
                        className="relative w-24 h-24 rounded border border-white/10 overflow-hidden group"
                      >
                        {item.type === "video" ? (
                          <video
                            src={item.url}
                            className="w-full h-full object-cover"
                            muted
                          />
                        ) : (
                          <img
                            src={item.url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        )}
                        <button
                          onClick={() => handleRemoveGalleryItem(index)}
                          className="absolute top-1 right-1 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 items-center">
                  <input
                    ref={galleryInputRef}
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    onChange={handleGalleryUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => galleryInputRef.current?.click()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
                  >
                    Choose Files
                  </button>
                  <span className="text-gray-400 text-sm">
                    {galleryItems.length > 0
                      ? `${galleryItems.length} file(s)`
                      : "No files chosen"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Information */}
          <div className="p-6 border-b border-white/5">
            <h2 className="text-xl font-semibold text-white mb-6">
              Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-white text-sm mb-2 block">
                  Company Name
                </label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) =>
                    handleInputChange("companyName", e.target.value)
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-white text-sm mb-2 block">Company Email</label>
                <input
                  type="email"
                  value={formData.companyEmail}
                  onChange={(e) => handleInputChange("companyEmail", e.target.value)}
                  className={inputClass}
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
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-white text-sm mb-2 block">Website</label>
                <input
                  type="url"
                  value={formData.companyWebsite}
                  onChange={(e) => handleInputChange("companyWebsite", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-white text-sm mb-2 block">
                  Industry
                </label>
                <input
                  type="text"
                  value={formData.industry}
                  onChange={(e) =>
                    handleInputChange("industry", e.target.value)
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-white text-sm mb-2 block">
                  Founded Year
                </label>
                <input
                  type="text"
                  value={formData.foundedDate}
                  onChange={(e) =>
                    handleInputChange("foundedDate", e.target.value)
                  }
                  placeholder="e.g. 2020"
                  className={inputClass}
                />
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
                  className={selectClass}
                >
                  <option value="1-10">1-10</option>
                  <option value="11-50">11-50</option>
                  <option value="50-120">50 - 120</option>
                  <option value="121-200">121-200</option>
                  <option value="200+">200+</option>
                </select>
              </div>
            </div>

            {/* Show Profile */}
            <div className="mt-6">
              <label className="text-white text-sm mb-3 block">
                Show profile
              </label>
              <div className="flex gap-6">
                {["show", "hidden"].map((val) => (
                  <label
                    key={val}
                    className="flex items-center gap-2 text-white cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="showProfile"
                      value={val}
                      checked={formData.showProfile === val}
                      onChange={(e) =>
                        handleInputChange("showProfile", e.target.value)
                      }
                      className="w-4 h-4"
                    />
                    {val.charAt(0).toUpperCase() + val.slice(1)}
                  </label>
                ))}
              </div>
            </div>

            {/* Categories */}
            <div className="mt-6">
              <label className="text-white text-sm mb-3 block">
                Categories <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap items-center gap-2 w-full px-4 py-3 bg-[#0E0E10] border border-white/10 rounded-lg min-h-[48px]">
                {formData.categories.map((cat, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-blue-600 text-white rounded-md flex items-center gap-2 text-sm"
                  >
                    {cat}
                    <button
                      onClick={() => handleRemoveCategory(cat)}
                      className="hover:text-gray-300 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={categoryInput}
                  onChange={(e) => setCategoryInput(e.target.value)}
                  onKeyDown={handleCategoryKeyDown}
                  placeholder={
                    formData.categories.length === 0
                      ? "Type a category and press Enter"
                      : ""
                  }
                  className="flex-1 min-w-[120px] bg-transparent text-white focus:outline-none placeholder:text-gray-500"
                />
              </div>
            </div>

            {/* Profile URL */}
            <div className="mt-6">
              <label className="text-white text-sm mb-3 block">
                Profile URL
              </label>
              <div className="relative">
                <input
                  type="url"
                  value={formData.profileURL}
                  onChange={(e) =>
                    handleInputChange("profileURL", e.target.value)
                  }
                  className={`${inputClass} pr-10`}
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
            <TextEditor
              value={formData.aboutCompany}
              onChange={(val) => handleInputChange("aboutCompany", val)}
            />
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
              className={inputClass}
            />
          </div>

          {/* Social Network */}
          <div className="p-6 border-b border-white/5">
            <h2 className="text-xl font-semibold text-white mb-6">
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
                      value={formData.socialNetworks[social.name] || ""}
                      onChange={(e) =>
                        handleSocialChange(social.name, e.target.value)
                      }
                      placeholder={social.placeholder}
                      className={`flex-1 ${inputClass}`}
                    />
                    {formData.socialNetworks[social.name] && (
                      <button
                        onClick={() => handleSocialChange(social.name, "")}
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
                  className={inputClass}
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
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-white text-sm mb-2 block">
                  Location
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) =>
                    handleInputChange("location", e.target.value)
                  }
                  className={inputClass}
                />
              </div>
            </div>

            {/* Interactive Map */}
            <div className="mb-2">
              <p className="text-gray-400 text-sm mb-2">
                Click on the map to set your location:
              </p>
            </div>
            <div className="rounded-lg overflow-hidden border border-white/5 mb-6 h-72">
              <MapContainer
                center={mapPosition}
                zoom={13}
                style={{ height: "100%", width: "100%" }}
                scrollWheelZoom
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <DraggableMarker
                  position={mapPosition}
                  onPositionChange={handleMapPositionChange}
                />
              </MapContainer>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-white text-sm mb-2 block">
                  Latitude
                </label>
                <input
                  type="text"
                  value={formData.lat}
                  onChange={(e) => handleLatLngInput("lat", e.target.value)}
                  placeholder="Latitude"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-white text-sm mb-2 block">
                  Longitude
                </label>
                <input
                  type="text"
                  value={formData.lng}
                  onChange={(e) => handleLatLngInput("lng", e.target.value)}
                  placeholder="Longitude"
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-70 flex items-center gap-2"
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSaving
              ? isUpdating
                ? "Updating..."
                : "Saving..."
              : isUpdating
                ? "Update Profile"
                : "Save Profile"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;
