// =====================================================================
// BARE BEAUTY INVENTORY MANAGEMENT SYSTEM (IMS)
// UI Navigation, Header Controller & Mobile Drawer
// =====================================================================

window.BareBeauty = window.BareBeauty || {};

// Fetch products into memory
async function loadProducts() {
  BareBeauty.state.products = await BareBeauty.api("/products");
}

// Update topbar status indicator badge
async function refreshStatus() {
  try {
    const summary = await BareBeauty.api("/dashboard");
    const attention = summary.lowStock + summary.outOfStock;
    const badge = $("#headerStatus");
    const text = $("#headerStatusText");
    if (badge) badge.classList.toggle("warn", attention > 0);
    if (text) {
      text.textContent = attention > 0
        ? `${plural(attention, "product")} need attention`
        : "All products well stocked";
    }
  } catch (e) {
    console.warn("Status refresh notice:", e);
  }
}

// Update page title and topbar heading
function renderHeader() {
  const title = BareBeauty.config.PAGE_TITLES[BareBeauty.state.page];
  const heading = $("#pageHeading");
  if (heading) heading.textContent = title;
  document.title = `${title} · Bare Beauty`;
  refreshStatus();
}

// Route to a specific SPA page view
function setPage(page, focusHeading = true) {
  if (!isSignedIn()) {
    showLogin();
    return;
  }

  // Save any pending inline quantity steppers before switching views
  if (pendingSaves.size) {
    saveAllQuantities().then(() => setPage(page, focusHeading));
    return;
  }

  BareBeauty.state.page = page;

  // Update active sidebar link
  document.querySelectorAll(".nav-item[data-page]").forEach((item) => {
    const on = item.dataset.page === page;
    item.classList.toggle("active", on);
    if (on) item.setAttribute("aria-current", "page");
    else item.removeAttribute("aria-current");
  });

  // Toggle visible page view section
  document.querySelectorAll(".page").forEach((item) => item.classList.add("hidden"));
  const targetPage = $(`#${page}Page`);
  if (targetPage) targetPage.classList.remove("hidden");

  renderHeader();

  // Render view-specific content
  if (page === "dashboard") BareBeauty.modules.dashboard.render();
  if (page === "inventory") BareBeauty.modules.inventory.render();
  if (page === "categories") BareBeauty.modules.categories.render();
  if (page === "history") BareBeauty.modules.history.render();
  if (page === "reports") BareBeauty.modules.reports.render();

  if (focusHeading && $("#pageHeading")) {
    $("#pageHeading").focus({ preventScroll: true });
  }
}

// Responsive mobile drawer toggle
function setSidebar(open) {
  const sidebar = $(".sidebar");
  const button = $("#mobileMenuButton");
  if (sidebar) sidebar.classList.toggle("open", open);
  if (button) {
    button.setAttribute("aria-expanded", String(open));
    button.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }
}

BareBeauty.navigation = {
  setPage,
  renderHeader,
  refreshStatus,
  loadProducts,
  setSidebar,
};
