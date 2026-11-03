import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import Talent from "../../src/models/Talent.js";
import Employer from "../../src/models/Employer.js";
import Admin from "../../src/models/Admin.js";
import SupportTicket from "../../src/models/SupportTicket.js";

export const supportPassword = "Support-local-only!";
export const supportId = n => new mongoose.Types.ObjectId(n.toString(16).padStart(24, "0"));
export async function seedSupportHistory() {
  if (mongoose.connection.host !== "127.0.0.1" || !/^qnduit_en499b_support_/.test(mongoose.connection.name || "")) throw Error("Support fixtures require an isolated loopback database.");
  const password = await bcrypt.hash(supportPassword, 10);
  const accounts = {
    talent: { _id: supportId(100), email: "talent.support@example.test", firstName: "Ada", lastName: "Support", fullName: "Ada Support", password, isVerified: true, accountStatus: "active" },
    employer: { _id: supportId(101), email: "employer.support@example.test", companyName: "Synthetic Employer", password, isVerified: true, accountStatus: "active" },
    suspended: { _id: supportId(102), email: "suspended.support@example.test", fullName: "Suspended Owner", password, isVerified: true, accountStatus: "suspended" },
    admin: { _id: supportId(103), email: "admin.support@example.test", name: "Synthetic Admin", password, isActive: true, role: "admin" },
  };
  await Talent.collection.insertMany([accounts.talent, accounts.suspended]);
  await Employer.collection.insertOne(accounts.employer); await Admin.collection.insertOne(accounts.admin);
  const originalAt = new Date("2026-11-03T08:00:00Z");
  const reply = (n, role, message, minute) => ({ _id: supportId(n), message, createdAt: new Date(`2026-11-03T08:${minute}:00Z`),
    ...(role === "admin" ? { adminId: accounts.admin._id, adminName: accounts.admin.name } : { authorId: accounts.talent._id, authorRole: "talent", authorName: "Ada Support" }) });
  const history = [reply(202, "talent", "User follow-up two.", "02"), reply(201, "admin", "Legacy Admin response one.", "01"), reply(203, "admin", "Admin response three.", "03"), reply(204, "talent", "User follow-up four.", "04")];
  const ticket = (n, owner, extra = {}) => ({ _id: supportId(n), ownerId: owner._id, userType: owner === accounts.employer ? "employer" : "talent", name: owner.fullName || owner.companyName,
    email: owner.email, category: "Technical Support", title: `Synthetic ticket ${n}`, message: "Original message is preserved exactly.", status: "In Progress", createdAt: originalAt, updatedAt: originalAt, replies: [], ...extra });
  const current = ticket(300, accounts.talent, { title: "Current conversation", replies: history });
  const legacy = ticket(301, accounts.talent, { title: "Legacy ownerless conversation", replies: [...history, { _id: supportId(205), adminId: accounts.admin._id, adminName: "Legacy Admin", message: "Legacy reply without a stored timestamp." }] });
  delete legacy.ownerId; // Same email must not grant ownership.
  await SupportTicket.collection.insertMany([current, legacy,
    ticket(302, accounts.employer, { title: "Employer conversation", replies: history.map(row => row.authorRole ? { ...row, authorRole: "employer", authorId: accounts.employer._id, authorName: "Synthetic Employer" } : row) }),
    ticket(303, accounts.suspended, { title: "Suspended owner conversation", replies: history.map(row => row.authorRole ? { ...row, authorId: accounts.suspended._id, authorName: "Suspended Owner" } : row) }),
    ...Array.from({ length: 12 }, (_, i) => ticket(310 + i, accounts.talent, { title: `Pagination ticket ${i + 1}`, createdAt: new Date(originalAt.getTime() - (i + 1) * 60000) })),
  ]);
  return accounts;
}
