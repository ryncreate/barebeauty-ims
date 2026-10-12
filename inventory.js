// =====================================================================
// BARE BEAUTY INVENTORY MANAGEMENT SYSTEM (IMS)
// Inventory Management Module (Catalog, Search, Sort & Steppers)
// =====================================================================

window.BareBeauty = window.BareBeauty || {};
BareBeauty.modules = BareBeauty.modules || {};

function productById(id) {
  return BareBeauty.state.products.find((p) => p.id === Number(id));
}

function filteredProducts() {
  const search = BareBeauty.state.search.trim().toLowerCase();
  const result = BareBeauty.state.products.filter((product) => {
    const matchesSearch = !search || [
      product.name,
      product.productType,
      product.shade,
      product.productId,
    ].some((value) => value.toLowerCase().includes(search));

    return matchesSearch &&
      (!BareBeauty.state.category || product.category === BareBeauty.state.category) &&
      (!BareBeauty.state.status || product.status === BareBeauty.state.status);
  });

  const [field, order] = BareBeauty.state.sort.split("-");
  const direction = order === "desc" ? -1 : 1;

  return result.sort((a, b) => {
    if (field === "price") return (a.price - b.price) * direction;
    if (field === "stock") return (a.stock - b.stock) * direction;
    if (field === "category") return a.category.localeCompare(b.category) || productLabel(a).localeCompare(productLabel(b));
    return productLabel(a).localeCompare(productLabel(b)) * direction;
  });
}

function productRow(product) {
  const label = escapeHtml(productLabel(product));
  return `<tr>
    ${productCell(product)}
    <td>${escapeHtml(product.category)}</td>
    <td>${money(product.price)}</td>
    <td><div class="qty-stepper">
      <button type="button" class="qty-btn" data-action="adjust" data-delta="-1" data-id="${product.id}" aria-label="Decrease quantity: ${label}" ${product.stock === 0 ? "disabled" : ""}>−</button>
      <input class="qty-input" type="number" min="0" step="1" inputmode="numeric" value="${product.stock}" data-id="${product.id}" aria-label="Quantity: ${label}" />
      <button type="button" class="qty-btn" data-action="adjust" data-delta="1" data-id="${product.id}" aria-label="Increase quantity: ${label}">+</button>
    </div></td>
    <td><span class="status ${statusClass(product.status)}">${escapeHtml(product.status)}</span></td>
    <td><div class="row-actions">
      <button class="mini-button" data-action="edit" data-id="${product.id}" aria-label="Edit: ${label}">Edit</button>
      <button class="mini-button danger" data-action="delete" data-id="${product.id}" aria-label="Delete: ${label}">Delete</button>
    </div></td>
  </tr>`;
}

function quantityInput(id) {
  return document.querySelector(`.qty-input[data-id="${id}"]`);
}

function refreshRow(id) {
  const input = quantityInput(id);
  const product = productById(id);
  if (!input || !product) return;
  const row = input.closest("tr");
  if (!pendingSaves.has(id)) input.value = product.stock;
  const shown = Number(input.value);
  const decBtn = row.querySelector('[data-delta="-1"]');
  if (decBtn) decBtn.disabled = !(shown > 0);
  const status = computeStatus(shown, product.reorderLevel);
  const pill = row.querySelector(".status");
  if (pill) {
    pill.className = `status ${statusClass(status)}`;
    pill.textContent = status;
  }
}

// 900ms debouncing for inline rapid stock stepper clicks
function adjustQuantity(id, delta) {
  const input = quantityInput(id);
  if (!input) return;
  const next = Number(input.value) + delta;
  if (!Number.isInteger(next) || next < 0) return;
  input.value = next;
  clearTimeout(pendingSaves.get(id));
  pendingSaves.set(id, window.setTimeout(() => saveQuantity(id), 900));
  refreshRow(id);
}

async function saveQuantity(id) {
  clearTimeout(pendingSaves.get(id));
  pendingSaves.delete(id);
  const input = quantityInput(id);
  const product = productById(id);
  if (!input || !product) return;

  const value = Number(input.value);
  if (input.value === "" || !Number.isInteger(value) || value < 0) {
    refreshRow(id);
    showToast("Enter a whole number of 0 or more.", true);
    return;
  }
  if (value === product.stock) return refreshRow(id);

  const difference = value - product.stock;
  try {
    const updated = await BareBeauty.api(`/products/${id}/stock`, {
      method: "POST",
      body: JSON.stringify({
        type: difference > 0 ? "in" : "out",
        quantity: Math.abs(difference),
        note: "Quantity adjustment",
      }),
    });
    product.stock = updated.stock;
    product.status = updated.status;
    refreshRow(id);
    BareBeauty.navigation.refreshStatus();
  } catch (error) {
    refreshRow(id);
    showToast(error.message, true);
  }
}

async function saveAllQuantities() {
  await Promise.all([...pendingSaves.keys()].map(saveQuantity));
}

function updateInventoryTable() {
  const products = filteredProducts();
  const rowsEl = $("#productRows");
  const countEl = $("#resultCount");
  if (rowsEl) {
    rowsEl.innerHTML = products.length
      ? products.map(productRow).join("")
      : `<tr><td colspan="6" class="empty">No products match these filters.</td></tr>`;
  }
  if (countEl) {
    countEl.textContent = `Showing ${products.length} of ${plural(BareBeauty.state.products.length, "product")}`;
  }
}

async function renderInventory() {
  const root = $("#inventoryPage");
  if (!root) return;
  try {
    await BareBeauty.navigation.loadProducts();
  } catch (error) {
    showPageError(root, error.message);
    return;
  }

  root.innerHTML = `<div class="toolbar">
      <input class="search" id="searchInput" type="search" aria-label="Search products" placeholder="Search products…" value="${escapeHtml(BareBeauty.state.search)}" />
      <select id="categoryFilter" aria-label="Filter by category"><option value="">All Categories</option>${BareBeauty.config.CATEGORIES.map((item) => `<option ${BareBeauty.state.category === item ? "selected" : ""}>${item}</option>`).join("")}</select>
      <select id="statusFilter" aria-label="Filter by stock status"><option value="">All Statuses</option>${["In Stock", "Low Stock", "Out of Stock"].map((item) => `<option ${BareBeauty.state.status === item ? "selected" : ""}>${item}</option>`).join("")}</select>
      <select id="sortSelect" aria-label="Sort products">${BareBeauty.config.SORT_OPTIONS.map(([value, name]) => `<option value="${value}" ${BareBeauty.state.sort === value ? "selected" : ""}>${name}</option>`).join("")}</select>
      <button class="button primary" data-action="create">＋ Add Product</button>
    </div>
    <p class="result-count small muted" id="resultCount"></p>
    <div class="table-wrap" tabindex="0" role="region" aria-label="Products, scrollable">
      <table aria-label="Products">
        <thead><tr><th scope="col">Product</th><th scope="col">Category</th><th scope="col">Price</th><th scope="col">Quantity</th><th scope="col">Status</th><th scope="col">Actions</th></tr></thead>
        <tbody id="productRows"></tbody>
      </table>
    </div>`;

  updateInventoryTable();
}

BareBeauty.modules.inventory = {
  render: renderInventory,
  updateTable: updateInventoryTable,
  filteredProducts,
  productRow,
  quantityInput,
  refreshRow,
  adjustQuantity,
  saveQuantity,
  saveAllQuantities,
  productById,
};
