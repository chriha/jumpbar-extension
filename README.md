<p align="center">
  <img src="icons/icon-512.png" alt="Jumpbar logo" width="128" height="128" />
</p>

<h1 align="center">Jumpbar</h1>

<p align="center">
  An Arc-style command palette for Chrome and Brave.<br />
  Jump to any tab, reopen closed ones, open sites, or search the web, all from the keyboard.
</p>

---

## Features

- **Floating palette** over a dimmed, blurred page. Opens with <kbd>Cmd</kbd>+<kbd>K</kbd> (<kbd>Ctrl</kbd>+<kbd>K</kbd> on Windows/Linux).
- **Fast tab switching.** The current tab is never listed, so <kbd>Cmd</kbd>+<kbd>K</kbd>, <kbd>Enter</kbd> jumps back to the previous tab.
- **One search box for everything**, in this priority order:
  1. open tabs
  2. recently closed tabs
  3. browsing history
- **Open sites directly.** Type `www.example.com`, `https://…` or `example.com` and press <kbd>Enter</kbd>.
- **Web search always one keystroke away.** A "Search for…" row stays pinned below the results, and <kbd>Cmd</kbd>+<kbd>Enter</kbd> searches the web even when tabs match. Results are capped at 10.
- **Personal search engines.** Define a shortcut like `yt`, type it, press <kbd>Tab</kbd>, and a badge appears. Whatever you type next is sent to that site's search.
- Follows light and dark mode and respects reduced motion.

## Install

Jumpbar isn't on a web store yet, so load it unpacked:

1. Clone this repo.
2. Open `chrome://extensions` (Chrome) or `brave://extensions` (Brave).
3. Turn on **Developer mode**.
4. Click **Load unpacked** and select this folder.

No build step and no dependencies.

## Usage

| Key | Action |
| --- | --- |
| <kbd>Cmd</kbd>+<kbd>K</kbd> (<kbd>Ctrl</kbd>+<kbd>K</kbd> on Windows/Linux) | Open / close the palette |
| <kbd>↑</kbd> <kbd>↓</kbd>, <kbd>Tab</kbd> (macOS also <kbd>Ctrl</kbd>+<kbd>N</kbd>/<kbd>P</kbd>) | Move the selection |
| <kbd>Enter</kbd> | Open the selected item |
| <kbd>Cmd</kbd>+<kbd>Enter</kbd> (<kbd>Ctrl</kbd>+<kbd>Enter</kbd>) | Search the web with your default engine |
| <kbd>Esc</kbd> | Clear the input; close when it's already empty |
| <kbd>Tab</kbd> after a shortcut | Enter that search engine's mode |
| <kbd>Backspace</kbd> on an empty input | Leave search engine mode |

Clicking the toolbar icon opens the palette too.

### Personal search engines

Open the settings page (right-click the toolbar icon → *Options*, or **Search engines…** in the palette footer) and add an engine:

| Field | Example |
| --- | --- |
| Name | `YouTube` |
| Shortcut | `yt` |
| URL with `%s` in place of the query | `https://www.youtube.com/results?search_query=%s` |

Then in the palette: type `yt`, press <kbd>Tab</kbd>, type `lofi beats`, press <kbd>Enter</kbd>. The query is URL-encoded and substituted for `%s`. Engines are stored in `chrome.storage.sync`.

### Changing the shortcut

Go to `chrome://extensions/shortcuts` (`brave://extensions/shortcuts`) and rebind **Open the search palette**.

## What about Cmd+T?

Browsers reserve <kbd>Cmd</kbd>+<kbd>T</kbd> (<kbd>Ctrl</kbd>+<kbd>T</kbd> on Windows/Linux), so an extension can't rebind it. Jumpbar does two things instead:

- It uses <kbd>Cmd</kbd>+<kbd>K</kbd> for the overlay.
- It replaces the **New Tab page** with the same palette on a plain background, so opening a new tab also lands in the palette.

The overlay can't be injected into `chrome://` pages, the Web Store or the built-in PDF viewer. On those pages, <kbd>Cmd</kbd>+<kbd>K</kbd> opens a new tab with the palette instead.

## Permissions

| Permission | Why |
| --- | --- |
| `tabs` | List and switch between open tabs |
| `sessions` | List and restore recently closed tabs |
| `history` | Search browsing history |
| `search` | Run a search with your default search engine |
| `favicon` | Show site icons in results |
| `storage` | Save your search engines |
| `scripting` + all-sites access | Show the overlay on web pages, including tabs that were open before install |

Jumpbar doesn't make network requests and doesn't collect or send any data.

## Project structure

```
manifest.json     Manifest V3 config, shortcut, permissions
background.js     Service worker: search across tabs/closed/history, tab actions
palette.js        The palette UI (shadow DOM), shared by overlay and New Tab page
content.js        Mounts the overlay on web pages
ntp.html / .js    New Tab page hosting the palette
options.html / .js  Search engine settings
icons/            Logo (SVG source and PNG sizes)
```

## Roadmap

- Better fuzzy matching and ranking
- Bookmarks as a result source
- Import/export of search engines

## Development

There is nothing to build. Edit the files, then press the reload button on the extension's card in `chrome://extensions`. Reload open pages to pick up content script changes.
