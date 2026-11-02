# Store listings

Same text for all three stores unless noted.

## Name
Transit Overlay for Home Search

## Firefox add-on URL (≤30 chars)
transit-overlay

## Short description (Chrome/Edge ≤132 chars, Firefox summary ≤250)
Adds transit, bike lanes, live traffic, places, pins, a measure tool and dark mode to Zillow's map, and makes it load faster.

## Description
Better, faster maps for house hunting on Zillow.

This extension adds the map tools Zillow doesn't have:

- Transport: transit lines with station names, bike lanes and live traffic
- Places: businesses, medical, schools, places of worship, government,
  attractions and sports, which Zillow's map normally hides
- Climate Risks: Zillow's flood, fire, wind, air and heat shading, as
  simple checkboxes
- Dark mode, for Zillow and its map
- Hover highlight: shows where a listing is on the map when you hover it
- Pins: right-click the map to drop pins (work, school, family) with optional
  5, 10 and 15 minute walking rings
- Measure distance on the map, with walking time
- A faster map: homes that aren't for sale or rent and property lines are
  trimmed from Zillow's map data before it's drawn
- "Full map" hides the listings so the map fills the page
- Zoom in closer than Zillow normally allows
- Google Maps links: open the map area, a spot you right-click, or a
  listing's address from its "…" menu, with Street View a click away
- Your choices are remembered

Most options are in the Map menu: open a Zillow search and click "Map" on the
map.

Click the extension's toolbar icon for a short guide to everything it adds.

Ideas or problems? We'd love to hear what you'd like it to do next. Open an
issue at https://github.com/Open-Mend/transit-overlay/issues or email
OpenMend@protonmail.com.

Coverage of transit, bike and traffic layers depends on Google's map data.

Why does it ask for access to your data on www.zillow.com? Firefox, Chrome
and Edge show that warning for any extension that changes a website. This
extension only changes the search map and its menu. It does not read your
Zillow account, saved homes, searches or messages, and it makes no network
requests of its own. Pins and settings stay in your browser. You can check all
of this in the source code below.

Privacy: collects no data.
Open source: https://github.com/Open-Mend/transit-overlay

Not affiliated with or endorsed by Zillow.

## Category
- Firefox: Search Tools
- Chrome: Tools
- Edge: Productivity

## Screenshots (1280×800)
In `store-screenshots/`:
1. `1-map-menu-transit.png` (from 0.4.x; shows the old, smaller Map menu)
2. `2-transit-lines.png`
3. `3-toolbar-guide.png` (the toolbar pop-up, 0.5.0)

Still to take for 0.5.0 in a normal browser, with listing photos and agent
names blurred:
- The new Map menu with Transport and Places options on (replaces 1)
- A neighborhood map with transit lines, station names and a pin with walking rings
- Dark mode with the hover highlight on a listing

## Privacy answers
- Single purpose (Chrome): Adds map tools to Zillow's search map (transit, bike and
  traffic layers, places, pins, measuring, dark mode).
- Permissions: none. Host access: runs only on https://www.zillow.com/* to add
  options to the map menu, draw map layers and pins, and trim Zillow's own map data
  so the map loads faster.
- Remote code: No. All code is in the package.
- Data collection: None. (Firefox manifest declares `data_collection_permissions: none`.)
- Privacy policy URL: https://github.com/Open-Mend/transit-overlay/blob/main/PRIVACY.md

## Support / homepage
- Homepage: https://github.com/Open-Mend/transit-overlay
- Support (bug reports and feature ideas): https://github.com/Open-Mend/transit-overlay/issues
- Support email: OpenMend@protonmail.com
