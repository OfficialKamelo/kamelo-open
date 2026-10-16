# Changelog

All notable changes to Kamelo are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [1.7.0] - 2026-10-16

### Added
- **Melo reads the page you're on.** Reading an article, a letter, a medicine leaflet or an email? Click "Read this page" in Melo, or ask "what's on this page?", and Melo answers about it on your computer. Only this page, only now: nothing is sent or stored. Melo reads the main text without menus, ads, forms or hidden text, never what you type into fields, never the browser's own pages, and asks first on mail, banking and pages with a password field. A long page: Melo reads the start and says so. Chrome only; it uses the `activeTab` permission, so Kamelo can only read a tab after you click its icon.
- **Melo has a new face.** A bright blue chameleon with 20 expressions: Melo listens while you type, thinks while the answer is on its way, talks as it answers and reacts to what you say, and never looks sad on its own. Drawn in Kamelo's own code, nothing loaded from the internet. The new face is also on the "Ask Melo" button, in the popup and as the icon of the chat.
- **Letters, checklists, steps and comparisons.** Ask Melo to write a letter and the parts only you know (your name, a date) become small fields to fill in. Ask for a checklist, a step-by-step plan or a comparison and you get a calm card you can tick off. What you fill in stays in this window, never goes to the AI, and comes along when you copy or save the answer as PDF or Word.
- **Melo gets sums right.** Kamelo now does the maths itself, on your computer: sums, percentages (of, discounts, VAT, what percentage, increase), equations (with the steps), circles, Pythagoras, rectangles, derivatives and unit conversions. Ask "What is 17% of 2340?" and the answer is there straight away and always correct; ask Melo to explain it and Melo explains with Kamelo's numbers.
- **A crisis line, always.** When someone writes about not wanting to live anymore, Melo's answer always ends with the crisis line (113 in the Netherlands, 112 if you are in danger now), also if the AI forgets it. This is done in Kamelo's own code, not left to the AI.
- **Checked facts.** For common school and science questions (Pythagoras, seasons, the speed of light, why the sky is blue and more), Kamelo gives Melo a short, checked fact with the question. If Melo still says something that is known to be wrong, Kamelo replaces that sentence with the right one.

### Changed
- **Melo answers in your language.** Chrome's built-in AI doesn't officially support Dutch and sometimes answered short Dutch questions in English. Kamelo now recognises Dutch, English, German, French and Spanish itself, also in short questions, stops an answer that starts in the wrong language and asks again.
- **Cleaner answers.** No more "I hope this helps!" or "Let me know" at the end, no "Of course, I can make a chart for you" at the start, no [your phone number] in letters, and no stray formula code like \boxed{5}.

- **A tidier popup.** The logo and name at the top are gone; the shield (on or off) now sits at the bottom right, next to Settings. The temporary chat has its own purple speech bubble.

### Removed
- Melo no longer has any route to a server or a “sealed chip”. Melo answers only on your own computer, or offers the AI site’s temporary chat.

## [1.6.0] - 2026-10-15

### Added
- **Melo has a face.** In the chat, Melo listens while you type, thinks while the answer is on its way, talks as it comes in, winks when a name stays hidden and looks concerned when something wasn't sent. With reduced motion turned on, the face changes without animating.
- **Melo draws charts and formulas.** Ask for a chart and Melo shows a real one: bars, stacked bars, lines, pies, or the graph of a function like y = x² − 4. Kamelo draws it on your computer and works out the function itself, so the curve is always right. Formulas show as proper math (fractions, roots, powers), and tables and headings are laid out neatly.
- **Save an answer as PDF or Word, or copy it.** Under each answer: Copy, PDF (a clean A4 page to print or save as PDF) and Word (a .docx with headings, tables and charts). Ask Melo to write a letter, CV or report and it writes the whole document. Everything is made on your computer.
- **Stop, retry and clear.** Stop an answer while it's being written, retry the last one, or clear the conversation straight away.
- **Melo has its own logo.** The light-blue chameleon head now marks Melo in the popup (instead of a green lock) and on the "Ask Melo" button in the notice; in the chat itself Melo shows his face.

