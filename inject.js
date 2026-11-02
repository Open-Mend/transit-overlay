// Transit Overlay for Home Search, by OpenMend. Runs in Zillow's page and adds
// map options Zillow doesn't offer. It collects nothing and makes no network
// requests of its own; settings stay in this browser (localStorage, "zt-").
//
// - Map Options menu, widened into blocks: Transport (transit lines with
//   station names, bike lanes, live traffic), Places (categories Zillow's map
//   style hides), Climate Risks as checkboxes, and Tools (dark mode, listing
//   hover highlight, hide unlisted homes, measure, Open in Google Maps).
// - Pins: right-click the map to add one, with optional walking rings.
// - "Full map" button next to "Map" to hide the listing list.
// - Two more zoom levels than Zillow allows, and links that open a spot or a
//   listing's address on google.com.
// - Lighter searches: Zillow's own map requests are trimmed before Zillow
//   draws them (see the first section).
(() => {
  // ---- Settings -------------------------------------------------------------

  const read = key => { try { return localStorage.getItem(key); } catch (e) { return null; } };
  const save = (key, value) => { try { localStorage.setItem(key, value); } catch (e) {} };
  // '1' or '0'; a missing setting uses its default.
  const flag = (key, byDefault) => { const value = read(key); return value === null ? byDefault : value === '1'; };
  const list = key => { try { return JSON.parse(read(key) || '[]'); } catch (e) { return []; } };

  const TRANSPORT_KEYS = ['transit', 'bike', 'traffic'];
  const state = {
    ...Object.fromEntries(TRANSPORT_KEYS.map(key => [key, flag(`zt-${key}-on`, false)])),
    places: list('zt-places'),
    pins: list('zt-pins'),
    dark: ['on', 'auto'].includes(read('zt-dark')) ? read('zt-dark') : 'off',
    hover: flag('zt-hover', true),
    // On unless turned off: unlisted homes are what slows the map down.
    hideUnlisted: flag('zt-hide-unlisted', true),
    hideList: flag('zt-hide-list', false),
  };
  // Zillow's own map type and climate risk, which Zillow forgets on reload.
  const zillowChoices = { mapType: read('zt-map-type') || 'auto', climate: read('zt-climate') || 'none' };

  function saveState() {
    for (const key of TRANSPORT_KEYS) save(`zt-${key}-on`, state[key] ? '1' : '0');
    save('zt-places', JSON.stringify(state.places));
    save('zt-pins', JSON.stringify(state.pins));
    save('zt-dark', state.dark);
    save('zt-hover', state.hover ? '1' : '0');
    save('zt-hide-unlisted', state.hideUnlisted ? '1' : '0');
    save('zt-hide-list', state.hideList ? '1' : '0');
  }

  // ---- Lighter searches (installed before Zillow's own code runs) --------

  // Zillow fetches its map data with fetch(). With "Hide unlisted homes" on,
  // the off-market results are dropped from search responses and the lot
  // (property) lines are removed from Zillow's outline tiles, keeping region
  // outlines such as the blue search boundary; with
  // "Full map" on, the search asks for map results only, not the list.
  // Anything unexpected passes through untouched, and the style rules further
  // down still hide things if Zillow's format changes.
  const realFetch = window.fetch;

  // Outline tiles are script like
  //   BoundaryTileRequest.responses["…"] = {"regions":[…],"parcels":[…]};
  // Empty each tile's "parcels" (lot lines) and keep its "regions".
  async function withoutLotLines(url, init) {
    const response = await realFetch.call(window, url, init);
    if (!response.ok) return response;
    try {
      const text = await response.clone().text();
      const stripped = text.replace(
        /(BoundaryTileRequest\.responses\[[^\]]+\]\s*=\s*)(\{[\s\S]*?\})(;?\s*)(?=BoundaryTileRequest\.responses|$)/g,
        (match, start, json, end) => {
          try { const tile = JSON.parse(json); tile.parcels = []; return start + JSON.stringify(tile) + end; } catch (e) { return match; }
        });
      return new Response(stripped, { status: response.status, statusText: response.statusText, headers: cleanHeaders(response) });
    } catch (e) {
      return response;
    }
  }

  // Headers for a rewritten body: the original length and compression no
  // longer apply.
  function cleanHeaders(response) {
    const headers = new Headers(response.headers);
    headers.delete('content-length');
    headers.delete('content-encoding');
    return headers;
  }

  async function lighterSearch(url, init) {
    if (state.hideList && typeof init?.body === 'string') {
      try {
        const body = JSON.parse(init.body);
        if (body.wants?.cat1) body.wants.cat1 = body.wants.cat1.filter(w => w !== 'listResults');
        if (body.searchQueryState) body.searchQueryState.isListVisible = false;
        init = { ...init, body: JSON.stringify(body) };
      } catch (e) {}
    }
    const response = await realFetch.call(window, url, init);
    if (!state.hideUnlisted || !response.ok) return response;
    try {
      const data = await response.clone().json();
      const results = data?.cat1?.searchResults;
      if (!Array.isArray(results?.mapResults)) return response;
      results.mapResults = results.mapResults.filter(r => r.statusType !== 'OTHER');
      return new Response(JSON.stringify(data), { status: response.status, statusText: response.statusText, headers: cleanHeaders(response) });
    } catch (e) {
      return response;
    }
  }

  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : null;
    if (url) {
      if (/\/map\/combo\b/.test(url) && state.hideUnlisted) return withoutLotLines(url, init);
      if (/async-create-search-page-state/.test(url) && (state.hideList || state.hideUnlisted)) return lighterSearch(url, init);
    }
    return realFetch.apply(this, arguments);
  };

  const PLACES = [
    ['poi.business', 'Businesses', 'Shops, grocery stores, restaurants, cafés, banks and gas stations'],
    ['poi.medical', 'Medical', 'Hospitals, pharmacies, doctors and emergency services'],
    ['poi.school', 'Schools', 'Schools, colleges and universities'],
    ['poi.place_of_worship', 'Places of worship', 'Churches, synagogues, mosques and temples'],
    ['poi.government', 'Government', 'City halls, courthouses and other government buildings'],
    ['poi.attraction', 'Attractions', 'Museums, landmarks and tourist attractions'],
    ['poi.sports_complex', 'Sports', 'Stadiums, sports fields and athletic complexes'],
  ];
  const STATION_NAMES = { featureType: 'transit', elementType: 'labels.text', stylers: [{ visibility: 'on' }] };

  // Same order as TRANSPORT_KEYS.
  const TRANSPORT = [
    ['transit', 'Transit', 'Subway, rail and bus lines, with station names'],
    ['bike', 'Bike lanes', 'Bike lanes, trails and bike-friendly roads'],
    ['traffic', 'Live traffic', 'Current traffic speeds on roads'],
  ];

  // A night map style for dark mode, based on Google's "night" style. It
  // only recolors land, roads, parks, water and station areas (airports):
  // a catch-all geometry rule would also turn the transit and bike lines gray.
  const DARK_MAP = [
    { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
    { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#283444' }] },
    { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#9aa4b2' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#38414e' }] },
    { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212a37' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#746855' }] },
    { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#263c3f' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
    { featureType: 'transit.station', elementType: 'geometry', stylers: [{ color: '#2f3948' }] },
  ];

  const MAX_ZOOM = 21;
  const maps = new Set();
  const layers = new Map();
  const zillowStyles = new Map();  // Zillow's own map styles per map
  let settingStyles = false;
  let patched = false;

  function track(map) {
    if (!map || maps.has(map)) return;
    maps.add(map);
    zillowStyles.set(map, map.get('styles'));
    // Zillow can restyle the map at any time; keep its styles, and re-add
    // ours on top.
    google.maps.event.addListener(map, 'styles_changed', () => {
      if (settingStyles) return;
      zillowStyles.set(map, map.get('styles'));
      setStyles(map);
    });
    google.maps.event.addListener(map, 'rightclick', e => askForPin(map, e));
    // Zillow stops zooming at 19; Google's maps have detail to 21 in most
    // cities. Put the higher limit back if Zillow resets it.
    const allowCloserZoom = () => { if ((map.get('maxZoom') || 0) < MAX_ZOOM) map.set('maxZoom', MAX_ZOOM); };
    google.maps.event.addListener(map, 'maxzoom_changed', allowCloserZoom);
    allowCloserZoom();
    apply();
    drawPins(map);
  }

  function apply() {
    for (const map of maps) {
      if (!layers.has(map)) {
        layers.set(map, {
          transit: new google.maps.TransitLayer(),
          bike: new google.maps.BicyclingLayer(),
          traffic: new google.maps.TrafficLayer(),
        });
      }
      const mapLayers = layers.get(map);
      for (const key of TRANSPORT_KEYS) mapLayers[key].setMap(state[key] ? map : null);
      setStyles(map);
    }
    applyDark();
    applyHideUnlisted();
    applyHideList();
  }

  // Zillow's style hides transit labels and most place categories. Add rules
  // after Zillow's to show what's turned on; with nothing on, Zillow's styles
  // are put back as-is.
  function setStyles(map) {
    const extra = state.places.map(featureType => ({ featureType, stylers: [{ visibility: 'on' }] }));
    if (state.transit) extra.push(STATION_NAMES);
    if (isDark()) extra.unshift(...DARK_MAP);
    const styles = zillowStyles.get(map);
    settingStyles = true;
    map.set('styles', extra.length ? [...(styles || []), ...extra] : styles);
    settingStyles = false;
  }

  function update(changes) {
    // Full map changes what Zillow's next search asks for, so run one now.
    // "Hide unlisted homes" takes effect on screen at once (CSS) and in
    // Zillow's data from the next pan or zoom.
    const research = 'hideList' in changes && changes.hideList !== state.hideList;
    Object.assign(state, changes);
    saveState();
    apply();
    if (research) refreshSearch();
  }

  // Patching prototype methods catches maps created before we got here,
  // as soon as Zillow calls any of these on them (it does on every pan/zoom).
  function patch(gm) {
    if (patched || !gm || !gm.Map || !gm.TransitLayer) return;
    patched = true;
    const proto = gm.Map.prototype;
    for (const name of ['getBounds', 'getZoom', 'getCenter', 'setCenter',
                        'setZoom', 'panTo', 'fitBounds', 'setOptions']) {
      const orig = proto[name];
      if (typeof orig !== 'function') continue;
      proto[name] = function (...args) {
        track(this);
        return orig.apply(this, args);
      };
    }
  }

  // The prototype patch also catches maps created before it, so a slow
  // poll is enough. It keeps running on map-less pages because Zillow can
  // load Google Maps later without a page reload.
  const poll = setInterval(() => {
    patch(window.google && window.google.maps);
    if (patched) clearInterval(poll);
  }, 500);

  // Adds or removes one of our <style> elements.
  function toggleStyle(id, on, css) {
    let style = document.getElementById(id);
    if (on && !style && document.head) {
      style = document.createElement('style');
      style.id = id;
      style.textContent = css;
      document.head.append(style);
    } else if (!on && style) {
      style.remove();
    }
  }

  // ---- Dark mode -----------------------------------------------------------

  // Zillow has no dark theme. Nothing is inverted: white page backgrounds
  // turn near-black, dark text on them turns light, and the map uses a night
  // style (DARK_MAP). Listing cards, menus, pop-ups and the map's own
  // controls are left as they are.
  const DARK_BG = '#111116';
  const LIGHT_TEXT = '#ebebf0';
  const CONTROLS = 'button, input, select, textarea, [role="button"]';
  // Only the search page itself: top bar, left sidebar, and the search area
  // (filters, map, results). Listing pages and other pop-ups keep Zillow's
  // light style.
  const DARK_AREAS = '[data-testid="topnav"], [data-testid="productnav"], #search-page-react-content';
  const KEEP = 'article, .gm-style, .map-gmap-controls, [data-c11n-component^="Dropdown"], [role="dialog"], [role="menu"], [role="listbox"], #zt-pin-ask';
  // Dark mode is 'off', 'on' or 'auto' (follow the browser's setting).
  const prefersDark = matchMedia('(prefers-color-scheme: dark)');
  const isDark = () => state.dark === 'on' || (state.dark === 'auto' && prefersDark.matches);
  prefersDark.addEventListener('change', () => { if (state.dark === 'auto') apply(); });

  const rgba = c => { const [r, g, b, a = 1] = (c.match(/[\d.]+/g) || [0, 0, 0, 0]).map(Number); return { r, g, b, a }; };
  const lightness = c => 0.299 * c.r + 0.587 * c.g + 0.114 * c.b;
  // The color actually showing behind an element: its own, or the nearest
  // ancestor's that isn't see-through.
  function backgroundOf(el) {
    for (let n = el; n; n = n.parentElement) {
      const c = rgba(getComputedStyle(n).backgroundColor);
      if (c.a > 0.5) return c;
    }
    return { r: 255, g: 255, b: 255, a: 1 };
  }

  const darkened = new Set();
  function darken(root) {
    // The map and the buttons over it (zoom, Schools, Map) keep Zillow's look.
    const map = document.querySelector('.gm-style');
    const mapRect = map && map.getBoundingClientRect();
    const overMap = el => {
      if (!mapRect) return false;
      const r = el.getBoundingClientRect();
      return r.width && r.left >= mapRect.left && r.right <= mapRect.right && r.top >= mapRect.top && r.bottom <= mapRect.bottom;
    };
    const elements = [root, ...root.querySelectorAll('*')]
      .filter(el => el.closest(DARK_AREAS) && !el.closest(KEEP) && !(el instanceof SVGElement));
    // Backgrounds first, then text, so text is always judged against the
    // background it ends up on.
    for (const el of elements) {
      const bg = rgba(getComputedStyle(el).backgroundColor);
      // Buttons and input boxes keep Zillow's white style.
      if (bg.a > 0.5 && bg.r >= 235 && bg.g >= 235 && bg.b >= 235 && !overMap(el) && !el.matches(CONTROLS)) {
        el.style.setProperty('background-color', DARK_BG, 'important');
        darkened.add(el);
      }
    }
    // Dark text on a dark background turns light. Text on colored backgrounds
    // (blue buttons, highlighted filters) is left alone, and light text that
    // would land on a light background is made dark.
    for (const el of elements) {
      if (darkened.has(el)) el.style.removeProperty('color');  // only undo our own color
      const text = lightness(rgba(getComputedStyle(el).color));
      const behind = lightness(backgroundOf(el));
      if (text < 120 && behind < 60) el.style.setProperty('color', LIGHT_TEXT, 'important');
      else if (text > 200 && behind > 180) el.style.setProperty('color', DARK_BG, 'important');
      else continue;
      darkened.add(el);
    }
  }

  let darkObserver = null;
  function applyDark() {
    if (!document.body) return;
    const on = isDark();
    if (on === !!darkObserver) return;
    // The page background, and the Zillow logo in white.
    toggleStyle('zt-dark-style', on, `
      html, body { background-color: ${DARK_BG} !important; }
      img[alt="Zillow logo"] { filter: brightness(0) invert(1); }`);
    if (on) {
      darken(document.body);
      // Zillow keeps adding content (results, pages); darken it as it comes.
      let queued = [];
      darkObserver = new MutationObserver(records => {
        if (!queued.length) requestAnimationFrame(() => { queued.forEach(n => n.isConnected && darken(n)); queued = []; });
        for (const r of records) for (const n of r.addedNodes) if (n.nodeType === 1) queued.push(n);
      });
      darkObserver.observe(document.body, { childList: true, subtree: true });
    } else {
      darkObserver.disconnect();
      darkObserver = null;
      for (const el of darkened) { el.style.removeProperty('background-color'); el.style.removeProperty('color'); }
      darkened.clear();
    }
  }

  // ---- Hide unlisted homes -------------------------------------------------

  // Zoomed all the way in, Zillow adds a dark marker for every home that isn't
  // for sale or rent, plus property (lot) lines. Lighter searches keep most of
  // them from being drawn at all; this style rule hides any that remain.
  // Off-market markers carry an "offmarket" color class real listings don't.
  function applyHideUnlisted() {
    toggleStyle('zt-hide-unlisted-style', state.hideUnlisted, `
      .gm-style .streamlined-marker-container:has(.dot-color-offmarket, .pill-color-offmarket),
      .gm-style .full-boundary-container[id^="parcel-"] { display: none !important; }`);
  }

  // Make Zillow search again: a one-pixel pan there and back. When the lot
  // outlines need to change, zoom out and in so Zillow fetches them again.
  // A 1px pan and back makes Zillow search again.
  function refreshSearch() {
    const map = visibleMap();
    if (!map) return;
    map.panBy(1, 0);
    setTimeout(() => map.panBy(-1, 0), 300);
  }

  // ---- Full map (hide the listing list) ------------------------------------

  // Hiding the list lets the map fill its space; Google Maps resizes itself.
  // Lighter searches also stop Zillow fetching the list's results.
  function applyHideList() {
    toggleStyle('zt-hide-list-style', state.hideList, '#search-page-list-container { display: none !important; }');
    const label = document.querySelector('#zt-list-button span');
    const text = state.hideList ? 'Show list' : 'Full map';
    if (label && label.textContent !== text) label.textContent = text;
  }

  // A copy of Zillow's "Map" button, placed just before it.
  function addListButton() {
    const mapButton = document.querySelector('[data-testid="map-layers-control-button"]');
    if (!mapButton || document.getElementById('zt-list-button')) return;
    const button = mapButton.cloneNode(true);
    button.id = 'zt-list-button';
    for (const attr of ['data-testid', 'aria-controls', 'aria-expanded', 'aria-pressed']) button.removeAttribute(attr);
    button.querySelector('svg')?.remove();
    button.title = 'Hide or show the listings, to give the map the whole page';
    button.addEventListener('click', () => update({ hideList: !state.hideList }));
    mapButton.parentElement.insertBefore(button, mapButton);
    applyHideList();
  }

  // ---- Pins with walking rings ---------------------------------------------

  // Zillow's font. Set on everything we add, because Zillow's containers
  // don't always pass it down (its menu defaults to Times).
  const FONT = 'Inter, "Inter Fallback", Arial, sans-serif';
  const PIN_COLOR = '#e8590c';
  const PIN_PATH = 'M12 0C7 0 3 4 3 9c0 6.5 9 15 9 15s9-8.5 9-15c0-5-4-9-9-9z';
  // Walking at about 80 m a minute.
  const RINGS = [[400, '5 min'], [800, '10 min'], [1200, '15 min']];
  const pinOverlays = new Map();  // map -> (pin -> its marker, rings and ring labels)
  let pinWindow = null;

  function savePins() {
    saveState();
    for (const map of maps) drawPins(map);
  }

  function ringsCheckbox(checked, onChange) {
    const label = document.createElement('label');
    Object.assign(label.style, { display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px', cursor: 'pointer' });
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = checked;
    box.addEventListener('change', () => onChange(box.checked));
    label.append(box, 'Walking rings (5 / 10 / 15 min)');
    return { label, box };
  }

  const pinTitle = pin => (pin.label ? pin.label + ' · ' : '') + 'drag to move, click for options';

  // A pin (icon and label) drawn on the map's top layer (floatPane), so
  // Zillow's listing markers can't cover it. That layer has no dragging of
  // its own, so dragging and clicking are handled here.
  function pinOverlay(map, position, pin, { onDrag, onDragEnd, onClick }) {
    const overlay = new google.maps.OverlayView();
    const div = document.createElement('div');
    div.className = 'zt-pin';
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.setAttribute('viewBox', '0 0 24 24');
    const shape = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    for (const [name, value] of [['d', PIN_PATH], ['fill', PIN_COLOR], ['stroke', '#fff'], ['stroke-width', '1.5']]) shape.setAttribute(name, value);
    icon.append(shape);
    const label = document.createElement('div');
    label.className = 'zt-pin-label';
    div.append(icon, label);
    // Keep the map (and Zillow) from treating clicks and drags on the pin as
    // its own, e.g. panning or a right-click "add pin".
    google.maps.OverlayView.preventMapHitsAndGesturesFrom(icon);

    let drag = null;
    icon.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      e.preventDefault();
      icon.setPointerCapture(e.pointerId);
      const tip = overlay.getProjection().fromLatLngToDivPixel(position);
      const pane = overlay.getPanes().floatPane.getBoundingClientRect();
      drag = { x: e.clientX, y: e.clientY, dx: e.clientX - pane.left - tip.x, dy: e.clientY - pane.top - tip.y, moved: false };
    });
    icon.addEventListener('pointermove', e => {
      if (!drag || (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 4)) return;
      drag.moved = true;
      const pane = overlay.getPanes().floatPane.getBoundingClientRect();
      position = overlay.getProjection().fromDivPixelToLatLng(
        new google.maps.Point(e.clientX - pane.left - drag.dx, e.clientY - pane.top - drag.dy));
      overlay.draw();
      onDrag(position);
    });
    icon.addEventListener('pointerup', () => {
      if (!drag) return;
      const moved = drag.moved;
      drag = null;
      moved ? onDragEnd(position) : onClick(position);
    });
    icon.addEventListener('contextmenu', e => e.preventDefault());

    overlay.onAdd = () => overlay.getPanes().floatPane.append(div);
    overlay.draw = () => {
      const point = overlay.getProjection()?.fromLatLngToDivPixel(position);
      if (point) Object.assign(div.style, { left: point.x + 'px', top: point.y + 'px' });
    };
    overlay.onRemove = () => div.remove();
    overlay.update = () => {
      label.textContent = pin.label || '';
      icon.setAttribute('aria-label', pinTitle(pin));
      div.title = pinTitle(pin);
    };
    overlay.update();
    overlay.setMap(map);
    return overlay;
  }

  // Rename or rings on/off: update the pin in place rather than redrawing,
  // so its open card stays open.
  function updatePin(pin) {
    saveState();
    for (const [map, pins] of pinOverlays) {
      const parts = pins.get(pin);
      if (!parts) continue;
      parts.marker.update();
      for (const ring of [...parts.circles, ...parts.ringLabels]) ring.setMap(pin.rings ? map : null);
    }
  }

  const north = (position, meters) => ({ lat: position.lat() + meters / 111320, lng: position.lng() });

  function drawPins(map) {
    for (const parts of (pinOverlays.get(map) || new Map()).values()) {
      for (const overlay of [parts.marker, ...parts.circles, ...parts.ringLabels]) overlay.setMap(null);
    }
    const pins = new Map();
    for (const pin of state.pins) {
      const position = new google.maps.LatLng(pin.lat, pin.lng);
      const circles = RINGS.map(([radius]) => new google.maps.Circle({
        map: pin.rings ? map : null, center: position, radius, clickable: false,
        strokeColor: PIN_COLOR, strokeOpacity: 0.8, strokeWeight: 1.5, fillColor: PIN_COLOR, fillOpacity: 0.05
      }));
      const ringLabels = RINGS.map(([radius, text]) => new google.maps.Marker({
        map: pin.rings ? map : null, position: north(position, radius), clickable: false,
        icon: { path: google.maps.SymbolPath.CIRCLE, scale: 0 },
        label: { text, className: 'zt-ring-label', color: PIN_COLOR, fontSize: '11px', fontWeight: '700' },
      }));
      const marker = pinOverlay(map, position, pin, {
        // The rings follow the pin while it's dragged.
        onDrag: p => {
          circles.forEach(c => c.setCenter(p));
          ringLabels.forEach((l, i) => l.setPosition(north(p, RINGS[i][0])));
        },
        onDragEnd: p => {
          Object.assign(pin, { lat: p.lat(), lng: p.lng() });
          savePins();
        },
        onClick: p => openPinWindow(map, p, pin),
      });
      pins.set(pin, { marker, circles, ringLabels });
    }
    pinOverlays.set(map, pins);
  }

  // Small card for a pin: rename, walking rings on/off, remove.
  function openPinWindow(map, position, pin) {
    if (!pinWindow) pinWindow = new google.maps.InfoWindow();
    const card = document.createElement('div');
    Object.assign(card.style, { font: '14px/1.4 ' + FONT, color: '#111116', minWidth: '180px' });
    const name = document.createElement('input');
    name.value = pin.label || '';
    name.placeholder = 'Label (e.g. Work)';
    Object.assign(name.style, { width: '100%', boxSizing: 'border-box', font: '700 14px/1.4 ' + FONT, padding: '4px 6px', marginBottom: '8px' });
    name.addEventListener('change', () => { pin.label = name.value.trim(); updatePin(pin); });
    const rings = ringsCheckbox(!!pin.rings, on => { pin.rings = on; updatePin(pin); }).label;
    const remove = button('Remove pin', () => {
      state.pins = state.pins.filter(p => p !== pin);
      pinWindow.close();
      savePins();
    });
    const mapsLink = button('Google Maps', () => openSpot(new google.maps.LatLng(pin.lat, pin.lng)));
    mapsLink.title = SPOT_TIP;
    const actions = document.createElement('div');
    Object.assign(actions.style, { display: 'flex', gap: '8px' });
    actions.append(mapsLink, remove);
    card.append(name, rings, actions);
    pinWindow.setContent(card);
    // Opened just above the pin's head, and in front of the pins, which
    // share the map's top layer.
    pinWindow.setOptions({ position, pixelOffset: new google.maps.Size(0, -34), zIndex: 2000 });
    pinWindow.open({ map });
  }

  // Right-click the map: a small box to name and add a pin there.
  function askForPin(map, e) {
    document.getElementById('zt-pin-ask')?.remove();
    const box = document.createElement('div');
    box.id = 'zt-pin-ask';
    const x = e.domEvent ? e.domEvent.clientX : innerWidth / 2;
    const y = e.domEvent ? e.domEvent.clientY : innerHeight / 2;
    Object.assign(box.style, {
      position: 'fixed', left: Math.min(x, innerWidth - 330) + 'px', top: Math.min(y, innerHeight - 140) + 'px',
      zIndex: 2147483000, background: '#fff', borderRadius: '12px', padding: '12px',
      boxShadow: 'rgba(0, 0, 0, 0.15) 0 8px 20px 0', font: '14px/1.4 ' + FONT, color: '#111116', width: '310px'
    });
    const name = document.createElement('input');
    name.placeholder = 'Pin label (e.g. Work), optional';
    Object.assign(name.style, { width: '100%', boxSizing: 'border-box', font: '14px/1.4 ' + FONT, padding: '6px 8px', marginBottom: '8px' });
    const close = () => { box.remove(); document.removeEventListener('mousedown', outside, true); };
    const rings = ringsCheckbox(false, () => {});  // off by default
    const add = () => {
      state.pins.push({ lat: e.latLng.lat(), lng: e.latLng.lng(), label: name.value.trim(), rings: rings.box.checked });
      close();
      savePins();
    };
    const outside = ev => { if (!box.contains(ev.target)) close(); };
    name.addEventListener('keydown', ev => { if (ev.key === 'Enter') add(); if (ev.key === 'Escape') close(); });
    const buttons = document.createElement('div');
    Object.assign(buttons.style, { display: 'flex', gap: '8px' });
    const mapsLink = button('Google Maps here', () => { openSpot(e.latLng); close(); });
    mapsLink.title = SPOT_TIP;
    buttons.append(button('Add pin', add), mapsLink, button('Cancel', close));
    box.append(name, rings.label, buttons);
    document.body.append(box);
    document.addEventListener('mousedown', outside, true);
    name.focus();
  }

  // ---- Hovered listing highlight -------------------------------------------

  // Zillow only enlarges its small price bubble. Draw a pulsing ring at the
  // hovered listing instead; its location is in the card's own
  // data-hdp-srp-context attribute.
  let hovered = null;
  let highlight = null;
  function onListingHover(e) {
    // Also run on mouseout: ad slots are iframes, so moving onto one sends
    // this page a mouseout but no mouseover.
    const target = e.type === 'mouseout' ? e.relatedTarget : e.target;
    const card = (state.hover && target?.closest?.('article[data-hdp-srp-context]')) || null;
    if (card === hovered) return;
    hovered = card;
    hideHighlight();
    // While a card is hovered, Zillow's other markers fade back.
    document.documentElement.classList.toggle('zt-hovering', !!card);
    if (!card) return;
    const position = listingPosition(card);
    const map = visibleMap();
    if (!map || !position) return;
    // Drawn on the map's top layer (floatPane): Zillow's listing markers sit
    // above Google's markers and would otherwise cover it.
    highlight = new google.maps.OverlayView();
    const div = document.createElement('div');
    div.className = 'zt-highlight';
    highlight.onAdd = () => highlight.getPanes().floatPane.append(div);
    highlight.draw = () => {
      const point = highlight.getProjection().fromLatLngToDivPixel(new google.maps.LatLng(position));
      Object.assign(div.style, { left: point.x + 'px', top: point.y + 'px' });
    };
    highlight.onRemove = () => div.remove();
    highlight.setMap(map);
    // Zillow's markers carry no listing id, so keep the one nearest the ring
    // at full strength while the others fade.
    requestAnimationFrame(() => {
      const ring = div.getBoundingClientRect();
      if (!ring.width) return;
      const x = ring.left + ring.width / 2, y = ring.top + ring.height / 2;
      let nearest = null, best = 40;  // pixels
      for (const marker of document.querySelectorAll('.gm-style .streamlined-marker-container')) {
        const r = marker.getBoundingClientRect();
        const d = Math.hypot(r.left + r.width / 2 - x, r.top + r.height / 2 - y);
        if (d < best) { best = d; nearest = marker; }
      }
      nearest?.classList.add('zt-hover-marker');
    });
  }
  // Homes carry their location in homeInfo. Apartment buildings (cards with
  // several units) don't; their id is the location instead, e.g.
  // "zpid_42.333797--71.101204".
  function listingContext(card) {
    try { return JSON.parse(decodeURIComponent(card.getAttribute('data-hdp-srp-context'))) || {}; } catch (err) { return {}; }
  }

  function listingPosition(card) {
    const context = listingContext(card);
    const home = context.homeInfo;
    if (home && typeof home.latitude === 'number') return { lat: home.latitude, lng: home.longitude };
    const id = String(context.zpid || card.id.replace(/^zpid_/, ''));
    const match = id.match(/^(-?\d+(?:\.\d+)?)-(-?\d+(?:\.\d+)?)$/);
    if (match) return { lat: Number(match[1]), lng: Number(match[2]) };
    return null;
  }

  function hideHighlight() {
    for (const marker of document.querySelectorAll('.zt-hover-marker')) marker.classList.remove('zt-hover-marker');
    if (!highlight) return;
    highlight.setMap(null);
    highlight = null;
  }

  // ---- Measure tool and Google Maps link ------------------------------------

  const visibleMap = () => [...maps].find(m => m.getDiv().offsetParent) || [...maps][0];

  // Straight-line distance in meters.
  function distance(a, b) {
    const rad = Math.PI / 180, dLat = (b.lat() - a.lat()) * rad, dLng = (b.lng() - a.lng()) * rad;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat() * rad) * Math.cos(b.lat() * rad) * Math.sin(dLng / 2) ** 2;
    return 2 * 6371000 * Math.asin(Math.sqrt(h));
  }

  let measure = null;
  function startMeasure() {
    const map = visibleMap();
    if (!map || measure) return;
    const line = new google.maps.Polyline({ map, clickable: false, strokeColor: '#0041d9', strokeWeight: 3 });
    const panel = document.createElement('div');
    panel.id = 'zt-measure';
    // Low on the map but above the Map and Full map buttons, and clear of
    // Zillow's "Remove Boundary" button at the top.
    Object.assign(panel.style, {
      position: 'absolute', bottom: '72px', left: '50%', transform: 'translateX(-50%)', zIndex: 10,
      display: 'flex', gap: '8px', alignItems: 'center', background: '#fff', borderRadius: '12px', padding: '8px 12px',
      boxShadow: 'rgba(0, 0, 0, 0.15) 0 8px 20px 0', font: '14px/1.4 ' + FONT, color: '#111116', whiteSpace: 'nowrap'
    });
    const text = document.createElement('span');
    // A dot at every point, so each click visibly lands.
    const dots = [];
    const undo = () => { line.getPath().pop(); dots.pop()?.setMap(null); render(); };
    panel.append(text, button('Undo', undo), button('Done', stopMeasure));
    map.getDiv().append(panel);
    // A drag that doesn't pan the map (e.g. one starting on Zillow's boundary
    // line) still ends in a click; only count clicks where the mouse stayed put.
    let down = null;
    const pointerDown = e => { down = { x: e.clientX, y: e.clientY }; };
    map.getDiv().addEventListener('pointerdown', pointerDown, true);
    // Zillow acts on map clicks (a click outside the search boundary removes
    // it, a click on a price opens its card), so while measuring the map's
    // clicks stop here and never reach Zillow. Panning doesn't use clicks.
    const projection = new google.maps.OverlayView();
    projection.draw = () => {};
    projection.setMap(map);
    const click = e => {
      if (!map.getDiv().contains(e.target) || panel.contains(e.target)) return;
      e.stopImmediatePropagation();
      e.preventDefault();
      if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
      const box = map.getDiv().getBoundingClientRect();
      const position = projection.getProjection()?.fromContainerPixelToLatLng(
        new google.maps.Point(e.clientX - box.left, e.clientY - box.top));
      if (!position) return;
      line.getPath().push(position);
      dots.push(new google.maps.Marker({ map, position, clickable: false, zIndex: 1e6,
        icon: { path: google.maps.SymbolPath.CIRCLE, scale: 5, fillColor: '#fff', fillOpacity: 1, strokeColor: '#0041d9', strokeWeight: 3 } }));
      render();
    };
    window.addEventListener('click', click, true);
    // Only a real Escape key press ends measuring (not the one that closes
    // Zillow's menu).
    const escape = e => { if (e.key === 'Escape' && e.isTrusted) stopMeasure(); };
    document.addEventListener('keydown', escape);
    // A pointing-finger cursor while measuring. Zillow's own cursor rules
    // win over Google Maps' cursor option, so set it with a style instead.
    const cursor = document.createElement('style');
    cursor.textContent = '.gm-style, .gm-style * { cursor: pointer !important; }';
    document.head.append(cursor);
    measure = { map, line, dots, panel, projection, click, escape, cursor, pointerDown };
    render();

    function render() {
      const points = line.getPath().getArray();
      let meters = 0;
      for (let i = 1; i < points.length; i++) meters += distance(points[i - 1], points[i]);
      const miles = meters / 1609.344;
      text.textContent = points.length === 0 ? 'Click the map to start measuring'
        : points.length === 1 ? 'Start set. Click the next point'
        : `${miles < 0.1 ? Math.round(meters * 3.28084) + ' ft' : miles.toFixed(2) + ' mi'} (${(meters / 1000).toFixed(2)} km) · about ${Math.max(1, Math.round(meters / 80))} min walk`;
    }
  }

  function stopMeasure() {
    if (!measure) return;
    measure.line.setMap(null);
    measure.dots.forEach(dot => dot.setMap(null));
    measure.panel.remove();
    measure.projection.setMap(null);
    window.removeEventListener('click', measure.click, true);
    document.removeEventListener('keydown', measure.escape);
    measure.cursor.remove();
    measure.map.getDiv().removeEventListener('pointerdown', measure.pointerDown, true);
    measure = null;
  }

  // Google Maps links, opened in a new tab only when clicked.
  const googleMaps = path => window.open('https://www.google.com/maps/' + path, '_blank', 'noopener');
  const search = query => googleMaps('search/?api=1&query=' + encodeURIComponent(query));

  // A spot, with a pin. Google's direct Street View link only works right on
  // a road (elsewhere it opens a black "no imagery" screen), so open the map
  // and let the person step into Street View there.
  const SPOT_TIP = 'Open this spot in Google Maps. For Street View, drag the yellow person onto the nearest street.';
  const openSpot = latLng => search(`${latLng.lat().toFixed(6)},${latLng.lng().toFixed(6)}`);

  // A listing card's address. Buildings show "Name | address"; keep just the
  // address.
  function listingAddress(card) {
    let address = card.querySelector('address')?.textContent.split('|').pop().trim();
    const home = listingContext(card).homeInfo;
    if (!address && home?.streetAddress) address = [home.streetAddress, home.city, home.state, home.zipcode].filter(Boolean).join(', ');
    return address || (card.getAttribute('aria-label') || '').split('|').pop().trim();
  }

  // "Google Maps" in a listing card's "…" menu (on the map pop-up and in the
  // list), right under Zillow's Share. It opens the listing's address, whose
  // Google page has a Street View photo of the building. Zillow adds the menu
  // to the page only while it's open, so the item is added each time.
  function addMenuItems() {
    for (const menu of document.querySelectorAll('[data-c11n-component="Menu.ContentPositioner"]')) {
      const share = menu.querySelector('[data-testid="property-card-share-action"]');
      if (!share || menu.querySelector('.zt-address-link')) continue;
      // The menu points back to its "…" button, which sits in the card.
      const card = document.getElementById(menu.getAttribute('aria-labelledby'))?.closest('[data-testid="property-card"]');
      const address = card && listingAddress(card);
      if (!address) continue;
      // A copy of Share keeps Zillow's look; the copy has none of Share's code.
      const item = share.closest('li').cloneNode(true);
      const link = item.querySelector('button');
      link.removeAttribute('data-testid');
      link.classList.add('zt-address-link', 'zt-menu-item');
      link.dataset.address = address;
      link.setAttribute('aria-label', 'Open this address in Google Maps');
      link.title = 'Open this address in Google Maps (its page has a Street View photo of the building)';
      link.querySelector('[data-c11n-component="Menu.ItemLabel"]').textContent = 'Google Maps';
      const icon = link.querySelector('svg');
      if (icon) {
        icon.setAttribute('viewBox', '0 0 24 24');
        const shape = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        shape.setAttribute('d', PIN_PATH);
        shape.setAttribute('fill', 'currentColor');
        icon.replaceChildren(shape);
      }
      share.closest('li').after(item);
    }
  }

  // Clicks on the menu item are caught first, at the window: otherwise they
  // can reach the card underneath and open the listing. The menu doesn't
  // close on Escape, so close it with a click outside it, as Zillow expects.
  for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
    window.addEventListener(type, e => {
      const link = e.target.closest && e.target.closest('.zt-address-link');
      if (!link) return;
      e.stopImmediatePropagation();
      e.preventDefault();
      if (type !== 'click') return;
      search(link.dataset.address);
      setTimeout(() => {
        for (const outside of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
          document.body.dispatchEvent(new (outside.startsWith('pointer') ? PointerEvent : MouseEvent)(outside, { bubbles: true }));
        }
      }, 0);
    }, true);
  }

  function openInGoogleMaps() {
    const map = visibleMap();
    if (!map) return;
    const c = map.getCenter();
    googleMaps(`@${c.lat().toFixed(6)},${c.lng().toFixed(6)},${map.getZoom()}z`);
  }

  // A plain button in Zillow's outlined style.
  function button(text, onClick) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = text;
    Object.assign(b.style, {
      font: '14px/1.4 ' + FONT, color: '#111116', background: '#fff', border: 'none', borderRadius: '12px',
      padding: '6px 12px', boxShadow: 'rgb(126, 127, 142) 0 0 0 1px inset', cursor: 'pointer'
    });
    if (onClick) b.addEventListener('click', onClick);
    return b;
  }

  // ---- Map Options menu ---------------------------------------------------

  // Rows copied from one of Zillow's radio rows so ours get the same look.
  function makeRow(template, id, text) {
    const row = template.cloneNode(true);
    const input = row.querySelector('input');
    const label = row.querySelector('label');
    for (const el of [input, label]) el.removeAttribute('data-testid');
    Object.assign(row.style, { display: '', marginLeft: '0' });
    input.id = id;
    label.htmlFor = id;
    label.textContent = text;
    return { row, input, label };
  }

  // Zillow's row and label styling, with a checkbox instead of a radio.
  function makeCheckbox(template, id, text, description, checked, onChange, compact) {
    const { row, input: radio, label } = makeRow(template, id, text);
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = id;
    input.checked = checked;
    Object.assign(input.style, { width: '20px', height: '20px', margin: '0 2px', accentColor: 'rgb(0, 65, 217)', cursor: 'pointer' });
    input.addEventListener('change', () => onChange(input.checked));
    radio.replaceWith(input);
    row.style.alignItems = 'center';
    if (description) row.title = description;
    if (compact) label.style.padding = '8px 0';
    return row;
  }

  // Headings use Zillow's "Climate Risks" text style in a 48px row, so they
  // line up with the first option next to them.
  function makeHeading(legend, text) {
    const heading = document.createElement('div');
    heading.className = legend.className;
    heading.textContent = text;
    Object.assign(heading.style, { margin: '0', padding: '0', height: '48px', display: 'flex', alignItems: 'center' });
    return heading;
  }

  function section(id, label, children, style) {
    const el = document.createElement('div');
    el.id = id;
    el.setAttribute('role', 'group');
    el.setAttribute('aria-label', label);
    Object.assign(el.style, style || {});
    el.append(...children);
    return el;
  }

  function placesSection(template, legend) {
    const rows = PLACES.map(([featureType, name, description]) =>
      makeCheckbox(template, 'zt-place-' + featureType, name, description, state.places.includes(featureType), on => {
        const places = state.places.filter(p => p !== featureType);
        if (on) places.push(featureType);
        update({ places });
      }, true));
    // A one-column grid, so the rows spread out to fill the block's height.
    return section('zt-places-section', 'Places', [makeHeading(legend, 'Places'), ...rows],
      { display: 'grid' });
  }

  // Lay the menu out as a grid: Zillow's map types and Climate Risks stay
  // where they are in the page; our sections are added around them.
  const BLOCK = { background: 'rgb(244, 244, 246)', borderRadius: '12px', padding: '0 12px 4px', boxSizing: 'border-box' };

  function enhanceMenu() {
    const content = document.querySelector('[data-c11n-component="Dropdown.Content"]');
    const body = content && content.querySelector('[data-c11n-component="Dropdown.Body"]');
    const mapTypes = body && body.querySelector('[name="searchMap-map-type"][role="group"]');
    const legend = document.querySelector('[data-testid="climate-header"]');
    const climate = legend && legend.closest('fieldset');
    const template = mapTypes && mapTypes.querySelector('[data-c11n-component="LabeledControl"]');
    if (!template || !climate || body.querySelector('#zt-places-section')) return;

    const transport = section('zt-transport-section', 'Transport', [
      makeHeading(legend, 'Transport'),
      ...TRANSPORT.map(([key, name, description]) =>
        makeCheckbox(template, 'zt-' + key, name, description, state[key], on => update({ [key]: on }))),
    ]);
    const places = placesSection(template, legend);
    const climateRisks = climateSection(template, legend, climate);
    climate.style.display = 'none';
    const tools = toolsSection(template, legend);
    body.append(transport, places, climateRisks, tools);
    // Remember Zillow's own choices so they can be restored after a reload.
    const remember = (group, key) => group.addEventListener('change', () => {
      const checked = group.querySelector('input:checked');
      if (checked) save(key, checked.id);
    });
    remember(mapTypes, 'zt-map-type');
    remember(climate, 'zt-climate');
    // Columns: map type | transport | places, with Climate Risks below the
    // first two. Each section is a light gray block.
    const place = (el, column, row) => Object.assign(el.style, BLOCK, { gridColumn: column, gridRow: row });
    place(mapTypes, '1', '1');
    place(transport, '2', '1');
    place(places, '3', '1 / span 2');
    place(climateRisks, '1 / 3', '2');
    place(tools, '1 / -1', '3');

    // Map types sit in their own column, which needs a heading too. Zillow
    // indents these rows by 8px; line them up with the headings instead.
    for (const row of mapTypes.querySelectorAll('[data-c11n-component="LabeledControl"]')) row.style.marginLeft = '0';
    if (!mapTypes.querySelector('#zt-maptype-heading')) {
      const heading = makeHeading(legend, 'Map type');
      heading.id = 'zt-maptype-heading';
      mapTypes.prepend(heading);
    }
    // 160 + 160 + 210px columns, two 12px gaps and Zillow's 16px padding.
    Object.assign(body.style, { display: 'grid', gridTemplateColumns: '160px 160px 210px', gap: '12px', paddingTop: '12px' });
    Object.assign(content.style, { width: '586px', maxWidth: 'none', maxHeight: 'none' });
    // On short screens, keep the menu inside the map and let it scroll.
    // Zillow may move a menu that doesn't fit upwards, so check both edges,
    // and again after Zillow places the shorter menu.
    const fit = tries => requestAnimationFrame(() => {
      const map = visibleMap()?.getDiv().getBoundingClientRect();
      if (!map) return;
      const box = content.getBoundingClientRect();
      const over = Math.max(0, map.top + 12 - box.top) + Math.max(0, box.bottom - map.bottom + 12);
      if (!over) return;
      Object.assign(content.style, { maxHeight: Math.max(200, box.height - over) + 'px', overflowY: 'auto', overflowX: 'hidden' });
      // Widen by the scroll bar so it doesn't cover the right column.
      content.style.width = 586 + content.offsetWidth - content.clientWidth + 'px';
      if (tries) fit(tries - 1);
    });
    fit(3);
  }

  // Tools across the bottom: the two action buttons next to the heading,
  // the two settings below, and a hint for pins (right-click the map).
  function toolsSection(template, legend) {
    // Zillow's menu ignores its Map button while focus is inside the menu,
    // but closes on Escape once the click has finished.
    const closeMenu = from => setTimeout(() =>
      from.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true })), 0);
    const measureButton = button('Measure distance', () => { closeMenu(measureButton); startMeasure(); });
    measureButton.title = 'Click points on the map to measure the distance between them';
    const googleButton = button('Open in Google Maps', openInGoogleMaps);
    googleButton.title = 'Open this map area in Google Maps in a new tab (for directions and Street View)';
    const buttons = document.createElement('div');
    Object.assign(buttons.style, { gridColumn: '2 / -1', display: 'flex', gap: '8px', justifyContent: 'flex-end' });
    buttons.append(measureButton, googleButton);
    const dark = darkModeSelect();
    const hover = makeCheckbox(template, 'zt-hover', 'Hover highlight', 'When you hover over a listing, mark its location on the map and fade the other markers', state.hover, on => update({ hover: on }));
    const unlisted = makeCheckbox(template, 'zt-hide-unlisted', 'Hide unlisted homes',
      "Hide the dark markers for homes that aren't for sale or rent, and the property lines (shown when zoomed all the way in)", state.hideUnlisted, on => update({ hideUnlisted: on }));
    const hint = document.createElement('div');
    hint.textContent = 'Tip: right-click the map to add a pin, with optional walking rings.';
    Object.assign(hint.style, { gridColumn: '1 / -1', font: '13px/1.4 ' + FONT, color: 'rgb(83, 83, 100)', paddingBottom: '8px' });
    return section('zt-tools-section', 'Tools', [makeHeading(legend, 'Tools'), buttons, dark, hover, unlisted, hint],
      { display: 'grid', gridTemplateColumns: '148px 148px 1fr', columnGap: '12px', alignItems: 'center' });
  }

  // "Dark mode: Off / On / Auto", where Auto follows the browser's setting.
  function darkModeSelect() {
    const label = document.createElement('label');
    label.title = 'Dark theme for all of Zillow, including the map. Auto follows your browser or system setting.';
    Object.assign(label.style, { display: 'flex', alignItems: 'center', gap: '6px', font: '16px/24px ' + FONT, color: 'rgb(17, 17, 22)', padding: '12px 0', whiteSpace: 'nowrap' });
    const select = document.createElement('select');
    select.id = 'zt-dark';
    for (const [value, text] of [['off', 'Off'], ['on', 'On'], ['auto', 'Auto']]) select.add(new Option(text, value, false, state.dark === value));
    Object.assign(select.style, { font: '13px ' + FONT, padding: '2px', borderRadius: '8px', cursor: 'pointer' });
    select.addEventListener('change', () => update({ dark: select.value }));
    label.append('Dark mode', select);
    return label;
  }

  // Zillow's Climate Risks radios, shown as checkboxes in a 2-column grid
  // with the heading as the first cell. Zillow shows one risk at a time, so
  // ticking one unticks the others, and unticking it selects Zillow's
  // hidden "None selected". Zillow's own (hidden) radios do the work.
  const CLIMATE = { FLOOD: 'flood', FIRE: 'wildfire', WIND: 'wind', AIR: 'air quality', HEAT: 'extreme heat' };
  function climateSection(template, legend, fieldset) {
    const radios = [...fieldset.querySelectorAll('input[type="radio"]')].filter(r => r.id !== 'none');
    const none = fieldset.querySelector('#none');
    const boxes = radios.map(radio => {
      const name = fieldset.querySelector(`label[for="${radio.id}"]`).textContent;
      const description = `Shade the map by ${CLIMATE[radio.id] || name.toLowerCase()} risk`;
      return makeCheckbox(template, 'zt-climate-' + radio.id, name, description, radio.checked, on => {
        (on ? radio : none).click();
        render();
      });
    });
    function render() {
      radios.forEach((radio, i) => { boxes[i].querySelector('input').checked = radio.checked; });
    }
    fieldset.addEventListener('change', render);
    const heading = makeHeading(legend, legend.textContent);
    return section('zt-climate-section', 'Climate Risks', [heading, ...boxes],
      { display: 'grid', gridTemplateColumns: '1fr 1fr' });
  }

  // After a reload, re-select the saved map type and climate risk through
  // Zillow's own menu (opened out of sight), so Zillow's state, legends and
  // data stay in step. Runs once, when the map is ready.
  let restored = false;
  function restoreZillowChoices() {
    const button = document.querySelector('[data-testid="map-layers-control-button"]');
    if (restored || !maps.size || !button) return;
    restored = true;
    const ids = [zillowChoices.mapType, zillowChoices.climate].filter(id => id !== 'auto' && id !== 'none');
    if (!ids.length) return;
    const hide = document.createElement('style');
    hide.textContent = '[data-c11n-component="Dropdown.ContentPositioner"] { visibility: hidden !important; }';
    document.head.append(hide);
    button.click();
    let tries = 0;
    const wait = setInterval(() => {
      const inputs = ids.map(id => document.getElementById(id));
      if (!inputs.every(Boolean) && ++tries < 40) return;
      clearInterval(wait);
      for (const input of inputs) if (input && !input.checked) input.click();
      button.click();
      hide.remove();
    }, 50);
  }

  // ---- Watch for Zillow's UI ---------------------------------------------

  // Zillow changes the page constantly; do our checks at most once a frame.
  let checkQueued = false;
  function onDomChange() {
    if (checkQueued) return;
    checkQueued = true;
    requestAnimationFrame(() => {
      checkQueued = false;
      enhanceMenu();
      addListButton();
      addMenuItems();
      restoreZillowChoices();
    });
  }

  function startObserver() {
    if (!document.body) return;
    applyDark();
    applyHideUnlisted();
    applyHideList();
    const style = document.createElement('style');
    style.textContent = `
      .zt-pin { position: absolute; z-index: 1001; width: 0; height: 0; }
      .zt-pin svg { position: absolute; left: -17px; top: -34px; width: 34px; height: 34px; cursor: grab; }
      .zt-pin svg:active { cursor: grabbing; }
      .zt-pin-label { position: absolute; transform: translate(-50%, 4px); white-space: nowrap; pointer-events: none;
        font: 700 13px/1.2 ${FONT}; color: #111116; text-shadow: 0 0 3px #fff, 0 0 3px #fff, 0 0 3px #fff; }
      .zt-ring-label { text-shadow: 0 0 2px #fff, 0 0 2px #fff, 0 0 2px #fff; }
      .zt-hovering .gm-style .streamlined-marker-container:not(.zt-hover-marker) { opacity: 0.2; transition: opacity 0.15s; }
      .zt-highlight { position: absolute; z-index: 1000; width: 14px; height: 14px; margin: -9px 0 0 -9px;
        border-radius: 50%; background: ${PIN_COLOR}; border: 2px solid #fff; pointer-events: none; }
      .zt-highlight::before { content: ''; position: absolute; inset: -16px; border: 4px solid ${PIN_COLOR};
        border-radius: 50%; animation: zt-pulse 1s ease-out infinite; }
      @keyframes zt-pulse { from { transform: scale(0.5); opacity: 1; } to { transform: scale(1.4); opacity: 0; } }`;
    document.head.append(style);
    document.addEventListener('mouseover', onListingHover);
    document.addEventListener('mouseout', onListingHover);
    new MutationObserver(onDomChange)
      .observe(document.body, { childList: true, subtree: true });
    onDomChange();
  }

  if (document.body) startObserver();
  else document.addEventListener('DOMContentLoaded', startObserver);
})();
