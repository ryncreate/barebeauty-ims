// =====================================================================
// BARE BEAUTY INVENTORY MANAGEMENT SYSTEM (IMS)
// Core Utilities, Formatters & Icon Definitions
// =====================================================================

window.BareBeauty = window.BareBeauty || {};

// DOM selector helper
const $ = (selector) => document.querySelector(selector);

// Philippine Peso (PHP) Currency Formatter
const money = (value) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(value || 0));

// Date Text Formatter (e.g. Oct 11, 2026)
const dateText = (value) =>
  new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: BareBeauty.config.TIME_ZONE,
  }).format(new Date(value));

// Date & Time Formatter (e.g. Oct 11, 2026, 11:00 PM)
const dateTimeText = (value) =>
  new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: BareBeauty.config.TIME_ZONE,
  }).format(new Date(value));

// HTML entity escaping for XSS prevention
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[char]);
}

// Map stock status to CSS badge class
function statusClass(status) {
  return status === "In Stock" ? "in" : status === "Low Stock" ? "low" : "out";
}

// Grammatical plural helper
function plural(count, word) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

// Display transient feedback toast notification
function showToast(message, error = false) {
  const toast = document.createElement("div");
  toast.className = `toast${error ? " error" : ""}`;
  if (error) toast.setAttribute("role", "alert");
  toast.textContent = message;
  const root = $("#toastRoot");
  if (root) {
    root.append(toast);
    window.setTimeout(() => toast.remove(), 3400);
  }
}

// Render friendly error container in page
function showPageError(root, message) {
  if (root) root.innerHTML = `<div class="panel empty">${escapeHtml(message)}</div>`;
}

// Relative date helper for mock history records
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

// Stock level condition evaluator
function computeStatus(stock, reorderLevel) {
  if (stock <= 0) return "Out of Stock";
  if (stock <= reorderLevel) return "Low Stock";
  return "In Stock";
}

// Attaches computed status to product object
function withStatus(product) {
  return { ...product, status: computeStatus(product.stock, product.reorderLevel) };
}

// Display name format (Name · Shade)
function productLabel(product) {
  return `${product.name} · ${product.shade}`;
}

// Table cell markup with dual-line product details
function productCell(product) {
  return `<td><strong>${escapeHtml(productLabel(product))}</strong><small>${escapeHtml(product.productId)} · ${escapeHtml(product.productType)}</small></td>`;
}

// ----- Category & Metric Icons -----
const CATEGORY_ICONS = {
  Eyes: '<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  Lips: '<path d="M3 12c2.5-2.2 4.5-3.5 6-3.5 1.2 0 2 .6 3 1.2 1-.6 1.8-1.2 3-1.2 1.5 0 3.5 1.3 6 3.5-2.5 3.6-5.5 5.5-9 5.5S5.5 15.6 3 12z"/><path d="M3 12c3 .8 6 1.2 9 1.2s6-.4 9-1.2"/>',
  Face: '<circle cx="12" cy="13.5" r="7.5"/><circle cx="12" cy="13.5" r="4"/><path d="M9 3.5h6"/>',
  Cheeks: '<rect x="3" y="8" width="18" height="12" rx="3.5"/><circle cx="12" cy="14" r="3.2"/><path d="M18 3.5v3M16.5 5h3"/>',
  Brows: '<path d="M3 15c4-6 11-8 18-4"/><path d="M5 18c3.5-4 8-5.5 14-3.2"/>',
};

function categoryIcon(name) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${CATEGORY_ICONS[name] || ""}</svg>`;
}

const lineIcon = (inner) =>
  `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;

const STAT_ICONS = {
  products: lineIcon('<path d="M10 2.5h4v3h-4z"/><path d="M9 5.5h6V8H9z"/><rect x="6.5" y="8" width="11" height="13.5" rx="3"/><path d="M9.5 14h5"/>'),
  units: lineIcon('<path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z"/><path d="M3.5 7.5 12 12l8.5-4.5M12 12v9"/>'),
  low: lineIcon('<path d="M12 3.5 21.5 20h-19z"/><path d="M12 10v4.5M12 17.4v.1"/>'),
  out: lineIcon('<circle cx="12" cy="12" r="8.5"/><path d="M6 6l12 12"/>'),
};

// Metric Stat Card (used in Reports and Dashboard)
function stat(label, value, detail, icon) {
  return `<article class="stat-card"><span class="stat-icon" aria-hidden="true">${icon}</span><p>${label}</p><strong>${value}</strong><p>${detail}</p></article>`;
}

// Category Breakdown Progress Row (used in Dashboard and Reports)
function categoryRow(name, valueText, percent) {
  return `<div class="category-row"><div class="category-row-head"><span>${escapeHtml(name)}</span><span>${valueText}</span></div><div class="progress" aria-hidden="true"><span style="width:${percent}%"></span></div></div>`;
}

// Global window bindings for cross-module accessibility
window.stat = stat;
window.categoryRow = categoryRow;
window.STAT_ICONS = STAT_ICONS;

BareBeauty.utils = {
  $,
  money,
  dateText,
  dateTimeText,
  escapeHtml,
  statusClass,
  plural,
  showToast,
  showPageError,
  daysAgo,
  computeStatus,
  withStatus,
  productLabel,
  productCell,
  categoryIcon,
  STAT_ICONS,
  stat,
  categoryRow,
};

