// =====================================================================
// BARE BEAUTY INVENTORY MANAGEMENT SYSTEM (IMS)
// Main Application Bootstrap & Event Dispatcher
// =====================================================================

window.BareBeauty = window.BareBeauty || {};

// Global click event dispatcher
document.addEventListener("click", async (event) => {
  // Navigation links
  const goLink = event.target.closest("[data-go]");
  if (goLink) return BareBeauty.navigation.setPage(goLink.dataset.go);

  // Category card filter click
  const categoryCard = event.target.closest("[data-category]");
  if (categoryCard) {
    BareBeauty.state.category = categoryCard.dataset.category;
    BareBeauty.state.search = "";
    BareBeauty.state.status = "";
    return BareBeauty.navigation.setPage("inventory");
  }

  // Report perspective tab click
  const reportButton = event.target.closest("[data-report]");
  if (reportButton) {
    BareBeauty.state.report = reportButton.dataset.report;
    return BareBeauty.modules.reports.render(`[data-report="${BareBeauty.state.report}"]`);
  }

  // Report date range chip click
  const rangeButton = event.target.closest("[data-range]");
  if (rangeButton) {
    BareBeauty.state.range = rangeButton.dataset.range;
    if (BareBeauty.state.range === "custom" && !BareBeauty.state.from) {
      const now = new Date();
      BareBeauty.state.from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      BareBeauty.state.to = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    }
    return BareBeauty.modules.reports.render(`[data-range="${BareBeauty.state.range}"]`);
  }

  // Action buttons
  const item = event.target.closest("[data-action]");
  if (!item) return;
  const action = item.dataset.action;

  if (action === "create") BareBeauty.modals.openProductModal();
  if (action === "close") BareBeauty.modals.closeModal();
  if (action === "edit") BareBeauty.modals.openProductModal(BareBeauty.modules.inventory.productById(item.dataset.id));
  if (action === "adjust") BareBeauty.modules.inventory.adjustQuantity(Number(item.dataset.id), Number(item.dataset.delta));
  if (action === "delete") BareBeauty.modals.openDeleteModal(BareBeauty.modules.inventory.productById(item.dataset.id));
  if (action === "signout") BareBeauty.modals.openSignOutModal();
  if (action === "confirm-signout") BareBeauty.modules.auth.handleSignOut();
  if (action === "export-csv") BareBeauty.modules.reports.exportCsv();
  if (action === "clear-history") {
    Object.assign(BareBeauty.state, { historySearch: "", historyType: "", historyFrom: "", historyTo: "" });
    BareBeauty.modules.history.render();
  }
  if (action === "confirm-delete") {
    try {
      await BareBeauty.api(`/products/${item.dataset.id}`, { method: "DELETE" });
      BareBeauty.modals.closeModal();
      showToast("Product removed.");
      BareBeauty.navigation.setPage("inventory", false);
    } catch (error) {
      showToast(error.message, true);
    }
  }
});

// Dynamic filtering and live search
document.addEventListener("input", (event) => {
  const id = event.target.id;
  if (id === "searchInput") {
    BareBeauty.state.search = event.target.value;
    BareBeauty.modules.inventory.updateTable();
  }
  if (id === "historySearch") {
    BareBeauty.state.historySearch = event.target.value;
    BareBeauty.modules.history.updateTable();
  }
});

document.addEventListener("change", (event) => {
  const id = event.target.id;
  const value = event.target.value;
  if (id === "categoryFilter") { BareBeauty.state.category = value; BareBeauty.modules.inventory.updateTable(); }
  if (id === "statusFilter") { BareBeauty.state.status = value; BareBeauty.modules.inventory.updateTable(); }
  if (id === "sortSelect") { BareBeauty.state.sort = value; BareBeauty.modules.inventory.updateTable(); }
  if (event.target.classList.contains("qty-input")) BareBeauty.modules.inventory.saveQuantity(Number(event.target.dataset.id));
  if (id === "historyType") { BareBeauty.state.historyType = value; BareBeauty.modules.history.updateTable(); }
  if (id === "historyFrom") { BareBeauty.state.historyFrom = value; BareBeauty.modules.history.updateTable(); }
  if (id === "historyTo") { BareBeauty.state.historyTo = value; BareBeauty.modules.history.updateTable(); }
  if (id === "fromDate") { BareBeauty.state.from = value; BareBeauty.modules.reports.render("#fromDate"); }
  if (id === "toDate") { BareBeauty.state.to = value; BareBeauty.modules.reports.render("#toDate"); }
});

