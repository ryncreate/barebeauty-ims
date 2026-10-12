// =====================================================================
// BARE BEAUTY INVENTORY MANAGEMENT SYSTEM (IMS)
// Category Department Breakdown & Cards Module
// =====================================================================

window.BareBeauty = window.BareBeauty || {};
BareBeauty.modules = BareBeauty.modules || {};

async function renderCategories() {
  const root = $("#categoriesPage");
  if (!root) return;

  try {
    await BareBeauty.navigation.loadProducts();
  } catch (error) {
    showPageError(root, error.message);
    return;
  }

  root.innerHTML = `<div class="grid category-grid">${BareBeauty.config.CATEGORIES.map((category) => {
    const items = BareBeauty.state.products.filter((item) => item.category === category);
    const units = items.reduce((sum, item) => sum + item.stock, 0);
    const low = items.filter((item) => item.status === "Low Stock").length;
    const out = items.filter((item) => item.status === "Out of Stock").length;
    return `<button type="button" class="category-card" data-category="${category}" aria-label="${category}: ${plural(items.length, "product")}. View in Inventory">
      <span class="category-color">${categoryIcon(category)}</span>
      <h3>${category}</h3>
      <dl class="category-stats">
        <div><dt>Products</dt><dd>${items.length}</dd></div>
        <div><dt>Available units</dt><dd>${units}</dd></div>
        <div class="${low + out > 0 ? "alert" : ""}"><dt>Low stock</dt><dd>${low}</dd></div>
        <div class="${out > 0 ? "alert" : ""}"><dt>Out of stock</dt><dd>${out}</dd></div>
      </dl>
    </button>`;
  }).join("")}</div>`;
}

BareBeauty.modules.categories = {
  render: renderCategories,
};
