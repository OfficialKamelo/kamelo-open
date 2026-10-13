<p align="center">
  <img src="icons/logo.svg" width="96" height="96" alt="Kamelo logo">
</p>

<h1 align="center">Kamelo</h1>

<p align="center">
  <strong>A better place for personal questions to AI.</strong><br>
  A browser extension for Chrome, Edge and Firefox. When you type something personal into ChatGPT, Claude, Gemini or another AI chat,
  Kamelo suggests a temporary chat, or Melo: Kamelo's private chat, where an AI answers on your own computer.
</p>

<p align="center">
  <a href="https://github.com/OfficialKamelo/kamelo-open/actions/workflows/test.yml"><img src="https://github.com/OfficialKamelo/kamelo-open/actions/workflows/test.yml/badge.svg" alt="Tests"></a>
  <img src="https://img.shields.io/badge/manifest-v3-0a84ff" alt="Manifest V3">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0-6e6e73" alt="License: AGPL-3.0"></a>
  <img src="https://img.shields.io/badge/network%20requests-none-34c759" alt="No network requests">
</p>

## What it does

More and more people ask AI about their health, their relationships or their money. Those chats are usually saved in your account,
and many AI apps use them for training by default. Kamelo doesn't change what you send, and your AI account still knows who you are.
What it does is help you choose where to ask:

1. **You type into an AI chat**, just like always.
2. **If it's personal**, about your own (or someone close to you) health, mental health, sexuality, faith, money or legal trouble,
   Kamelo shows a short notice above the text field. General questions ("what are the symptoms of flu?") don't trigger it.
3. **One click** moves your message, unchanged, to the site's **temporary chat** (ChatGPT, Gemini, Claude's incognito chat),
   which stays out of your history and isn't used for training. In Chrome you can also ask **Melo**, Kamelo's private chat.

### Recognising personal topics
A word list in 82 languages ([`src/topic-words.js`](src/topic-words.js), [`src/topics.js`](src/topics.js)), written for the way
people actually type. In Chrome, when the word list finds nothing, Kamelo asks Chrome's built-in AI (Gemini Nano) on your computer
as a second check ([`src/topic-ai.js`](src/topic-ai.js)): only when the model is already on your computer (Kamelo never downloads it
for this), only after you pause typing, and nothing is stored. Corrections from native speakers are welcome.

### Melo, the private chat
Melo (called Private Chat before) is a chat in the browser's side panel where Chrome's built-in AI answers on your own computer ([`chat/device.js`](chat/device.js)).
Your question never leaves the device. Nothing is downloaded until you click Download; Chrome then fetches its own model once.
Chats live only in that window and are gone when you close it. Edge and Firefox don't offer an on-device AI to extensions yet,
so there Kamelo offers a temporary chat instead.

### The popup
The switch (Protected), Melo (the private chat) and a temporary chat. That's all.

## Where it works

Only on the AI chat sites in [`src/sites.js`](src/sites.js): ChatGPT, Gemini, Claude, Copilot, Perplexity, Mistral, Grok, DeepSeek,
Meta AI and others. Kamelo doesn't run on any other website.

## Privacy and security

