// =====================================================================
// BARE BEAUTY INVENTORY MANAGEMENT SYSTEM (IMS)
// Core Configuration & Application Constants
// =====================================================================

window.BareBeauty = window.BareBeauty || {};

BareBeauty.config = {
  // Session & Local Storage Keys
  AUTH_KEY: "bare-beauty-demo-auth",
  STORAGE_KEY: "bare-beauty-db-v2",
  TIME_ZONE: "Asia/Manila",

  // Catalogue Department Categories
  CATEGORIES: ["Eyes", "Lips", "Face", "Cheeks", "Brows"],

  // Active Administrator Profile
  ADMIN: {
    name: "Aveghail",
    role: "Inventory admin",
  },

  // Navigation Page Titles
  PAGE_TITLES: {
    dashboard: "Dashboard",
    inventory: "Inventory",
    categories: "Categories",
    history: "Movement History",
    reports: "Reports",
  },

  // Inventory Table Sort Options
  SORT_OPTIONS: [
    ["name-asc", "Name (A–Z)"],
    ["name-desc", "Name (Z–A)"],
    ["price-asc", "Price (low to high)"],
    ["price-desc", "Price (high to low)"],
    ["stock-asc", "Quantity (low to high)"],
    ["stock-desc", "Quantity (high to low)"],
    ["category-asc", "Category"],
  ],

  // Report Perspective Filters
  REPORTS: [
    ["summary", "Inventory Summary"],
    ["movement", "Stock Movement"],
    ["low", "Low Stock"],
    ["out", "Out of Stock"],
    ["value", "Inventory Value"],
  ],

  // Report Date Range Filters
  RANGES: [
    ["today", "Today"],
    ["week", "This Week"],
    ["month", "This Month"],
    ["custom", "Custom Date Range"],
  ],
};

// Global shorthand references for clean code
const AUTH_KEY = BareBeauty.config.AUTH_KEY;
const STORAGE_KEY = BareBeauty.config.STORAGE_KEY;
const TIME_ZONE = BareBeauty.config.TIME_ZONE;
const CATEGORIES = BareBeauty.config.CATEGORIES;
const PAGE_TITLES = BareBeauty.config.PAGE_TITLES;
const SORT_OPTIONS = BareBeauty.config.SORT_OPTIONS;
const REPORTS = BareBeauty.config.REPORTS;
const RANGES = BareBeauty.config.RANGES;
let ADMIN = BareBeauty.config.ADMIN;
