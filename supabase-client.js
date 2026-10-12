// =====================================================================
// BARE BEAUTY INVENTORY MANAGEMENT SYSTEM (IMS)
// Supabase Client Initialization & Config Loader
// =====================================================================

window.BareBeauty = window.BareBeauty || {};
BareBeauty.services = BareBeauty.services || {};

// Supabase project credentials configuration
// (Replace with your actual Supabase URL & Anon Key when ready to connect live)
window.SUPABASE_CONFIG = {
  url: "https://oameyoviysniyucxxrws.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hbWV5b3ZpeXNuaXl1Y3h4cndzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3MzEzODMsImV4cCI6MjEwNzMwNzM4M30.9cwSIIeOAaL4y_BZc1ZNyzIfsHcueGtPoMYWRZ_seDY",
};

BareBeauty.supabase = {
  client: null,

  isConfigured() {
    const cfg = window.SUPABASE_CONFIG;
    return Boolean(
      cfg &&
      typeof cfg.url === "string" &&
      cfg.url.trim().startsWith("https://") &&
      !cfg.url.includes("YOUR_PROJECT_ID") &&
      typeof cfg.anonKey === "string" &&
      cfg.anonKey.trim().length > 20 &&
      !cfg.anonKey.includes("YOUR_SUPABASE_ANON_KEY")
    );
  },

  init() {
    if (typeof window.supabase !== "undefined" && this.isConfigured()) {
      try {
        this.client = window.supabase.createClient(
          window.SUPABASE_CONFIG.url.trim(),
          window.SUPABASE_CONFIG.anonKey.trim()
        );
        console.log("Supabase Client initialized successfully.");
      } catch (err) {
        console.warn("Supabase initialization error:", err);
      }
    }
    return this.client;
  },
};

// Attempt initial setup
BareBeauty.supabase.init();
