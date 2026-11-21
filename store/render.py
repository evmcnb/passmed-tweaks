"""Render store images with headless Chrome: python store/render.py  ->  store/out/*.png

screenshot-1..5.png are 1280x800 (both stores); promo-440x280.png is Chrome's small promo tile.
All content is invented sample data (see shots.html and stats-stub.js).
"""
import subprocess
import tempfile
from pathlib import Path

HERE = Path(__file__).parent
CHROME = next(p for p in [
    Path(r'C:\Program Files\Google\Chrome\Application\chrome.exe'),
    Path(r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'),
] if p.exists())

# stats page with fake data, generated from the real stats.html
stats = (HERE.parent / 'stats.html').read_text(encoding='utf-8')
stats = stats.replace('<script src="src/shared.js">', '<script src="stats-stub.js"></script><script src="../src/shared.js">')
stats = stats.replace('src="stats.js"', 'src="../stats.js"')
(HERE / 'stats-sample.html').write_text(stats, encoding='utf-8')

out = HERE / 'out'
out.mkdir(exist_ok=True)
jobs = [(f'screenshot-{i}.png', str(i), '1280,800') for i in range(1, 6)] + [('promo-440x280.png', 'promo', '440,280')]
with tempfile.TemporaryDirectory() as profile:
    for name, shot, size in jobs:
        subprocess.run([
            str(CHROME), '--headless=new', f'--user-data-dir={profile}', '--hide-scrollbars', '--allow-file-access-from-files',
            '--force-device-scale-factor=1', f'--window-size={size}', '--virtual-time-budget=4000',
            f'--screenshot={out / name}', (HERE / 'shots.html').as_uri() + f'?s={shot}',
        ], check=True, capture_output=True)
        print(out / name)
