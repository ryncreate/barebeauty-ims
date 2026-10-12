// =====================================================================
// BARE BEAUTY INVENTORY MANAGEMENT SYSTEM (IMS)
// Dashboard Statistics & Analytics Module
// =====================================================================

window.BareBeauty = window.BareBeauty || {};
BareBeauty.modules = BareBeauty.modules || {};

function simpleStat(label, value, tone = "") {
  return `<article class="stat-card simple ${tone}"><p>${label}</p><strong>${value}</strong></article>`;
}

function categoryRow(name, valueText, percent) {
  return `<div class="category-row"><div class="category-row-head"><span>${escapeHtml(name)}</span><span>${valueText}</span></div><div class="progress" aria-hidden="true"><span style="width:${percent}%"></span></div></div>`;
}

function activityHtml(entries) {
  if (!entries || !entries.length) return `<div class="empty">No stock movements yet.</div>`;
  return `<div class="activity-list">${entries.map((entry) => `
    <div class="activity">
      <div class="activity-text">
        <strong>${escapeHtml(entry.productName)}</strong>
        <small>${dateText(entry.createdAt)}</small>
      </div>
      <b class="${entry.type === "in" ? "plus" : "minus"}">${entry.type === "in" ? "+" : "−"}${entry.quantity}</b>
    </div>
  `).join("")}</div>`;
}

async function renderDashboard() {
  const root = $("#dashboardPage");
  if (!root) return;
  if (!root.innerHTML) root.innerHTML = `<div class="loading">Loading…</div>`;

  try {
    const summary = await BareBeauty.api("/dashboard");
    root.innerHTML = `<div class="grid stats-grid">
        ${simpleStat("Total Products", summary.totalProducts)}
        ${simpleStat("Units on Hand", summary.totalStock)}
        ${simpleStat("Low Stock", summary.lowStock, "warn")}
        ${simpleStat("Out of Stock", summary.outOfStock, "alert")}
      </div>
      <div class="grid split-grid">
        <section class="panel">
          <div class="panel-title"><h2>Stock by Category</h2><button type="button" class="link-button" data-go="categories">View All</button></div>
          ${summary.categories.map((item) => categoryRow(item.name, plural(item.stock, "unit"), Math.round((item.stock / Math.max(summary.totalStock, 1)) * 100))).join("")}
        </section>
        <section class="panel">
          <div class="panel-title"><h2>Recent Movements</h2><button type="button" class="link-button" data-go="history">View All</button></div>
          ${activityHtml(summary.recentActivity)}
        </section>
      </div>`;
  } catch (error) {
    showPageError(root, error.message);
  }
}

BareBeauty.modules.dashboard = {
  render: renderDashboard,
  simpleStat,
  categoryRow,
  activityHtml,
};
