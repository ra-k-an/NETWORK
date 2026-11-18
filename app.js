const STORAGE_KEY = "network-dashboard-v1";
const defaults = {
  bundle: 5,
  used: 0,
  renewal: "",
  history: [],
  lowAlert: true,
  notifications: false
};

let state = loadState();
let installPrompt = null;

const $ = (id) => document.getElementById(id);
const bundleDialog = $("bundleDialog");
const usageDialog = $("usageDialog");
const settingsDialog = $("settingsDialog");

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    return saved && typeof saved === "object"
      ? { ...defaults, ...saved, history: Array.isArray(saved.history) ? saved.history : [] }
      : { ...defaults };
  } catch {
    return { ...defaults };
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    toast("Could not save locally. Check browser storage settings.");
  }
}

function number(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function formatGB(value) {
  return `${Math.max(0, value).toFixed(value < 10 ? 2 : 1)} GB`;
}

function render() {
  const bundle = Math.max(0, number(state.bundle));
  const used = Math.max(0, number(state.used));
  const remaining = Math.max(0, bundle - used);
  const percentUsed = bundle > 0 ? Math.min(100, used / bundle * 100) : 0;
  const percentLeft = bundle > 0 ? Math.round(remaining / bundle * 100) : 0;

  $("remainingValue").innerHTML = `${remaining.toFixed(2)}<span> GB</span>`;
  $("usedValue").textContent = formatGB(used);
  $("bundleValue").textContent = formatGB(bundle);
  $("remainingPercent").textContent = `${percentLeft}%`;
  $("usedLabel").textContent = `${formatGB(used)} used`;
  $("totalLabel").textContent = `of ${formatGB(bundle)}`;
  $("usageBar").style.width = `${percentUsed}%`;
  $("usageBar").style.background = percentLeft <= 20
    ? "linear-gradient(90deg,#a90e32,#ff3151)"
    : "linear-gradient(90deg,#a90e32,#ff4260)";

  if (state.renewal) {
    const date = new Date(`${state.renewal}T12:00:00`);
    $("cycleDate").textContent = Number.isNaN(date.getTime())
      ? "Date not set"
      : date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.ceil((date - today) / 86400000);
    $("cycleHint").textContent = diff > 0 ? `${diff} day${diff === 1 ? "" : "s"} until renewal`
      : diff === 0 ? "Bundle renews today" : "Renewal date has passed";
  } else {
    $("cycleDate").textContent = "Not set";
    $("cycleHint").textContent = "Set your renewal date to begin.";
  }

  renderHistory();

  if (state.lowAlert && bundle > 0 && percentLeft <= 20) {
    $("remainingValue").classList.add("warning");
    $("cycleHint").textContent = `${percentLeft}% remaining — consider enabling data saver.`;
  } else {
    $("remainingValue").classList.remove("warning");
  }
}

function renderHistory() {
  const host = $("historyList");
  if (!state.history.length) {
    host.innerHTML = `<div class="empty-state"><span>◌</span><strong>No activity yet</strong><small>Log usage to build your history.</small></div>`;
    return;
  }
  host.innerHTML = state.history.slice().reverse().map(item => {
    const safeNote = escapeHTML(item.note || "Data usage");
    const date = new Date(item.date);
    const dateText = Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
    return `<div class="history-item">
      <div class="history-bullet">↓</div>
      <div class="history-info"><strong>${safeNote}</strong><small>${escapeHTML(dateText)}</small></div>
      <div class="history-amount">-${formatGB(number(item.amount))}</div>
    </div>`;
  }).join("");
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function toast(message) {
  const el = $("toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove("show"), 2600);
}

function openBundleDialog() {
  $("bundleInput").value = state.bundle;
  $("usedInput").value = state.used;
  $("renewalInput").value = state.renewal || "";
  bundleDialog.showModal();
}

$("editBundleBtn").addEventListener("click", openBundleDialog);
$("quickEditBtn").addEventListener("click", openBundleDialog);
$("addUsageBtn").addEventListener("click", () => {
  $("amountInput").value = "";
  $("noteInput").value = "";
  usageDialog.showModal();
});
$("settingsBtn").addEventListener("click", () => {
  $("alertToggle").checked = state.lowAlert;
  settingsDialog.showModal();
});

$("bundleForm").addEventListener("submit", event => {
  event.preventDefault();
  const bundle = Number($("bundleInput").value);
  const used = Number($("usedInput").value);
  if (!Number.isFinite(bundle) || bundle <= 0 || !Number.isFinite(used) || used < 0) {
    toast("Enter valid bundle and usage amounts.");
    return;
  }
  state.bundle = bundle;
  state.used = used;
  state.renewal = $("renewalInput").value;
  saveState();
  render();
  bundleDialog.close();
  toast("Bundle settings saved.");
  maybeNotify();
});

$("usageForm").addEventListener("submit", event => {
  event.preventDefault();
  const amount = Number($("amountInput").value);
  if (!Number.isFinite(amount) || amount <= 0) {
    toast("Enter a usage amount greater than zero.");
    return;
  }
  const note = $("noteInput").value.trim() || "Data usage";
  state.used = number(state.used) + amount;
  state.history.push({ amount, note, date: new Date().toISOString() });
  state.history = state.history.slice(-100);
  saveState();
  render();
  usageDialog.close();
  toast("Usage added to your history.");
  maybeNotify();
});

$("settingsForm").addEventListener("submit", event => {
  event.preventDefault();
  state.lowAlert = $("alertToggle").checked;
  saveState();
  render();
  settingsDialog.close();
  toast("Preferences saved.");
});

$("notifyBtn").addEventListener("click", async () => {
  if (!("Notification" in window)) {
    toast("Notifications are not supported by this browser.");
    return;
  }
  const permission = await Notification.requestPermission();
  state.notifications = permission === "granted";
  saveState();
  toast(state.notifications ? "Notifications enabled." : "Notification permission not granted.");
});

$("resetBtn").addEventListener("click", () => {
  if (!confirm("Reset all NETWORK settings and usage history on this device?")) return;
  state = { ...defaults, history: [] };
  saveState();
  render();
  settingsDialog.close();
  toast("Local NETWORK data reset.");
});

$("clearHistoryBtn").addEventListener("click", () => {
  if (!state.history.length) {
    toast("There is no history to clear.");
    return;
  }
  if (!confirm("Clear usage history? Your used-data total will stay unchanged.")) return;
  state.history = [];
  saveState();
  renderHistory();
  toast("History cleared.");
});

function maybeNotify() {
  const bundle = number(state.bundle);
  const remaining = Math.max(0, bundle - number(state.used));
  const percentLeft = bundle > 0 ? remaining / bundle * 100 : 100;
  if (state.lowAlert && percentLeft <= 20) {
    toast(`Low data warning: ${percentLeft.toFixed(0)}% remaining.`);
    if (state.notifications && "Notification" in window && Notification.permission === "granted") {
      new Notification("NETWORK — Low data", {
        body: `${formatGB(remaining)} remaining from your ${formatGB(bundle)} bundle.`
      });
    }
  }
}

function scrollToSection(selector) {
  const el = document.querySelector(selector);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}
$("navUsage").addEventListener("click", event => { event.preventDefault(); scrollToSection(".stats-grid"); });
$("navTips").addEventListener("click", event => { event.preventDefault(); scrollToSection(".tips-grid"); });
$("navHistory").addEventListener("click", event => { event.preventDefault(); scrollToSection(".history-panel"); });

document.querySelectorAll(".bottom-nav a").forEach(link => {
  link.addEventListener("click", () => {
    document.querySelectorAll(".bottom-nav a").forEach(a => a.classList.remove("active"));
    link.classList.add("active");
  });
});

window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  installPrompt = event;
  $("installBtn").hidden = false;
});
$("installBtn").addEventListener("click", async () => {
  if (!installPrompt) return;
  installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
  $("installBtn").hidden = true;
});

if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => toast("Offline support could not be enabled in this browser."));
  });
}

render();
