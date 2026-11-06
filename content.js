// Injected into web pages. Embeds the palette as a full-viewport iframe pointing at an extension
// page (frame.html), which keeps keyboard input away from the page and from other extensions.
(() => {
  // After an extension reload, tabs that were already open keep an orphaned copy of this script
  // whose chrome.* APIs are dead. Take over from it instead of bailing out.
  window.__searchPalette?.destroy();

  const FRAME_URL = chrome.runtime.getURL("frame.html");
  const STYLE = {
    position: "fixed", inset: "0", width: "100vw", height: "100vh", border: "0", margin: "0",
    padding: "0", "z-index": "2147483647", "color-scheme": "normal", background: "transparent",
    display: "block", opacity: "1", visibility: "visible", "max-width": "none", "max-height": "none",
  };
  let frame = null;
  let fallbackTimer = 0;

  function removeFrame() {
    clearTimeout(fallbackTimer);
    frame?.remove();
    frame = null;
  }

  function open() {
    frame = document.createElement("iframe");
    frame.src = FRAME_URL;
    frame.title = "Jumpbar";
    for (const [k, v] of Object.entries(STYLE)) frame.style.setProperty(k, v, "important");
    (document.body || document.documentElement).append(frame);
    frame.focus();
  }

  function requestClose() {
    frame.contentWindow?.postMessage({ type: "jumpbar:close" }, "*");
    // The frame removes itself after its closing animation; this is only a safety net.
    fallbackTimer = setTimeout(removeFrame, 500);
  }

  function toggle() {
    if (frame && !frame.isConnected) frame = null; // the page removed it
    if (frame) requestClose();
    else open();
  }

  const onWindowMessage = (e) => {
    if (frame && e.source === frame.contentWindow && e.data?.type === "jumpbar:closed") removeFrame();
  };
  const onRuntimeMessage = (msg) => {
    if (msg.type === "toggle") toggle();
  };
  window.addEventListener("message", onWindowMessage);
  chrome.runtime.onMessage.addListener(onRuntimeMessage);

  window.__searchPalette = {
    destroy() {
      removeFrame();
      window.removeEventListener("message", onWindowMessage);
      try { chrome.runtime.onMessage.removeListener(onRuntimeMessage); } catch {}
    },
  };
})();
