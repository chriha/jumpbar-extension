// Service worker: owns all browser-API access (tabs, history, sessions, search).

const MAX_RESULTS = 10;

// ---------- helpers ----------

function looksLikeUrl(input) {
  const s = input.trim();
  if (!s || /\s/.test(s)) return false;
  if (/^https?:\/\//i.test(s) || /^www\./i.test(s)) return true;
  if (/^localhost(:\d+)?(\/\S*)?$/i.test(s)) return true;
  return /^[\w-]+(\.[\w-]+)*\.[a-z]{2,}(:\d+)?(\/\S*)?$/i.test(s);
}

function normalizeUrl(input) {
  const s = input.trim();
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(s) ? s : `https://${s}`;
}

/** Every whitespace-separated token must match; returns 0 for no match. */
function score(query, title, url) {
  if (!query) return 1;
  const t = (title || "").toLowerCase();
  const u = (url || "").toLowerCase().replace(/^https?:\/\/(www\.)?/, "");
  let total = 0;
  for (const token of query.split(/\s+/)) {
    let s = 0;
    if (t.startsWith(token)) s = 100;
    else if (t.includes(` ${token}`)) s = 70;
    else if (t.includes(token)) s = 50;
    else if (u.startsWith(token)) s = 60;
    else if (u.includes(token)) s = 30;
    if (!s) return 0;
    total += s;
  }
  return total;
}

const isWebUrl = (url) => {
  try { return ["http:", "https:"].includes(new URL(url).protocol); } catch { return false; }
};

function isNoise(url) {
  return !url || url.startsWith("chrome://newtab") || url.startsWith("chrome-search://");
}

// ---------- search ----------

async function search(rawQuery, currentTab) {
  const query = rawQuery.trim().toLowerCase();

  const settings = await chrome.storage.sync.get({ includePrivate: false });
  // With private/regular mixing off, a private window must not surface regular browsing (closed tabs, history).
  const hideRegular = !settings.includePrivate && !!currentTab?.incognito;

  const [tabs, closed, history] = await Promise.all([
    chrome.tabs.query({}),
    hideRegular ? Promise.resolve([]) : chrome.sessions.getRecentlyClosed({ maxResults: 25 }),
    query && !hideRegular
      ? chrome.history.search({ text: rawQuery.trim(), maxResults: 40, startTime: 0 })
      : Promise.resolve([]),
  ]);

  // The tab the palette is opened from is never a result, so Cmd+K, Enter jumps to the previous tab.
  const seen = new Set(currentTab?.url ? [currentTab.url] : []);
  const results = [];

  // 1. Open tabs (highest priority)
  const openItems = tabs
    .filter((t) => !isNoise(t.url) && t.id !== currentTab?.id && (settings.includePrivate || t.incognito === !!currentTab?.incognito))
    .map((t) => ({
      kind: "open",
      title: t.title || t.url,
      url: t.url,
      tabId: t.id,
      windowId: t.windowId,
      rank: score(query, t.title, t.url),
      recency: t.lastAccessed || 0,
    }))
    .filter((i) => i.rank > 0)
    .sort((a, b) => b.rank - a.rank || b.recency - a.recency);
  for (const i of openItems) {
    seen.add(i.url);
    results.push(i);
  }

  // 2. Recently closed tabs
  const closedItems = [];
  for (const s of closed) {
    const tabsInSession = s.tab ? [s.tab] : s.window?.tabs ?? [];
    for (const t of tabsInSession) {
      if (isNoise(t.url) || seen.has(t.url)) continue;
      const rank = score(query, t.title, t.url);
      if (rank > 0) {
        closedItems.push({
          kind: "closed",
          title: t.title || t.url,
          url: t.url,
          sessionId: t.sessionId ?? s.window?.sessionId,
          rank,
        });
      }
    }
  }
  closedItems.sort((a, b) => b.rank - a.rank);
  for (const i of closedItems) {
    if (seen.has(i.url)) continue;
    seen.add(i.url);
    results.push(i);
  }

  // 3. History
  for (const h of history) {
    if (isNoise(h.url) || !isWebUrl(h.url) || seen.has(h.url)) continue;
    seen.add(h.url);
    results.push({ kind: "history", title: h.title || h.url, url: h.url });
  }

  const capped = results.slice(0, MAX_RESULTS);

  // 4. Direct URL / web search actions
  const actions = [];
  if (query && looksLikeUrl(rawQuery)) {
    actions.push({ kind: "url", title: rawQuery.trim(), url: normalizeUrl(rawQuery) });
  }
  if (query) {
    actions.push({ kind: "search", title: rawQuery.trim(), text: rawQuery.trim() });
  }

  return actions[0]?.kind === "url"
    ? [actions[0], ...capped, ...actions.slice(1)]
    : [...capped, ...actions];
}

// ---------- activate ----------

// Messages come from our own content scripts, which run inside web pages. Treat their payload as
// untrusted: validate every field and never open anything that wasn't an http(s) URL.
const isId = (n) => Number.isInteger(n) && n >= 0;

async function activate(item) {
  if (!item || typeof item !== "object") throw new Error("bad item");
  switch (item.kind) {
    case "open":
      if (!isId(item.tabId) || !isId(item.windowId)) throw new Error("bad ids");
      await chrome.tabs.update(item.tabId, { active: true });
      await chrome.windows.update(item.windowId, { focused: true });
      break;
    case "closed":
      if (typeof item.sessionId !== "string") throw new Error("bad session");
      await chrome.sessions.restore(item.sessionId);
      break;
    case "history":
    case "url":
      if (typeof item.url !== "string" || !isWebUrl(item.url)) throw new Error("bad url");
      await chrome.tabs.create({ url: item.url });
      break;
    case "engine": {
      // Only open URLs on a site the user has configured as a search engine, over https.
      if (typeof item.url !== "string") throw new Error("bad url");
      const target = new URL(item.url);
      const { engines = [] } = await chrome.storage.sync.get({ engines: [] });
      const known = engines.some((e) => {
        try { return new URL(e.url).origin === target.origin; } catch { return false; }
      });
      if (target.protocol !== "https:" || !known) throw new Error("unknown engine");
      await chrome.tabs.create({ url: target.href });
      break;
    }
    case "search":
      if (typeof item.text !== "string" || !item.text.trim() || item.text.length > 2000) throw new Error("bad text");
      await chrome.search.query({ text: item.text, disposition: "NEW_TAB" });
      break;
    default:
      throw new Error("unknown kind");
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id || !msg || typeof msg !== "object") return;
  if (msg.type === "search" && typeof msg.query === "string") {
    search(msg.query.slice(0, 500), sender.tab).then(sendResponse, () => sendResponse([]));
    return true;
  }
  if (msg.type === "options") {
    chrome.runtime.openOptionsPage();
    return;
  }
  if (msg.type === "activate") {
    activate(msg.item).then(() => sendResponse(true), () => sendResponse(false));
    return true;
  }
});

// ---------- toggling ----------

async function inject(tabId) {
  await chrome.scripting.executeScript({ target: { tabId }, files: ["palette.js", "content.js"] });
}

async function togglePalette() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  try {
    await chrome.tabs.sendMessage(tab.id, { type: "toggle" });
  } catch {
    try {
      // First use on this page: inject on demand (the keypress/click grants activeTab).
      await inject(tab.id);
      await chrome.tabs.sendMessage(tab.id, { type: "toggle" });
    } catch {
      // Restricted page (chrome://, Web Store, PDF viewer…): the overlay can't be shown there.
    }
  }
}

chrome.commands.onCommand.addListener((command) => {
  if (command === "toggle-palette") togglePalette();
});
chrome.action.onClicked.addListener(togglePalette);
