function formatTime(seconds) {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

function renderHistory() {
  chrome.storage.local.get(["history"], (res) => {
    const list = document.getElementById("list");
    const emptyState = document.getElementById("emptyState");
    const history = res.history || [];

    list.innerHTML = "";
    
    if (history.length === 0) {
      emptyState.style.display = "block";
      return;
    }

    emptyState.style.display = "none";

    history.forEach((item, index) => {
      const li = document.createElement("li");
      li.className = "history-item";
      li.innerHTML = `
        <div class="item-content" data-url="${item.url}">
          <span class="item-title" title="${item.title}">${item.title}</span>
          <span class="item-url">${item.url}</span>
          <div class="item-meta">
            <span class="item-time">⏱ ${formatTime(item.timeSpent)}</span>
            <span>${item.visitedAt}</span>
          </div>
        </div>
        <div class="actions">
          <button class="btn-action copy" data-url="${item.url}" title="Copy Link">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
          <button class="btn-action delete" data-index="${index}" title="Delete record">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      `;
      list.appendChild(li);
    });

    // Handle Item Clicks (Open Link)
    document.querySelectorAll(".item-content").forEach(el => {
      el.addEventListener("click", (e) => {
        const url = e.currentTarget.getAttribute("data-url");
        if (url) {
          chrome.tabs.create({ url, active: true });
        }
      });
    });

    // Handle Copy Clicks
    document.querySelectorAll(".btn-action.copy").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation(); // Prevent opening the link
        const url = e.currentTarget.getAttribute("data-url");
        copyToClipboard(url);
      });
    });

    // Handle Delete Clicks
    document.querySelectorAll(".delete").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation(); // Prevent opening the link
        const index = e.currentTarget.getAttribute("data-index");
        deleteItem(index);
      });
    });
  });
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast("Link copied to clipboard!");
  });
}

function showToast(message) {
  const existing = document.querySelector(".copy-toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = "copy-toast";
  toast.innerText = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translate(-50%, 20px)";
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

function deleteItem(index) {
  chrome.storage.local.get(["history"], (res) => {
    const history = res.history || [];
    history.splice(index, 1);
    chrome.storage.local.set({ history }, () => {
      renderHistory();
    });
  });
}

document.getElementById("clearAll").addEventListener("click", () => {
  if (confirm("Are you sure you want to clear all history?")) {
    chrome.storage.local.set({ history: [] }, () => {
      renderHistory();
    });
  }
});

// Initial render
renderHistory();
