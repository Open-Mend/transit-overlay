# Changelog

## 0.5.1
- New name: Neighborhood Lens: Map Tools for Home Search (formerly Transit
  Overlay for Home Search). The Firefox add-on ID is unchanged, so existing
  installs keep updating.
- Privacy note, README and store listing describe more precisely what the
  extension reads and where pins are stored, and that the extra map layers are
  downloaded by the Google map Zillow already uses.
- Map menu stacks into one column on narrow screens instead of running off
  the edge.
- If Zillow changes part of its page, only the affected feature stops; the
  rest keep working.
- "Full map" announces whether it's on to screen readers; the pulsing hover
  marker respects "reduce motion"; walking-ring labels have stronger contrast.
- Release zips now include the LICENSE and a SHA256SUMS file.

## 0.5.0
- Map menu redesigned into blocks: Map type, Transport, Places, Climate Risks
  and Tools. Every option has a description; on short screens it scrolls.
- Transport: transit now also shows station names; new bike lanes and live
  traffic layers.
- Places: show businesses, medical, schools, places of worship, government,
  attractions and sports, which Zillow's map hides.
- Climate Risks shown as checkboxes, always open.
- Tools: dark mode (Off / On / Auto), hover highlight (marks the hovered
  listing on the map and fades the other markers), hide unlisted homes (on by
  default), measure distance with walking time, open the area in Google Maps.
- Pins: right-click the map to add a pin with an optional label and 5, 10 and
  15 minute walking rings; drag, rename, remove; open the spot in Google Maps.
- "Full map" button next to "Map" hides the listings.
- Zoom in two levels further than Zillow allows (21 instead of 19).
- "Google Maps" in each listing card's "…" menu opens its address.
- Faster map: off-market homes and property lines are removed from Zillow's
  map data before it's drawn; "Full map" stops Zillow loading the list.
- Settings, plus Zillow's own map type and climate risk, are remembered after
  a refresh.
- Toolbar pop-up explaining what the extension adds and where.

## 0.4.2
- Firefox minimum version 140 (Android 142) for the data-collection setting.

## 0.4.1
- First public release: a Transit (Off / On) option in Zillow's Map menu.
