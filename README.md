# 🛡️ FocusGuard – Productivity Blocker Chrome Extension

A Chrome extension that intercepts visits to distracting websites and helps you stay focused with a real-time productivity score.

---

## 📦 How to Install (No coding needed)

1. **Download** this folder to your computer
2. Open Chrome and go to: `chrome://extensions/`
3. Toggle **"Developer mode"** ON (top right corner)
4. Click **"Load unpacked"**
5. Select the `productivity-blocker` folder
6. ✅ Done! The 🛡️ icon will appear in your toolbar

---

## ✨ Features

- **Instant blocking overlay** on YouTube, Instagram, Twitter/X, TikTok, Reddit, Facebook, Netflix, Twitch, Pinterest
- **10-second countdown** auto-redirects you back
- **"Proceed Anyway"** option (but it counts against your score)
- **Daily Productivity Score** (0–100) based on warnings & time spent
- **🔥 Streak tracker** for consecutive productive days
- **Time tracking** per distraction site
- **Custom warning message** — write your own motivational message
- **Add/remove blocked sites** from the settings panel

---

## 🎯 Productivity Score Formula

| Action | Points |
|---|---|
| Start of day | 100 |
| Warning shown | -2 |
| Bypassed warning | -8 |
| Every 3 min on blocked sites | -1 |

**Grades:**
- 90–100 → 🏆 Excellent
- 75–89  → 💪 Great Focus
- 55–74  → 😐 Average
- 30–54  → ⚠️ Distracted
- 0–29   → 🔴 Off Track

---

## 🗂️ File Structure

```
productivity-blocker/
├── manifest.json     ← Extension config
├── background.js     ← Core logic, time tracking, storage
├── content.js        ← Overlay injected into blocked sites
├── styles.css        ← Overlay styling
├── popup.html        ← Dashboard UI
├── popup.js          ← Dashboard logic
└── icons/            ← Extension icons
```

---

## 🔧 Customization

Click the 🛡️ icon in Chrome → Settings tab to:
- Change the warning message
- Add or remove blocked sites
