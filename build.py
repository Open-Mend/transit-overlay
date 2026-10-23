#!/usr/bin/env python3
"""Build store-ready zips for Firefox and Chrome/Edge into dist/.

The source manifest is the Firefox one. The Chrome/Edge build drops the
Firefox-only `browser_specific_settings` key (Chrome warns about it) and
sets the minimum Chrome version that supports `"world": "MAIN"`.
"""
import json
import pathlib
import zipfile

SRC = pathlib.Path(__file__).resolve().parent
DIST = SRC / 'dist'
FILES = ['inject.js', 'icons/icon-16.png', 'icons/icon-32.png',
         'icons/icon-48.png', 'icons/icon-128.png']

manifest = json.loads((SRC / 'manifest.json').read_text())
chrome = {k: v for k, v in manifest.items() if k != 'browser_specific_settings'}
chrome['minimum_chrome_version'] = '111'

DIST.mkdir(exist_ok=True)
for target, m in [('firefox', manifest), ('chrome-edge', chrome)]:
    out = DIST / f"transit-overlay-{manifest['version']}-{target}.zip"
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('manifest.json', json.dumps(m, indent=2) + '\n')
        for f in FILES:
            z.write(SRC / f, f)
    print(out)
