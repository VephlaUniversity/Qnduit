// Decides where a "choose this plan" click on the public pricing pages should go based on who is looking: a visitor, a signed-in employer, or a signed-in talent.

export const PLAN_AUDIENCE = {
  free: "talent",
  public: "talent",
  bronze: "employer",
  silver: "employer",
  platinum: "employer",
};

export const readSession = () => {
  try {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (token && user?.userType)
      return { signedIn: true, userType: user.userType };
  } catch {
    /* ignore unreadable storage */
  }
  return { signedIn: false, userType: null };
};

// Returns { to } for a navigation, or { message } when the click can't proceed.
export const routeForPlan = (planType, session = readSession()) => {
  const audience = PLAN_AUDIENCE[planType];
  if (!audience) return { message: "Please choose a plan." };

  if (!session.signedIn) {
    return { to: `/${audience}-signup?plan=${encodeURIComponent(planType)}` };
  }

  if (session.userType !== audience) {
    return {
      message:
        audience === "employer"
          ? "This plan is for employer accounts. Sign in with an employer account to choose it."
          : "This plan is for talent accounts. Sign in with a talent account to choose it.",
    };
  }

  if (audience === "employer") return { to: "/dashboard/packages" };
  if (planType === "free") return { to: "/talent-dashboard" };
  return { to: "/talent-dashboard/packages" };
};

// Plan from the URL (?plan=...) if it is a real one, otherwise "".
export const planFromUrl = (
  search = typeof window !== "undefined" ? window.location.search : "",
) => {
  const plan = new URLSearchParams(search).get("plan") || "";
  return Object.hasOwn(PLAN_AUDIENCE, plan) ? plan : "";
};