### Changed
- **Melo listens first.** When you share something personal, Melo says what it hears and asks about you, instead of sending a list of tips. Tips come when you ask for them. Short, casual messages get a light answer.
- **A softer hello.** Say hi and Melo introduces himself and asks how you are, instead of asking straight away what's on your mind.
- **A calmer Melo.** The empty chat gets one line of guidance and four optional starting points. A small "Private on this device" line above the input explains, on click, where your question goes. Answers start with the answer: no "Good question!" and no "Anything else?" at the end.

### Fixed
- **Melo sometimes answered in the wrong language.** A short, casual message could get an answer in French. Melo now keeps to your language unless you clearly write in another one.
- **The free edition showed a paperclip that did nothing.**
- **Firefox: the description no longer mentions Melo.** Melo, the private chat, only exists in Chrome; in Firefox the description now says what Kamelo does there: a nudge to use a temporary chat when you ask AI something personal.

## [1.5.2] - 2026-10-15

- **The popup looks right again.** In the free edition the popup showed three large black shields and a grey switch; it now shows one small shield and a blue switch when Kamelo is on.

## [1.5.1] - 2026-10-13

### Security
- **A secrets check runs on every change.** Our automatic checks now also refuse any change that contains a key or password.

### Changed
- **Private Chat listens first.** It answers like someone who hears you out and gives practical advice, without a warning about doctors or 112 under every reply. A crisis line or 112 only comes up when it really matters. A simple "hi" gets a friendly hello back, in your language.
- **The free extension's popup says "On" instead of "Protected".** The free edition doesn't mask anything, so "Protected" promised too much.

### Added
- **Kamelo speaks Spanish, German and French.** The popup, the notices, Private Chat and the settings follow your browser's language, like the website does.
- **The welcome page opens in your language** (Dutch, German, French or Spanish) after installing.

### Changed
- **Private Chat is now called Melo.** Same private chat on your computer, new name: Melo is Kamelo's private chat, where Chrome's built-in AI answers on your own computer. The button in the notice now says "Ask Melo". Nothing else changes, and your settings stay as they are.
- **Better at everyday personal questions.** Kamelo now also notices debt in more of the ways people say it ("I have so much debt", "ik heb een schuld van 3000 euro", BKR, bailiffs, CCJs, gambling away savings), sexually transmitted infections, common medicines, palpitations, infidelity and open relationships, divorce and custody, burnout and being fired, and questions about visas, asylum and residence permits. "Schuld" as in "it's my fault", technical debt and debt as a finance term still don't give a notice.
- **Legal notice, broader words.** The notice for legal questions now says "a legal matter" instead of "police or the courts", so it also fits divorce, custody and residence permits.
- **Edge and Firefox say why.** Where Chrome offers Melo, the notice in Edge and Firefox now explains: "Edge doesn't have a built-in AI that Kamelo can use yet, so Kamelo offers a temporary chat instead."

## [1.5.0] - 2026-10-12

### Changed
- **Kamelo now focuses on Private Chat and temporary chats.** When you type something personal on ChatGPT, Claude, Gemini or another AI chat (about your health, mental health, sexuality, faith, money or legal trouble), Kamelo suggests asking it in a temporary chat, which stays out of your history and isn't used for training, or in Private Chat, where Chrome's built-in AI answers on your own computer. Kamelo doesn't change what you send, and your AI account still knows who you are: it helps you pick the right place for a personal question.
- Replacing names and details with placeholders, restoring them in answers and the vault are no longer part of the free Kamelo.
- **Old masked data is deleted.** On this update Kamelo removes everything it kept on your device for masking: the vault (also a locked one), the vault lock, the monthly overview and your lists of words to always or never mask.
- **Fewer permissions.** Kamelo now only runs on the AI chat sites it knows instead of on every website, and no longer needs the "alarms" permission.
- **Private Chat is faster, with separate conversations.** The AI on your computer gets ready as soon as the window opens, your question appears right away and the answer is written out smoothly. Start a new chat or switch between chats in the window; a question from the notice opens as a new chat, and is asked straight away when the AI is ready.
- **A simpler popup.** Just the switch (Protected), Private Chat and a temporary chat.
- The extension details page now links to kamelo.eu.

