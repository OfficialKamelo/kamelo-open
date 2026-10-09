# Privacy Policy – Kamelo (AI privacy software)

_Last updated: October 8, 2026_

Kamelo – AI privacy software (formerly Elidy; "Kamelo", "the extension") is a browser extension for Chrome and Edge that protects your personal data when you use AI tools. This policy explains what data the extension handles and how.

## Summary
- Kamelo does **not** collect, transmit, sell or share any of your data.
- All processing happens **locally in your browser**, on your own device.
- There is no account, no analytics, no tracking and no server. After installing, Kamelo opens kamelo.eu/welcome in a new tab, and when you remove it, your browser opens kamelo.eu/goodbye. Those are ordinary web pages (no cookies, no analytics), and Kamelo itself sends nothing.

## What data the extension handles
To do its job, the extension reads text you type or paste into AI chatbots, AI features on websites, and requests that a web page sends to AI services. In that text it detects personal information such as:
- names, email addresses, phone numbers and addresses
- bank details (IBAN, account numbers, BIC/SWIFT) and payment card numbers
- identification numbers (such as SSN, BSN, passport numbers)
- passwords, API keys and private keys

Detected information is replaced with placeholders (for example `[PERSON_1]`) before the text is sent to the AI. When the AI responds, the placeholders are replaced with the original values on your screen.

## What data is stored, and where
- **Placeholder vault**: a list that links each placeholder to its original value, so it can be restored in AI responses. It is stored only on your device using Chrome's local extension storage. You can encrypt it with AES-256-GCM, protected by Touch ID or a password of your choice.
- **Settings**: your preferences, such as sites marked as AI tools, terms you always want hidden, words you never want hidden (with the site and date you added them), and the auto-delete period.

Vault entries that have not been used for 30 days (adjustable) are deleted automatically, and the vault keeps at most 10,000 entries (the least recently used go first). You can clear the vault at any time from the extension popup. Uninstalling the extension removes all stored data.

## What data is shared
None. Kamelo never sends your data to the developer or to any third party. The extension contains no remote code, analytics or advertising.

Text that you choose to send to an AI service is sent by that website, not by Kamelo, and is subject to that service's own privacy policy. Kamelo only reduces the personal data contained in it.

**Restoring has a limit.** When Kamelo puts your real details back in an AI's answer, they appear on that web page, so that website's own code can read them, like everything else you see on the page. They are never sent to the AI by Kamelo, and each detail is only restored on the site where it was masked. If you don't want real details on the page at all, turn off "Restore in answers" in the extension.

## Permissions
- **storage**: to save your settings and the local placeholder vault.
- **activeTab**: to let the popup show whether Kamelo is active on the site in the current tab, and to let you mark that site as an AI tool.
- **scripting**: only when Kamelo is installed or updated, to start its own bundled scripts in tabs that were already open, so protection works right away. No remote code is run.
- **Access to all websites**: AI input fields appear on many websites (for example in Gmail, Slack and Notion), so the extension must be able to detect them anywhere. Page content is processed locally and never collected.

## Use of data
Kamelo's use of information complies with the Chrome Web Store User Data Policy, including the Limited Use requirements. Data is not sold, not used for advertising, not used for creditworthiness or lending purposes, and not used for any purpose other than the extension's single purpose described above.

## Children
Kamelo does not knowingly collect any data from anyone, including children.

## This website (kamelo.eu)
- **Goodbye question.** When you remove Kamelo, kamelo.eu/goodbye asks why. Only if you press Send, the reason you picked and the optional message you typed are sent to a small Kamelo service on Cloudflare (Cloudflare, Inc., USA, EU-U.S. Data Privacy Framework). We don't store your IP address or anything else from your browser, and answers are deleted automatically after a year. Please don't include personal details in your message.
- **No cookies.** kamelo.eu does not use cookies, local storage or similar technologies, so there is no cookie banner.
- **No analytics, ads or third parties.** The site loads no fonts, scripts or images from other companies, and has no forms other than the optional goodbye question above.
- **Hosting.** The site is hosted on GitHub Pages by GitHub, Inc. (USA). Like any web host, GitHub may log visitors' IP addresses to keep the service secure. GitHub participates in the EU-U.S. Data Privacy Framework. See the [GitHub Privacy Statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement).
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
