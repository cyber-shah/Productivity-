// ─── FocusGuard Content Script ───────────────────────────────────────────────

(async () => {
  const hostname = window.location.hostname.replace("www.", "");

  // Read directly from storage — no message passing, always works
  let data;
  try {
    data = await chrome.storage.local.get(["blockedSites", "settings"]);
  } catch (e) {
    return;
  }

  const blockedSites = data.blockedSites || [
    "youtube.com", "instagram.com", "twitter.com", "x.com",
    "facebook.com", "tiktok.com", "reddit.com", "netflix.com",
    "twitch.tv", "pinterest.com"
  ];

  const site = blockedSites.find(s => hostname.includes(s));
  if (!site) return;

  const settings = data.settings || {};
  const message = settings.message || "Are you sure? You planned to study.";

  // Log the warning directly to storage
  logWarning(site);

  // Freeze the page scroll
  document.documentElement.style.overflow = "hidden";

  // Build Overlay
  const overlay = document.createElement("div");
  overlay.id = "focusguard-overlay";
  overlay.innerHTML = `
    <div class="fg-backdrop"></div>
    <div class="fg-card">
      <div class="fg-icon-wrap">
        <div class="fg-icon">🛡️</div>
        <div class="fg-rings">
          <span></span><span></span><span></span>
        </div>
      </div>
      <div class="fg-label">FOCUS GUARD</div>
      <h1 class="fg-title">${message}</h1>
      <p class="fg-sub">You're about to visit <strong>${hostname}</strong>.<br>This might break your focus session.</p>
      <div class="fg-timer-wrap">
        <div class="fg-timer-bar"><div class="fg-timer-fill" id="fg-timer-fill"></div></div>
        <span class="fg-timer-text" id="fg-timer-text">Taking you back in 10s...</span>
      </div>
      <div class="fg-actions">
        <button class="fg-btn fg-btn-back" id="fg-back">← Go Back</button>
        <button class="fg-btn fg-btn-proceed" id="fg-proceed">Proceed Anyway</button>
      </div>
      <p class="fg-guilt">Every distraction costs you momentum. Stay strong.</p>
    </div>
  `;

  document.documentElement.appendChild(overlay);

  // Countdown Timer
  let countdown = 10;
  const timerFill = document.getElementById("fg-timer-fill");
  const timerText = document.getElementById("fg-timer-text");

  const interval = setInterval(() => {
    countdown--;
    const pct = (countdown / 10) * 100;
    timerFill.style.width = pct + "%";
    if (countdown <= 0) {
      clearInterval(interval);
      goBack();
    } else {
      timerText.textContent = "Taking you back in " + countdown + "s...";
    }
  }, 1000);

  function goBack() {
    clearInterval(interval);
    overlay.classList.add("fg-fade-out");
    setTimeout(() => {
      history.back();
      setTimeout(() => { window.location.href = "chrome://newtab"; }, 300);
    }, 400);
  }

  function proceed() {
    clearInterval(interval);
    logBypass(site);
    overlay.classList.add("fg-fade-out");
    setTimeout(() => {
      overlay.remove();
      document.documentElement.style.overflow = "";
    }, 400);
  }

  document.getElementById("fg-back").addEventListener("click", goBack);
  document.getElementById("fg-proceed").addEventListener("click", proceed);

  requestAnimationFrame(() => {
    overlay.classList.add("fg-visible");
  });

  // Storage helpers — no background service worker needed
  async function logWarning(site) {
    const today = new Date().toISOString().split("T")[0];
    const d = await chrome.storage.local.get(["dailyData"]);
    const dailyData = d.dailyData || {};
    if (!dailyData[today]) dailyData[today] = {};
    if (!dailyData[today][site]) dailyData[today][site] = { timeSpent: 0, warnings: 0, bypassed: 0 };
    dailyData[today][site].warnings += 1;
    chrome.storage.local.set({ dailyData });
  }

  async function logBypass(site) {
    const today = new Date().toISOString().split("T")[0];
    const d = await chrome.storage.local.get(["dailyData"]);
    const dailyData = d.dailyData || {};
    if (!dailyData[today]) dailyData[today] = {};
    if (!dailyData[today][site]) dailyData[today][site] = { timeSpent: 0, warnings: 0, bypassed: 0 };
    dailyData[today][site].bypassed += 1;
    chrome.storage.local.set({ dailyData });
  }
})();
