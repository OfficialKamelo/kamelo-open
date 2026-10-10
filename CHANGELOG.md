# Changelog

All notable changes to Kamelo are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- **Firefox.** Kamelo now also runs in Firefox (128 and newer). `npm run pack:firefox` builds the package for addons.mozilla.org; in Firefox the vault reaches the page through the background, because content scripts can't read session storage there.
- When you remove Kamelo, your browser opens a short goodbye page (kamelo.eu/goodbye) that asks what didn't work and shows a quick fix for each reason. It's an ordinary web page: Kamelo sends nothing.

### Changed
- **Kamelo is open source.** The code is now licensed under the AGPL-3.0 (it was PolyForm Noncommercial). The name and logo stay protected; see TRADEMARKS.md.
- **Settings in categories.** Masking (always/never protect, sensitive topics), Vault (restore, auto-delete, vault lock) and Sites (mask every text field, marked sites) each have their own page, with help and the version below.
- **One blue, easier to read.** The popup, the in-page notice and the details window now share one blue, and small grey and blue text, placeholders and the green "restored" label all meet the WCAG AA contrast level in light and dark mode.
- **A clearer popup with less text.** One glance tells you where you stand: "Protected" on a green card when Kamelo is on, "Off" on a grey card when it's off, and the switch. Below it: Mask text, how much Kamelo protected this month (click the number for the breakdown), and Vault and Settings side by side. Right after installing, a "Try Kamelo" button (opens ChatGPT) takes the place of the number.
- **The notice shows what was masked, right above where you type.** For example "Sarah Miller → [PERSON_1] +3 more", with Details and a close button. Press Esc to close it; it never takes the focus away from your message, and it stays put while you hover over it. After the first five times it shrinks to just "4 protected".
- **"What the AI sees".** Details opens a small card in the same spot, listing each item with its type, your value (bank and card numbers partly hidden) and the placeholder the AI gets, with "Keep visible" on every row.
- The vault lock and "How does it work?" moved to Settings.
- "Mask every text field" moved from the main screen to Settings, under the current site.
- The vault hides your real details until you hover over them or tap the eye button, just like the details window.
- Section headers are no longer in capitals, and the button in the notice is now called "Details" (Dutch: "Bekijk").
- Keyboard focus is clearly visible everywhere, including the auto-delete menu; remove buttons are easier to hit; icons share one line weight.
- Notice animations respect the system "reduce motion" setting.

### Fixed
- **Grok.** Grok is rolling out a new text field; Kamelo now finds both the old and the new one.
- A stray line above "Clear vault".
- "Locked" was shown twice on the main screen when the vault was locked; it now appears once, next to the vault.
- An empty "Marked as AI" section in Settings.

## [1.3.2] - 2026-10-08

### Added
- **Mask text, anywhere.** A new row in the popup: paste or type text, and Kamelo masks it right there, ready to paste into places it can't reach itself, like the Copilot sidebar in Edge, desktop apps or Word. Paste the AI's answer into the same box and your real details come back. It sees which one you need: plain text is masked, text with placeholders is restored. Copy with one click or ⌘/Ctrl + Enter.
- Details masked in the popup stay in the popup: no website can ask Kamelo to restore them.

### Changed
- "Restore text" moved out of the vault into **Mask text**, so masking and restoring live in one place.
- Kamelo is now called **Kamelo: AI privacy software** (in Dutch: *privacysoftware voor AI*).

## [1.3.1] - 2026-10-08

### Changed
- After installing, Kamelo opens a short welcome page on kamelo.eu (pin Kamelo, try it on ChatGPT, Gemini or Claude). "How does it work?" in the popup also opens kamelo.eu.

### Removed
- The built-in welcome page; it now lives on kamelo.eu/welcome.

## [1.3.0] - 2026-10-08

### Security
- **The vault is now kept per site.** Details masked on one site are only restored on that same site, and the same detail on another site gets its own placeholder. Before, any website could ask Kamelo to restore placeholders and read back details masked elsewhere (for example a password pasted into ChatGPT). Details masked before this update are only restored on known AI sites.
- Copying with real details only happens during a real click or key press, which a website can't fake.
- A website can no longer fill the vault with junk or choose the text of Kamelo's notice.

### Added
- **This month** in the popup: how many items Kamelo protected this month, with the most common kinds (names, email addresses, keys, …). Only counts, stored on your device; no values, no sites.
- **Sensitive topics:** a calm notice when you share something about your own health, mental health, sexuality, faith, money problems or police and courts. Kamelo can't mask these, so it suggests a temporary chat. Once per topic per page; "Don't show again" mutes a topic, and the switch in Settings turns it off or back on. General questions ("What are the symptoms of diabetes?") don't trigger it. Works in 82 languages.

