# Transit Overlay for Home Search

Extra map tools for Zillow search pages: transit lines with station names,
bike lanes, live traffic, places, pins with walking rings, a distance measure
tool, dark mode and more. Click the extension's toolbar icon for a short guide
to what it adds and where.

No data is collected and nothing is sent anywhere (see [PRIVACY.md](PRIVACY.md)).

Browsers describe the extension's access as access to your data on
www.zillow.com ("Access your data for www.zillow.com" in Firefox, "Read and
change your data on www.zillow.com" in Chrome and Edge), the standard warning
for any extension that changes a site.
It only changes the search map and its menu; it doesn't read your Zillow
account, saved homes, searches or messages. All of the page code is in
[inject.js](inject.js).

Not affiliated with or endorsed by Zillow. MIT licensed.

## What it adds

**Map menu** (click **Map** on the map), widened into blocks:
- **Transport:** transit lines with station names, bike lanes, live traffic.
- **Places:** businesses, medical, schools, places of worship, government,
  attractions and sports, which Zillow's map normally hides.
- **Climate Risks:** Zillow's flood, fire, wind, air and heat shading, as
  checkboxes.
- **Tools:** dark mode (Off / On / Auto), hover highlight, hide unlisted
  homes (on by default), measure distance, open the area in Google Maps.

**On the map**
- Right-click to add a pin with an optional label and 5, 10 and 15 minute
  walking rings, or to open that spot in Google Maps. Drag a pin to move it;
  click it to rename, toggle its rings or remove it.
- **Full map** (next to **Map**) hides the listings so the map fills the page.
- Zoom in two levels further than Zillow allows.

**On listings**
- Hover a listing card to see where it is on the map.
- In a listing's **"…"** menu, **Google Maps** opens its address. Google's page
  for the address has a photo that opens Street View.

**Faster map:** with **Hide unlisted homes** on, off-market homes and property
lines are removed from Zillow's own map data before Zillow draws them; with
**Full map** on, Zillow doesn't load the list. All settings, plus Zillow's own
map type and climate risk, are remembered after a refresh.

## Ideas and problems
Have an idea for the map, or found something broken? Open an
[issue](https://github.com/Open-Mend/transit-overlay/issues) or email
OpenMend@protonmail.com.

## Install
- **Firefox:** [Get it from Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/transit-overlay/)
- **Chrome and Edge:** store listings are coming later. Until then you can
  install it manually (see below).

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

The store packages contain exactly `manifest.json`, `inject.js`,
`popup.html`, `popup.js` and `icons/*.png` from this repo, unminified, so
anyone can compare an installed copy against the tagged release.

## Troubleshooting
- Nothing added to the Map menu: Zillow may have changed its page. Check the
  console (F12) and open an issue.
- Lines or layers don't appear: pan or zoom the map once.

Requires Firefox 140+ (Android 142+), Chrome 111+ or Edge 111+.
