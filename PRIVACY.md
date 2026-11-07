# Jumpbar Privacy Policy

_Last updated: 7 November 2026_

Jumpbar is a browser extension that lets you search your open tabs, recently closed tabs and browsing history from a keyboard-driven palette. **It does not collect, store on any server, share, or sell your data.**

## What Jumpbar accesses

Jumpbar reads the following **locally in your browser**, only while you are using the palette, and only to show you results:

- **Open tabs**: titles and URLs, to let you search and switch between them.
- **Recently closed tabs**: titles and URLs, so you can reopen them.
- **Browsing history**: titles and URLs matching what you type.
- **Site icons**: fetched from Chrome's own local favicon cache.

This information is never written to disk by Jumpbar, never transmitted anywhere, and is discarded when the palette closes.

## What Jumpbar stores

Jumpbar saves only your **settings** in `chrome.storage.sync`:

- the custom search engines you add (name, shortcut, URL template)
- the "include tabs across private and regular windows" preference

`chrome.storage.sync` is provided by your browser. If you are signed in to Chrome with sync enabled, Chrome may sync these settings across your devices through your Google account. The developer has no access to them.

## Network activity

Jumpbar makes **no network requests of its own**, includes no analytics, telemetry, advertising or remote code, and has no servers. When you choose to search the web or open a custom search engine, your browser opens that site or your default search engine in a new tab, exactly as if you had typed the address yourself. That search is then governed by the privacy policy of that site.

## Private (Incognito) windows

By default, private and regular browsing stay separate: regular windows never show private tabs, and private windows only show their own tabs and no regular history. You can change this in the settings page. Jumpbar only works in Incognito if you enable it there yourself in your browser's extension settings.

## Permissions

| Permission | Purpose |
| --- | --- |
| `tabs` | Read titles and URLs of open tabs and switch to them |
| `sessions` | List and restore recently closed tabs |
| `history` | Search your browsing history |
| `search` | Run a search with your default search engine |
| `favicon` | Show site icons in results |
| `storage` | Save your search engines and settings |
| `activeTab`, `scripting` | Show the palette on the page you open it from, only when you press the shortcut or click the toolbar icon |

## Limited use

The use of information received from browser APIs will adhere to the Chrome Web Store User Data Policy, including the Limited Use requirements. Data is used only to provide the user-facing search feature, and is not transferred to third parties, used for advertising, or used to determine creditworthiness or for lending.

## Changes and contact

If this policy changes, the date above will be updated and the changes will be described in the extension's release notes.

Questions: open an issue on the project's repository, or email reposts.diorama-0j@icloud.com.
