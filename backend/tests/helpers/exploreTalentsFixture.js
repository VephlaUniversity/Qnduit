import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import Talent from "../../src/models/Talent.js";
import Employer from "../../src/models/Employer.js";
import Resume from "../../src/models/Resume.js";

export const explorePassword = "ExploreLocal500B!";
export const exploreId = n => new mongoose.Types.ObjectId(n.toString(16).padStart(24, "0"));
const indexHasResume = index => index !== 9 && index < 14;
export async function seedExploreTalents() {
  if (mongoose.connection.host !== "127.0.0.1" || !/^qnduit_en500b_/.test(mongoose.connection.name || "")) {
    throw Error("Explore fixtures require a dedicated loopback synthetic database.");
  }
  const password = await bcrypt.hash(explorePassword, 4);
  await Employer.collection.insertMany([1, 2].map(n => ({ _id: exploreId(500 + n), firstName: "Employer", lastName: String(n),
    companyName: `Synthetic Employer ${n}`, email: `employer${n}@en500b.example.invalid`, password,
    isVerified: true, accountStatus: "active", savedCandidates: [] })));
  const rows = [
    { firstName: "Ada", lastName: "Okafor", jobTitle: "Product Designer", categories: ["Design", "Technology", "R&D [Labs]"], tags: [" UX Research ", "C++", "Design, Research"], age: "29" },
    { fullName: "Maya Chen", jobTitle: "Product Designer", location: "Canada", experienceTime: "3-5 Years", qualification: "Master Degree", categories: [" Design ", "Research"], tags: ["figma"], age: "70" },
    { fullName: "Tunde Bello", jobTitle: "Frontend Engineer", categories: ["Technology"], age: "" },
    ...Array.from({ length: 12 }, (_, i) => ({ fullName: `Sample Talent ${i + 1}`, jobTitle: "Researcher", tags: i < 7 ? ["Research"] : [], ...(i === 10 ? { categories: [] } : i === 11 ? { categories: null } : {}) })),
    { fullName: "Hidden Talent", showProfile: "hidden", tags: ["UX Research", "Research"], categories: ["Design", "Research"] },
    { fullName: "Suspended Talent", accountStatus: "suspended", tags: ["UX Research", "Research"], categories: ["Design", "Research"] },
    { fullName: "Unverified Talent", isVerified: false, tags: ["UX Research", "Research"], categories: ["Design", "Research"] },
  ];
  for (const [i, row] of rows.entries()) {
    const talent = { _id: exploreId(i + 1), firstName: "", lastName: "", location: "Nigeria", jobTitle: "Designer",
      email: `talent${i + 1}@en500b.example.invalid`, password, isVerified: true, accountStatus: "active", showProfile: "show",
      selectedPlan: "free", categories: ["Research"], experienceTime: "1-3 Years", qualification: "Bachelor Degree",
      offeredSalary: "2500", salaryType: "Monthly", createdAt: new Date(1700000000000 + i * 1000),
      aboutMe: "Synthetic Talent profile for isolated Explore testing.", ...row };
    await Talent.collection.insertOne(talent);
    // Include missing/empty sources and duplicate Resume matches without changing browse counts.
    if (indexHasResume(i)) {
      const titles = i === 0 ? [" Figma ", "UX Research"] : i === 1 ? ["ux research"] : i === 2 ? [" C++ ", " React "] : [];
      await Resume.collection.insertOne({ talent: talent._id, skills: titles.map(title => ({ title, percent: "80" })), cvFiles: [{ url: "PRIVATE-CV" }] });
      if (i === 0) await Resume.collection.insertOne({ talent: talent._id, skills: [{ title: "Figma", percent: "80" }] });
    }
  }
}
