const mongoose = require("mongoose");
const Attraction = require("../src/models/Attraction");
const User = require("../src/models/User");

const MONGO_URI =
  "mongodb+srv://hellonaman:hellonmn7665@careconnect.z90we.mongodb.net/tourShip?retryWrites=true&w=majority&appName=CareConnect";

async function seedJaipurAttractions() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("MongoDB connected");

    const admin = await User.findOne({ role: "admin" });
    if (!admin) {
      throw new Error("Admin user not found. Create admin first.");
    }

    // 🔥 READ ENUMS DIRECTLY FROM SCHEMA (NO GUESSING)
    const CATEGORY = Attraction.schema.path("category").enumValues[0];
    const DISTRICT = Attraction.schema.path("location.district").enumValues[0];
    const DAY = Attraction.schema.path("openingHours.0.day").enumValues[0];
    const FEE_CATEGORY = Attraction.schema.path("entryFees.0.category").enumValues[0];

    const jaipurAttractions = [
      // ================= ALBERT HALL MUSEUM =================
{
  name: "Albert Hall Museum",
  slug: "albert-hall-museum",
  shortDescription: "Oldest museum in Rajasthan located in Ram Niwas Garden.",
  description: "Albert Hall Museum showcases artifacts, paintings, and sculptures.",
  category: CATEGORY,
  tags: ["museum", "heritage", "jaipur"],

  location: {
    address: "Ram Niwas Garden, Jaipur, Rajasthan",
    city: "Jaipur",
    district: DISTRICT,
    state: "Rajasthan",
    country: "India",
    coordinates: {
      latitude: 26.9124,
      longitude: 75.7873
    }
  },

  thumbnail: {
    url: "https://example.com/albert-hall.jpg",
    altText: "Albert Hall Museum Jaipur"
  },

  openingHours: [
    { day: DAY, open: "09:00", close: "17:00", isClosed: false }
  ],

  entryFees: [
    { category: FEE_CATEGORY, amount: 40, currency: "INR" }
  ],

  recommendedDuration: "1-2 hours",
  isActive: true,
  isVerified: true,
  status: "open",
  createdBy: admin._id
},

// ================= JAL MAHAL =================
{
  name: "Jal Mahal",
  slug: "jal-mahal",
  shortDescription: "Beautiful palace located in the middle of Man Sagar Lake.",
  description: "Jal Mahal is a scenic palace best viewed during sunrise and sunset.",
  category: CATEGORY,
  tags: ["palace", "lake", "photography"],

  location: {
    address: "Amer Rd, Man Sagar Lake, Jaipur",
    city: "Jaipur",
    district: DISTRICT,
    state: "Rajasthan",
    country: "India",
    coordinates: {
      latitude: 26.9535,
      longitude: 75.8466
    }
  },

  thumbnail: {
    url: "https://example.com/jal-mahal.jpg",
    altText: "Jal Mahal Jaipur"
  },

  openingHours: [
    { day: DAY, open: "06:00", close: "18:00", isClosed: false }
  ],

  entryFees: [
    { category: FEE_CATEGORY, amount: 0, currency: "INR" }
  ],

  isFreeEntry: true,
  recommendedDuration: "30-45 minutes",
  isActive: true,
  isVerified: true,
  status: "open",
  createdBy: admin._id
},

// ================= BIRLA MANDIR =================
{
  name: "Birla Mandir Jaipur",
  slug: "birla-mandir-jaipur",
  shortDescription: "White marble Hindu temple dedicated to Lord Vishnu.",
  description: "Birla Mandir is known for its peaceful atmosphere and architecture.",
  category: CATEGORY,
  tags: ["temple", "religious", "jaipur"],

  location: {
    address: "Jawahar Lal Nehru Marg, Jaipur",
    city: "Jaipur",
    district: DISTRICT,
    state: "Rajasthan",
    country: "India",
    coordinates: {
      latitude: 26.8925,
      longitude: 75.8151
    }
  },

  thumbnail: {
    url: "https://example.com/birla-mandir.jpg",
    altText: "Birla Mandir Jaipur"
  },

  openingHours: [
    { day: DAY, open: "06:00", close: "20:00", isClosed: false }
  ],

  entryFees: [
    { category: FEE_CATEGORY, amount: 0, currency: "INR" }
  ],

  isFreeEntry: true,
  recommendedDuration: "1 hour",
  isActive: true,
  isVerified: true,
  status: "open",
  createdBy: admin._id
},

// ================= GALTA JI (MONKEY TEMPLE) =================
{
  name: "Galta Ji Temple",
  slug: "galta-ji-temple",
  shortDescription: "Ancient Hindu pilgrimage site surrounded by hills.",
  description: "Galta Ji is famous for natural springs and large monkey population.",
  category: CATEGORY,
  tags: ["temple", "heritage", "nature"],

  location: {
    address: "Galta Ji, Jaipur, Rajasthan",
    city: "Jaipur",
    district: DISTRICT,
    state: "Rajasthan",
    country: "India",
    coordinates: {
      latitude: 26.9196,
      longitude: 75.8667
    }
  },

  thumbnail: {
    url: "https://example.com/galta-ji.jpg",
    altText: "Galta Ji Temple Jaipur"
  },

  openingHours: [
    { day: DAY, open: "05:00", close: "21:00", isClosed: false }
  ],

  entryFees: [
    { category: FEE_CATEGORY, amount: 0, currency: "INR" }
  ],

  isFreeEntry: true,
  recommendedDuration: "1-2 hours",
  isActive: true,
  isVerified: true,
  status: "open",
  createdBy: admin._id
},

// ================= CHOKHI DHANI =================
{
  name: "Chokhi Dhani",
  slug: "chokhi-dhani",
  shortDescription: "Ethnic village resort showcasing Rajasthani culture.",
  description: "Chokhi Dhani offers folk dance, food, and cultural experiences.",
  category: CATEGORY,
  tags: ["culture", "food", "experience"],

  location: {
    address: "Tonk Rd, Sitapura, Jaipur",
    city: "Jaipur",
    district: DISTRICT,
    state: "Rajasthan",
    country: "India",
    coordinates: {
      latitude: 26.7658,
      longitude: 75.8337
    }
  },

  thumbnail: {
    url: "https://example.com/chokhi-dhani.jpg",
    altText: "Chokhi Dhani Jaipur"
  },

  openingHours: [
    { day: DAY, open: "17:00", close: "23:00", isClosed: false }
  ],

  entryFees: [
    { category: FEE_CATEGORY, amount: 700, currency: "INR" }
  ],

  recommendedDuration: "3-4 hours",
  isActive: true,
  isVerified: true,
  status: "open",
  createdBy: admin._id
}

    ];

    await Attraction.insertMany(jaipurAttractions);
    console.log("✅ Jaipur attractions inserted successfully");

    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding failed:", err.message);
    process.exit(1);
  }
}

seedJaipurAttractions();
