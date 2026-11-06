// Runs inside the iframe that content.js embeds in the page. Because the palette lives in an
// extension page, page scripts and other extensions' content scripts (Vimium, …) never see its keystrokes.
const palette = window.createPalette({ page: false, frame: true });
window.addEventListener("message", (e) => {
  if (e.source === window.parent && e.data?.type === "jumpbar:close") palette.close();
});
palette.open();
