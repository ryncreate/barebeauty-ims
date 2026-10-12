// =====================================================================
// BARE BEAUTY INVENTORY MANAGEMENT SYSTEM (IMS)
// Centralized Application State Store
// =====================================================================

window.BareBeauty = window.BareBeauty || {};

BareBeauty.state = {
  // Current active view: 'dashboard' | 'inventory' | 'categories' | 'history' | 'reports'
  page: "dashboard",

  // In-memory product catalog & stock movement history
  products: [],
  history: [],

  // Inventory page filters & sorting
  search: "",
  category: "",
  status: "",
  sort: "name-asc",

  // Movement history page filters
  historySearch: "",
  historyType: "",
  historyFrom: "",
  historyTo: "",

  // Reports page configuration
  report: "summary",
  range: "month",
  from: "",
  to: "",
  lastReport: null,
};

// Global authentication session status
let session = false;

// Debounced inline quantity adjustments Map (product_id -> timeoutId)
const pendingSaves = new Map();

// Global shorthand reference
const state = BareBeauty.state;
