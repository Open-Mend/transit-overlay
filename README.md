# Transit Overlay for Home Search

Adds a **Transit** column (Off / On) to the **Map Options** menu on Zillow
search pages, next to Automatic / Satellite / Street view. Turn it on to
overlay public transit lines and stations (Google's transit layer) on the
map. Your choice is remembered.

No data is collected and nothing is sent anywhere (see [PRIVACY.md](PRIVACY.md)).

Browsers describe the extension's access as "Access your data for
www.zillow.com", the standard wording for any extension that changes a site.
It only adds the Transit option and turns on the transit layer; it doesn't
read your Zillow account, saved homes, searches or messages. All of the code
is in [inject.js](inject.js).
Not affiliated with or endorsed by Zillow. MIT licensed.

## Install
- **Firefox:** [Get it from Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/transit-overlay/)
- **Chrome and Edge:** store listings are coming later. Until then you can
  install it manually (see below).

Then open a Zillow search, click **Map** (bottom of the map) and choose
**Transit → On**.

### Manual install in Chrome / Edge
1. Download `transit-overlay-<version>-chrome-edge.zip` from the
   [latest release](https://github.com/Open-Mend/transit-overlay/releases/latest)
   and unzip it.
2. Go to `chrome://extensions` (or `edge://extensions`), turn on
   **Developer mode**, click **Load unpacked** and pick the unzipped folder.

## Development

### Try local changes in Firefox
1. Go to `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on…** and pick `manifest.json` in this folder.

Temporary add-ons are removed when Firefox restarts. In Chrome/Edge, use
**Load unpacked** on this folder; Chrome will show a harmless warning about
the Firefox-only `browser_specific_settings` key.

### Building
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

Requires Firefox 140+ (Android 142+), Chrome 111+ or Edge 111+.
