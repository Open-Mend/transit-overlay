# Transit Overlay for Home Search

Adds a **Transit** column (Off / On) to the **Map Options** menu on Zillow
search pages, next to Automatic / Satellite / Street view. Turn it on to
overlay public transit lines and stations (Google's transit layer) on the
map. Your choice is remembered.

No data is collected and nothing is sent anywhere (see [PRIVACY.md](PRIVACY.md)).
Not affiliated with or endorsed by Zillow. MIT licensed.

## Try it in Firefox (temporary, no signing needed)
1. Go to `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on…** and pick `manifest.json` in this folder.
3. Open a Zillow search, click **Map** (bottom of the map) and choose
   **Transit → On**.

Temporary add-ons are removed when Firefox restarts.

## Install permanently in Firefox
Firefox only keeps signed add-ons. Upload the Firefox zip (see Building)
to https://addons.mozilla.org/developers/ — choose
**On this site** (public listing) or **On your own** (unlisted, you get a
signed .xpi to install yourself). Both are free.

## Chrome / Edge
1. Unzip `transit-overlay-<version>-chrome-edge.zip`.
2. Go to `chrome://extensions` (or `edge://extensions`), turn on
   **Developer mode**, click **Load unpacked** and pick the unzipped folder.

Loading this source folder directly also works, but Chrome will show a
harmless warning about the Firefox-only `browser_specific_settings` key.

To publish: Chrome Web Store (https://chrome.google.com/webstore/devconsole,
one-time $5 fee) and Microsoft Edge Add-ons
(https://partner.microsoft.com/dashboard/microsoftedge, free) both take the
same `chrome-edge` zip.

## Building
```
python3 build.py
```
Writes `transit-overlay-<version>-firefox.zip` and
`transit-overlay-<version>-chrome-edge.zip` to `dist/`.
Bump `version` in `manifest.json` before each store upload.

The store packages contain exactly `manifest.json`, `inject.js` and
`icons/*.png` from this repo, unminified, so anyone can compare an installed
copy against the tagged release.

## Troubleshooting
- No Transit column: Zillow changed its menu. Check the console (F12).
- Lines don't appear: pan or zoom the map once.

Requires Firefox 128+, Chrome 111+ or Edge 111+.
