// =====================================================================
// BARE BEAUTY INVENTORY MANAGEMENT SYSTEM (IMS)
// Analytics Reports & Sanitized CSV Export Module
// =====================================================================

window.BareBeauty = window.BareBeauty || {};
BareBeauty.modules = BareBeauty.modules || {};

const padNum = (n) => String(n).padStart(2, "0");
const toInputDate = (d) => `${d.getFullYear()}-${padNum(d.getMonth() + 1)}-${padNum(d.getDate())}`;
const sumBy = (items, fn) => items.reduce((total, item) => total + fn(item), 0);

function rangeBounds() {
  const now = new Date();
  let start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);

  if (BareBeauty.state.range === "week") {
    const back = (start.getDay() + 6) % 7;
    start = new Date(start.getFullYear(), start.getMonth(), start.getDate() - back);
    end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);
  }
  if (BareBeauty.state.range === "month") {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }
  if (BareBeauty.state.range === "custom") {
    const from = new Date(`${BareBeauty.state.from}T00:00:00`), to = new Date(`${BareBeauty.state.to}T00:00:00`);
    if (isNaN(from) || isNaN(to) || from > to) {
      return { start, end, invalid: true, label: "Choose a start date that is on or before the end date" };
    }
    start = from;
    end = new Date(to.getFullYear(), to.getMonth(), to.getDate() + 1);
  }

  const last = new Date(end.getTime() - 1);
  const dayText = (d) => new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric" }).format(d);
  const label = BareBeauty.state.range === "today" ? dayText(start) : `${dayText(start)} – ${dayText(last)}`;
  return { start, end, invalid: false, label };
}

function reportTable(label, head, rows, emptyText) {
  const th = head.map(([text, num]) => `<th scope="col"${num ? ' class="num"' : ""}>${text}</th>`).join("");
  const body = rows.length ? rows.join("") : `<tr><td colspan="${head.length}" class="empty">${emptyText}</td></tr>`;
  return `<div class="table-wrap" tabindex="0" role="region" aria-label="${label}, scrollable"><table aria-label="${label}"><thead><tr>${th}</tr></thead><tbody>${body}</tbody></table></div>`;
}

function sectionTitle(title, subtitle = "") {
  return `<div class="report-section-title"><h2>${title}</h2>${subtitle ? `<p class="small muted">${subtitle}</p>` : ""}</div>`;
}

function outSince(product, history) {
  const last = history.find((e) => e.productId === product.productId && e.stockAfter === 0);
  return last ? dateText(last.createdAt) : "—";
}

