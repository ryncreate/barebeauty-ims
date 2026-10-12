// =====================================================================
// BARE BEAUTY INVENTORY MANAGEMENT SYSTEM (IMS)
// Modal Dialogs & Keyboard Accessibility Focus Trap
// =====================================================================

window.BareBeauty = window.BareBeauty || {};

function closeModal() {
  const root = $("#modalRoot");
  if (root) root.innerHTML = "";
}

function modalHead(title, subtitle = "") {
  return `<div class="modal-head"><div><h2>${title}</h2>${subtitle ? `<p class="muted">${subtitle}</p>` : ""}</div><button class="close-button" type="button" data-action="close">×</button></div>`;
}

// Add / Edit Product Modal
function openProductModal(product = null) {
  const editing = Boolean(product);
  const root = $("#modalRoot");
  if (!root) return;

  root.innerHTML = `<div class="modal-backdrop"><form id="productForm" class="modal">
    ${modalHead(editing ? "Edit Product" : "Add Product")}
    <div class="form-grid">
      <label class="wide">Product ID<input name="productId" value="${escapeHtml(product?.productId || "")}" required /></label>
      <label>Product Type<input name="productType" value="${escapeHtml(product?.productType || "")}" required /></label>
      <label>Product Name<input name="name" value="${escapeHtml(product?.name || "")}" required /></label>
      <label>Shade<input name="shade" value="${escapeHtml(product?.shade || "")}" required /></label>
      <label>Category<select name="category">${BareBeauty.config.CATEGORIES.map((item) => `<option ${product?.category === item ? "selected" : ""}>${item}</option>`).join("")}</select></label>
      <label>Unit Price<input name="price" type="number" min="0" step=".01" value="${product?.price ?? ""}" required /></label>
      ${editing ? "" : '<label>Opening Stock<input name="stock" type="number" min="0" step="1" value="0" required /></label>'}
      <label>Reorder Level<input name="reorderLevel" type="number" min="0" step="1" value="${product?.reorderLevel ?? 10}" required /></label>
    </div>
    <div class="modal-actions"><button class="button secondary" type="button" data-action="close">Cancel</button><button class="button primary" type="submit">${editing ? "Save Changes" : "Add Product"}</button></div>
  </form></div>`;

  $("#productForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target));
    data.price = Number(data.price);
    data.reorderLevel = Number(data.reorderLevel);
    if (!editing) data.stock = Number(data.stock);

    try {
      await BareBeauty.api(editing ? `/products/${product.id}` : "/products", {
        method: editing ? "PATCH" : "POST",
        body: JSON.stringify(data),
      });
      closeModal();
      showToast(editing ? "Product updated." : "Product added.");
      BareBeauty.navigation.setPage("inventory", false);
    } catch (error) {
      showToast(error.message, true);
    }
  });
}

// Confirmation Dialog for Product Removal
function openDeleteModal(product) {
  const root = $("#modalRoot");
  if (!root || !product) return;

  root.innerHTML = `<div class="modal-backdrop"><div class="modal modal-small">
    ${modalHead("Remove this product?")}
    <p class="muted">"${escapeHtml(productLabel(product))}" will be removed from your inventory. This can't be undone.</p>
    <div class="modal-actions"><button class="button secondary" type="button" data-action="close">Keep It</button><button class="button primary" type="button" data-action="confirm-delete" data-id="${product.id}">Remove</button></div>
  </div></div>`;
}

// Confirmation Dialog for Sign Out
function openSignOutModal() {
  const root = $("#modalRoot");
  if (!root) return;

  root.innerHTML = `<div class="modal-backdrop"><div class="modal modal-small">
    ${modalHead("Sign out of Bare Beauty?")}
    <p class="muted">Your session will end, and you will return to the login page.</p>
    <div class="modal-actions"><button class="button secondary" type="button" data-action="close">Cancel</button><button class="button primary" type="button" data-action="confirm-signout">Sign Out</button></div>
  </div></div>`;
}

// Accessibility Focus Trap Observer
let lastFocus = null;
function initModalObserver() {
  const modalRoot = $("#modalRoot");
  if (!modalRoot) return;

  new MutationObserver(() => {
    const dialog = $("#modalRoot .modal");
    if (!dialog) {
      if (lastFocus && lastFocus.isConnected) lastFocus.focus();
      lastFocus = null;
      return;
    }
    if (!lastFocus) lastFocus = document.activeElement;
    const title = dialog.querySelector("h2");
    if (title) {
      title.id = "modalTitle";
      dialog.setAttribute("aria-labelledby", "modalTitle");
    }
    const confirming = dialog.querySelector('[data-action="confirm-delete"], [data-action="confirm-signout"]');
    dialog.setAttribute("role", confirming ? "alertdialog" : "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.querySelectorAll(".close-button").forEach((b) => b.setAttribute("aria-label", "Close dialog"));
    (dialog.querySelector("input, select") || dialog.querySelector(".secondary"))?.focus();
  }).observe(modalRoot, { childList: true });
}

BareBeauty.modals = {
  closeModal,
  modalHead,
  openProductModal,
  openDeleteModal,
  openSignOutModal,
  initModalObserver,
};
