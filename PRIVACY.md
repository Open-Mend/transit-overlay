# Privacy policy

Neighborhood Lens: Map Tools for Home Search (formerly Transit Overlay for
Home Search) does not collect or send any data.

- It runs only on https://www.zillow.com/ pages.
- It makes no network requests of its own. When you turn on transit, bike
  lanes, traffic or places, the Google Maps code that Zillow's page already
  loads downloads those map images from Google, the same way it loads the
  normal map. No other library or script is loaded.
- To make the map draw faster, it edits Zillow's map data in your browser
  after it arrives: off-market homes and property lines are removed before
  Zillow's page draws them. With "Full map" on, Zillow's own search request
  asks for map results only, not the list. It reads this map search data only
  to trim it, and never stores or sends it. Nothing extra is sent anywhere.
- Your settings and pins (their locations and labels) are saved in
  zillow.com's local storage in this browser. The extension never sends them
  anywhere, but because they are stored on zillow.com, Zillow's own page could
  read them. Clearing zillow.com's site data deletes them.
- Google Maps opens in a new tab only when you click one of its links; that
  sends the spot or address you chose to Google, like any Google Maps link.

Questions: open an issue at https://github.com/Open-Mend/transit-overlay/issues