- **No network requests.** Kamelo never contacts a server, not even ours. No analytics, no tracking, no account.
  See [Verify it yourself](#verify-it-yourself).
- **Everything stays on your device.** The text you type is checked in the page, in memory. When you click the temporary chat
  or Melo button, your message is kept in the browser's session memory (never on disk) for at most a minute, only to
  put it in the new chat.
- **Old data is removed.** Versions up to 1.4.3 masked personal details and kept a local vault. On updating to 1.5.0, Kamelo deletes
  that vault (also a locked one), the vault lock, the monthly overview and the word lists from your device.

### Why each permission
| Permission | Why |
|---|---|
| Access to the AI chat sites in `src/sites.js` | To notice a personal topic in the text you type there and show the notice. No other sites. |
| `storage` | Your on/off setting, stored on your device. |
| `scripting` | Starts Kamelo's own bundled scripts in AI chat tabs that were already open when you installed or updated it. No remote code. |
| `sidePanel` | Opens Melo, the private chat, in Chrome's side panel (not in Firefox, which has no side panel API). |

See the [privacy policy](PRIVACY.md). To report a vulnerability, see [SECURITY.md](SECURITY.md).

## Verify it yourself

Everything Kamelo does is in this repository, with no build step and no minified code.

- **It makes no requests of its own.** Search the extension code for network calls:
  ```bash
  grep -rnE "fetch\(|XMLHttpRequest|sendBeacon|WebSocket\(" src popup chat
  ```
  The only hit is in `chat/chat.js`: the encrypted route for a future paid Kamelo Plus. It needs a library that isn't part of
  this repository or the store package, so it can't run.
- **The only pages it opens:** [kamelo.eu/welcome](https://kamelo.eu/welcome) once after installing, [kamelo.eu/goodbye](https://kamelo.eu/goodbye) when you remove it
  (both in [`src/background.js`](src/background.js)), and the temporary chat of the AI site you're on when you click it.
- **Run the tests.** `npm run test:browser` loads the store package in a real Chrome
  ([`tests/browser/public.test.mjs`](tests/browser/public.test.mjs)): the notice appears for a personal topic, your text goes to the
  temporary chat unchanged, Kamelo doesn't run on other sites, and nothing is downloaded for the on-device check.
- **The store package is this code.** [`tools/pack.mjs`](tools/pack.mjs) zips `manifest.json`, `_locales`, `src`, `popup`, `chat` and `icons` as they are.
  Download the package from the store, unzip it and compare it with this code at the same version (see `manifest.json`).

## Screenshots

See [kamelo.eu](https://kamelo.eu) for screenshots and a short demo.

## Installation

| Store | Official extension ID |
|---|---|
| [Chrome Web Store](https://chromewebstore.google.com/detail/ijmapnnfbjdkldjljobgadjfoabpgjoj) | `ijmapnnfbjdkldjljobgadjfoabpgjoj` |
| [Microsoft Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/kjjenbhncoomobcdpbhljmhfcmanhbkj) | `kjjenbhncoomobcdpbhljmhfcmanhbkj` |

These are the only official listings. Kamelo never asks for an account, a password or a payment.
To check which one you have, open `chrome://extensions` (or `edge://extensions`), turn on Developer mode and compare the ID.

**From source (developer mode):**
1. Clone this repository.
2. Open `chrome://extensions` (or `edge://extensions` in Edge) and turn on **Developer mode**.
3. Click **Load unpacked** and select the repository folder.

## Development

No build step: the extension is plain JavaScript (Manifest V3) with no runtime dependencies.
The browser tests use Puppeteer, installed with `npm install`.

```bash
npm install
npm test                 # unit tests (Node 20+)
npm run test:browser     # the store package in a real Chrome, on simulated AI pages
npm run pack             # the store package for Chrome and Edge (npm run pack:firefox for Firefox)
```

| Path | Contents |
|---|---|
| `src/content.js` | Watches the text field on AI chat sites and shows the notice |
| `src/topics.js`, `src/topic-words.js` | Personal topics: the word lists in 82 languages |
| `src/topic-ai.js` | The second check with Chrome's built-in AI, on the device |
| `src/background.js` | Hands your message to the temporary chat or Melo; removes old masking data after an update |
| `src/sites.js` | Known AI sites, their input field and temporary chat. **When a site changes, this is usually the only file to edit** |
| `src/config.js`, `src/strings.js`, `src/edition.js` | Settings, UI text in English and Dutch, and which edition this is |
| `chat/` | Melo, the private chat (`device.js`: the on-device AI of the browser) |
| `popup/` | The popup (`public.html`) |
| `tests/` | Unit tests; `tests/browser/` runs the store package in Chrome |
| `tools/` | `pack.mjs` (store and Firefox packages), `release.mjs`, `sign.mjs` (signed `.crx`), `news.mjs`, `check-secrets.mjs`, `build-locales.mjs` |

Some shared files (`src/content.js`, `src/background.js`, `src/strings.js`, `chat/chat.js`) still contain code paths for
Kamelo Business, a separate edition that isn't part of this repository. They do nothing here: `src/edition.js` says `public`.

## Known limitations

- The notice is a suggestion. Kamelo doesn't stop you from sending, and doesn't change what you send.
- The word list can miss a personal question phrased in an unusual way, especially outside Chrome (no on-device second check).
- Temporary chats are a feature of the AI service, with its own rules: for example, ChatGPT may keep temporary chats for up to 30 days for safety.
- Melo needs Chrome's built-in AI, which needs a recent computer and about 22 GB of free space.

## Contributing

Bug reports, missed detections and pull requests are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) to get started,
and look for issues labelled [`good first issue`](https://github.com/OfficialKamelo/kamelo-open/labels/good%20first%20issue).
Questions and ideas go in [Discussions](https://github.com/OfficialKamelo/kamelo-open/discussions).
Everyone taking part follows the [Code of Conduct](CODE_OF_CONDUCT.md). See the [changelog](CHANGELOG.md) for what changed in each version.

## License

Copyright © 2026 Lucas van der Wegen.

Kamelo is open source under the [GNU Affero General Public License v3.0](LICENSE) (AGPL-3.0).
You may use, study, change and share it. If you distribute Kamelo or a modified version, or offer it as a service, you must
share your source under the same license. The code is public so anyone can check exactly what the extension does.

The name **Kamelo** and the chameleon logo are not covered by the code license. See [TRADEMARKS.md](TRADEMARKS.md).