function reportBody(products, history, moves, rangeLabel, invalid) {
  const received = sumBy(moves.filter((e) => e.type === "in"), (e) => e.quantity);
  const released = sumBy(moves.filter((e) => e.type === "out"), (e) => e.quantity);
  const totalUnits = sumBy(products, (p) => p.stock);
  const totalValue = sumBy(products, (p) => p.price * p.stock);
  const low = products.filter((p) => p.status === "Low Stock");
  const out = products.filter((p) => p.status === "Out of Stock");

  if (BareBeauty.state.report === "summary") {
    const rows = BareBeauty.config.CATEGORIES.map((name) => {
      const items = products.filter((p) => p.category === name);
      return `<tr><td><strong>${name}</strong></td><td class="num">${items.length}</td><td class="num">${sumBy(items, (p) => p.stock)}</td><td class="num">${items.filter((p) => p.status === "Low Stock").length}</td><td class="num">${items.filter((p) => p.status === "Out of Stock").length}</td><td class="num">${money(sumBy(items, (p) => p.price * p.stock))}</td></tr>`;
    });
    rows.push(`<tr class="total-row"><td><strong>Total</strong></td><td class="num">${products.length}</td><td class="num">${totalUnits}</td><td class="num">${low.length}</td><td class="num">${out.length}</td><td class="num">${money(totalValue)}</td></tr>`);
    return `<div class="grid report-grid">${stat("Units Received", received, rangeLabel, "↓")}${stat("Units Released", released, rangeLabel, "↑")}${stat("Inventory Value", money(totalValue), "Retail value (price × quantity)", "₱")}</div>
      <div class="report-section">${sectionTitle("Category Breakdown", "Current stock by category")}${reportTable("Category breakdown", [["Category"], ["Products", 1], ["Units", 1], ["Low Stock", 1], ["Out of Stock", 1], ["Retail Value", 1]], rows, "No products yet.")}</div>`;
  }

  if (BareBeauty.state.report === "movement") {
    const net = received - released;
    const empty = invalid ? "Pick a valid date range to see movements." : "No stock movements in this period.";
    return `<div class="grid report-grid">${stat("Units Received", received, rangeLabel, "↓")}${stat("Units Released", released, rangeLabel, "↑")}${stat("Net Change", `${net > 0 ? "+" : net < 0 ? "−" : ""}${Math.abs(net)}`, plural(moves.length, "movement") + " in this period", "⇅")}</div>
      <div class="report-section">${sectionTitle("Stock Movement Report")}<div class="table-wide">${reportTable("Stock movements", HISTORY_HEAD, moves.map(BareBeauty.modules.history.historyRow), empty)}</div></div>`;
  }

  if (BareBeauty.state.report === "low") {
    const rows = [...low].sort((a, b) => a.stock - b.stock).map((p) => `<tr>${productCell(p)}<td>${escapeHtml(p.category)}</td><td class="num"><strong>${p.stock}</strong></td><td class="num">${p.reorderLevel}</td><td class="num">${Math.max(0, p.reorderLevel - p.stock)}</td><td><span class="status low">Low Stock</span></td></tr>`);
    return `<div class="report-section first">${sectionTitle("Low Stock Report", `${plural(low.length, "product")} at or below the reorder level`)}${reportTable("Low stock products", [["Product"], ["Category"], ["On Hand", 1], ["Reorder Level", 1], ["Below Reorder By", 1], ["Status"]], rows, "Nothing is running low. Every product is above its reorder level.")}</div>`;
  }

  if (BareBeauty.state.report === "out") {
    const rows = out.map((p) => `<tr>${productCell(p)}<td>${escapeHtml(p.category)}</td><td class="num">${money(p.price)}</td><td>${outSince(p, history)}</td><td class="num">${p.reorderLevel}</td><td><span class="status out">Out of Stock</span></td></tr>`);
    return `<div class="report-section first">${sectionTitle("Out-of-Stock Report", `${plural(out.length, "product")} currently unavailable`)}${reportTable("Out of stock products", [["Product"], ["Category"], ["Price", 1], ["Out Since"], ["Reorder Level", 1], ["Status"]], rows, "Nothing is out of stock right now.")}</div>`;
  }

  const catValues = BareBeauty.config.CATEGORIES.map((name) => ({
    name,
    value: sumBy(products.filter((p) => p.category === name), (p) => p.price * p.stock),
  })).filter((c) => c.value > 0);
  const topValue = Math.max(...catValues.map((c) => c.value), 1);
  const rows = [...products].sort((a, b) => b.price * b.stock - a.price * a.stock).map((p) => `<tr>${productCell(p)}<td>${escapeHtml(p.category)}</td><td class="num">${money(p.price)}</td><td class="num">${p.stock}</td><td class="num"><strong>${money(p.price * p.stock)}</strong></td><td class="num">${totalValue ? Math.round((p.price * p.stock / totalValue) * 100) : 0}%</td></tr>`);
  return `<div class="grid report-grid">${stat("Inventory Value", money(totalValue), "Retail value (price × quantity)", "₱")}${stat("Units on Hand", totalUnits, "Across all products", STAT_ICONS.units)}${stat("Products", products.length, "In the catalogue", STAT_ICONS.products)}</div>
    <section class="panel report-section">${sectionTitle("Value by Category")}${catValues.map((c) => categoryRow(c.name, money(c.value), Math.round((c.value / topValue) * 100))).join("") || '<div class="empty">No stock value yet.</div>'}</section>
    <div class="report-section">${sectionTitle("Inventory Value Report", "Every product, highest value first")}${reportTable("Inventory value by product", [["Product"], ["Category"], ["Price", 1], ["Units", 1], ["Retail Value", 1], ["Share", 1]], rows, "No products yet.")}</div>`;
}

