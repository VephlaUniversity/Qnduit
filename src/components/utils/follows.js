// Follows are kept per talent (keyed by email) in localStorage so the
// Following and Discover tabs stay in sync and survive a refresh. The employer
// directory below is mock data

const STORAGE_PREFIX = "qnduit_follows:";
const CHANGE_EVENT = "qnduit:follows-changed";

// How long an unfollowed employer stays in the Following tab (so an accidental
// unfollow can be undone) before it moves back to Discover.

export const UNFOLLOW_GRACE_MS = 30 * 60 * 1000;

export const EMPLOYER_DIRECTORY = [
  {
    id: 1,
    name: "Samsung",
    rating: 5,
    location: "Las Vegas, NV 89107, USA",
    category: "Design & Creative",
    openings: 5,
    verified: true,
  },
  {
    id: 2,
    name: "Movistar",
    rating: 4,
    location: "Las Vegas, NV 89107, USA",
    category: "Advertising",
    openings: 4,
    verified: false,
  },
  {
    id: 3,
    name: "Tech Corp",
    rating: 5,
    location: "Las Vegas, NV 89107, USA",
    category: "IT & development",
    openings: 5,
    verified: true,
  },
  {
    id: 4,
    name: "Momba Jai",
    rating: 5,
    location: "Las Vegas, NV 89107, USA",
    category: "Delivery Driver",
    openings: 2,
    verified: true,
  },
  {
    id: 5,
    name: "Sarang Hedo",
    rating: 5,
    location: "Las Vegas, NV 89107, USA",
    category: "Sales & Marketing",
    openings: 0,
    verified: false,
  },
  {
    id: 6,
    name: "Avitex Agency",
    rating: 5,
    location: "Las Vegas, NV 89107, USA",
    category: "Engineering",
    openings: 5,
    verified: true,
  },
  {
    id: 7,
    name: "Cybrary",
    rating: 5,
    location: "College Park, MD, USA",
    category: "Cybersecurity",
    openings: 7,
    verified: true,
  },
  {
    id: 8,
    name: "PerimeterX",
    rating: 4,
    location: "San Mateo, CA, USA",
    category: "Cybersecurity",
    openings: 3,
    verified: true,
  },
  {
    id: 9,
    name: "Azure Skies",
    rating: 4,
    location: "Seattle, WA, USA",
    category: "Cloud",
    openings: 6,
    verified: true,
  },
  {
    id: 10,
    name: "Skale",
    rating: 4,
    location: "Lagos, Nigeria",
    category: "IT & development",
    openings: 4,
    verified: false,
  },
  {
    id: 11,
    name: "Northwind Labs",
    rating: 5,
    location: "Berlin, Germany",
    category: "Engineering",
    openings: 2,
    verified: true,
  },
  {
    id: 12,
    name: "Brightpath Health",
    rating: 3,
    location: "Toronto, Canada",
    category: "Healthcare",
    openings: 8,
    verified: false,
  },
  {
    id: 13,
    name: "Kora Finance",
    rating: 4,
    location: "Accra, Ghana",
    category: "Finance",
    openings: 1,
    verified: true,
  },
  {
    id: 14,
    name: "Greenfield Energy",
    rating: 3,
    location: "London, UK",
    category: "Energy",
    openings: 0,
    verified: false,
  },
];

// Employers every talent starts out following (what the page showed before
// there was a way to discover more).
const DEFAULT_FOLLOWED_IDS = [1, 2, 3, 4, 5, 6];

const keyFor = (email) =>
  `${STORAGE_PREFIX}${(email || "guest").toLowerCase()}`;

const persist = (email, entries) => {
  try {
    localStorage.setItem(keyFor(email), JSON.stringify(entries));
  } catch (error) {
    console.error("Could not save follows:", error);
  }
};

const write = (email, entries) => {
  persist(email, entries);
  window.dispatchEvent(new Event(CHANGE_EVENT));
};

// entry: { id, followedAt, unfollowedAt | null }
export const getFollows = (email) => {
  try {
    const raw = localStorage.getItem(keyFor(email));
    if (!raw) {
      const seeded = DEFAULT_FOLLOWED_IDS.map((id) => ({
        id,
        followedAt: Date.now(),
        unfollowedAt: null,
      }));
      // Seed quietly: this can run during a render, so no change event.
      persist(email, seeded);
      return seeded;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

// Still shown in the Following tab? (followed, or unfollowed within the grace window)
export const isInFollowingTab = (entry, now = Date.now()) =>
  !!entry &&
  (entry.unfollowedAt == null || now - entry.unfollowedAt < UNFOLLOW_GRACE_MS);

// `employer` is a snapshot ({ name, location, category }) for real employers
// that aren't in EMPLOYER_DIRECTORY, e.g. followed from a job's details page,
// so the Following tab can still show them.
export const followEmployer = (email, id, employer) => {
  const rest = getFollows(email).filter((e) => e.id !== id);
  const entry = { id, followedAt: Date.now(), unfollowedAt: null };
  if (employer) entry.employer = employer;
  write(email, [...rest, entry]);
};

export const isFollowing = (entries, id) =>
  entries.some((e) => e.id === id && e.unfollowedAt == null);

export const unfollowEmployer = (email, id) => {
  write(
    email,
    getFollows(email).map((e) =>
      e.id === id && e.unfollowedAt == null
        ? { ...e, unfollowedAt: Date.now() }
        : e,
    ),
  );
};

export const subscribeFollows = (callback) => {
  const onStorage = (e) => {
    if (e.key && e.key.startsWith(STORAGE_PREFIX)) callback();
  };
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", onStorage);
  };
};
