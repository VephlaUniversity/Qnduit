const STORAGE_KEY = "qnduit_support_tickets";
const CHANGE_EVENT = "qnduit:tickets-changed";

export const TICKET_CATEGORIES = [
  "Login Problem",
  "Account Issues",
  "Billing Issue",
  "General Inquiry",
  "Profile",
  "Verification",
  "Applications",
  "Other",
];

const SEED_TICKETS = [
  {
    id: 1,
    userType: "talent",
    name: "James Edward",
    email: "edwardj207@gmail.com",
    subject: "Login Problem",
    date: "12 Apr 2025",
    status: "Open",
    message:
      "Hello,\n\nI've been trying to log into my account since this morning but keep getting an invalid credentials error, even after resetting my password twice.\n\nCould you please look into this for me?\n\nThanks in advance for your assistance.",
  },
  {
    id: 2,
    userType: "talent",
    name: "Adam Scott",
    email: "adamscott@gmail.com",
    subject: "Account Issues",
    date: "10 Apr 2025",
    status: "In Progress",
    message:
      "Hi there,\n\nMy profile keeps showing an outdated job title even after I've updated it several times. Can someone check what's going on?\n\nThanks.",
  },
  {
    id: 3,
    userType: "talent",
    name: "John Doe",
    email: "johndoe@gmail.com",
    subject: "Billing Issue",
    fullSubject: "Billing Issue - Premium Not Activated",
    date: "7 Apr 2025",
    status: "Resolved",
    message:
      "Hello,\nI hope you're doing well. I made a payment for the premium subscription yesterday, and the transaction was completed successfully. However, I still appear to be on the free plan.\nI was looking forward to accessing the premium features right away, so I'd really appreciate it if you could look into this and help get it sorted.\nPlease let me know if you need a payment confirmation from my end.\n\nThanks in advance for your assistance.",
  },
  {
    id: 4,
    userType: "talent",
    name: "James Edward",
    email: "edwardj207@gmail.com",
    subject: "General Inquiry",
    date: "25 Mar 2025",
    status: "Resolved",
    message: "Hi, just wanted to ask about the difference between plan tiers.",
  },
  {
    id: 5,
    userType: "talent",
    name: "James Edward",
    email: "edwardj207@gmail.com",
    subject: "General Inquiry",
    date: "25 Mar 2025",
    status: "In Progress",
    message: "Following up on my previous question about plan tiers.",
  },
  {
    id: 6,
    userType: "employer",
    name: "PerimeterX",
    email: "perimeterx@gmail.com",
    subject: "Profile",
    date: "19 Mar 2025",
    status: "Closed",
    message: "Requesting help updating our company profile logo.",
  },
  {
    id: 7,
    userType: "employer",
    name: "PerimeterX",
    email: "perimeterx@gmail.com",
    subject: "Profile",
    date: "19 Mar 2025",
    status: "In Progress",
    message: "Our company address on the profile page is outdated.",
  },
  {
    id: 8,
    userType: "employer",
    name: "PerimeterX",
    email: "perimeterx@gmail.com",
    subject: "Profile",
    date: "19 Mar 2025",
    status: "In Progress",
    message: "Following up on the profile address update request.",
  },
  {
    id: 9,
    userType: "talent",
    name: "Natasha Cobbs",
    email: "ntashcbs207@gmail.com",
    subject: "General Inquiry",
    date: "12 Mar 2025",
    status: "Open",
    message: "How do I change my notification preferences?",
  },
  {
    id: 10,
    userType: "employer",
    name: "Cybrary",
    email: "cybrary@gmail.com",
    subject: "Verification",
    date: "7 Mar 2025",
    status: "Resolved",
    message: "Requesting verification badge for our employer account.",
  },
  {
    id: 11,
    userType: "employer",
    name: "Cybrary",
    email: "cybrary@gmail.com",
    subject: "Verification",
    date: "7 Mar 2025",
    status: "Resolved",
    message: "Follow-up on verification document upload.",
  },
  {
    id: 12,
    userType: "employer",
    name: "Cybrary",
    email: "cybrary@gmail.com",
    subject: "Verification",
    date: "7 Mar 2025",
    status: "Resolved",
    message: "Confirming verification badge is now visible.",
  },
  {
    id: 13,
    userType: "employer",
    name: "Skale",
    email: "Skale@gmail.com",
    subject: "Applications",
    date: "12 Feb 2025",
    status: "Closed",
    message: "Why are our job applications not showing candidate resumes?",
  },
];

const read = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // First run: seed quietly. No change event here, since read() can be
      // called during a render and must not trigger other components' setState.
      persist(SEED_TICKETS);
      return SEED_TICKETS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : SEED_TICKETS;
  } catch {
    return SEED_TICKETS;
  }
};

const persist = (tickets) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
  } catch (error) {
    console.error("Could not save support tickets:", error);
  }
};

const write = (tickets) => {
  persist(tickets);
  window.dispatchEvent(new Event(CHANGE_EVENT));
};

const formatDate = (date) =>
  date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export const getTickets = () => read();

// Tickets submitted by one account, newest first. Matches on email.
export const getTicketsForEmail = (email) => {
  const target = (email || "").trim().toLowerCase();
  if (!target) return [];
  return read().filter((t) => (t.email || "").toLowerCase() === target);
};

export const addTicket = ({
  name,
  email,
  userType,
  category,
  title,
  message,
}) => {
  const now = new Date();
  const cleanTitle = (title || "").trim();
  const ticket = {
    id: now.getTime(),
    userType,
    name,
    email,
    subject: category,
    fullSubject: cleanTitle ? `${category} - ${cleanTitle}` : undefined,
    date: formatDate(now),
    createdAt: now.toISOString(),
    status: "Open",
    message: message.trim(),
  };
  // Newest first so it lands at the top of the admin list.
  write([ticket, ...read()]);
  return ticket;
};

export const updateTicketStatus = (id, status) => {
  write(read().map((t) => (t.id === id ? { ...t, status } : t)));
};

export const deleteTicket = (id) => {
  write(read().filter((t) => t.id !== id));
};

// Fires on changes made in this tab and (via the storage event) other tabs.
export const subscribeTickets = (callback) => {
  const onStorage = (e) => {
    if (e.key === STORAGE_KEY) callback();
  };
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", onStorage);
  };
};
