# Releasing Kamelo

Every release goes the same way: one command, a beta check, then the Chrome Web Store and Microsoft Edge Add-ons.

## 1. Write down what changed

Add your changes under `## [Unreleased]` in [CHANGELOG.md](../CHANGELOG.md) while you work.
The release script refuses to run when that section is empty.

## 2. Run the release script

```bash
npm run release -- patch          # 1.1.3 → 1.1.4, for fixes
npm run release -- minor          # 1.1.3 → 1.2.0, for new features
npm run release -- patch --dry-run
```

The script:

1. checks that you are on `main`, the working tree is clean and nothing newer is on GitHub;
2. bumps the version in `manifest.json`, `package.json` and `package-lock.json`;
3. moves `[Unreleased]` in the changelog under the new version, with today's date and compare links;
4. runs all unit and browser tests, and undoes the version bump if any fail;
5. builds the zips in `web-store-uploaden/`, one folder per store: `Google Chrome/` (store + beta), `Microsoft Edge/` (the same store zip) and `Firefox/`;
6. commits `Release <version>` and tags `v<version>`.

Push with `git push --follow-tags`, or pass `--push` to let the script do it.

## 3. Beta first

The beta is a **separate, private item** in the Chrome Web Store called *Kamelo Beta*.
Its icon shows a β, so it is easy to tell apart from the regular version.

Setup, once:

1. Developer Dashboard → **New item** → upload `kamelo-beta-<version>.zip`.
2. Fill in the listing (the regular texts are fine) and the privacy tab, the same as for Kamelo.
3. **Distribution → Visibility: Private**, and add your testers under **Trusted testers** (email addresses or a Google Group).
4. Submit. Testers install it from the link in the dashboard.

For every release, upload the new beta zip to that item, install it, and use it for a day on the sites you care about.
Turn off the regular Kamelo while testing so the two don't both mask.

## 4. Then the store

Upload `kamelo-store-<version>.zip` to the Kamelo item and submit it for review.

**Staged rollout.** Once Kamelo has more than 10,000 weekly users, the dashboard lets you publish to a percentage of users.
Start with 10%, watch issues and reviews for a day or two, then go to 100%.

**Edge.** The same `kamelo-store-<version>.zip` works in Edge. In [Partner Center](https://partner.microsoft.com/dashboard/microsoftedge/overview),
open Kamelo → **Packages** → upload the zip → **Publish**, and describe the changes under *Notes for certification*.
Certification takes up to seven business days.

**Something wrong after publishing?** Use the rollback in the dashboard if it is offered.
Otherwise check out the previous tag, release it with a higher version number and submit that.

## When a site breaks

The nightly [Live sites](../.github/workflows/sites.yml) workflow opens the AI sites from [src/sites.js](../src/sites.js),
pastes made-up data and checks that it is masked and restored. Nothing is sent.
When a site breaks, the workflow fails, GitHub emails you and an issue labelled `site-broken` is opened.

1. Run the check yourself: `npm run test:sites -- chatgpt --show`.
2. Usually the input field moved. Find its new selector in Chrome's developer tools and update `composer` in `src/sites.js`.
3. Run the check again, add a line to the changelog, and release a patch.

Sites that show bots a security check are skipped in GitHub's nightly run (they say nothing about Kamelo).
Run `npm run test:sites -- --show` on your own computer to check those.

## After the release: update video
Every release gets an update video for YouTube and a reel. Write `studio/marketing/updates/<version>.js` from the changelog entry and run `bash studio/marketing/make-update.sh <version>` (the marketing folder is local, not in git). The videos and post texts land in `media/<kanaal>/niet ready/<version>/`.

## Firefox (addons.mozilla.org)

- `npm run pack:firefox` maakt `web-store-uploaden/Firefox/kamelo-firefox-<versie>.zip`; invulinstructies staan in `web-store-uploaden/Firefox/INVULLEN-FIREFOX.md`. Het manifest krijgt daar `background.scripts`
  (Firefox kent geen service worker), het add-on-ID `kamelo@kamelo.eu`, minimaal Firefox 128 en `data_collection_permissions: none`.
- Testen: eenmalig `npx puppeteer browsers install firefox`, daarna `npm run test:firefox` (echte Firefox, echt plakken).
- Uploaden op https://addons.mozilla.org/developers/ (account van Lucas). Mozilla vraagt soms de broncode als die niet leesbaar is;
  Kamelo is gewone JavaScript zonder build-stap, dus dat is niet nodig.
- Lint: `npx web-ext lint --source-dir <uitgepakte zip>`; alleen twee waarschuwingen over innerHTML met vaste stijlen (veilig).
