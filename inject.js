// Runs in Zillow's page context. Finds the Google Maps instance(s) Zillow
// creates and adds a Transit column to Zillow's "Map Options" menu that
// turns google.maps.TransitLayer on and off.
(() => {
  const STORAGE_KEY = 'zt-transit-on';
  const COLUMN_ID = 'zt-transit-heading';
  const maps = new Set();
  const layers = new Map();
  let patched = false;
  let enabled = false;
  try { enabled = localStorage.getItem(STORAGE_KEY) === '1'; } catch (e) {}

  function track(map) {
    if (!map || maps.has(map)) return;
    maps.add(map);
    apply();
  }

  function apply() {
    for (const map of maps) {
      if (!layers.has(map)) layers.set(map, new google.maps.TransitLayer());
      layers.get(map).setMap(enabled ? map : null);
    }
  }

  function setEnabled(on) {
    enabled = on;
    try { localStorage.setItem(STORAGE_KEY, on ? '1' : '0'); } catch (e) {}
    apply();
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

  // Fill the empty right-hand column next to Automatic / Satellite /
  // Street view with a "Transit" heading and Off / On radios.
  // Laying the map-type group out as a two-column grid keeps the menu's
  // height unchanged, so the height-capped menu doesn't start scrolling.
  function addTransitColumn() {
    const mapTypes = document.querySelector('[name="searchMap-map-type"][role="group"]');
    if (!mapTypes || mapTypes.querySelector('#' + COLUMN_ID)) return;
    const rows = [...mapTypes.querySelectorAll(':scope > [data-c11n-component="LabeledControl"]')];
    if (!rows.length) return;
    const climateLegend = document.querySelector('[data-testid="climate-header"]');

    const heading = document.createElement('div');
    heading.id = COLUMN_ID;
    heading.textContent = 'Transit';
    if (climateLegend) heading.className = climateLegend.className;
    Object.assign(heading.style, {
      gridColumn: '2', gridRow: '1', margin: '0', padding: '0',
      display: 'flex', alignItems: 'center'
    });

    const radios = [['off', 'Off', 2], ['on', 'On', 3]].map(([value, text, gridRow]) => {
      const row = rows[0].cloneNode(true);
      const input = row.querySelector('input');
      const label = row.querySelector('label');
      for (const el of [input, label]) el.removeAttribute('data-testid');
      input.id = 'zt-transit-' + value;
      input.name = 'zt-transit';
      input.checked = (value === 'on') === enabled;
      input.addEventListener('change', () => { if (input.checked) setEnabled(value === 'on'); });
      label.htmlFor = input.id;
      label.textContent = text;
      Object.assign(row.style, { gridColumn: '2', gridRow: String(gridRow) });
      return row;
    });

    // Line our column up with Climate Risks' second column (Wind / Air / Heat).
    const left = id => { const el = document.getElementById(id); return el && el.getBoundingClientRect().left; };
    const firstCol = left('WIND') - left('none');
    rows.forEach((row, i) => Object.assign(row.style, { gridColumn: '1', gridRow: String(i + 1) }));
    Object.assign(mapTypes.style, {
      display: 'grid', alignItems: 'center',
      gridTemplateColumns: firstCol > 0 ? `${firstCol}px 1fr` : '1fr 1fr'
    });
    mapTypes.append(heading, ...radios);
  }

  function startObserver() {
    new MutationObserver(addTransitColumn)
      .observe(document.body, { childList: true, subtree: true });
    addTransitColumn();
  }

  if (document.body) startObserver();
  else document.addEventListener('DOMContentLoaded', startObserver);
})();