### Changed
- Contact and "Report a problem" by email now use hello@kamelo.eu.
- The vault row in the popup is now called **In the vault**, so it isn't confused with the monthly count.
- The popup opens with one line about this site ("Protected on ChatGPT", "Protection is off"), tinted blue when Kamelo is on and grey when it's off. Rows have small colour icons like System Settings, colours follow Apple's 2025 palette, and the footer is just "How does it work?".
- Kamelo now starts by itself in a tab that was already open when you open the popup; no more "Reload this page". On any website the popup says "Protected on google.com", and **Mask every text field** (formerly "Treat this site as AI") turns it on for AI features Kamelo doesn't recognise.
- A calmer popup: protection and the current site at the top, then the vault, the vault lock and **This month** (which opens the monthly overview). The explanation lines under the rows are gone; "Treat this site as AI" has a short subtitle instead.

## [1.2.1] - 2026-10-07

### Changed
- Contact and "Report a problem" now use a dedicated Kamelo email address.

## [1.2.0] - 2026-10-07

### Changed
- Elidy is now called **Kamelo**, with a new logo: a blue chameleon. Settings and protected data carry over; nothing to do after the update.
- The notice is shorter: how many items were protected, with **More info**. That opens a panel with each item, what the AI sees instead, and a button to keep it visible (with undo). Real values stay blurred until you point at them or press the eye. The panel is light or dark like the site you're on.
- All known AI sites and their input fields live in one file, `src/sites.js`.

### Added
- Ready for Microsoft Edge: texts and the pin step on the welcome page follow the browser (Edge uses an eye icon instead of a pin), and a 300×300 store logo.
- "Report a problem" in the popup settings: an email with the site, Kamelo version and browser filled in, nothing else.
- The donate button on the welcome page links to Ko-fi.
- Browser tests that run Kamelo in a real Chrome, and a nightly check on the real AI sites that opens an issue when a site breaks.
- A release script (`npm run release`) and a beta build that shows a β on its icon.

### Fixed
- Copy buttons that set the clipboard in their own copy handler (like ChatGPT's) copied placeholders; they now copy the real values.
- Copilot's new address, copilot.com, is recognised as an AI site.

## [1.1.3] - 2026-10-06

### Added
- Welcome page with an animation that shows how masking and restoring work (with a pause button), and a "how to tell it works" section.
- Lock and unlock the vault right in the popup: a password field, a Touch ID button (opens a small window that asks for your fingerprint and closes itself) and a "Lock now" button.
- The setup steps on the welcome page tick themselves off: when Kamelo is pinned to the toolbar, and when it protects something for the first time. A button copies a test IBAN to try it.
- License (PolyForm Noncommercial 1.0.0), contributing guide, code of conduct, issue and pull request templates, Dependabot.

### Changed
- Kamelo now also works in tabs that were already open when it was installed or updated; no reload needed. This adds the `scripting` permission and an explicit `<all_urls>` host permission, both covered by the existing "read and change all your data" warning.
- After an update, the previous content script in open tabs hands over to the new one instead of masking alongside it.
- The donate button is hidden until there is a donation link. The footer links to the privacy policy, contact and GitHub.

### Fixed
- Editable blocks inside AI answers (such as ChatGPT's email drafts) now show the real values instead of placeholders. Placeholders stay only in the field you type or paste into.

## [1.1.2] - 2026-10-06

### Fixed
- Tabs that were open when the extension was reloaded or updated no longer fill Chrome's error list with "Extension context invalidated". Masking keeps working with what is already in memory.

## [1.1.1] - 2026-10-06

### Fixed
- The content script never ran in Chrome, so nothing was masked on any site. The AI host list for the network filter now lives in its own file, and a test fails if content script entries share a file.

## [1.1.0] - 2026-10-06

### Added
- Masked names are recognised later in other forms (lowercase, first or last name), with the same placeholder.
- Company names by legal form (Inc., Ltd, BV, GmbH and others).
- The notice lists remembered words. Click one to keep it visible (added to "Never protect" with its origin), with undo.
- Copy buttons on AI sites copy the real values instead of placeholders.

### Changed
- Names that are also ordinary words (Will, May, Mark) are only masked after a clear cue.
- The vault is capped at 10,000 entries; the least recently used go first.

## [1.0.0] - 2026-10-05

### Added
- First release: masks personal data on the device before it reaches ChatGPT, Gemini, Claude and other AI tools, and restores the real values in answers.
- Optional encrypted vault (Touch ID or password), automatic cleanup after 30 days.

