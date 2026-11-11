import { resolveSubscriptionStatus } from "./subscriptionStatus.js";

const count = rows => {
  if (rows === undefined) return 0;
  if (!Array.isArray(rows))
    throw Object.assign(
      new Error("Stored portfolio data needs review. No changes were saved."),
      { statusCode: 409 },
    );
  return rows.length;
};

// Call before uploads and again inside the save transaction. Count identities,
// not image URLs: distinct projects may legitimately share an asset.
export async function enforcePortfolioLimit({
  owner, talent, resume, talentProjects, resumeProjects, session = null,
}) {
  const currentCount = count(talent?.portfolio) + count(resume?.portfolioImages);
  const projectCount = count(talentProjects) + count(resumeProjects);
  const status = await resolveSubscriptionStatus({
    accountId: owner, role: "talent", session,
  });
  const limit = status.eligibility.talentPublicProfile ? 20 : 4;
  // Grandfather existing rows without allowing the excess to grow.
  if (projectCount > Math.max(currentCount, limit)) {
    throw Object.assign(
      new Error(`Your portfolio allowance is ${limit} projects. Remove projects before adding more; existing projects can be edited or replaced without increasing their count.`),
      {
        statusCode: 403,
        code: "PORTFOLIO_PROJECT_LIMIT",
        limit, currentCount, projectCount,
      },
    );
  }
}
