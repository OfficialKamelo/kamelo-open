# Contributing to Kamelo

Thanks for helping make Kamelo better. Bug reports, personal topics Kamelo missed, notices that showed up for ordinary questions, translations of the word lists, and code are all welcome.

## Before you start

- **Security or privacy problem?** Don't open a public issue. Follow [SECURITY.md](SECURITY.md).
- **Question or idea?** Start a thread in [Discussions](https://github.com/OfficialKamelo/kamelo-open/discussions).
- **Bug, missed topic or wrong notice?** Open an issue. Use made-up data in examples, never real personal data.
- **Larger change?** Open an issue first so we can agree on the approach before you write a lot of code.

Issues labelled [`good first issue`](https://github.com/OfficialKamelo/kamelo-open/labels/good%20first%20issue) are a good place to start.

## Development setup

No build step: the extension is plain JavaScript (Manifest V3) with no runtime dependencies. You need Node 20 or newer for the tests; `npm install` adds Puppeteer for the browser tests.

```bash
git clone https://github.com/OfficialKamelo/kamelo-open.git
cd kamelo-open
npm install
npm test
npm run test:browser
```

To try your change in Chrome: open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked** and select the repository folder.
After editing, click the reload icon on the Kamelo card and reload any open AI tabs.

See the [README](README.md#development) for an overview of the source files.

## Code style

- Plain modern JavaScript, no frameworks, no build tools, no runtime dependencies.
- `'use strict'`, `const`/`let`, two-space indentation, single quotes, semicolons. Match the surrounding code.
- Keep comments short and explain *why*, not *what*.
- **No network requests.** Kamelo never contacts a server. Pull requests that add `fetch`, analytics, remote code or similar will not be merged.
- User-facing text goes in `src/strings.js`, never hard-coded: in English, Dutch, German, French and Spanish (`tests/talen.test.js` checks that every language has every text). `_locales/` is generated from it with `node tools/build-locales.mjs`.
- Recognising topics must work fully on the device: word lists, and Chrome's built-in AI only when its model is already there. No external services.

## Tests

- Every word-list change or bug fix needs a test in `tests/` that fails without your change.
- Add both a positive case (a personal question that should get the notice) and a negative case (an ordinary question that must not), for example in `tests/topics.test.js` or `tests/topics-corpus.test.js`.
- Run `npm test` and `npm run test:browser` before you open a pull request. CI runs the same checks on every pull request.
- Kamelo stopped working on an AI site? Usually the input field moved: update its `composer` selector in `src/sites.js`.

## Pull requests

1. Fork the repository and create a branch from `main` (for example `fix/dutch-debt-words`).
2. Keep each pull request focused on one change.
3. Write a clear title and fill in the pull request template.
4. Add a line to the `Unreleased` section of [CHANGELOG.md](CHANGELOG.md) for user-visible changes.
5. Make sure CI passes. A maintainer will review your pull request.

## License of contributions

Kamelo is released under the [GNU Affero General Public License v3.0](LICENSE).
By submitting a contribution, you confirm that you wrote it (or have the right to submit it), and you grant Lucas van der Wegen
a perpetual, worldwide, non-exclusive, royalty-free, irrevocable license to use, modify and distribute your contribution under
the project's license or any other license, including in paid versions of Kamelo.

## Code of conduct

Everyone taking part in this project follows the [Code of Conduct](CODE_OF_CONDUCT.md).
