import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../hooks/useToast";
import axios from "axios";
import { API_BASE_URL } from "../utils/api";
import { editorPlainText, profileImageUrl } from "../profiles/profileApi";
import JobForm from "../jobs/JobForm";
import { validateJobSalary } from "../utils/jobSalaryValidation";
import { deadlineError, jobDateKey } from "../utils/jobDeadline";
import { useSearchParams } from "react-router-dom";

const SubmitJob = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const featuredImageRef = useRef(null);
  const photosRef = useRef(null);
  const nextPhotoKey = useRef(0);
  const [saving, setSaving] = useState(false);
  const [salaryErrors, setSalaryErrors] = useState({});
  const [deadlineMessage, setDeadlineMessage] = useState("");
  const [savedDeadline, setSavedDeadline] = useState("");
  const [loadingJob, setLoadingJob] = useState(true);
  const [jobError, setJobError] = useState("");
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
  const [searchParams] = useSearchParams();
  const id = searchParams.get("edit");
  const isEditing = searchParams.has("edit");

  useEffect(() => {

    setEditingJobId(null);
    setJobError("");
    setDeadlineMessage("");
    setSavedDeadline("");
    if (!isEditing) {
      setFormData(prev => Object.fromEntries(Object.keys(prev).map(key => [key, ""])));
      setFeaturedImage(null);
      setPhotos([]);
      setLoadingJob(false);
      return;
    }
    if (!/^[a-f\d]{24}$/i.test(id || "")) {
      setJobError("Invalid or missing job ID.");
      setLoadingJob(false);
      return;
    }
    let active = true;
    const controller = new AbortController();
    setLoadingJob(true);

    const fetchJob = async () => {
      try {

        const { data } = await axios.get(
          `${API_BASE_URL}/api/jobs/${id}`,
          {
            signal: controller.signal,
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`
            }
          }
        );

        if (!active) return;
        const job = data.job;
        if (!job?._id || job._id.toLowerCase() !== id.toLowerCase()) {
          setJobError("Job not found.");
          return;
        }

        setEditingJobId(job._id);
        setSavedDeadline(jobDateKey(job.deadlineDate));

        // map DB structure → your form structure
        setFormData({
          jobTitle: job.jobTitle || "",
          jobDescription: job.jobDescription || "",
          category: job.category || "",
          jobCategory: job.jobCategory || "",
          jobApplyType: job.jobApplyType || "",
          salaryType: job.salary?.type || "",
          minSalary: job.salary?.min ?? "",
          maxSalary: job.salary?.max ?? "",
          experience: job.experience || "",
          careerLevel: job.careerLevel || "",
          qualification: job.qualification || "",
          deadlineDate: jobDateKey(job.deadlineDate),
          address: job.address || "",
          location: job.location || "",
        });

        setFeaturedImage(job.featuredImage?.url
          ? { preview: profileImageUrl(job.featuredImage.url) } : null);
        setPhotos((job.gallery || []).map((item, index) => ({
          key: `saved-${item._id || index}`,
          id: item._id,
          preview: profileImageUrl(item.url),
          type: item.type,
        })));
      } catch (error) {
        if (!active) return;
        const status = error.response?.status;
        setJobError(status === 401 ? "Your session expired. Please sign in again."
          : status === 403 ? "You are not authorized to edit this job."
          : status === 404 ? "Job not found."
          : "Unable to load this job. Please try again.");
      } finally {
        if (active) setLoadingJob(false);
      }
    };

    fetchJob();
    return () => { active = false; controller.abort(); };
  }, [id, isEditing]);

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
    e.target.value = ""; // Allow another selection, including the same file.
    if (!files.length) return;
    if (files.some(file => !/\.(png|jpe?g|mp4)$/i.test(file.name))) {
      toast({ title: "Unsupported gallery file", description: "Choose PNG, JPG, JPEG or MP4 files.", variant: "destructive" });
      return;
    }
    if (photos.filter(photo => photo.file).length + files.length > 10) {
      toast({ title: "Too many new files", description: "Upload up to 10 new gallery files per save.", variant: "destructive" });
      return;
    }
    const additions = files.map(file => ({
      key: `new-${nextPhotoKey.current++}`,
      file,
      type: file.type.startsWith("video/") || /\.mp4$/i.test(file.name) ? "video" : "image",
    }));
    setPhotos(prev => [...prev, ...additions]);
  };



  const removePhoto = (index) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const reportSalaryErrors = (errors) => {
    setSalaryErrors(errors);
    requestAnimationFrame(() => {
      const field = errors.minSalary ? "minSalary" : "maxSalary";
      document.getElementById(`job-${field}`)?.focus();
    });
    toast({ title: "Check salary", description: Object.values(errors)[0], variant: "destructive" });
  };

  const reportDeadlineError = (message) => {
    setDeadlineMessage(message);
    requestAnimationFrame(() => document.getElementById("job-deadlineDate")?.focus());
    toast({ title: "Check deadline", description: message, variant: "destructive" });
  };

  const handleSubmit = async () => {
    if (saving || loadingJob || jobError || (isEditing && !editingJobId)) return;

    if (!formData.jobTitle.trim()) {
      toast({
        title: "Error",
        description: "Job Title is required",
        variant: "destructive",
      });
      return;
    }

    if (!editorPlainText(formData.jobDescription).trim()) {
      toast({ title: "Error", description: "Job Description is required", variant: "destructive" });
      return;
    }

    const errors = validateJobSalary(formData);
    if (Object.keys(errors).length) { reportSalaryErrors(errors); return; }
    setSalaryErrors({});

    const message = deadlineError(formData.deadlineDate, savedDeadline);
    if (message) { reportDeadlineError(message); return; }
    setDeadlineMessage("");

    const form = new FormData();

    Object.keys(formData).forEach(key => {
      form.append(key, formData[key]);
    });

    if(featuredImage instanceof File){
      form.append("featuredImage", featuredImage);
    }

    // An explicit empty list means remove all; omission never clears saved media.
    form.append("retainedGalleryIds", JSON.stringify(photos.filter(photo => !photo.file).map(photo => photo.id)));
    photos.forEach(photo => {
      if (photo.file instanceof File) form.append("photos", photo.file);
    });

    try {

      setSaving(true);

      const url = isEditing
        ? `${API_BASE_URL}/api/jobs/update/${editingJobId}`
        : `${API_BASE_URL}/api/jobs/create`;

      const token = localStorage.getItem("token");

      await axios({
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

      const errors = err.response?.data?.errors;
      if (errors?.deadlineDate) reportDeadlineError(errors.deadlineDate);
      else if (errors && (errors.minSalary || errors.maxSalary)) reportSalaryErrors(errors);
      else toast({
        title: "Error",
        description: err.response?.data?.code === "JOB_POST_LIMIT_REACHED"
          ? "You’ve reached the Free plan limit of 10 jobs. Upgrade to a paid plan to post more jobs."
          : err.response?.status === 401 ? "Your session expired. Please sign in again."
          : err.response?.status === 403 ? "You are not authorized to save this job."
          : err.response?.status === 404 ? "Job not found. Return to My Jobs and try again."
          : err.response?.status === 400 ? "Please check the job details and try again."
          : "Unable to save this job. Please try again.",
        variant: "destructive",
      });

    }

    setSaving(false);
  };

  if (loadingJob || jobError) {
    return (
      <div className="min-h-screen bg-[#0E0E10] p-4 md:p-8 text-white">
        <h1 className="text-2xl font-semibold mb-4">{isEditing ? "Edit Job" : "Submit Job"}</h1>
        <p role={jobError ? "alert" : "status"}>{jobError || "Loading job…"}</p>
        <button onClick={() => navigate("/dashboard/my-job")}
          className="mt-4 min-h-[44px] px-4 border border-blue-500 rounded-lg focus-visible:outline focus-visible:outline-2">
          Back to My Jobs
        </button>
      </div>
    );
  }

  return <JobForm {...{ isEditing, formData, setFormData, featuredImage, featuredImageRef, photos, photosRef,
    handleFeaturedImage, handlePhotosUpload, removePhoto, setFeaturedImage, handleInputChange,
    salaryErrors, deadlineMessage, savedDeadline, saving }} onCancel={() => navigate("/dashboard/my-job")} onSubmit={handleSubmit} />;
};

export default SubmitJob;
