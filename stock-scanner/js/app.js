"use strict";

const DATA_URL = "data/stocks.json";
const state = {
  rows: [],
  filteredRows: [],
  sortKey: "ticker",
  sortDirection: "ascending"
};

const elements = {
  refreshButton: document.getElementById("refreshButton"),
  copyButton: document.getElementById("copyButton"),
  exportButton: document.getElementById("exportButton"),
  searchInput: document.getElementById("searchInput"),
  resultsBody: document.getElementById("resultsBody"),
  status: document.getElementById("status"),
  errorMessage: document.getElementById("errorMessage"),
  signalCount: document.getElementById("signalCount"),
  scannedCount: document.getElementById("scannedCount"),
  lastUpdated: document.getElementById("lastUpdated"),
  sortButtons: [...document.querySelectorAll(".sort-button")]
};

function formatPrice(value) {
  return Number(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatDate(value) {
  if (!value) return "Unknown";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit"
      });
}

function showError(message = "") {
  elements.errorMessage.hidden = !message;
  elements.errorMessage.textContent = message;
}

function getBadgeClass(buy) {
  return buy === "WM" ? "badge-wm" : buy === "M" ? "badge-m" : "badge-w";
}

function compareRows(a, b, key) {
  if (["current", "week", "month"].includes(key)) {
    return Number(a[key]) - Number(b[key]);
  }
  return String(a[key] ?? "").localeCompare(String(b[key] ?? ""));
}

function sortRows(rows) {
  const direction = state.sortDirection === "ascending" ? 1 : -1;
  return [...rows].sort((a, b) => compareRows(a, b, state.sortKey) * direction);
}

function renderRows() {
  const rows = sortRows(state.filteredRows);
  elements.resultsBody.replaceChildren();

  if (!rows.length) {
    const tr = document.createElement("tr");
    tr.innerHTML = '<td class="empty-message" colspan="5">NOTHING TO REPORT!</td>';
    elements.resultsBody.appendChild(tr);
    return;
  }

  const fragment = document.createDocumentFragment();

  for (const row of rows) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="ticker">${row.ticker}</td>
      <td>${formatPrice(row.current)}</td>
      <td>${formatPrice(row.week)}</td>
      <td>${formatPrice(row.month)}</td>
      <td><span class="badge ${getBadgeClass(row.buy)}">${row.buy}</span></td>
    `;
    fragment.appendChild(tr);
  }

  elements.resultsBody.appendChild(fragment);
}

function applyFilter() {
  const query = elements.searchInput.value.trim().toUpperCase();
  state.filteredRows = state.rows.filter(row =>
    row.ticker.toUpperCase().includes(query) ||
    row.buy.toUpperCase().includes(query)
  );
  renderRows();
}

function updateSortIndicators() {
  for (const button of elements.sortButtons) {
    const active = button.dataset.sort === state.sortKey;
    if (active) {
      button.setAttribute("aria-sort", state.sortDirection);
    } else {
      button.removeAttribute("aria-sort");
    }
  }
}

async function loadData() {
  elements.refreshButton.disabled = true;
  elements.status.textContent = "Loading stock data...";
  showError("");

  try {
    const response = await fetch(`${DATA_URL}?v=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Unable to load data: HTTP ${response.status}`);

    const payload = await response.json();
    state.rows = Array.isArray(payload.results)
      ? payload.results.filter(row => row.buy)
      : [];
    state.filteredRows = [...state.rows];

    elements.signalCount.textContent = String(state.rows.length);
    elements.scannedCount.textContent = String(payload.scanned ?? 0);
    elements.lastUpdated.textContent = formatDate(payload.updated_at);
    elements.status.textContent = `${state.rows.length} buy signal(s) found.`;

    applyFilter();
  } catch (error) {
    state.rows = [];
    state.filteredRows = [];
    elements.signalCount.textContent = "0";
    elements.scannedCount.textContent = "0";
    elements.lastUpdated.textContent = "Unavailable";
    elements.status.textContent = "Stock data could not be loaded.";
    showError(
      "Run the GitHub Action once to generate data/stocks.json, then refresh this page. " +
      (error?.message || "")
    );
    renderRows();
  } finally {
    elements.refreshButton.disabled = false;
  }
}

async function copyBuyList() {
  const rows = sortRows(state.filteredRows);
  if (!rows.length) {
    elements.status.textContent = "There are no buy signals to copy.";
    return;
  }

  const text = rows.map(row => `${row.ticker} (${row.buy})`).join(", ");

  try {
    await navigator.clipboard.writeText(text);
    elements.status.textContent = "Buy list copied.";
  } catch {
    elements.status.textContent = "Clipboard access was blocked.";
  }
}

function exportCsv() {
  const rows = sortRows(state.filteredRows);
  if (!rows.length) {
    elements.status.textContent = "There are no buy signals to export.";
    return;
  }

  const lines = [
    ["Ticker", "Current", "Last-Week", "Last-Month", "Buy"],
    ...rows.map(row => [row.ticker, row.current, row.week, row.month, row.buy])
  ];

  const csv = lines.map(line =>
    line.map(value => `"${String(value).replaceAll('"', '""')}"`).join(",")
  ).join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "stock-buy-signals.csv";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  elements.status.textContent = "CSV exported.";
}

for (const button of elements.sortButtons) {
  button.addEventListener("click", () => {
    const key = button.dataset.sort;
    if (state.sortKey === key) {
      state.sortDirection =
        state.sortDirection === "ascending" ? "descending" : "ascending";
    } else {
      state.sortKey = key;
      state.sortDirection = "ascending";
    }
    updateSortIndicators();
    renderRows();
  });
}

elements.searchInput.addEventListener("input", applyFilter);
elements.refreshButton.addEventListener("click", loadData);
elements.copyButton.addEventListener("click", copyBuyList);
elements.exportButton.addEventListener("click", exportCsv);

updateSortIndicators();
loadData();
