// Injected into web pages; shows the palette as an overlay when asked.
(() => {
  // After an extension reload, tabs that were already open keep an orphaned copy of this script
  // whose chrome.* APIs are dead. Take over from it instead of bailing out.
  const prev = window.__searchPalette;
  if (prev) {
    try { prev.instance.close(); } catch {}
    try { chrome.runtime.onMessage.removeListener(prev.listener); } catch {}
  }

  const instance = window.createPalette({ page: false });
  const listener = (msg) => {
    if (msg.type === "toggle") instance.toggle();
  };
  chrome.runtime.onMessage.addListener(listener);
  window.__searchPalette = { instance, listener };
})();
