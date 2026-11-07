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

/**
 * Fuzzy subsequence match: every character of `token` must appear in `text` in order.
 * Returns 0 for no match, otherwise a score below the substring tiers (max 25),
 * higher for consecutive runs and matches that start at a word boundary.
 */
function fuzzy(token, text) {
  if (token.length < 2 || !text) return 0;
  let ti = 0;
  let run = 0;
  let bonus = 0;
  for (let i = 0; i < text.length && ti < token.length; i++) {
    if (text[i] !== token[ti]) { run = 0; continue; }
    run++;
    if (run > 1) bonus += 2;
    if (i === 0 || /[\s\-_./:]/.test(text[i - 1])) bonus += 3;
    ti++;
  }
  return ti === token.length ? Math.min(25, 8 + bonus) : 0;
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
    else s = Math.max(fuzzy(token, t), fuzzy(token, u.split("/")[0]) * 0.8);
    if (!s) return 0;
    total += s;
  }
  return total;
}

/** Frecency-style boost for history: more visits and more recent visits rank higher (0-30). */
function historyBoost(h) {
  const days = Math.max(0, (Date.now() - (h.lastVisitTime || 0)) / 86400000);
  const recency = 20 / (1 + days / 7);
  const frequency = Math.min(10, Math.log2(1 + (h.visitCount || 0)) * 2);
  return recency + frequency;
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

  const [tabs, closed, history, bookmarks] = await Promise.all([
    chrome.tabs.query({}),
    hideRegular ? Promise.resolve([]) : chrome.sessions.getRecentlyClosed({ maxResults: 25 }),
    query && !hideRegular
      ? chrome.history.search({ text: rawQuery.trim(), maxResults: 100, startTime: 0 })
      : Promise.resolve([]),
    // Bookmarks are saved on purpose, but a private window shouldn't surface regular browsing data.
    query && !hideRegular ? chrome.bookmarks.search(query).catch(() => []) : Promise.resolve([]),
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
      pinned: t.pinned,
      muted: !!t.mutedInfo?.muted,
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

  // 3. Bookmarks (folders have no url)
  const bookmarkItems = [];
  for (const b of bookmarks) {
    if (!b.url || isNoise(b.url) || !isWebUrl(b.url) || seen.has(b.url)) continue;
    bookmarkItems.push({ kind: "bookmark", title: b.title || b.url, url: b.url, rank: score(query, b.title, b.url) || 1 });
  }
  bookmarkItems.sort((a, b) => b.rank - a.rank);
  for (const i of bookmarkItems) {
    if (seen.has(i.url)) continue;
    seen.add(i.url);
    results.push(i);
  }

  // 4. History, ranked by match quality plus a visit-count/recency boost
  const historyItems = [];
  for (const h of history) {
    if (isNoise(h.url) || !isWebUrl(h.url) || seen.has(h.url)) continue;
    const match = score(query, h.title, h.url) || 1;
    historyItems.push({ kind: "history", title: h.title || h.url, url: h.url, rank: match + historyBoost(h) });
  }
  historyItems.sort((a, b) => b.rank - a.rank);
  for (const i of historyItems) {
    if (seen.has(i.url)) continue;
    seen.add(i.url);
    results.push(i);
  }

  const capped = results.slice(0, MAX_RESULTS);

  // 5. Direct URL / web search actions
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
    case "bookmark":
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

async function tabAction(action, tabId) {
  if (!isId(tabId)) throw new Error("bad id");
  const tab = await chrome.tabs.get(tabId);
  switch (action) {
    case "close": await chrome.tabs.remove(tabId); return {};
    case "pin": await chrome.tabs.update(tabId, { pinned: !tab.pinned }); return { pinned: !tab.pinned };
    case "mute": await chrome.tabs.update(tabId, { muted: !tab.mutedInfo?.muted }); return { muted: !tab.mutedInfo?.muted };
    default: throw new Error("unknown action");
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
  if (msg.type === "tabAction") {
    tabAction(msg.action, msg.tabId).then(sendResponse, () => sendResponse(null));
    return true;
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
