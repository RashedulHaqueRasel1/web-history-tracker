// Initialize Heartbeat Alarm (every 10 seconds for more accurate tracking)
chrome.alarms.create("heartbeat", { periodInMinutes: 0.167 }); // ~10 seconds

// Helper to get state from storage
async function getState() {
  const res = await chrome.storage.local.get(["currentTabId", "startTime", "currentUrl"]);
  return {
    currentTabId: res.currentTabId || null,
    startTime: res.startTime || null,
    currentUrl: res.currentUrl || null
  };
}

// Helper to save state to storage
async function saveState(currentTabId, startTime, currentUrl) {
  await chrome.storage.local.set({ currentTabId, startTime, currentUrl });
}

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const now = Date.now();
  const state = await getState();

  // Save time for the previous tab
  if (state.currentTabId && state.startTime && state.currentUrl) {
    await saveOrUpdateRecord(state.currentUrl, now - state.startTime, state.currentTabId);
  }
  
  // Get the new active tab's URL
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    await saveState(activeInfo.tabId, now, tab.url);
  } catch (e) {
    await saveState(activeInfo.tabId, now, null);
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (tab.active && changeInfo.status === "complete") {
    const now = Date.now();
    const state = await getState();

    // If we were tracking this tab, save the accumulated time
    if (state.startTime && state.currentTabId === tabId && state.currentUrl) {
       await saveOrUpdateRecord(state.currentUrl, now - state.startTime, tabId);
    }
    
    // Start tracking the new/refreshed URL
    await saveState(tabId, now, tab.url);
  }
});

// Heartbeat to periodically save progress
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "heartbeat") {
    const now = Date.now();
    const state = await getState();

    if (state.currentTabId && state.startTime && state.currentUrl) {
      // Save accumulated time but DON'T reset the timer
      await saveOrUpdateRecord(state.currentUrl, now - state.startTime, state.currentTabId, true);
      // Reset start time for next period
      await saveState(state.currentTabId, now, state.currentUrl);
    }
  }
});

async function saveOrUpdateRecord(url, durationMs, tabId, isHeartbeat = false) {
  if (durationMs < 1000) return; // Ignore very small durations

  try {
    // Get tab info for title
    let tabTitle = "No title";
    try {
      const tab = await chrome.tabs.get(tabId);
      if (tab && tab.title) tabTitle = tab.title;
    } catch (e) {
      // Tab might be closed, use stored URL
    }

    if (!url || url.startsWith('chrome://')) return;

    const durationSec = Math.floor(durationMs / 1000);
    const nowStr = new Date().toLocaleString();

    const res = await chrome.storage.local.get(["history"]);
    let history = res.history || [];
    
    // Always merge with the most recent record if it's the same URL
    if (history.length > 0 && history[0].url === url) {
      history[0].timeSpent += durationSec;
      history[0].visitedAt = nowStr;
      history[0].title = tabTitle; // Update title in case it changed
    } else {
      // Only create new record if it's not a heartbeat or if URL changed
      if (!isHeartbeat) {
        history.unshift({
          title: tabTitle,
          url: url,
          timeSpent: durationSec,
          visitedAt: nowStr
        });
      }
    }

    if (history.length > 100) history = history.slice(0, 100);
    await chrome.storage.local.set({ history });
  } catch (e) {
    console.error("Tracking Error:", e);
  }
}
