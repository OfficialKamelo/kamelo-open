<p align="center">
  <img src="icons/logo.svg" width="96" height="96" alt="Kamelo logo">
</p>

<h1 align="center">Kamelo</h1>

<p align="center">
  <strong>AI doesn't need to know everything.</strong><br>
  A browser extension for Chrome, Edge and Firefox that masks personal data on your device before it reaches ChatGPT, Gemini, Claude or any other AI,
  and puts the real details back in the answer, only on your screen.
</p>

<p align="center">
  <a href="https://github.com/OfficialKamelo/kamelo-open/actions/workflows/test.yml"><img src="https://github.com/OfficialKamelo/kamelo-open/actions/workflows/test.yml/badge.svg" alt="Tests"></a>
  <img src="https://img.shields.io/badge/manifest-v3-0a84ff" alt="Manifest V3">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0-6e6e73" alt="License: AGPL-3.0"></a>
  <img src="https://img.shields.io/badge/data%20leaves%20your%20device-never-34c759" alt="Data never leaves your device">
</p>

## How it works

1. **You type or paste** a message into an AI chat, just like always.
2. **Kamelo masks personal data on your device** before anything is sent. `Sarah Miller` becomes `[PERSON_1]`, an email address becomes `[EMAIL_1]`.
3. **The AI answers with placeholders.** Kamelo replaces them with the real values on your screen.

The link between placeholders and real values is kept in a local vault in your browser. There is no server, no account and no second AI:
detection is rule-based (patterns, checksums and keyword lists), and restoring is a lookup in that vault.

```
You type:        I'm Sarah Miller. Since my breakup with Tom Becker I can't sleep. How do I tell my therapist?
The AI sees:     I'm [PERSON_1]. Since my breakup with [PERSON_2] I can't sleep. How do I tell my therapist?
You see back:    I'm sorry, Sarah Miller. You could say: "Since my breakup with Tom Becker I've been sleeping badly."
```

## What it detects

| Category | Examples |
|---|---|
| **Bank details** | IBANs from 87 countries (with checksum), US routing and account numbers, UK sort codes, BIC/SWIFT, Indian IFSC |
| **Payment cards** | Card numbers (Luhn check) and CVV codes |
| **ID numbers** | SSN, BSN, National Insurance, Belgian national number, DNI/NIE, codice fiscale, NIR, Aadhaar, PAN, CPF, Chinese ID, and passport, licence and other numbers after a keyword |
| **Secrets** | API keys (OpenAI, Anthropic, AWS, GitHub, Slack, Google, Stripe), private keys, JWTs, passwords after `password:` and similar |
| **Personal details** | Names, email addresses, phone numbers, dates of birth, addresses, postcodes, IP addresses, crypto wallets |
| **Companies** | Company names with a legal form, such as Acme Inc., Jansen BV, Müller GmbH or Smith Ltd |
| **Your own terms** | Client names, project names or anything else you add |

Formats with a fixed structure (IBANs, cards, checksummed IDs, emails, phone numbers, keys) are recognised in any language.
Keywords and month names are recognised in 20+ languages.

### Sensitive topics
Health, mental health, sexuality, faith, money problems and police or courts can't be replaced by a placeholder.
When you share something about yourself or someone close ("my doctor", "ik heb schulden"), Kamelo shows a short notice suggesting a temporary chat,
once per topic per page. General questions don't trigger it. Recognised in 82 languages ([word lists](src/topic-words.js); corrections from native speakers welcome).

### It remembers, carefully
Once Kamelo has masked a name, it also recognises it later in other forms: in lowercase, or just the first or last name, in the next message or chat, always with the same placeholder.
To avoid false positives, single names only count when they look like a name (capitalised, or after cues like "to sarah" or "dear mark"),
and names that are also ordinary words (Will, May, Mark) only after a clear cue. So "Will you help me?" and "mark this as done" stay untouched.

Anything masked from memory is listed in the notice. Click a word there to keep it visible: it goes on your "Never protect" list
(with the site and date it came from), and you can undo it straight from the notice.

## Where it works

- **AI chats:** ChatGPT, Gemini, Claude, Copilot, Perplexity, Mistral, DeepSeek, Grok, Meta AI and more ([full list](src/sites.js)).
- **AI fields on other sites:** "Help me write" in Gmail, Slack AI, Notion AI and AI chat widgets, recognised by their labels.
- **AI APIs called from the browser:** requests to `api.openai.com`, `api.anthropic.com`, Azure OpenAI and others are masked before they leave.
- **Any other site:** "Mask every text field" in the popup masks every text field on that site.

Regular messages to people, such as a normal email or chat message, are left untouched.

## Privacy and security

