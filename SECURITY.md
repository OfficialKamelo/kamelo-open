# Security Policy

Kamelo handles personal data, so security and privacy reports get priority.

## Supported versions

Only the latest release receives fixes. Please check that you're on the newest version (see `chrome://extensions`, `edge://extensions` or `about:addons`) before reporting.

## Reporting a vulnerability

**Please don't open a public issue for security problems.** Report privately instead:

- via **Security → Report a vulnerability** on this repository (preferred), or
- by email to hello@kamelo.eu.

Examples of what to report:
- personal data that is sent to an AI without being masked in a way that could affect many users
- any way data leaves the device, or a network request made by Kamelo
- ways to read or decrypt the vault, or to bypass the lock
- a website that can read masked values or the vault through the extension

Please include the Kamelo version, the browser and its version, the site, and steps to reproduce. Use made-up data, never real personal data.

## What happens next

- You'll get a reply within 7 days.
- Once confirmed, I'll work on a fix and keep you updated. Please give me reasonable time to release it before you disclose the issue publicly.
- With your permission, you'll be credited in the release notes.

A single missed detection (for example one name that isn't recognised) is not a security issue: please use the **Missed detection** issue template for those.
