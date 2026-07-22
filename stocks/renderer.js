const refreshButton = document.querySelector("#refreshButton");
const resultsBody = document.querySelector("#resultsBody");
const signalCount = document.querySelector("#signalCount");
const scannedCount = document.querySelector("#scannedCount");
const updatedAt = document.querySelector("#updatedAt");
const statusText = document.querySelector("#statusText");
const errorPanel = document.querySelector("#errorPanel");
const errorList = document.querySelector("#errorList");

function money(value) {
  return value === null ? "-" : value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function setLoading(loading) {
  refreshButton.disabled = loading;
  refreshButton.classList.toggle("loading", loading);
  refreshButton.querySelector(".button-label").textContent = loading ? "Scanning" : "Refresh";
}

function renderRows(results) {
  resultsBody.replaceChildren();

  if (results.length === 0) {
    const row = document.createElement("tr");
    row.className = "empty-row";
    const cell = document.createElement("td");
    cell.colSpan = 5;
    cell.textContent = "NOTHING TO REPORT!";
    row.append(cell);
    resultsBody.append(row);
    return;
  }

  for (const item of results) {
    const row = document.createElement("tr");
    const values = [
      { value: item.ticker, className: "ticker" },
      { value: money(item.current), className: "numeric" },
      { value: money(item.lastWeek), className: "numeric" },
      { value: money(item.lastMonth), className: "numeric" }
    ];

    for (const entry of values) {
      const cell = document.createElement("td");
      cell.className = entry.className;
      cell.textContent = entry.value;
      row.append(cell);
    }

    const buyCell = document.createElement("td");
    buyCell.className = "center";
    const badge = document.createElement("span");
    badge.className = "signal";
    badge.textContent = item.buy;
    badge.setAttribute("aria-label", item.buy === "WM" ? "Weekly and monthly buy" : `${item.buy === "W" ? "Weekly" : "Monthly"} buy`);
    buyCell.append(badge);
    row.append(buyCell);
    resultsBody.append(row);
  }
}

function renderErrors(errors) {
  errorList.replaceChildren();
  errorPanel.hidden = errors.length === 0;

  for (const error of errors) {
    const item = document.createElement("li");
    item.textContent = `${error.ticker}: ${error.message}`;
    errorList.append(item);
  }
}

async function scan() {
  setLoading(true);
  statusText.textContent = "Scanning Yahoo Finance data...";

  try {
    const payload = await window.stockApp.scan();
    renderRows(payload.results);
    renderErrors(payload.errors);
    signalCount.textContent = String(payload.results.length);
    scannedCount.textContent = String(payload.scanned);
    updatedAt.textContent = new Date(payload.updatedAt).toLocaleString();
    statusText.textContent = payload.results.length
      ? `${payload.results.length} buy signal${payload.results.length === 1 ? "" : "s"} found.`
      : "Scan completed. No buy signals found.";
  } catch (error) {
    renderRows([]);
    statusText.textContent = `Scan failed: ${error instanceof Error ? error.message : String(error)}`;
  } finally {
    setLoading(false);
  }
}

refreshButton.addEventListener("click", scan);
scan();
