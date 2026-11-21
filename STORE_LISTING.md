# Store submission kit

Build first: `python build.py` → `dist/passmed-tweaks-chrome-1.0.0.zip` and `dist/passmed-tweaks-firefox-1.0.0.zip`.
Bump `version` in `manifest.json` for every update you upload.

---

## Listing text (both stores)

**Name:** Passmed Tweaks

**Summary (≤132 chars, Chrome "short description" / Firefox "summary"):**
Unofficial add-on for Passmedicine: themes, hidden scores, blind blocks, cover test, better comments, insights and stats.

**Category:** Chrome: Education (or Productivity › Tools). Firefox: Other / Productivity.

**Description:**

> Passmed Tweaks makes Passmedicine question practice calmer, clearer and more exam-like. Not affiliated with or endorsed by Passmedicine.
>
> **Look and feel**
> • 8 themes (Midnight, OLED, Nord, Dracula, Forest, Sepia, Solarized, Mint) plus custom colours
> • Font choice and question text size, wide layout, focus mode, collapsible side boxes
> • Cleaner results tables with a reference-range column
> • Hide the AI buttons and app banner
>
> **Practise like the real exam**
> • Hide your scores (ticks, dashboard, daily %) until you hover
> • Blind blocks: no right/wrong or explanations for N questions, then review them all
> • Cover test: think of (or type) your answer before the options appear
> • Question timer with a pace alert
>
> **Learn more from every question**
> • Insights after answering: attempts, % of people correct, difficulty, the most common wrong answer, your history with the concept, and the full concept explanation
> • Review list shows how many people get each question right, sortable by hardest
>
> **Better comments**
> • Threaded replies with clear reply chains, OP and "you" badges
> • Sort by top, newest, oldest or most replies; search; hide low-scored threads; Ctrl+Enter to post
>
> **Your stats, your data**
> • A local stats page: accuracy compared with everyone else, by category and by day, topics you keep missing
> • Export missed questions as an Anki deck, or every answer as CSV
> • Everything stays in your browser. No accounts, no tracking, no servers.

**Privacy policy URL:** host `PRIVACY.md` somewhere public (e.g. a GitHub repo or Gist) and paste its URL.

---

## Chrome Web Store
1. Register at https://chrome.google.com/webstore/devconsole (one-time US$5 fee).
2. **New item** → upload `dist/passmed-tweaks-chrome-1.0.0.zip`.
3. **Store listing:** paste the text above; upload images:
   - Store icon 128×128: `icons/128.png`
   - Screenshots 1280×800: `store/out/screenshot-1.png` … `screenshot-5.png`
   - Small promo tile 440×280: `store/out/promo-440x280.png`
   - (Regenerate with `python store/render.py`. All content is invented sample data.)
4. **Privacy practices:**
   - *Single purpose:* "Customise and enhance the Passmedicine question-bank website (appearance, practice modes, comments and statistics)."
   - *storage justification:* "Saves the user's settings and an optional local log of their answers for the stats page."
   - *Host permission (passmedicine.com) justification:* "The extension only modifies passmedicine.com pages, which is its sole purpose."
   - *Remote code:* No.
   - *Data usage:* tick none of the collected-data types (nothing leaves the device), then tick the three certifications.
5. Submit for review (usually a few days).

## Firefox Add-ons (AMO)
1. Sign in at https://addons.mozilla.org/developers/ → **Submit a New Add-on**.
2. Choose **On this site** (public listing) or **On your own** (signed .xpi just for you, issued in minutes, permanent install).
3. Upload `dist/passmed-tweaks-firefox-1.0.0.zip`. It passes `web-ext lint` with 0 errors/warnings.
4. "Do you need to submit source code?" **No.** The code isn't minified or bundled.
5. Paste the listing text, add screenshots (`store/out/screenshot-*.png`), set the privacy policy URL, licence (e.g. MIT), and submit.

## Naming note
Both stores can reject a name that suggests it's official. The "Unofficial… Not affiliated with Passmedicine" lines are there for that reason. If a reviewer still objects, rename to "Tweaks for Passmedicine" in `manifest.json` and rebuild.
