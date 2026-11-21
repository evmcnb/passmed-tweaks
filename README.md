# Passmed Tweaks

Browser extension (Chrome/Edge/Brave + Firefox 128+) for passmedicine.com. Settings live in the toolbar popup and apply instantly.

## Install
- **Store builds:** `python build.py` makes `dist/*-chrome-*.zip` and `dist/*-firefox-*.zip`. See [STORE_LISTING.md](STORE_LISTING.md) for uploading and [PRIVACY.md](PRIVACY.md) for the privacy policy.
- **Chrome/Edge (dev):** `chrome://extensions` → Developer mode → Load unpacked → pick this folder.
- **Firefox (dev):** `about:debugging#/runtime/this-firefox` → Load Temporary Add-on → pick `manifest.json` (removed on restart).

## Features
- **Themes:** Midnight, OLED, Nord, Dracula, Forest, Sepia, Solarized, Mint, or custom colours. Font, question text size, UI polish, wide/focus layouts, hide AI buttons / app banner.
- **Results tables:** cleaner styling with a Test / Result / Reference header; missing reference ranges are filled from the site's own reference list (plus albumin, Mg, INR, glucose, lactate, HbA1c); optional (off by default) ↑ / ↓ colouring of out-of-range results.
- **Side boxes** (Textbooks, Content Map, Links, Media, Dashboard): chevron in each header collapses it; remembered per box.
- **Scores:** blur your ticks, dashboard, daily % and progress bar (hover to peek); hide peer answer % until you hover the options; per-question + session timer.
- **Blind blocks:** no right/wrong, peer %, explanations or score for N questions (your pick is outlined). When the block is done, the bottom-left button reveals feedback in place on every question (with a "Block start" jump); the next new question starts another block.
- **Cover test:** options and submit stay hidden until you type an answer (optional) and press Enter / "Show options". Your guess shows above the options and in the insights panel afterwards. The site's 1–6/Enter shortcuts can't answer while covered.
- **My stats** (popup → "My stats"): every question you answer is logged locally (time, right/wrong, category, peer % correct). Shows accuracy vs peers overall, per category and per day, topics you keep missing, hardest questions you got right. The corner shows "Today 72% · peers 64% (+8)".
- **Export:** Anki deck (tab-separated, HTML) of missed questions with stem, options, answer, your pick, key concept and explanation; CSV of all answers. Self-check: `node test/stats.test.js`.
- **Review list:** each question shows the % of people who get it right (coloured by difficulty), with a "Hardest first / Easiest first" sort.
- **Pace alert:** timer turns amber after 90 s (configurable) on an unanswered question, red after double.
- **Insights** (after answering): attempts, peer % correct, difficulty, like ratio, how many picked your wrong answer, most common wrong answer, your history with the concept, the full concept explanation, copyable question ID.
- **Comments:** threaded cards, sort (top/newest/oldest/most replies), search, hide low-scored threads, reply boxes behind a "Reply" toggle, collapsible replies, your own comments highlighted, Ctrl+Enter to post.

## How it works
`src/hook.js` runs in the page and reads the question JSON the site already fetches (`multi_ajax_question_data.php`). It never sends requests or answers. `src/content.js` does everything else.
