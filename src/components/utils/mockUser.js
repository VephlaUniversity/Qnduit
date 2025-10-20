// Mock user data for testing

// Employer credentials and data
export const MOCK_EMPLOYER_CREDENTIALS = {
  email: "employer@gmail.com",
  password: "password123",
};

export const MOCK_EMPLOYER_DATA = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  email: "employer@gmail.com",
  name: "Peter Abraham",
  phone: "+1 234 567 8900",
  address: "123 Main Street, New York, NY 10001",
  lat: "40.75054385989452",
  lng: "-73.99599761719189",
  avatar: null,
  userType: "employer",
  createdAt: "2024-01-15T10:30:00Z",

  company: "Tech Corp",
  website: "https://techcorp.com",
  teamSize: "50-100",
  founded: "2015",

  // Notifications
  notifications: [
    {
      id: 1,
      title: "New Application",
      message: "Sarah Johnson applied for Senior Developer position",
      time: "2 hours ago",
      read: false,
      type: "application",
    },
    {
      id: 2,
      title: "Interview Scheduled",
      message: "Meeting scheduled with Michael Chen for tomorrow",
      time: "5 hours ago",
      read: false,
      type: "meeting",
    },
    {
      id: 3,
      title: "Profile View",
      message: "Your job post has been viewed 45 times",
      time: "1 day ago",
      read: true,
      type: "info",
    },
  ],

  // Messages
  messages: [
    {
      id: 1,
      name: "Sarah Johnson",
      lastMessage: "Thank you for the opportunity!",
      time: "10:30 AM",
      unread: 2,
      online: true,
      avatar: null,
    },
    {
      id: 2,
      name: "Michael Chen",
      lastMessage: "Looking forward to our meeting",
      time: "Yesterday",
      unread: 0,
      online: false,
      avatar: null,
    },
  ],

  // Package/Plan info
  currentPackage: {
    name: "Professional",
    price: 99,
    expiry: "2025-12-31",
    jobPosts: 20,
    featuredJobs: 5,
    cvViews: "Unlimited",
  },
};

// Talent credentials and data
export const MOCK_TALENT_CREDENTIALS = {
  email: "talent@gmail.com",
  password: "password123",
};

export const MOCK_TALENT_DATA = {
  id: "660e8400-e29b-41d4-a716-446655440111",
  email: "talent@gmail.com",
  name: "Jane Smith",
  phone: "+1 234 567 8901",
  address: "456 Tech Avenue, San Francisco, CA 94102",
  lat: "37.7749",
  lng: "-122.4194",
  avatar: null,
  userType: "talent",
  createdAt: "2024-02-20T14:30:00Z",

  jobTitle: "UI UX Designer",
  experience: "5 Years",
  qualification: "Master Degree",
  offeredSalary: "2000",
  salaryType: "Month",

  // Notifications
  notifications: [
    {
      id: 1,
      title: "Job Match",
      message: "New UI Designer position matches your profile",
      time: "1 hour ago",
      read: false,
      type: "job",
    },
    {
      id: 2,
      title: "Application Update",
      message: "Your application for Senior Designer was viewed",
      time: "3 hours ago",
      read: false,
      type: "application",
    },
  ],

  // Messages
  messages: [
    {
      id: 1,
      name: "Tech Corp",
      lastMessage: "We'd like to schedule an interview",
      time: "9:15 AM",
      unread: 1,
      online: true,
      avatar: null,
    },
  ],
};

export const MOCK_USER_CREDENTIALS = MOCK_EMPLOYER_CREDENTIALS;
export const MOCK_USER_DATA = MOCK_EMPLOYER_DATA;
