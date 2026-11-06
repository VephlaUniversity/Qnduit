import { talentFields } from "./talentLocation.js";

// Owner-only profile/dashboard record. Authentication secrets and future schema
// additions must never appear merely because they were loaded from MongoDB.
export const OWNER_TALENT_FIELDS = "_id email firstName lastName fullName dateOfBirth phone gender age jobTitle qualification experienceTime language location city country address aboutMe showProfile offeredSalary salaryType categories tags socialNetworks avatar introVideo resume geoLocation profileCompleted profileUpdatedAt selectedPlan paymentStatus username publicProfileEnabled portfolioUrl experience portfolio isVerified accountStatus verificationBadgeOverride createdAt updatedAt";
export const ownerTalentProfile = record => talentFields(record, OWNER_TALENT_FIELDS);
