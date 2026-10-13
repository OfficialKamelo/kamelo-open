# Kamelo Privacy Policy

_Last updated: October 12, 2026 (version 1.5.0)_

Kamelo, AI privacy software (formerly Elidy; "Kamelo", "the extension"), is a browser extension for Chrome, Edge and Firefox. When you type something personal into an AI chat, it suggests asking it in a temporary chat, or Melo, Kamelo's private chat, where the AI built into your browser answers on your own computer. This policy explains what data the extension handles and how.

## Summary
- Kamelo does **not** collect, transmit, sell or share any of your data.
- All processing happens **locally in your browser**, on your own device.
- There is no account, no analytics, no tracking and no server. After installing, Kamelo opens kamelo.eu/welcome in a new tab, and when you remove it, your browser opens kamelo.eu/goodbye. Those are ordinary web pages (no cookies, no analytics), and Kamelo itself sends nothing.
- Kamelo does not change or hide what you send to an AI service. Your AI account still knows who you are; Kamelo helps you choose a temporary chat or Melo for personal questions.

## What data the extension handles
- **Text you type on AI chat sites.** Kamelo only runs on the AI chat sites it knows (such as ChatGPT, Gemini and Claude). There it reads the text you type into the chat's input field and checks, on your device, whether it is about a personal topic: health, mental health, sexuality, religion, money or legal matters. If so, it shows a notice. The text is checked in memory and is not stored.
- **On-device AI check (Chrome only).** When the word list finds nothing, Kamelo may ask the AI built into Chrome (Gemini Nano) whether the text is a personal question in one of those topics. This runs entirely on your computer, only when Chrome's model is already on your device (Kamelo never downloads it for this), and nothing is stored or logged.
- **Melo, the private chat (called Private Chat before).** Questions you ask Melo are answered by the AI built into your browser, on your own computer. They are not sent anywhere. Conversations exist only in the open Melo window and are gone when you close it. The model is downloaded by your browser (for Chrome, from Google) only after you click Download.
- **Moving a message.** When you click the temporary chat or Melo button, the message you had typed is kept in the browser's session memory (never written to disk) so it can be put into the new chat. It is only handed over on the same tab and site (or to Melo), within one minute, and removed once used.

## What data is stored, and where
- **Settings**: whether Kamelo is on, stored on your device in the browser's extension storage.
- **Melo state**: whether you declined the on-device AI download, and whether it was too slow on your computer, so Kamelo doesn't ask again or can offer a temporary chat instead. No questions or answers.
- Nothing else. Uninstalling the extension removes all stored data.

**Data from earlier versions is deleted.** Versions up to 1.4.3 replaced personal details with placeholders and kept a local "vault" linking each placeholder to its original value. Version 1.5.0 no longer does this. When it is installed or updated, and each time the browser starts, it deletes the vault (also an encrypted one), the vault lock, the monthly overview and your lists of words to always or never mask from your device.

## What data is shared
None. Kamelo never sends your data to the developer or to any third party. The extension contains no remote code, analytics or advertising.

Text that you choose to send to an AI service, in a normal or a temporary chat, is sent by that website, not by Kamelo, and is subject to that service's own privacy policy. A temporary chat is a feature of that service, with its own rules on how long it is kept.

## Permissions
- **Access to AI chat sites** (only the sites listed in the extension, such as chatgpt.com, gemini.google.com and claude.ai): to check the text you type there for personal topics and show the notice. Kamelo does not run on other websites.
- **storage**: to save your on/off setting.
- **scripting**: to start Kamelo's own bundled scripts in AI chat tabs that were already open when Kamelo was installed or updated. No remote code is run.
- **sidePanel** (Chrome and Edge): to open Melo, the private chat, in the browser's side panel.

## Use of data
Kamelo's use of information complies with the Chrome Web Store User Data Policy, including the Limited Use requirements. Data is not sold, not used for advertising, not used for creditworthiness or lending purposes, and not used for any purpose other than the extension's single purpose described above.

## Children
Kamelo does not knowingly collect any data from anyone, including children.

## This website (kamelo.eu)
- **Goodbye question.** When you remove Kamelo, kamelo.eu/goodbye asks why. Only if you press Send, the reason you picked and the optional message you typed are sent to a small Kamelo service on Cloudflare (Cloudflare, Inc., USA, EU-U.S. Data Privacy Framework). We don't store your IP address or anything else from your browser, and answers are deleted automatically after a year. To stop abuse, the service allows one answer per sender per day: it keeps a scrambled code made from your IP address and the date for 24 hours, separate from your answer. The code changes every day and can't be turned back into your IP address. Please don't include personal details in your message.
- **No cookies.** kamelo.eu does not use cookies. If your browser is set to another language, the site offers that language once; when you choose a language or close that notice, the site remembers only that language code (for example `es`) in your browser's local storage, so it doesn't ask again. It never leaves your device, and you can clear it in your browser settings. Nothing else is stored, so there is no cookie banner.
- **No analytics, ads or third parties.** The site loads no fonts, scripts or images from other companies, and has no forms other than the optional goodbye question above.
- **Hosting.** The site is hosted by Cloudflare, Inc. (USA), which also runs our DNS. Like any web host, Cloudflare processes visitors' IP addresses to deliver the site and keep it secure. We have turned off visitor logs for the site and don't use Cloudflare's web analytics. Cloudflare participates in the EU-U.S. Data Privacy Framework. See the [Cloudflare Privacy Policy](https://www.cloudflare.com/privacypolicy/).
- **Links.** Links to other sites (such as Discord, YouTube, Instagram, X and Ko-fi) are covered by those sites' own privacy policies.

## Who is responsible
Kamelo is made by Lucas van der Wegen, Amsterdam, the Netherlands. Contact: hello@kamelo.eu.

## Your rights
Under the GDPR you have the right to access, correct or delete your personal data, and to object to its use. Because Kamelo does not collect any data, we usually have nothing to show or delete: everything is on your own device, and you can clear it from the extension at any time. If you email us, we only use your message to reply, and delete it when it is no longer needed.

You can also file a complaint with the Dutch Data Protection Authority ([Autoriteit Persoonsgegevens](https://autoriteitpersoonsgegevens.nl/en)).

## Changes
If this policy changes, the updated version will be published at this address with a new date.

## Contact
Questions about this policy: hello@kamelo.eu
