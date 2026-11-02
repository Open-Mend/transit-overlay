// Shows the installed version in the toolbar pop-up.
document.getElementById('version').textContent =
  (globalThis.browser || globalThis.chrome).runtime.getManifest().version;
