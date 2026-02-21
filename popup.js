// ─── FocusGuard Popup Logic ──────────────────────────────────────────────────

// ── Tab Switching ─────────────────────────────────────────────────────────────
document.getElementById("tab-stats").addEventListener("click", () => switchTab("stats"));
document.getElementById("tab-settings").addEventListener("click", () => switchTab("settings"));

function switchTab(tab) {
  document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  document.getElementById(`panel-${tab}`).classList.add("active");
  document.getElementById(`tab-${tab}`).classList.add("active");
}

// ── Grade System ──────────────────────────────────────────────────────────────
function getGrade(score) {
  if (score >= 90) return { label: "🏆 Excellent", color: "#34d399", sub: "You're killing it today!" };
  if (score >= 75) return { label: "💪 Great Focus", color: "#6366f1", sub: "Stay on track!" };
  if (score >= 55) return { label: "😐 Average", color: "#fbbf24", sub: "You can do better." };
  if (score >= 30) return { label: "⚠️ Distracted", color: "#f97316", sub: "Too many distractions." };
  return { label: "🔴 Off Track", color: "#f87171", sub: "Refocus and start fresh." };
}

function formatTime(seconds) {
  if (!seconds) return "0";
  const m = Math.round(seconds / 60);
  return m < 1 ? "<1" : String(m);
}

// ── Score Calculator (duplicated here so popup doesn't need background) ───────
function calculateScore(todayData) {
  let score = 100;
  for (const site in todayData) {
    const d = todayData[site];
    score -= (d.warnings || 0) * 2;
    score -= (d.bypassed || 0) * 8;
    score -= Math.floor((d.timeSpent || 0) / 180);
  }
  return Math.max(0, Math.min(100, score));
}

// ── Load Stats (reads directly from chrome.storage — no message passing) ──────
async function loadStats() {
  const today = new Date().toISOString().split("T")[0];
  const data = await chrome.storage.local.get(["dailyData", "streakData"]);

  const dailyData = data.dailyData || {};
  const todayData = dailyData[today] || {};
  const streakData = data.streakData || { streak: 0 };
  const score = calculateScore(todayData);

  // Streak
  document.getElementById("streak-count").textContent = streakData.streak || 0;

  // Score ring
  const scoreNum = document.getElementById("score-num");
  const ringFill = document.getElementById("ring-fill");
  const circumference = 283;

  scoreNum.textContent = score;
  const offset = circumference - (score / 100) * circumference;
  setTimeout(() => {
    ringFill.style.strokeDashoffset = offset;
  }, 100);

  const grade = getGrade(score);
  document.getElementById("score-grade").textContent = grade.label;
  document.getElementById("score-grade").style.color = grade.color;
  document.getElementById("score-sub").textContent = grade.sub;

  // Stats
  let totalWarnings = 0, totalBypassed = 0, totalTime = 0;
  const siteList = document.getElementById("site-list");
  siteList.innerHTML = "";

  for (const site in todayData) {
    const d = todayData[site];
    totalWarnings += d.warnings || 0;
    totalBypassed += d.bypassed || 0;
    totalTime += d.timeSpent || 0;

    const el = document.createElement("div");
    el.className = "site-item";
    el.innerHTML = `
      <div class="site-left">
        <div class="site-dot"></div>
        <span>${site}</span>
      </div>
      <span class="site-time">${formatTime(d.timeSpent)}m · ${d.bypassed || 0} bypassed</span>
    `;
    siteList.appendChild(el);
  }

  if (Object.keys(todayData).length === 0) {
    siteList.innerHTML = `<div class="no-data">No distractions today 🎉</div>`;
  }

  document.getElementById("stat-warnings").textContent = totalWarnings;
  document.getElementById("stat-bypassed").textContent = totalBypassed;
  document.getElementById("stat-time").textContent = formatTime(totalTime);
}

// ── Load Settings ─────────────────────────────────────────────────────────────
let blockedSites = [];

async function loadSettings() {
  const data = await chrome.storage.local.get(["settings", "blockedSites"]);
  const settings = data.settings || {};
  blockedSites = data.blockedSites || [];

  document.getElementById("setting-message").value =
    settings.message || "Are you sure? You planned to study.";

  renderSiteTags();
}

function renderSiteTags() {
  const container = document.getElementById("site-tags");
  container.innerHTML = "";
  blockedSites.forEach((site, i) => {
    const tag = document.createElement("div");
    tag.className = "site-tag";
    tag.innerHTML = `${site} <button data-i="${i}">×</button>`;
    tag.querySelector("button").addEventListener("click", () => {
      blockedSites.splice(i, 1);
      renderSiteTags();
    });
    container.appendChild(tag);
  });
}

document.getElementById("add-site-btn").addEventListener("click", () => {
  const input = document.getElementById("new-site-input");
  const val = input.value.trim().replace(/^https?:\/\/(www\.)?/, "").replace(/\/.*$/, "");
  if (val && !blockedSites.includes(val)) {
    blockedSites.push(val);
    renderSiteTags();
    input.value = "";
  }
});

document.getElementById("new-site-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") document.getElementById("add-site-btn").click();
});

document.getElementById("save-btn").addEventListener("click", async () => {
  const message = document.getElementById("setting-message").value.trim();

  await chrome.storage.local.set({
    settings: { message: message || "Are you sure? You planned to study." },
    blockedSites: blockedSites
  });

  const confirm = document.getElementById("save-confirm");
  confirm.classList.add("show");
  setTimeout(() => confirm.classList.remove("show"), 2000);
});

// ── Init ──────────────────────────────────────────────────────────────────────
loadStats();
loadSettings();
