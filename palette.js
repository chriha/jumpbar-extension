// The palette UI, mounted as an overlay by the content script.
// Lives in a closed shadow root so page styles can't leak in or out and page scripts can't read it.
window.createPalette = function createPalette() {
  const ICONS = {
    search:
      '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="9" r="5.5"/><path d="M13.2 13.2 17 17"/></svg>',
    globe:
      '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="10" r="7"/><path d="M3 10h14M10 3c2 2.2 3 4.5 3 7s-1 4.8-3 7c-2-2.2-3-4.5-3-7s1-4.8 3-7Z"/></svg>',
  };

  const LABELS = {
    open: "Switch to Tab",
    closed: "Reopen",
    bookmark: "Bookmark",
    history: "History",
    url: "Open",
    search: "Search",
    engine: "Search",
    hint: "Press Tab",
  };

  const CSS = `
    :host { all: initial; }
    * { box-sizing: border-box; }
    .root {
      --bg: rgba(30, 30, 36, 0.82);
      --border: rgba(255, 255, 255, 0.1);
      --text: #f4f4f7;
      --muted: rgba(244, 244, 247, 0.52);
      --hover: rgba(255, 255, 255, 0.07);
      --selected: rgba(255, 255, 255, 0.12);
      --chip: rgba(255, 255, 255, 0.12);
      --accent: #8b8cff;
      --scrim: rgba(8, 8, 14, 0.5);
      --shadow: 0 0 0 0.5px rgba(0,0,0,.6), 0 24px 70px rgba(0,0,0,.5), 0 8px 20px rgba(0,0,0,.3);
      position: fixed; inset: 0; z-index: 2147483647;
      display: flex; justify-content: center; align-items: flex-start;
      padding-top: min(18vh, 160px);
      background: var(--scrim);
      -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px);
      font: 14px/1.4 -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif;
      color: var(--text);
      -webkit-font-smoothing: antialiased;
      animation: fade 140ms ease-out;
    }
    @media (prefers-color-scheme: light) {
      .root {
        --bg: rgba(255, 255, 255, 0.86);
        --border: rgba(0, 0, 0, 0.08);
        --text: #16161a;
        --muted: rgba(22, 22, 26, 0.5);
        --hover: rgba(0, 0, 0, 0.045);
        --selected: rgba(0, 0, 0, 0.08);
        --chip: rgba(0, 0, 0, 0.08);
        --accent: #5b5cf0;
        --scrim: rgba(30, 30, 50, 0.28);
        --shadow: 0 0 0 0.5px rgba(0,0,0,.12), 0 24px 70px rgba(30,30,60,.28), 0 8px 20px rgba(30,30,60,.12);
      }
    }
    .box {
      width: min(640px, calc(100vw - 32px));
      background: var(--bg);
      border-radius: 16px;
      box-shadow: var(--shadow), inset 0 0 0 1px var(--border);
      -webkit-backdrop-filter: blur(40px) saturate(1.6); backdrop-filter: blur(40px) saturate(1.6);
      overflow: hidden;
      transform-origin: top center;
      animation: pop 180ms cubic-bezier(0.2, 0.9, 0.3, 1.1);
    }
    .field { display: flex; align-items: center; gap: 12px; padding: 16px 18px; }
    .field svg { width: 20px; height: 20px; flex: none; color: var(--muted); }
    input {
      all: unset; flex: 1; min-width: 0;
      font-size: 18px; line-height: 1.3; color: var(--text);
      caret-color: var(--accent);
    }
    input::placeholder { color: var(--muted); }
    .list {
      max-height: min(46vh, 380px); overflow-y: auto; padding: 6px;
      border-top: 1px solid var(--border);
      overscroll-behavior: contain;
      scrollbar-width: thin; scrollbar-color: var(--chip) transparent;
    }
    .list:empty { display: none; }
    .pinned { padding: 0 6px 6px; border-top: 1px solid var(--border); padding-top: 6px; }
    .pinned:empty { display: none; }
    .row {
      display: flex; align-items: center; gap: 12px;
      height: 44px; padding: 0 10px; border-radius: 10px; cursor: default;
    }
    .row.sel { background: var(--selected); }
    .icon {
      width: 20px; height: 20px; flex: none; border-radius: 5px;
      display: grid; place-items: center; color: var(--muted);
    }
    .icon img { width: 18px; height: 18px; border-radius: 4px; display: block; }
    .icon svg { width: 18px; height: 18px; }
    .text { flex: 1; min-width: 0; display: flex; align-items: baseline; gap: 10px; }
    .title { font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 0 1 auto; max-width: 80%; }
    .url { color: var(--muted); font-size: 12.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1 1 0; min-width: 0; }
    .badge {
      flex: none; padding: 3px 10px; border-radius: 8px; font-size: 13px; font-weight: 600;
      background: var(--accent); color: #fff; animation: badge 140ms cubic-bezier(0.2, 0.9, 0.3, 1.2);
    }
    .badge[hidden] { display: none; }
    .tag { flex: none; color: var(--muted); font-size: 12px; display: flex; align-items: center; gap: 8px; }
    .row.sel .tag { color: var(--text); }
    .kbd {
      min-width: 20px; height: 20px; padding: 0 5px; border-radius: 5px;
      background: var(--chip); display: none; place-items: center; font-size: 11px;
    }
    .row.sel .kbd { display: grid; }
    .foot {
      display: flex; gap: 16px; padding: 9px 18px; border-top: 1px solid var(--border);
      color: var(--muted); font-size: 12px;
    }
    .foot span { display: flex; align-items: center; gap: 6px; }
    .foot .kbd { display: grid; height: 18px; min-width: 18px; }
    .foot [hidden] { display: none; }
    .foot .flash { color: var(--accent); font-weight: 600; }
    .foot .link { margin-left: auto; cursor: pointer; }
    .foot .link:hover { color: var(--text); }
    .root.closing { animation: fade-out 120ms ease-in forwards; pointer-events: none; }
    .root.closing .box { animation: pop-out 120ms ease-in forwards; }
    @keyframes fade-out { to { opacity: 0; } }
    @keyframes pop-out { to { opacity: 0; transform: scale(0.97) translateY(-4px); } }
    @keyframes badge { from { opacity: 0; transform: scale(0.85); } }
    @keyframes fade { from { opacity: 0; } }
    @keyframes pop { from { opacity: 0; transform: scale(0.96) translateY(-6px); } }
    @media (prefers-reduced-motion: reduce) { .root, .box, .badge { animation: none; } }
  `;

  const IS_MAC = /mac/i.test(navigator.userAgentData?.platform || navigator.platform);
  const MOD = IS_MAC ? "⌘" : "Ctrl+";
  const DEFAULT_PLACEHOLDER = "Search tabs, bookmarks and history, or enter a URL…";
  let host = null;
  let rootEl = null; // closed shadow roots aren't reachable via host.shadowRoot, so keep our own reference
  let input = null;
  let list = null;
  let pinned = null; // the "Search for…" row stays visible below the scrolling results
  let results = null;
  let items = [];
  let selected = 0;
  let requestId = 0;
  let engines = [];
  let engine = null; // active custom search engine ("badge" mode)
  let badge = null;
  let foot = null;

  function loadEngines() {
    chrome.storage.sync.get("engines").then((r) => (engines = r.engines || []), () => {});
  }
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "sync" && changes.engines) engines = changes.engines.newValue || [];
  });

  const matchEngine = (text) => {
    const t = text.trim().toLowerCase();
    return t ? engines.find((e) => e.shortcut === t) : undefined;
  };

  function siteOf(e) {
    try { return new URL(e.url).origin; } catch { return e.url; }
  }

  function enterEngine(e) {
    engine = e;
    input.value = "";
    badge.textContent = e.name;
    badge.hidden = false;
    input.placeholder = `Search ${e.name}…`;
    runSearch("");
  }

  function exitEngine() {
    engine = null;
    badge.hidden = true;
    input.placeholder = DEFAULT_PLACEHOLDER;
    runSearch(input.value);
  }

  function faviconUrl(url) {
    const u = new URL(chrome.runtime.getURL("/_favicon/"));
    u.searchParams.set("pageUrl", url);
    u.searchParams.set("size", "32");
    return u.toString();
  }

  function displayUrl(url) {
    try {
      // host/…/last-segment: keeps the part of a URL that actually identifies the page.
      const u = new URL(url);
      const host = u.host.replace(/^www\./, "");
      const segs = u.pathname.split("/").filter(Boolean);
      if (!segs.length) return host;
      return segs.length > 1 ? `${host}/…/${segs[segs.length - 1]}` : `${host}/${segs[0]}`;
    } catch {
      return url;
    }
  }

  function buildRow(item, index) {
    const row = document.createElement("div");
    row.className = "row";
    row.dataset.index = index;

    const icon = document.createElement("div");
    icon.className = "icon";
    if (item.kind === "search") icon.innerHTML = ICONS.search;
    else if (item.kind === "url") icon.innerHTML = ICONS.globe;
    else {
      const img = document.createElement("img");
      img.src = faviconUrl(item.url);
      img.alt = "";
      img.addEventListener("error", () => (icon.innerHTML = ICONS.globe));
      icon.append(img);
    }

    const text = document.createElement("div");
    text.className = "text";
    const title = document.createElement("span");
    title.className = "title";
    title.textContent =
      item.kind === "search" ? `Search for “${item.title}”`
      : item.kind === "hint" ? `Search ${item.title}`
      : item.title;
    text.append(title);
    if (item.kind !== "search") {
      const url = document.createElement("span");
      url.className = "url";
      url.textContent = displayUrl(item.url);
      text.append(url);
    }

    const tag = document.createElement("div");
    tag.className = "tag";
    const label = document.createElement("span");
    label.textContent = LABELS[item.kind] + (item.pinned ? " · Pinned" : "") + (item.muted ? " · Muted" : "");
    const kbd = document.createElement("span");
    kbd.className = "kbd";
    kbd.textContent = "↵";
    tag.append(label, kbd);

    row.append(icon, text, tag);
    return row;
  }

  function render() {
    const rows = items.map(buildRow);
    const hasSearchRow = items.length > 1 && items[items.length - 1].kind === "search";
    pinned.replaceChildren(...(hasSearchRow ? [rows.pop()] : []));
    list.replaceChildren(...rows);
    select(0);
  }

  function select(index, scroll = true) {
    if (!items.length) return;
    selected = (index + items.length) % items.length;
    const isTab = items[selected].kind === "open";
    foot.querySelector(".tab-hint").hidden = !isTab;
    foot.querySelector(".esc-hint").hidden = isTab;
    results.querySelectorAll(".row").forEach((row) => {
      const isSel = Number(row.dataset.index) === selected;
      row.classList.toggle("sel", isSel);
      if (isSel && scroll) row.scrollIntoView({ block: "nearest" });
    });
  }

  async function runSearch(query) {
    const id = ++requestId;
    if (engine) {
      const site = siteOf(engine);
      items = [{
        kind: "engine",
        title: query.trim() ? `Search ${engine.name} for “${query.trim()}”` : `Open ${engine.name}`,
        url: site,
        target: query.trim() ? engine.url.replaceAll("%s", encodeURIComponent(query.trim())) : site,
      }];
      render();
      return;
    }
    const found = await chrome.runtime.sendMessage({ type: "search", query });
    if (id !== requestId) return; // a newer keystroke superseded this one
    items = found || [];
    const hint = matchEngine(query);
    if (hint) items.unshift({ kind: "hint", title: hint.name, url: siteOf(hint), engine: hint });
    render();
  }

  function activate(item) {
    if (!item) return;
    if (item.kind === "hint") return enterEngine(item.engine);
    if (item.kind === "engine") item = { kind: "engine", url: item.target };
    chrome.runtime.sendMessage({ type: "activate", item, query: input.value });
    close();
  }

  // Esc: clear the input first (keeping focus), close when it's already empty.
  function onWindowKeyDown(e) {
    if (e.key !== "Escape" || e.isComposing || !host) return;
    e.preventDefault();
    e.stopImmediatePropagation(); // pages often handle Esc themselves (e.g. by blurring the focused element)
    window.__paletteEscDown = true;
    lastEscAt = performance.now();
    escape();
  }

  let lastEscAt = 0;
  let lastPointerAt = 0;

  function escape() {
    if (!host) return;
    if (input.value) {
      input.value = "";
      input.focus();
      runSearch("");
    } else {
      close();
    }
  }

  // Close / pin / mute the selected open tab without leaving the palette.
  async function tabAction(action) {
    const item = items[selected];
    if (item?.kind !== "open") return;
    const res = await chrome.runtime.sendMessage({ type: "tabAction", action, tabId: item.tabId });
    if (!res || !host || items[selected] !== item) return;
    const index = selected;
    if (action === "close") items.splice(index, 1);
    else Object.assign(item, res);
    render();
    select(Math.min(index, items.length - 1));
  }

  const isWeb = (url) => /^https?:\/\//i.test(url || "");

  function flash(message) {
    const el = foot?.querySelector(".flash");
    if (!el) return;
    el.textContent = message;
    el.hidden = false;
    clearTimeout(flash.timer);
    flash.timer = setTimeout(() => (el.hidden = true), 1500);
  }

  async function copy(url) {
    try {
      await navigator.clipboard.writeText(url);
      flash("Copied URL");
    } catch {
      flash("Couldn't copy");
    }
  }

  function onKeyDown(e) {
    e.stopPropagation(); // keep keystrokes away from the host page
    if (e.isComposing) return;
    // Copy: Cmd/Ctrl+C copies the selected result's URL (unless text is selected in the input);
    // Cmd/Ctrl+Shift+C copies the URL of the page the palette is open on.
    if ((IS_MAC ? e.metaKey : e.ctrlKey) && e.code === "KeyC" && !e.altKey) {
      if (e.shiftKey) { e.preventDefault(); copy(location.href); return; }
      const url = items[selected]?.url;
      if (input.selectionStart === input.selectionEnd && isWeb(url)) { e.preventDefault(); copy(url); return; }
    }
    if (IS_MAC ? e.metaKey : e.ctrlKey) {
      const action = e.key === "Backspace" ? "close" : e.shiftKey && e.code === "KeyP" ? "pin" : e.shiftKey && e.code === "KeyU" ? "mute" : null;
      if (action) { e.preventDefault(); tabAction(action); return; }
    }
    switch (e.key) {
      case "Escape": e.preventDefault(); window.__paletteEscDown = true; lastEscAt = performance.now(); escape(); break;
      case "Backspace":
        if (engine && !input.value) { e.preventDefault(); exitEngine(); }
        break;
      case "ArrowDown": e.preventDefault(); select(selected + 1); break;
      case "ArrowUp": e.preventDefault(); select(selected - 1); break;
      case "Tab": {
        e.preventDefault();
        const match = !engine && !e.shiftKey && matchEngine(input.value);
        if (match) enterEngine(match);
        else select(selected + (e.shiftKey ? -1 : 1));
        break;
      }
      case "Enter": {
        e.preventDefault();
        // Cmd/Ctrl+Enter always searches the web, even when tabs match.
        const web = (IS_MAC ? e.metaKey : e.ctrlKey) ? items.find((i) => i.kind === "search") : null;
        activate(web || items[selected]);
        break;
      }
      default:
        // Emacs-style navigation is macOS only: on Windows/Linux Ctrl is the "Cmd" key
        // (Ctrl+K toggles the palette, Ctrl+N/P are browser shortcuts).
        if (IS_MAC && e.ctrlKey && (e.key === "n" || e.key === "j")) { e.preventDefault(); select(selected + 1); }
        else if (IS_MAC && e.ctrlKey && (e.key === "p" || e.key === "k")) { e.preventDefault(); select(selected - 1); }
    }
  }

  function open() {
    if (host) { input.focus(); return; }
    host = document.createElement("div");
    const shadow = host.attachShadow({ mode: "closed" });

    const style = document.createElement("style");
    style.textContent = CSS;

    const root = document.createElement("div");
    root.className = "root";
    root.innerHTML = `
      <div class="box">
        <div class="field">${ICONS.search}<span class="badge" hidden></span><input type="text" spellcheck="false" autocomplete="off"
          placeholder="${DEFAULT_PLACEHOLDER}" aria-label="Search" /></div>
        <div class="results"><div class="list" role="listbox"></div><div class="pinned"></div></div>
        <div class="foot">
          <span><span class="kbd">↑</span><span class="kbd">↓</span> navigate</span>
          <span><span class="kbd">↵</span> open</span>
          <span><span class="kbd">${MOD}↵</span> search web</span>
          <span class="esc-hint"><span class="kbd">esc</span> close</span>
          <span class="tab-hint" hidden><span class="kbd">${MOD}⌫</span> close tab <span class="kbd">${MOD}⇧P</span> pin <span class="kbd">${MOD}⇧U</span> mute</span>
          <span class="flash" hidden></span>
          <span class="link" data-act="options">Search engines…</span>
        </div>
      </div>`;
    shadow.append(style, root);
    rootEl = root;
    input = shadow.querySelector("input");
    badge = shadow.querySelector(".badge");
    list = shadow.querySelector(".list");
    pinned = shadow.querySelector(".pinned");
    results = shadow.querySelector(".results");
    foot = shadow.querySelector(".foot");

    input.addEventListener("input", () => runSearch(input.value));
    input.addEventListener("keydown", onKeyDown);
    // Keep the cursor in the input: if something blurs it while the palette is open, take focus back.
    // Keyboard extensions like Vimium swallow Esc before we see it and blur the focused input instead
    // (they look into open shadow roots). An unprompted blur (no click, no Esc we handled) is that
    // case, so treat it as Esc.
    host.addEventListener("pointerdown", () => (lastPointerAt = performance.now()), true);
    input.addEventListener("blur", () => {
      const at = performance.now();
      setTimeout(() => {
        if (!host || !input || shadow.activeElement === input || !document.hasFocus()) return;
        const prompted = at - lastPointerAt < 300 || at - lastEscAt < 300;
        input.focus();
        if (!prompted) escape();
      }, 0);
    });
    // Keep focus in the input when clicking rows / empty space.
    results.addEventListener("mousedown", (e) => e.preventDefault());
    for (const type of ["keyup", "keypress"]) host.addEventListener(type, (e) => e.stopPropagation());

    results.addEventListener("mousemove", (e) => {
      const row = e.target.closest?.(".row") ?? e.composedPath().find((n) => n.classList?.contains("row"));
      if (row && Number(row.dataset.index) !== selected) select(Number(row.dataset.index), false);
    });
    results.addEventListener("click", (e) => {
      const row = e.composedPath().find((n) => n.classList?.contains("row"));
      if (row) activate(items[Number(row.dataset.index)]);
    });
    shadow.querySelector('[data-act="options"]').addEventListener("click", () => {
      chrome.runtime.sendMessage({ type: "options" });
      close();
    });
    root.addEventListener("mousedown", (e) => {
      if (e.target === root) {
        e.preventDefault();
        close();
      }
    });

    (document.body || document.documentElement).append(host);
    input.focus();
    loadEngines();
    runSearch("");
  }

  function close() {
    if (!host) return;
    requestId++;
    const el = host;
    const root = rootEl;
    rootEl = null;
    host = input = list = pinned = results = badge = foot = null;
    engine = null;
    items = [];
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return el.remove();
    root.classList.add("closing");
    setTimeout(() => el.remove(), 130);
  }

  // The Esc listeners are installed once per page, at load. The content script runs at
  // document_start, so these capture listeners come first on the window and see Esc before any page
  // script can swallow it. They dispatch to the newest palette instance, so re-injection (which
  // creates another instance later in the listener order) can't be starved by the page.
  window.__paletteActive = { onKeyDown: onWindowKeyDown, isOpen: () => !!host, escape };
  if (!window.__paletteListenersInstalled) {
    window.__paletteListenersInstalled = true;
    window.addEventListener("keydown", (e) => window.__paletteActive?.onKeyDown(e), true);
    // Fallback: if another extension or the page swallowed the keydown before us, act on keyup.
    window.addEventListener("keyup", (e) => {
      if (e.key !== "Escape") return;
      const active = window.__paletteActive;
      if (active?.isOpen()) {
        e.stopImmediatePropagation();
        if (!window.__paletteEscDown) active.escape();
      }
      window.__paletteEscDown = false;
    }, true);
  }

  return { open, close, toggle: () => (host ? close() : open()) };
};