- **No network requests.** Kamelo never contacts a server, not even ours. There are no analytics, no tracking and no account. See [Verify it yourself](#verify-it-yourself).
- **Encrypted vault (optional).** Lock the vault with Touch ID (WebAuthn PRF) or a password (PBKDF2, 600,000 rounds); the vault is encrypted with AES-256-GCM.
  When unlocked it lives only in memory (`chrome.storage.session`) and locks again when Chrome closes.
- **Automatic cleanup.** Vault entries that haven't been used for 30 days (adjustable) are deleted.

- **Size limit.** The vault keeps at most 10,000 entries (Chrome gives extensions 10 MB of storage); the least recently used entries go first.

### Why each permission
| Permission | Why |
|---|---|
| Access to all websites | AI fields appear on many sites (Gmail, Slack, Notion, support chats), so Kamelo has to recognise them anywhere. Normal messages to people are left alone. |
| `storage` | Your settings and the placeholder vault, stored only on your device. |
| `activeTab` | Lets the popup show whether Kamelo is active on the current site and mark a site as AI. |

See the [privacy policy](PRIVACY.md). To report a vulnerability, see [SECURITY.md](SECURITY.md).

## Verify it yourself

You don't have to take our word for any of this. Everything Kamelo does is in this repository, with no build step and no minified code.

- **It makes no requests of its own.** Search the extension code for network calls:
  ```bash
  grep -rnE "fetch\(|XMLHttpRequest|sendBeacon|WebSocket\(" src popup unlock
  ```
  The only hits are in [`src/net-main.js`](src/net-main.js), where Kamelo wraps the page's own requests to AI APIs so it can mask them.
- **The only pages it opens:** [kamelo.eu/welcome](https://kamelo.eu/welcome) once after installing, [kamelo.eu/goodbye](https://kamelo.eu/goodbye) when you remove it
  (both in [`src/background.js`](src/background.js)), and links you click in the popup. Opening a page sends nothing from your vault.
- **Watch what is sent.** Open DevTools (Network tab) on chatgpt.com, send `My password is Hunter2!` and look at the request payload:
  it says `[SECRET_1]`.
- **Run the tests.** `npm run test:browser` loads Kamelo in a real Chrome and checks that requests to AI APIs leave with placeholders, not the real values
  ([`tests/browser/extension.test.mjs`](tests/browser/extension.test.mjs)).
- **The store package is this code.** [`tools/pack.mjs`](tools/pack.mjs) zips `manifest.json`, `_locales`, `src`, `popup`, `unlock` and `icons` as they are.
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

Your browser will say the extension can "read and change data on all websites". That is needed to recognise AI fields on any site; all processing stays on your device.

## Development

No build step: the extension is plain JavaScript (Manifest V3) with no runtime dependencies.
The browser tests use Puppeteer, installed with `npm install`.

```bash
npm install
npm test                       # unit tests (Node 20+)
npm run test:browser           # Kamelo in a real Chrome, on simulated AI and shop pages
npm run test:sites -- --show   # Kamelo on the real AI sites (nothing is sent)
python3 -m http.server 8765
```

With the server running, open:
- `http://localhost:8765/demo/`: a simulated AI chat that shows exactly what would be sent to the AI.
- `http://localhost:8765/demo/popup-preview.html`: the popup with sample data.

| Path | Contents |
|---|---|
| `src/detector.js` | Detection, masking and restoring (shared by all parts) |
| `src/content.js` | Finds AI fields on the page, masks on paste and send, restores answers |
| `src/net-main.js` | Masks requests that pages send to AI APIs |
| `src/background.js`, `src/vault*.js` | Vault storage and encryption |
| `src/sites.js` | Known AI sites and where their input field is. **When a site changes, this is usually the only file to edit** |
| `src/ai-hosts.js` | AI API hosts whose requests are masked on any site |
| `src/config.js` | Settings and the labels that mark AI fields on other sites |
| `src/strings.js` | UI text in English and Dutch |
| `popup/`, `unlock/` | Extension pages |
| `demo/` | Local test pages and the popup preview used by the tests |
| `tests/` | Unit tests; `tests/browser/` runs Kamelo in Chrome; `tests/live/` checks the real AI sites nightly |
| `tools/` | `release.mjs`, `pack.mjs` (store and Firefox packages), `build-locales.mjs`, `build-preview.mjs` |

## Known limitations

- AI called from a site's own **server** is invisible to a browser extension. Turn on "Mask every text field" for such a site.
- The network filter only sees text (JSON) requests. **Uploaded files** (PDFs, images) are not filtered.
- **Names** are recognised from first-name lists, patterns and memory; a new surname on its own can still be missed. Add important names under "Always protect".
- If an AI rewrites a placeholder (for example "Person 1" instead of `[PERSON_1]`), it can't be restored.

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
