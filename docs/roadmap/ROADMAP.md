# Melo roadmap: a private personal agent

Status: plan, approved 28 Nov 2026. No app code has changed yet.
Mockups: [`onboarding-mockup.html`](onboarding-mockup.html) (open it in a browser; the screen text is in Dutch).

## 1. Goal

Melo becomes a personal agent like [Nod](https://nod.n8n.io/) by n8n. It does real tasks with your mail, calendar and papers.
It asks before every action. The difference: **all AI is private, also in the cloud.**

- Default: **Melo Kluis** ("Melo vault"). Open models run in a [Tinfoil](https://tinfoil.sh) confidential-computing enclave.
  The app verifies the enclave before it sends anything. Nobody can read the content, including us.
- Easy like ChatGPT: one button, "Begin met Melo". No account, no key, no server to set up.
- Optional, for people who want to choose:
  1. **Own Tinfoil key**: same enclave, the user pays Tinfoil directly.
  2. **Own local server**: Ollama, LM Studio or llama.cpp on the Mac.
  3. **More models in the vault**: Gemma 4 31B, DeepSeek V4.1 Flash, Kimi, GLM, GPT-OSS 120B, Llama.
- Not offered: OpenAI, Anthropic, Gemini or OpenRouter keys. Those providers can read the prompt.

## 2. What we take from Nod, and what we change

| Nod | Melo |
|---|---|
| Welcome screen: logo, one line, four points, Get started | Same layout. "Volledig privé" instead of "Runs on your computer". No usage data at all. |
| Step 1 does an action: connect mail, get three task suggestions | Same. Login goes **directly** to Google or Microsoft from the device. No Composio. Tokens stay in the Keychain. |
| "Tell me about yourself" chips (work / personal, what you do) | Same. Answers stay on the device and go to the local memory ("Over jou"). Nod shares them with its team. |
| "Which AI provider?" list | Same list shape, but every row is private (see 1). Each row shows a privacy label. |
| "Your own server" (OpenAI-compatible, `localhost:11434/v1`) | Same fields: server address, optional key, Connect. Only tool-capable models are listed. Needs 64k context. Tiny test request on select. |
| Trust check before actions | Melo already has this: every action goes through the Poort, with a confirm card, checkboxes and "Zet terug" (undo). |
| Runs in a VM (Lima/Docker, 3-6 GB RAM) | No VM. Native iPhone and Mac app. |
| No iPhone app (Telegram/WhatsApp instead) | Native iPhone and Mac app. |

## 3. Architecture

```
iPhone / Mac app
  ├─ Mail, calendar, papers, memory, OAuth tokens  -> stay on the device (Keychain, local SQLite)
  ├─ Poort (action gate) + confirm card            -> unchanged
  ├─ Denkplek ("where Melo thinks")                -> new routing layer
  │     ├─ Melo Kluis      -> Kamelo relay -> Tinfoil enclave   (EHBP, body encrypted end to end)
  │     ├─ Own Tinfoil key -> Tinfoil enclave directly           (EHBP)
  │     ├─ Own server      -> http://localhost:11434/v1 etc.     (OpenAI-compatible)
  │     └─ Built-in model  -> on-device (existing)
  └─ Proof sheet: "Versleuteld · gecontroleerd"   -> shows attestation result to the user
```

### 3.1 Melo Kluis through our relay

- Tinfoil's [EHBP](https://docs.tinfoil.sh/resources/ehbp) encrypts HTTP bodies with HPKE to the enclave key. Headers stay in the clear.
- Our existing Cloudflare relay holds `TINFOIL_API_KEY`. It never sees plaintext. It only:
  1. checks the user's App Store subscription (signed transaction),
  2. checks the user's monthly budget,
  3. forwards the encrypted body and preserves `Ehbp-Encapsulated-Key`, `Ehbp-Response-Nonce` and `X-Tinfoil-Enclave-Url`,
  4. reads token counts from `X-Tinfoil-Usage-Metrics` to count usage.
- Follows Tinfoil's [proxy guide](https://docs.tinfoil.sh/guides/proxy-server). The Tinfoil key is never in the app.
- The key gets a `max_cost` cap through the Tinfoil Admin API, so spend can never run away.

### 3.2 Attestation in the app

- Use `tinfoil-swift` (iOS 17+, macOS 14+). Attestation goes through the relay's `/attestation` route, but is **verified on the device**.
- Pin the expected enclave measurement (code hash). If verification fails, Melo sends nothing and says so.
- Show the result: a green chip "Versleuteld · gecontroleerd" at the top of every chat. Tap it for the proof sheet
  (mockup screen 7): keys on this device, last check time, fingerprint, what Tinfoil can see, what nobody can see, link to verify yourself.

### 3.3 Own local server (Mac)

- OpenAI-compatible client. Defaults: Ollama `http://localhost:11434/v1`, vLLM `:8000/v1`, llama.cpp `:8080/v1`. LM Studio too.
- `GET /v1/models` to discover; list only models that report tool support.
- Check context length (warn below 65,536). Send a tiny test request when a model is chosen and at start-up.
- iPhone: no own server. The iPhone uses the built-in model, Melo Kluis, or the paired Mac on the same network.

## 4. Security requirements (review by Ritik Yadav)

1. The app verifies Tinfoil's attestation and pins the enclave hash **before** encrypting anything.
2. The relay never terminates the encryption. It only forwards.
3. We promise **content** privacy, not zero metadata. Who calls, when, and token volume are visible for billing. The UI says this plainly.
4. Enclaves do not protect against prompt injection from a hostile email. The confirm card stays for every action.
   The chat UI never auto-fetches external links or markdown images (classic silent leak).
5. Enclaves are stateless. Keep memory and invariants local and compact, so we don't send large payloads every turn.
6. Make privacy visible: "credentials stay on your device" and the attestation result must be obvious in the UI (proof sheet).

## 5. Work, in order

| # | Step | Who | Done when |
|---|---|---|---|
| 1 | Tinfoil account + API key in the local env file | Lucas | Key exists, never committed |
| 2 | New onboarding (iPhone + Mac), on a new branch | Claude | Matches the mockups, all 15 app languages |
| 3 | `Denkplek` routing layer + Tinfoil client (EHBP) | Claude | Unit tests pass; attestation failure blocks sending |
| 4 | Relay: subscription check, budget, EHBP forwarding, usage counting | Claude | Relay test: cannot read body; over budget returns a clear error |
| 5 | Own Tinfoil key + own local server screens | Claude | Test with Ollama `gpt-oss:20b` |
| 6 | Proof sheet + green chip | Claude | Shows real attestation data |
| 7 | First Mac build, tested without touching real data | Claude + Lucas | Lucas approves the build |
| 8 | Security review of attestation + relay | Ritik | Review notes resolved |
| 9 | Fresh multi-turn task tests with Tinfoil models (Dutch and English) | Claude | Unseen test set; results written up |
| 10 | Open-source the app code (Apache 2.0) | Lucas | Clean history, no secrets |
| 11 | TestFlight build (iPhone + Mac) | Lucas | Internal first, then testers |
| 12 | Website and store text ("Alles is versleuteld. Niemand kan meelezen.") | Lucas | Only after 11 |

## 6. Open questions for Tinfoil

1. Where are the enclaves? Is there an EU region?
2. Is there a monthly minimum for the Inference API?
3. Can the Swift SDK fetch attestation through our relay in production (the docs list it for Swift)?

## 7. Out of scope here

Business plans, pricing, keys and tester data stay in private repos.
