// Injected into web pages; shows the palette as an overlay when asked.
(() => {
  if (window.__searchPaletteInstance) return;
  window.__searchPaletteInstance = window.createPalette({ page: false });
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "toggle") window.__searchPaletteInstance.toggle();
  });
})();
