// =====================================================================
// BARE BEAUTY INVENTORY MANAGEMENT SYSTEM (IMS)
// Movement History & Stock Audit Trail Module
// =====================================================================

window.BareBeauty = window.BareBeauty || {};
BareBeauty.modules = BareBeauty.modules || {};

const HISTORY_HEAD = [
  ["Date & Time"],
  ["Product"],
  ["Movement"],
  ["Quantity", 1],
  ["Previous Stock", 1],
  ["Updated Stock", 1],
  ["Performed By"],
];
window.HISTORY_HEAD = HISTORY_HEAD;

function previousStockOf(entry) {
  if (typeof entry.previousStock === "number") return entry.previousStock;
  return entry.type === "in" ? entry.stockAfter - entry.quantity : entry.stockAfter + entry.quantity;
}

function movementPill(type) {
  return `<span class="status ${type === "in" ? "in" : "low"}">${type === "in" ? "Stock In" : "Stock Out"}</span>`;
}

function historyRow(entry) {
  return `<tr>
    <td>${dateTimeText(entry.createdAt)}</td>
    <td><strong>${escapeHtml(entry.productName)}</strong><small>${escapeHtml(entry.productId)}</small></td>
    <td>${movementPill(entry.type)}${entry.note ? `<small>${escapeHtml(entry.note)}</small>` : ""}</td>
    <td class="num"><strong>${entry.type === "in" ? "+" : "−"}${entry.quantity}</strong></td>
    <td class="num">${previousStockOf(entry)}</td>
    <td class="num">${entry.stockAfter}</td>
    <td>${escapeHtml(entry.performedBy || BareBeauty.config.ADMIN.name)}</td>
  </tr>`;
}

function filteredHistory() {
  const search = BareBeauty.state.historySearch.trim().toLowerCase();
  const from = BareBeauty.state.historyFrom ? new Date(`${BareBeauty.state.historyFrom}T00:00:00`) : null;
  const toStart = BareBeauty.state.historyTo ? new Date(`${BareBeauty.state.historyTo}T00:00:00`) : null;
  const to = toStart ? new Date(toStart.getFullYear(), toStart.getMonth(), toStart.getDate() + 1) : null;

  if (from && to && from >= to) return null;

  return BareBeauty.state.history.filter((entry) => {
    const time = new Date(entry.createdAt);
    const text = `${entry.productName} ${entry.productId} ${entry.note || ""}`.toLowerCase();
    return (
      (!search || text.includes(search)) &&
      (!BareBeauty.state.historyType || entry.type === BareBeauty.state.historyType) &&
      (!from || time >= from) &&
      (!to || time < to)
    );
  });
}

function updateHistoryTable() {
  const entries = filteredHistory();
  const note = $("#historyNote");
  const rowsEl = $("#historyRows");

  if (entries === null) {
    if (note) {
      note.textContent = "The From date must be on or before the To date.";
      note.setAttribute("role", "alert");
    }
    if (rowsEl) rowsEl.innerHTML = `<tr><td colspan="7" class="empty">Choose a valid date range.</td></tr>`;
    return;
  }

  if (note) {
    note.removeAttribute("role");
    note.textContent = `Showing ${entries.length} of ${plural(BareBeauty.state.history.length, "movement")}`;
  }
  if (rowsEl) {
    rowsEl.innerHTML = entries.length
      ? entries.map(historyRow).join("")
      : `<tr><td colspan="7" class="empty">No stock movements match these filters.</td></tr>`;
  }
}

async function renderHistory() {
  const root = $("#historyPage");
  if (!root) return;

  try {
    BareBeauty.state.history = await BareBeauty.api("/inventory-history?limit=1000");
  } catch (error) {
    showPageError(root, error.message);
    return;
  }

  root.innerHTML = `<div class="toolbar toolbar-wrap">
      <input class="search" id="historySearch" type="search" aria-label="Search movements" placeholder="Search by product, ID, or note…" value="${escapeHtml(BareBeauty.state.historySearch)}" />
      <select id="historyType" aria-label="Filter by movement"><option value="">All Movements</option><option value="in" ${BareBeauty.state.historyType === "in" ? "selected" : ""}>Stock In</option><option value="out" ${BareBeauty.state.historyType === "out" ? "selected" : ""}>Stock Out</option></select>
      <label class="date-field">From <input type="date" id="historyFrom" value="${BareBeauty.state.historyFrom}" /></label>
      <label class="date-field">To <input type="date" id="historyTo" value="${BareBeauty.state.historyTo}" /></label>
      <button type="button" class="mini-button" data-action="clear-history">Clear</button>
    </div>
    <p class="result-count small muted" id="historyNote"></p>
    <div class="table-wrap table-wide" tabindex="0" role="region" aria-label="Stock movements, scrollable">
      <table aria-label="Stock movements">
        <thead><tr>${HISTORY_HEAD.map(([text, num]) => `<th scope="col"${num ? ' class="num"' : ""}>${text}</th>`).join("")}</tr></thead>
        <tbody id="historyRows"></tbody>
      </table>
    </div>`;

  updateHistoryTable();
}

BareBeauty.modules.history = {
  render: renderHistory,
  updateTable: updateHistoryTable,
  filteredHistory,
  historyRow,
  movementPill,
  previousStockOf,
};
