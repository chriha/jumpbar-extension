# Chrome Web Store listing: Jumpbar

Copy each section into the matching field of the Developer Dashboard.

## Store listing tab

**Name:** Jumpbar

**Category:** Productivity

**Summary (max 132 characters):**

```
Arc-style command palette: jump to any tab, reopen closed ones, search history, or search the web, all from the keyboard.
```

**Description:**

```
Jumpbar is a fast, keyboard-first command palette for Chrome and Brave. Press Cmd+K (Ctrl+K on Windows/Linux) on any page and a clean, floating search box appears over a softly blurred background. Type to find what you need, press Enter, and you're there.

ONE SEARCH BOX FOR EVERYTHING
Results are ranked in a sensible order:
• Open tabs: switch instantly, even across windows
• Recently closed tabs: bring back the page you just closed
• Browsing history: find that site you visited last week
• Websites: type a URL like example.com and press Enter
• The web: a "Search for…" row is always pinned below the results

BUILT FOR SPEED
• The tab you're on never clutters the list, so Cmd+K then Enter jumps straight back to your previous tab
• Cmd+Enter (Ctrl+Enter) searches the web instantly, even when tabs match
• Navigate with arrow keys or Tab. Esc clears the search, and closes the palette when it's already empty
• No mouse needed, but clicking works too

YOUR OWN SEARCH SHORTCUTS
Define shortcuts for your favourite sites, like "yt" for YouTube or "gh" for GitHub. Type the shortcut, press Tab, and everything you type next is searched on that site. Presets for Google, YouTube, GitHub, Wikipedia and Maps get you started in one click, and you can add any site that has an https search URL.

DESIGNED TO FEEL RIGHT
• Follows your system light/dark mode
• Smooth, subtle animations, with reduced-motion support
• Site icons in every result

PRIVATE BY DESIGN
• No tracking, no analytics, no accounts, no ads
• Jumpbar makes no network requests of its own and sends your data nowhere
• Your tabs and history are only read locally, while you search
• Jumpbar only runs on a page when you open it with the shortcut or toolbar icon
• Private and regular windows stay separate by default
• Your custom search shortcuts are stored in Chrome's own sync storage

CUSTOMISE
Rebind the shortcut any time at chrome://extensions/shortcuts, which is handy if a site you use has its own Cmd+K. Clicking the toolbar icon also opens the palette.

Note: Chrome doesn't allow extensions on internal pages (chrome://), the Chrome Web Store, or the built-in PDF viewer, so the palette can't open there. Requires Chrome 130 or newer.
```

**Assets to upload** (all ready in `store/`, 1280×800, no transparency):
- Icon 128×128: `icons/icon-128.png`
- Screenshots, in this order:
  1. `store/screenshot-1-search.png`: mixed results for a query
  2. `store/screenshot-2-tabs.png`: quick tab switching
  3. `store/screenshot-3-engines.png`: custom search engine badge
  4. `store/screenshot-4-light.png`: light mode
  5. `store/screenshot-5-settings.png`: settings page
- Small promo tile 440×280: `store/promo-tile-440x280.png`
- Privacy policy URL: host `PRIVACY.md` publicly (e.g. the GitHub repo's file URL) and paste the link

## Privacy practices tab

**Single purpose:**

```
Quickly find and switch to open tabs, recently closed tabs, browsing history and websites from one keyboard-driven search box.
```

**Permission justifications:**

| Permission | Justification |
| --- | --- |
| `tabs` | Reads titles and URLs of open tabs so the user can search them and switch to the chosen tab. |
| `bookmarks` | Searches the user's bookmarks for results matching the typed query. Results are shown locally and never transmitted. |
| `history` | Searches the user's browsing history for results matching the typed query. Results are shown locally and never transmitted. |
| `sessions` | Lists and restores recently closed tabs and windows. |
| `search` | Runs a web search with the user's default search engine when the user chooses "Search for…". |
| `favicon` | Shows each result's site icon from Chrome's local favicon cache. |
| `storage` | Saves the user's custom search engines and settings. |
| `activeTab` | Lets the palette appear on the current page when the user presses the shortcut or clicks the toolbar icon. |
| `scripting` | Injects the palette overlay into the current page on demand, after that user action. |

**Host permissions:** none requested.

**Remote code:** No, I am not using remote code.

**Data usage disclosures:** tick only **Web history** (tab and history URLs/titles are read locally to provide the feature). Leave everything else unticked.

Certify all three statements:
- I do not sell or transfer user data to third parties, outside of the approved use cases
- I do not use or transfer user data for purposes unrelated to the item's single purpose
- I do not use or transfer user data to determine creditworthiness or for lending purposes

## Distribution tab

- Visibility: Public
- Regions: all regions

## Before you upload

- Bump `version` in `manifest.json` for every re-upload
- Run `./scripts/pack.sh` and upload `dist/jumpbar-<version>.zip`. It includes only `manifest.json`, the JS and HTML files and `icons/` (not `store/`, `docs/` or markdown files)