// Login form submission
$("#loginForm")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const email = $("#emailInput")?.value.trim() || "";
  const password = $("#passwordInput")?.value || "";
  BareBeauty.modules.auth.handleSignIn(email, password);
});

// Show / Hide password toggle
$("#togglePassword")?.addEventListener("click", () => {
  const input = $("#passwordInput");
  if (!input) return;
  const show = input.type === "password";
  input.type = show ? "text" : "password";
  const btn = $("#togglePassword");
  if (btn) {
    btn.textContent = show ? "Hide" : "Show";
    btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
    btn.setAttribute("aria-pressed", String(show));
  }
});

// Navigation drawer clicks
$("#mainNav")?.addEventListener("click", (event) => {
  const navButton = event.target.closest("[data-page]");
  if (navButton) BareBeauty.navigation.setPage(navButton.dataset.page);
});

$("#mobileMenuButton")?.addEventListener("click", () => {
  const isOpen = $(".sidebar")?.classList.contains("open");
  BareBeauty.navigation.setSidebar(!isOpen);
});

$("#mainNav")?.addEventListener("click", () => {
  BareBeauty.navigation.setSidebar(false);
});

// Keyboard navigation (Enter, Escape, Focus Trap)
document.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && event.target.classList.contains("qty-input")) {
    event.target.blur();
    return;
  }
  const dialog = $("#modalRoot .modal");
  if (event.key === "Escape") {
    if (dialog) BareBeauty.modals.closeModal();
    else BareBeauty.navigation.setSidebar(false);
    return;
  }
  if (event.key === "Tab" && dialog) {
    const items = [...dialog.querySelectorAll("button, input, select")].filter((el) => !el.disabled);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
});

// Multi-tab logout synchronization
window.addEventListener("storage", (event) => {
  if (event.key === BareBeauty.config.AUTH_KEY && event.newValue !== "true" && session) {
    BareBeauty.modules.auth.handleSignOut();
  }
});

// Real-time synchronization when connected to Supabase
function initRealtime() {
  if (!isSupabaseActive()) return;
  try {
    BareBeauty.supabase.client
      .channel("bare-beauty-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => {
        if (BareBeauty.state.page === "inventory") BareBeauty.modules.inventory.render();
        else if (BareBeauty.state.page === "dashboard") BareBeauty.modules.dashboard.render();
        else if (BareBeauty.state.page === "categories") BareBeauty.modules.categories.render();
        BareBeauty.navigation.refreshStatus();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "stock_transactions" }, () => {
        if (BareBeauty.state.page === "history") BareBeauty.modules.history.render();
        else if (BareBeauty.state.page === "dashboard") BareBeauty.modules.dashboard.render();
      })
      .subscribe();
  } catch (err) {
    console.warn("Realtime channel notice:", err);
  }
}

// Application Initialization
async function initApp() {
  // Initialize accessible modal focus observer
  BareBeauty.modals.initModalObserver();

  if (isSupabaseActive() && BareBeauty.services.auth) {
    try {
      const currentSession = await BareBeauty.services.auth.getSession();
      if (currentSession) {
        session = true;
        BareBeauty.modules.auth.enterApp();
      } else {
        BareBeauty.modules.auth.showLogin();
      }

      BareBeauty.supabase.client.auth.onAuthStateChange((event) => {
        if (event === "SIGNED_OUT" && session) {
          BareBeauty.modules.auth.handleSignOut();
        }
      });

      initRealtime();
      return;
    } catch (e) {
      console.warn("Supabase startup check notice:", e);
    }
  }

  // Local storage session check
  try {
    session = localStorage.getItem(BareBeauty.config.AUTH_KEY) === "true";
  } catch (e) {
    console.warn("Local session check notice:", e);
  }

  if (session) {
    BareBeauty.modules.auth.enterApp();
  } else {
    BareBeauty.modules.auth.showLogin();
  }
}

// Bootstrap application on page load
initApp();
