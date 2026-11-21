"""Build store-ready zips: python build.py  ->  dist/tweaks-for-passmedicine-<browser>-<version>.zip

Chrome gets the manifest without Firefox's browser_specific_settings; Firefox gets it as-is.
Uses zipfile (forward-slash paths), which both stores require.
"""
import json
import zipfile
from pathlib import Path

ROOT = Path(__file__).parent
FILES = ['popup.html', 'popup.js', 'stats.html', 'stats.js', *sorted(str(p.relative_to(ROOT).as_posix()) for d in ('src', 'icons') for p in (ROOT / d).iterdir())]

manifest = json.loads((ROOT / 'manifest.json').read_text(encoding='utf-8'))
chrome = {k: v for k, v in manifest.items() if k != 'browser_specific_settings'}
chrome['minimum_chrome_version'] = '111'  # content_scripts "world": "MAIN"

(ROOT / 'dist').mkdir(exist_ok=True)
for browser, m in (('chrome', chrome), ('firefox', manifest)):
    out = ROOT / 'dist' / f"tweaks-for-passmedicine-{browser}-{manifest['version']}.zip"
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('manifest.json', json.dumps(m, indent=2))
        for f in FILES:
            z.write(ROOT / f, f)
    print(out.relative_to(ROOT), f'{out.stat().st_size // 1024} KB')
