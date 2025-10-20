import { z } from "zod";

export const talentProfileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, { message: "Name must be at least 2 characters" })
    .max(100, { message: "Name must be less than 100 characters" }),

  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: "Invalid date format (YYYY-MM-DD)",
  }),

  phone: z
    .string()
    .trim()
    .min(10, { message: "Phone number must be at least 10 digits" })
    .max(20, { message: "Phone number is too long" }),

  email: z
    .string()
    .trim()
    .email({ message: "Invalid email address" })
    .max(255, { message: "Email is too long" }),

  gender: z.enum(["Male", "Female", "Other"], {
    message: "Please select a gender",
  }),

  age: z.string().nonempty({ message: "Please select an age range" }),

  offeredSalary: z
    .string()
    .trim()
    .regex(/^\d+$/, { message: "Salary must be a valid number" }),

  salaryType: z.enum(["Month", "Year", "Hour"], {
    message: "Please select a salary type",
  }),

  experienceTime: z
    .string()
    .nonempty({ message: "Please select experience time" }),

  qualification: z
    .string()
    .nonempty({ message: "Please select a qualification" }),

  location: z
    .string()
    .trim()
    .min(2, { message: "Location must be at least 2 characters" })
    .max(100, { message: "Location is too long" }),

  language: z.string().nonempty({ message: "Please select a language" }),

  jobTitle: z
    .string()
    .trim()
    .min(2, { message: "Job title must be at least 2 characters" })
    .max(100, { message: "Job title is too long" }),

  categories: z
    .string()
    .trim()
    .min(2, { message: "Category must be at least 2 characters" })
    .max(50, { message: "Category is too long" }),

  showProfile: z.enum(["show", "hidden"]),

  aboutMe: z
    .string()
    .trim()
    .min(50, { message: "About me must be at least 50 characters" })
    .max(2000, { message: "About me must be less than 2000 characters" }),

  facebook: z
    .string()
    .url({ message: "Invalid Facebook URL" })
    .or(z.literal(""))
    .optional(),

  twitter: z
    .string()
    .url({ message: "Invalid Twitter URL" })
    .or(z.literal(""))
    .optional(),

  instagram: z
    .string()
    .url({ message: "Invalid Instagram URL" })
    .or(z.literal(""))
    .optional(),

  linkedin: z
    .string()
    .url({ message: "Invalid LinkedIn URL" })
    .or(z.literal(""))
    .optional(),

  pinterest: z
    .string()
    .url({ message: "Invalid Pinterest URL" })
    .or(z.literal(""))
    .optional(),

  youtube: z
    .string()
    .url({ message: "Invalid YouTube URL" })
    .or(z.literal(""))
    .optional(),

  address: z
    .string()
    .trim()
    .min(5, { message: "Address must be at least 5 characters" })
    .max(200, { message: "Address is too long" }),

  mapLocation: z
    .string()
    .trim()
    .min(5, { message: "Map location must be at least 5 characters" })
    .max(200, { message: "Map location is too long" }),

  latitude: z
    .string()
    .regex(/^-?\d+(\.\d+)?$/, { message: "Invalid latitude" }),

  longitude: z
    .string()
    .regex(/^-?\d+(\.\d+)?$/, { message: "Invalid longitude" }),

  introVideo: z
    .string()
    .url({ message: "Invalid video URL" })
    .or(z.literal(""))
    .optional(),
});

export const educationSchema = z.object({
  academy: z
    .string()
    .trim()
    .min(2, { message: "Academy name must be at least 2 characters" })
    .max(100, { message: "Academy name is too long" }),

  title: z
    .string()
    .trim()
    .min(2, { message: "Title must be at least 2 characters" })
    .max(100, { message: "Title is too long" }),

  startDate: z.string().regex(/^\d{4}$/, { message: "Invalid year format" }),

  endDate: z.string().regex(/^\d{4}$/, { message: "Invalid year format" }),

  description: z
    .string()
    .trim()
    .min(10, { message: "Description must be at least 10 characters" })
    .max(500, { message: "Description is too long" }),
});

export const experienceSchema = z.object({
  company: z
    .string()
    .trim()
    .min(2, { message: "Company name must be at least 2 characters" })
    .max(100, { message: "Company name is too long" }),

  title: z
    .string()
    .trim()
    .min(2, { message: "Title must be at least 2 characters" })
    .max(100, { message: "Title is too long" }),

  startDate: z.string().regex(/^\d{4}$/, { message: "Invalid year format" }),

  endDate: z.string().regex(/^\d{4}$/, { message: "Invalid year format" }),

  description: z
    .string()
    .trim()
    .min(10, { message: "Description must be at least 10 characters" })
    .max(500, { message: "Description is too long" }),
});

export const skillSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, { message: "Skill title must be at least 2 characters" })
    .max(50, { message: "Skill title is too long" }),

  percent: z
    .string()
    .regex(/^\d+$/, { message: "Percent must be a number" })
    .refine((val) => parseInt(val) >= 0 && parseInt(val) <= 100, {
      message: "Percent must be between 0 and 100",
    }),
});

export const validateFormData = (schema, data) => {
  try {
    schema.parse(data);
    return { success: true, errors: {} };
  } catch (error) {
    const errors = {};
    error.errors.forEach((err) => {
      errors[err.path[0]] = err.message;
    });
    return { success: false, errors };
  }
};

export const validateFile = (file, options = {}) => {
  const {
    maxSize = 5 * 1024 * 1024,
    allowedTypes = ["image/jpeg", "image/png", "application/pdf"],
  } = options;

  if (!file) {
    return { valid: false, error: "No file selected" };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds ${maxSize / (1024 * 1024)}MB limit`,
    };
  }

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type not allowed. Allowed types: ${allowedTypes.join(", ")}`,
    };
  }

  return { valid: true };
};
