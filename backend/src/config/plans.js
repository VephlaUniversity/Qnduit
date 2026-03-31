export const PLANS = {
  bronze: {
    price: 699, // kobo (₦6.99 equivalent)
    durationDays: 30,
    limits: {
      jobPosts: 3,
      savedCandidates: 10,
    },
  },
  silver: {
    price: 899,
    durationDays: 30,
    limits: {
      jobPosts: 10,
      savedCandidates: 50,
    },
  },
  platinum: {
    price: 1299,
    durationDays: 30,
    limits: {
      jobPosts: Infinity,
      savedCandidates: Infinity,
    },
  },
};