// ─── FocusGuard Background Service Worker ───────────────────────────────────

const BLOCKED_SITES = [
  "youtube.com",
  "instagram.com",
  "twitter.com",
  "x.com",
  "facebook.com",
  "tiktok.com",
  "reddit.com",
  "netflix.com",
  "twitch.tv",
  "pinterest.com"
];

// ─── Initialize storage on install ──────────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  const today = getToday();
  chrome.storage.local.set({
    blockedSites: BLOCKED_SITES,
    sessionData: {},
    dailyData: {},
    streakData: { lastProductiveDay: null, streak: 0 },
    settings: {
      message: "Are you sure? You planned to study.",
      strictMode: false
    },
    currentDate: today
  });

  // Reset data daily
  chrome.alarms.create("dailyReset", { periodInMinutes: 60 });
});

// ─── Daily reset alarm ───────────────────────────────────────────────────────
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "dailyReset") {
    checkAndResetDaily();
  }
});

function getToday() {
  return new Date().toISOString().split("T")[0];
}

async function checkAndResetDaily() {
  const today = getToday();
  const data = await chrome.storage.local.get(["currentDate", "dailyData", "streakData"]);

  if (data.currentDate !== today) {
    // Check if yesterday was productive for streak
    const dailyData = data.dailyData || {};
    const yesterday = data.currentDate;
    const yesterdayScore = calculateScore(dailyData[yesterday] || {});

    let streakData = data.streakData || { lastProductiveDay: null, streak: 0 };
    if (yesterdayScore >= 70) {
      streakData.streak += 1;
      streakData.lastProductiveDay = yesterday;
    } else {
      streakData.streak = 0;
    }

    chrome.storage.local.set({
      currentDate: today,
      sessionData: {},
      streakData
    });
  }
}

// ─── Track active tab time ───────────────────────────────────────────────────
let activeTabInfo = { tabId: null, url: null, startTime: null };

function isBlockedSite(url) {
  if (!url) return null;
  try {
    const hostname = new URL(url).hostname.replace("www.", "");
    const blocked = BLOCKED_SITES.find(site => hostname.includes(site));
    return blocked || null;
  } catch {
    return null;
  }
}

async function saveTimeSpent(site, seconds) {
  if (!site || seconds < 1) return;
  const today = getToday();
  const data = await chrome.storage.local.get(["dailyData"]);
  const dailyData = data.dailyData || {};

  if (!dailyData[today]) dailyData[today] = {};
  if (!dailyData[today][site]) dailyData[today][site] = { timeSpent: 0, warnings: 0, bypassed: 0 };

  dailyData[today][site].timeSpent += seconds;
  chrome.storage.local.set({ dailyData });
}

function stopTracking() {
  if (activeTabInfo.startTime && activeTabInfo.url) {
    const site = isBlockedSite(activeTabInfo.url);
    if (site) {
      const seconds = Math.round((Date.now() - activeTabInfo.startTime) / 1000);
      saveTimeSpent(site, seconds);
    }
  }
  activeTabInfo = { tabId: null, url: null, startTime: null };
}

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  stopTracking();
  const tab = await chrome.tabs.get(activeInfo.tabId);
  if (tab.url && isBlockedSite(tab.url)) {
    activeTabInfo = { tabId: activeInfo.tabId, url: tab.url, startTime: Date.now() };
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.active) {
    stopTracking();
    if (tab.url && isBlockedSite(tab.url)) {
      activeTabInfo = { tabId, url: tab.url, startTime: Date.now() };
    }
  }
});

chrome.tabs.onRemoved.addListener(() => {
  stopTracking();
});

// ─── Listen for messages from content.js ────────────────────────────────────
chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {

  if (msg.type === "CHECK_URL") {
    const data = await chrome.storage.local.get(["blockedSites", "settings"]);
    const hostname = msg.hostname;
    const blocked = (data.blockedSites || BLOCKED_SITES).find(site => hostname.includes(site));
    sendResponse({ blocked: !!blocked, site: blocked || null, settings: data.settings });
    return true;
  }

  if (msg.type === "LOG_WARNING") {
    const today = getToday();
    const data = await chrome.storage.local.get(["dailyData"]);
    const dailyData = data.dailyData || {};
    if (!dailyData[today]) dailyData[today] = {};
    if (!dailyData[today][msg.site]) dailyData[today][msg.site] = { timeSpent: 0, warnings: 0, bypassed: 0 };
    dailyData[today][msg.site].warnings += 1;
    chrome.storage.local.set({ dailyData });
    sendResponse({ ok: true });
    return true;
  }

  if (msg.type === "LOG_BYPASS") {
    const today = getToday();
    const data = await chrome.storage.local.get(["dailyData"]);
    const dailyData = data.dailyData || {};
    if (!dailyData[today]) dailyData[today] = {};
    if (!dailyData[today][msg.site]) dailyData[today][msg.site] = { timeSpent: 0, warnings: 0, bypassed: 0 };
    dailyData[today][msg.site].bypassed += 1;
    chrome.storage.local.set({ dailyData });
    sendResponse({ ok: true });
    return true;
  }

  if (msg.type === "GET_STATS") {
    const today = getToday();
    const data = await chrome.storage.local.get(["dailyData", "streakData", "blockedSites"]);
    const todayData = (data.dailyData || {})[today] || {};
    const score = calculateScore(todayData);
    sendResponse({ todayData, score, streakData: data.streakData, blockedSites: data.blockedSites });
    return true;
  }

  if (msg.type === "UPDATE_SETTINGS") {
    chrome.storage.local.set({ settings: msg.settings });
    sendResponse({ ok: true });
    return true;
  }

  if (msg.type === "UPDATE_BLOCKED_SITES") {
    chrome.storage.local.set({ blockedSites: msg.sites });
    sendResponse({ ok: true });
    return true;
  }
});

// ─── Productivity Score Formula ──────────────────────────────────────────────
function calculateScore(todayData) {
  let score = 100;
  let totalTime = 0;
  let totalBypassed = 0;

  for (const site in todayData) {
    const d = todayData[site];
    totalTime += d.timeSpent || 0;
    totalBypassed += d.bypassed || 0;
    score -= (d.warnings || 0) * 2;
    score -= (d.bypassed || 0) * 8;
  }

  // Time penalty: -1 point per 3 minutes on distraction sites
  score -= Math.floor(totalTime / 180);

  return Math.max(0, Math.min(100, score));
}