async function renderReports(focusSelector) {
  const root = $("#reportsPage");
  if (!root) return;

  try {
    await BareBeauty.navigation.loadProducts();
    const history = await BareBeauty.api("/inventory-history?limit=1000");
    const { start, end, invalid, label } = rangeBounds();
    const moves = invalid ? [] : history.filter((e) => {
      const t = new Date(e.createdAt);
      return t >= start && t < end;
    });
    BareBeauty.state.lastReport = { products: BareBeauty.state.products, history, moves };

    const usesRange = BareBeauty.state.report === "summary" || BareBeauty.state.report === "movement";
    const rangeControls = usesRange
      ? `<div class="report-tabs" role="group" aria-label="Date range">${BareBeauty.config.RANGES.map(([id, name]) => `<button type="button" class="chip${BareBeauty.state.range === id ? " active" : ""}" data-range="${id}" aria-pressed="${BareBeauty.state.range === id}">${name}</button>`).join("")}</div>
         ${BareBeauty.state.range === "custom" ? `<div class="date-inputs"><label>From<input type="date" id="fromDate" value="${BareBeauty.state.from}" /></label><label>To<input type="date" id="toDate" value="${BareBeauty.state.to}" /></label></div>` : ""}
         <p class="small muted" ${invalid ? 'role="alert"' : ""}>${invalid ? label : `Showing ${label}`}</p>`
      : `<p class="small muted">Current stock as of ${dateText(new Date())}. Date filters apply to Inventory Summary and Stock Movement.</p>`;

    root.innerHTML = `<div class="report-tabs" role="group" aria-label="Report type">${BareBeauty.config.REPORTS.map(([id, name]) => `<button type="button" class="chip${BareBeauty.state.report === id ? " active" : ""}" data-report="${id}" aria-pressed="${BareBeauty.state.report === id}">${name}</button>`).join("")}</div>
      <div class="filter-bar">${rangeControls}<button type="button" class="button secondary export-button" data-action="export-csv">Export CSV</button></div>
      ${reportBody(BareBeauty.state.products, history, moves, label, invalid)}`;
    if (focusSelector) root.querySelector(focusSelector)?.focus();
  } catch (error) {
    showPageError(root, error.message);
  }
}

// Sanitizes CSV field against formula injection (=, +, -, @)
function csvCell(value) {
  let text = String(value ?? "");
  if (typeof value === "string" && /^[=+\-@]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function reportCsv() {
  const { products, history, moves } = BareBeauty.state.lastReport;
  const filename = `bare-beauty-${BareBeauty.state.report}-report-${toInputDate(new Date())}.csv`;
  const totalValue = sumBy(products, (p) => p.price * p.stock);
  const value = (p) => p.price * p.stock;

  if (BareBeauty.state.report === "summary") {
    const rows = BareBeauty.config.CATEGORIES.map((name) => {
      const items = products.filter((p) => p.category === name);
      return [name, items.length, sumBy(items, (p) => p.stock), items.filter((p) => p.status === "Low Stock").length, items.filter((p) => p.status === "Out of Stock").length, sumBy(items, value)];
    });
    rows.push(["Total", products.length, sumBy(products, (p) => p.stock), products.filter((p) => p.status === "Low Stock").length, products.filter((p) => p.status === "Out of Stock").length, totalValue]);
    return { filename, head: ["Category", "Products", "Units", "Low Stock", "Out of Stock", "Retail Value (PHP)"], rows };
  }
  if (BareBeauty.state.report === "movement") {
    const rows = moves.map((e) => [dateTimeText(e.createdAt), e.productName, e.productId, e.type === "in" ? "Stock In" : "Stock Out", e.type === "in" ? e.quantity : -e.quantity, BareBeauty.modules.history.previousStockOf(e), e.stockAfter, e.performedBy || BareBeauty.config.ADMIN.name, e.note || ""]);
    return { filename, head: ["Date & Time", "Product", "Product ID", "Movement", "Quantity", "Previous Stock", "Updated Stock", "Performed By", "Note"], rows };
  }
  if (BareBeauty.state.report === "low") {
    const rows = products.filter((p) => p.status === "Low Stock").sort((a, b) => a.stock - b.stock).map((p) => [productLabel(p), p.productId, p.category, p.stock, p.reorderLevel, Math.max(0, p.reorderLevel - p.stock)]);
    return { filename, head: ["Product", "Product ID", "Category", "On Hand", "Reorder Level", "Below Reorder By"], rows };
  }
  if (BareBeauty.state.report === "out") {
    const rows = products.filter((p) => p.status === "Out of Stock").map((p) => [productLabel(p), p.productId, p.category, p.price, outSince(p, history), p.reorderLevel]);
    return { filename, head: ["Product", "Product ID", "Category", "Price (PHP)", "Out Since", "Reorder Level"], rows };
  }
  const rows = [...products].sort((a, b) => value(b) - value(a)).map((p) => [productLabel(p), p.productId, p.category, p.price, p.stock, value(p), totalValue ? Math.round((value(p) / totalValue) * 100) + "%" : "0%"]);
  return { filename, head: ["Product", "Product ID", "Category", "Price (PHP)", "Units", "Retail Value (PHP)", "Share"], rows };
}

async function exportCsv() {
  if (!BareBeauty.state.lastReport) return;
  const { filename, head, rows } = reportCsv();
  const lines = [head, ...rows].map((row) => row.map(csvCell).join(","));
  const csv = "\ufeff" + lines.join("\r\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast(`Exported ${plural(rows.length, "row")} to ${filename}`);
}

BareBeauty.modules.reports = {
  render: renderReports,
  exportCsv,
  reportCsv,
  rangeBounds,
  reportBody,
};