### Added
- **Better at recognising personal topics.** Kamelo understands more of the way people actually type ("im", "idk", "kheb"), everyday words for symptoms, low mood and payment trouble, forgetfulness, and leaving a faith. In Chrome, when the word list finds nothing, Kamelo asks Chrome's built-in AI on your computer as a second check, only if the model is already there (it never downloads it for this) and only after you pause typing. Your text stays on your device and isn't stored.

## [1.4.3] - 2026-10-12

### Changed
- **Firefox package is smaller.** Firefox doesn't get Private Chat, so it no longer includes the library that only Kamelo Plus needs.

## [1.4.2] - 2026-10-12

### Changed
- **Edge and Firefox: straight to a temporary chat.** Private Chat needs the AI built into Chrome, so in Edge and Firefox the notice for a personal topic now offers the temporary chat directly, and the popup no longer shows Private Chat there. Chrome is unchanged.

## [1.4.1] - 2026-10-12

### Added
- **Private Chat.** Your own chat for personal questions, from the Kamelo popup or from "Protect your data" in the notice on ChatGPT, Claude or Gemini (you can switch the latter off in Settings). In Chrome, Private Chat uses Chrome's built-in AI, so your question never leaves your device. Nothing is downloaded until you click Download, with the free space needed shown first. When the browser can't answer on the device (Edge and Firefox for now, or a computer that can't run it), Kamelo sends nothing and offers a temporary chat on ChatGPT, Claude or Gemini instead, with your text masked as usual. Edge joins automatically once it offers its built-in AI to extensions.

### Changed
- **More names, addresses and passwords caught.** Names with El, Ben, Al or Van in the middle ("Fatima El Amrani"), O'Connor and McDonald; a later "Mrs El Amrani" gets the same placeholder as the full name. Street names that start with the kind of street ("Laan van Meerdervoort 210") or have words before them ("Burgemeester de Withstraat 3", "Oude Gracht 45"), and Polish addresses and postcodes. And the password in a connection link such as `postgres://admin:…@host`.
- **Keys in code and config.** Settings like `aws_secret_access_key = …`, `DB_PASSWORD=…` or `"client_secret": "…"` are now masked too: the word may sit anywhere in the setting's name.
- **Better at names in personal messages.** Kamelo now knows more Dutch first names (like Annelies, Marleen, Marcel) and also masks names that are ordinary words, like Mark or Frans, when the words before them clearly point to a person: "my ex Mark", "ze heet …", "my therapist …", "dear Mark". Without such a clue ("Mark this as done", "in het Frans") or before a number ("met Max 5 personen") they stay as they are.

## [1.4.0] - 2026-10-11

### Security
- **Websites only ever see their own part of the vault.** Kamelo's background now hands each page only the details that were masked on that same site, and only accepts changes for that site. The full vault and the key of a protected vault stay inside Kamelo itself (the popup, the vault window and the background), out of reach of every website, even one that has been hacked.
- **"Deleted after 30 days" is now guaranteed.** The background clears old details on start, every 12 hours and right after unlocking, also when you don't open an AI site for a while. (Before, this only happened when you opened an AI site or the popup.) Requires the "alarms" permission, which shows no warning.
- **Better not sent than sent unmasked.** If Kamelo can't mask a message to an AI service in time, or a page tries to wear out its limit, the message is stopped instead of going out with your details; just send it again. Kamelo's own settings on that site are respected: when it's off, nothing changes.
- A page can no longer switch off the network filter by changing Kamelo's list of AI services after loading.

### Added
- **See what Kamelo does, right in the text.** While you type, names, email addresses and other details that will be masked get a blue wavy underline; hover for "Mask now" or "Keep visible". After masking, the placeholders in the text field are marked in blue. In the AI's answer, every detail Kamelo put back gets a dotted underline; hover to see the placeholder the AI saw. Kamelo draws these marks with the browser's highlight feature (CSS Custom Highlight API), without changing the page itself. Not in plain text boxes (`<textarea>`) and not in Firefox before version 140; masking and restoring work there as before.
- **Ask privately in the popup.** On ChatGPT, Claude and Gemini the popup offers "Ask privately": the tab moves to a temporary chat, taking along what you had typed, masked as usual.
- **Ask privately.** When you share something personal (health, money problems, …) on ChatGPT, Claude or Gemini, the notice now offers "Ask privately": one click opens a temporary chat (Claude: incognito) with your message already in it, masked as usual. Temporary chats stay out of your history and memory and aren't used for training. Your text travels along in memory only, for that tab, for at most a minute.
- **Firefox.** Kamelo now also runs in Firefox (128 and newer). `npm run pack:firefox` builds the package for addons.mozilla.org; in Firefox the vault reaches the page through the background, because content scripts can't read session storage there.
- When you remove Kamelo, your browser opens a short goodbye page (kamelo.eu/goodbye) that asks what didn't work and shows a quick fix for each reason. It's an ordinary web page: Kamelo sends nothing.

### Changed
- **New short description:** "Talk to AI freely. Kamelo masks your name and personal details on your device before they reach ChatGPT, Gemini, Claude or other AI."
- **Kamelo is open source.** The code is now licensed under the AGPL-3.0 (it was PolyForm Noncommercial). The name and logo stay protected; see TRADEMARKS.md.
- **Settings in categories.** Masking (always/never protect, sensitive topics), Vault (restore, auto-delete, vault lock) and Sites (mask every text field, marked sites) each have their own page, with help and the version below.
- **One blue, easier to read.** The popup, the in-page notice and the details window now share one blue, and small grey and blue text, placeholders and the green "restored" label all meet the WCAG AA contrast level in light and dark mode.
- **A clearer popup with less text.** One glance tells you where you stand, and where: "Protected on chatgpt.com" on a green card on an AI site (or "temporary chat on chatgpt.com"), "Ready" with "Masks AI fields on bol.com" on other websites, and "Off" on an orange card that says what that means: on every site, personal details go to AI unmasked. And the switch. Below it: Mask text, how much Kamelo protected this month (click the number for the breakdown), and Vault and Settings side by side. Right after installing, a "Try Kamelo" button (opens ChatGPT) takes the place of the number.
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
- **The notice never covers the text bar.** It now sits 8px above the visible bar (not just the text inside it), lined up with its left edge, and follows it while a long message makes it grow, on every AI site, also those without a form (Claude, Gemini, Perplexity). No room above? Then below the bar, then beside it, and only on a small screen as a small badge on the bar's top edge. It also stays put when a site swaps its text field after pasting (Grok).
- A stray line above "Clear vault".
- "Locked" was shown twice on the main screen when the vault was locked; it now appears once, next to the vault.
- An empty "Marked as AI" section in Settings.

## [1.3.3] - 2026-10-11

### Security
- **A website could read details you masked elsewhere.** Small frames without their own web address (for example an empty `about:blank` or `srcdoc` frame that a page creates) were not tied to any site, so Kamelo treated every detail in your vault as allowed there. A malicious page could put placeholders like [PERSON_1] in such a frame and read back the real values. Those frames now belong to the page around them, and a frame Kamelo can't place gets nothing. Found in our own security review; we know of no abuse. Update to 1.3.3.

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

