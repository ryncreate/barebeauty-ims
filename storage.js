// =====================================================================
// BARE BEAUTY INVENTORY MANAGEMENT SYSTEM (IMS)
// Client LocalStorage Persistence Layer
// =====================================================================

window.BareBeauty = window.BareBeauty || {};

BareBeauty.storage = {
  loadDb() {
    try {
      const raw = localStorage.getItem(BareBeauty.config.STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn("Storage load exception:", e);
    }
    const seeded = BareBeauty.mockData.seedDb();
    this.saveDb(seeded);
    return seeded;
  },

  saveDb(database) {
    try {
      localStorage.setItem(BareBeauty.config.STORAGE_KEY, JSON.stringify(database));
    } catch (e) {
      console.warn("Storage save exception:", e);
    }
  },
};

// Global shorthand references
function loadDb() { return BareBeauty.storage.loadDb(); }
function saveDb(database) { return BareBeauty.storage.saveDb(database); }

let db = loadDb();
