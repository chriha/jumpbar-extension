const PRESETS = [
  { name: "Google", shortcut: "go", url: "https://www.google.com/search?q=%s" },
  { name: "YouTube", shortcut: "yt", url: "https://www.youtube.com/results?search_query=%s" },
  { name: "GitHub", shortcut: "gh", url: "https://github.com/search?q=%s" },
  { name: "Wikipedia", shortcut: "wi", url: "https://en.wikipedia.org/w/index.php?search=%s" },
  { name: "Maps", shortcut: "maps", url: "https://www.google.com/maps/search/%s" },
];

const $ = (id) => document.getElementById(id);
let engines = [];
let editingId = null;

const save = () => chrome.storage.sync.set({ engines });

function renderList() {
  const list = $("list");
  list.replaceChildren();
  if (!engines.length) {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = "No search engines yet. Add one below.";
    list.append(empty);
    return;
  }
  for (const e of engines) {
    const li = document.createElement("li");
    li.className = "engine";

    const key = document.createElement("span");
    key.className = "key";
    key.textContent = e.shortcut;

    const info = document.createElement("div");
    info.className = "info";
    const name = document.createElement("div");
    name.className = "name";
    name.textContent = e.name;
    const tpl = document.createElement("div");
    tpl.className = "tpl";
    tpl.textContent = e.url;
    info.append(name, tpl);

    const edit = document.createElement("button");
    edit.textContent = "Edit";
    edit.onclick = () => startEdit(e);
    const del = document.createElement("button");
    del.className = "danger";
    del.textContent = "Delete";
    del.onclick = async () => {
      engines = engines.filter((x) => x.id !== e.id);
      if (editingId === e.id) resetForm();
      await save();
      renderList();
    };

    li.append(key, info, edit, del);
    list.append(li);
  }
}

function fill(e) {
  $("name").value = e.name;
  $("shortcut").value = e.shortcut;
  $("url").value = e.url;
}

function startEdit(e) {
  editingId = e.id;
  fill(e);
  $("form-title").textContent = `Edit ${e.name}`;
  $("save").textContent = "Save changes";
  $("cancel").hidden = false;
  $("name").focus();
}

function resetForm() {
  editingId = null;
  $("form").reset();
  $("error").textContent = "";
  $("form-title").textContent = "Add a search engine";
  $("save").textContent = "Add engine";
  $("cancel").hidden = true;
}

function validate({ name, shortcut, url }, existing = engines, ignoreId = editingId) {
  if (!name) return "Give the engine a name.";
  if (!/^[a-z0-9]+$/.test(shortcut)) return "The shortcut can only contain letters and numbers.";
  if (existing.some((e) => e.shortcut === shortcut && e.id !== ignoreId))
    return `The shortcut “${shortcut}” is already in use.`;
  if (!url.includes("%s")) return "The URL needs %s where the query should go.";
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return "Only https URLs are supported.";
  } catch {
    return "That doesn't look like a valid URL.";
  }
  return "";
}

$("form").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const entry = {
    name: $("name").value.trim(),
    shortcut: $("shortcut").value.trim().toLowerCase(),
    url: $("url").value.trim(),
  };
  const error = validate(entry);
  $("error").textContent = error;
  if (error) return;

  if (editingId) engines = engines.map((e) => (e.id === editingId ? { ...e, ...entry } : e));
  else engines.push({ id: crypto.randomUUID(), ...entry });
  await save();
  resetForm();
  renderList();
});

$("export").addEventListener("click", () => {
  const data = engines.map(({ name, shortcut, url }) => ({ name, shortcut, url }));
  const blob = new Blob([JSON.stringify({ jumpbarEngines: 1, engines: data }, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "jumpbar-search-engines.json";
  a.click();
  URL.revokeObjectURL(a.href);
});

$("import").addEventListener("click", () => $("import-file").click());

$("import-file").addEventListener("change", async (ev) => {
  const file = ev.target.files[0];
  ev.target.value = "";
  const status = $("io-status");
  if (!file) return;
  try {
    if (file.size > 1_000_000) throw new Error("too big");
    const parsed = JSON.parse(await file.text());
    const list = Array.isArray(parsed) ? parsed : parsed?.engines;
    if (!Array.isArray(list)) throw new Error("no engines");
    let added = 0;
    let skipped = 0;
    for (const raw of list) {
      const entry = {
        name: String(raw?.name ?? "").trim().slice(0, 60),
        shortcut: String(raw?.shortcut ?? "").trim().toLowerCase().slice(0, 12),
        url: String(raw?.url ?? "").trim(),
      };
      // Same rules as the form; entries whose shortcut already exists are skipped, never overwritten.
      if (validate(entry, engines, null)) { skipped++; continue; }
      engines.push({ id: crypto.randomUUID(), ...entry });
      added++;
    }
    if (added) { await save(); renderList(); }
    status.textContent = `Imported ${added} engine${added === 1 ? "" : "s"}` + (skipped ? `, skipped ${skipped} (invalid or shortcut already in use).` : ".");
  } catch {
    status.textContent = "That file isn't a valid Jumpbar search engine export.";
  }
});

$("cancel").addEventListener("click", resetForm);

for (const preset of PRESETS) {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = preset.name;
  b.onclick = () => {
    fill(preset);
    $("error").textContent = "";
    $("shortcut").focus();
  };
  $("presets").append(b);
}

chrome.storage.sync.get({ engines: [], includePrivate: false }).then((r) => {
  engines = r.engines;
  $("include-private").checked = r.includePrivate;
  renderList();
});

$("include-private").addEventListener("change", (e) =>
  chrome.storage.sync.set({ includePrivate: e.target.checked }));
