# Store listings

Same text for all three stores unless noted.

## Name
Neighborhood Lens: Map Tools for Home Search

(44 characters; fits AMO's 50 and Chrome's 75. Formerly "Transit Overlay for
Home Search". The Firefox add-on ID `transit-overlay@home-search` and the AMO
URL stay the same, so existing users keep getting updates.)

## Firefox add-on URL (≤30 chars)
transit-overlay

## Short description (Chrome/Edge ≤132 chars, Firefox summary ≤250)
Transit, bike lanes, traffic, places, walking-ring pins, measuring and dark mode for the map on Zillow search pages.

## Description
Map tools for house hunting. See how a neighborhood really works before you
visit: transit lines and stations, bike lanes, live traffic, nearby schools,
shops and clinics, and walking rings around the places that matter to you.

Works on Zillow search pages. Open a search and click "Map" on the map to see
the new Transport, Places, Climate Risks and Tools sections.

(Formerly "Transit Overlay for Home Search".)

- Transport: transit lines with station names, bike lanes and live traffic
- Places: businesses, medical, schools, places of worship, government,
  attractions and sports, which the search map normally hides
- Climate Risks: flood, fire, wind, air and heat shading, as simple checkboxes
- Dark mode for the search page and its map
- Hover highlight: shows where a listing is on the map when you hover it
- Pins: right-click the map to drop pins (work, school, family) with optional
  5, 10 and 15 minute walking rings (straight-line distance)
- Measure distance on the map, with an estimated walking time
- Hide unlisted homes (on by default): homes that aren't for sale or rent and
  property lines are trimmed from the map data, so the map draws faster
- "Full map" hides the listings so the map fills the page
- Zoom in two levels closer
- Google Maps links: open the map area, a spot you right-click, or a
  listing's address from its "…" menu
- Your choices are remembered, including the map type and climate risk you
  picked

Click the extension's toolbar icon for a short guide to everything it adds.

Ideas or problems? We'd love to hear what you'd like it to do next. Open an
issue at https://github.com/Open-Mend/transit-overlay/issues or email
OpenMend@protonmail.com.

Coverage of transit, bike and traffic layers depends on Google's map data.

Why does it ask for access to your data on www.zillow.com? Firefox, Chrome
and Edge show that warning for any extension that changes a website. This
extension only changes the search map and its menu. It reads the map search
data only to trim it in your browser, and never stores or sends it. It doesn't
touch your account, saved homes or messages, and it makes no network requests
of its own (turning on transit, bike, traffic or places layers makes the
page's Google map download those map images, like the normal map). Pins and
settings stay in your browser. You can check all of this in the source code
below.

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

1 and 2 predate 0.5.0. Shot list to take in a normal browser (1280×800,
listing photos and agent names blurred, Zillow's logo cropped or small), with
captions; Chrome takes the first five, AMO and Edge can also keep the toolbar
guide:
1. "Your map, upgraded": the new Map menu open with Transport, Places,
   Climate Risks and Tools (replaces 1)
2. "Transit, stations and walking distance": transit lines with station names
   and a "Work" pin with 5/10/15 min rings, Full map on (replaces 2)
3. "Bike lanes and live traffic"
4. "Know what's nearby": Places on (schools, medical, shops) with a measure line
5. "Dark mode and hover highlight": a hovered card marked on the map
6. The toolbar guide (3, retake with the new name)

## Privacy answers
- Single purpose (Chrome): Adds map tools to Zillow's search map (transit, bike and
  traffic layers, places, pins, measuring, dark mode).
- Permissions: none. Host access: runs only on https://www.zillow.com/* to add
  options to the map menu, draw map layers and pins, and trim Zillow's own map data
  so the map draws faster.
- Remote code: No. All code is in the package.
- Data collection: None. (Firefox manifest declares `data_collection_permissions: none`.)
- Privacy policy URL: https://github.com/Open-Mend/transit-overlay/blob/main/PRIVACY.md

## Support / homepage
- Homepage: https://github.com/Open-Mend/transit-overlay
- Support (bug reports and feature ideas): https://github.com/Open-Mend/transit-overlay/issues
- Support email: OpenMend@protonmail.com
