---
name: cambly-note
description: Organize Cambly English lesson recordings into structured study notes — grammar corrections, vocabulary, teacher feedback, and full transcripts. Supports full-auto (Puppeteer MCP), semi-auto (computer use), and manual (console copy-paste) modes.
license: MIT
---

# Cambly Note Skill

## Role & Goal

You help users turn their Cambly online English lessons into structured study notes. After each lesson, the user wants to organize the speech-to-text transcript, AI grammar corrections, teacher feedback, and session stats into well-structured notes for review and vocabulary building.

---

## Step 0: Choose a Working Mode

**Before asking about language or taking any action, determine the working mode.**

Open with a natural, friendly tone. Explain what you can do, then ask which mode they prefer. Example:

> Great, I'll help you turn your Cambly lesson into a structured study note — grammar corrections, new words, key teaching moments, and the full transcript, all organized for easy review.
>
> Which mode works best for you?
>
> **A — Full Auto** (Claude Code + Puppeteer MCP)
> I navigate Cambly, extract the data, and build the note — you don't touch the browser at all.
> ✅ Easiest option, great for processing multiple lessons in batch
> ⚠️ Requires a one-time 5-minute MCP plugin setup
>
> **B — Semi-Auto** (Claude computer use)
> I take screenshots and click through your browser. You just need to be logged into Cambly.
> ✅ No plugin needed, Claude handles most of the steps
> ⚠️ Requires Claude Max or a computer-use-enabled subscription (claude.ai web); not available on standard plans
>
> **C — Manual** (recommended for new users, works with any Claude version)
> You copy two snippets of page text from your browser's DevTools console and paste them here. I handle all the parsing.
> ✅ Zero setup, works on any device, most reliable
> ⚠️ Requires two copy-paste operations per lesson (~2 minutes)
>
> Not sure which to pick? **Go with C** — notes ready in under 5 minutes.

Keep the tone natural. Don't list technical details. Once a mode is selected, move directly to the next step without re-explaining the differences.

---

## ⚙️ Mode A Setup (skip if using Mode C)

Run the following command in your terminal to register Puppeteer MCP with Claude Code CLI:

```bash
claude mcp add puppeteer /path/to/mcp-server-puppeteer --scope user -e PUPPETEER_HEADLESS=false
```

The typical path is `~/.npm-global/bin/mcp-server-puppeteer` (confirm with `which mcp-server-puppeteer`).

> ⚠️ **Do not** add MCP config to `~/.claude/settings.json` under `mcpServers` — that's the Claude Desktop App format and is not read by Claude Code CLI. The CLI config lives in `~/.claude.json` and is written via `claude mcp add`.

After registering, run `claude mcp list` to confirm `puppeteer: ... ✓ Connected`, then start a new session for the tools to be available.

`PUPPETEER_HEADLESS=false` makes the browser window visible. **On first use, manually log in to Cambly in the Puppeteer browser window once** — the session persists automatically after that.

> Tool calls use namespaced names (e.g. `mcp__puppeteer__puppeteer_navigate`). Use the full prefixed name.

---

## Step 1: Ask for Output Language

Once the mode is confirmed, ask which language the notes should be in:

> What language would you like the notes in?
> 1. 中文（简体）
> 2. English
> 3. 日本語
> 4. 한국어
> 5. Other (please specify)

Use the chosen language consistently throughout the session (headings, column headers, section names, explanatory text). **English quotes from the lesson always stay in English — do not translate them.**

Set the URL `lang` parameter based on selection: Chinese → `zh_CN`, English → `en`, Japanese → `ja`, Korean → `ko`.

---

## Step 2: Confirm Scope

Ask the user:

> Which lessons would you like to process?
> 1. The most recent lesson
> 2. A specific lesson (please provide the full lesson detail page URL)
> 3. Batch — the last N lessons

Proceed to the appropriate workflow based on their answer.

---

## Workflows

### Mode A: Full Auto (Puppeteer MCP)

Tool names (with namespace prefix):
`mcp__puppeteer__puppeteer_navigate` / `mcp__puppeteer__puppeteer_evaluate` / `mcp__puppeteer__puppeteer_screenshot`

> **Note**: `puppeteer_click` does not work on Cambly's inner tabs (see Known Issues). Always use the `elementFromPoint` approach below for tab switching.

#### Script Rules (must follow)

- **No top-level `return`** → wrap everything in an IIFE: `(() => { ... })()`
- **No top-level `await`** → use `new Promise(r => setTimeout(r, N))`
- **No complex recursive scripts** → causes stack overflow; use `document.body.innerText` to get raw text and let Claude parse it

#### Correct Way to Switch Tabs

```js
// Find the visible tab (page has duplicate [role="tab"] elements; filter by width > 0)
(() => {
  const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
  const t = tabs.find(el => /语音转文字|Transcript/.test(el.textContent)
                          && el.getBoundingClientRect().width > 0);
  if (!t) return 'not found';
  const r = t.getBoundingClientRect();
  const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
  const el = document.elementFromPoint(cx, cy);
  ['mousedown', 'mouseup', 'click'].forEach(type =>
    el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, clientX: cx, clientY: cy }))
  );
  return 'dispatched on: ' + el.textContent.trim().slice(0, 20);
})()
```

To switch back to the Feedback tab, replace the regex with `/^反馈$|^Feedback$/`.

#### Single Lesson Flow

```
1. If user provided a full URL → use it directly
   If user selected "most recent" → run [Mode A Batch: Get List] first to get the first lessonId

2. mcp__puppeteer__puppeteer_navigate →
   https://www.cambly.com/en/student/progress/past-lesson?lessonV2Id={ID}&lang=en

3. mcp__puppeteer__puppeteer_screenshot → confirm logged in (lesson detail visible)
   If login page shown → tell user to log in manually in the Puppeteer browser window, then continue

── Phase 1: Feedback tab ──

4. Wait 10 seconds (SPA load + AI feedback lazy-load) + scroll right panel to trigger loading:
   new Promise(r => { document.querySelector('[role="tabpanel"]')?.scrollBy(0, 400); setTimeout(r, 10000); })

5. mcp__puppeteer__puppeteer_evaluate → document.body.innerText
   → save as feedbackText

6. Extract from feedbackText:
   - Stats (speaking ratio, WPM, unique vocab, duration)
   - Date, tutor name
   - AI grammar/vocab correction cards (each: type / you said / suggestion / knowledge point)
   - Tutor written feedback (between "Lesson feedback" and "Was this feedback helpful")
   - If duration < 30 min → mark ⚠️ skip

── Phase 2: Transcript tab ──

7. Use [Correct Way to Switch Tabs] to switch to the Transcript tab
   Wait 3 seconds

8. mcp__puppeteer__puppeteer_evaluate → document.body.innerText
   → find content after "Transcript\nClick" as the transcript

9. Build and output the note
```

#### Batch: Get Lesson List

```
1. mcp__puppeteer__puppeteer_navigate →
   https://www.cambly.com/en/student/progress/past-lessons?lang=en
2. Wait 3 seconds
3. mcp__puppeteer__puppeteer_evaluate → run [List Extraction Script]
4. Read window.__camblyLessonList (note: list cards don't show duration, field is usually null)
   → take the latest N items as the queue; filter by duration on the detail page
5. Process each lesson; extract duration from feedbackText on the detail page before deciding to skip
6. Output notes every 5 lessons
```

---

### Mode B: Semi-Auto (Computer Use)

Tools: `computer` (screenshot / left_click / type / key / scroll)

**Prerequisite: User already has Cambly open and logged in in their local browser.**

```
1. computer screenshot → confirm current page state

2. If navigation needed:
   computer left_click address bar → key ctrl+a → type URL → key Return
   Wait 5 seconds

── Phase 1: Feedback tab ──

3. computer screenshot → confirm on Feedback tab (AI correction cards visible in right panel)
   If not on Feedback tab → left_click the Feedback tab (confirm coordinates from screenshot)
   Wait 8 seconds for AI feedback lazy-load to complete

4. Write script to clipboard (using bash tool):
   bash: cat > /tmp/cambly_extract.js << 'EOF'
   [output full inline extraction script here]
   EOF
   macOS: pbcopy < /tmp/cambly_extract.js
   Linux: xclip -selection clipboard < /tmp/cambly_extract.js

5. computer key F12 → wait for DevTools to open
   computer left_click Console tab
   computer key ctrl+v → key Return
   Wait 2 seconds (script execution time)

6. computer screenshot → confirm "✅ Cambly Lesson Extracted" is visible
   If not → scroll console up to find it; or verify DevTools opened correctly

── Phase 2: Transcript tab ──

7. Switch tab (coordinates based on 1419×840; take a screenshot first for other resolutions):
   computer left_click (1109, 45)
   Wait 3 seconds

8. computer key ctrl+v → key Return (script still in clipboard, just rerun)
   Wait 2 seconds
   computer screenshot → confirm "✅ Cambly Lesson Extracted"

9. Extract data — in console input:
   computer type → copy(JSON.stringify(window.__camblyLessonData, null, 2))
   computer key Return
   Wait 1 second (copy command writes the full JSON to clipboard)
   Tell user: please paste here (⌘+V / Ctrl+V)

   If JSON is too long and paste fails, split into two:
   First:  copy(JSON.stringify({...window.__camblyLessonData, transcript: ''}, null, 2))
   Second: copy(window.__camblyLessonData.transcript)

10. Build and output the note
```

---

### Mode C: Manual

Claude's role: guide the user through collecting raw text → read the pasted content → output the note.

Use plain, accessible language. No "JSON", "script", "command line" jargon. User can ask for help at any step.

**The idea: no complex scripts needed. The user runs one line in the browser console to copy page text; Claude handles all the parsing.**

#### Single Lesson

Output the following instructions to the user:

---

**4 steps, about 2 minutes.**

**Step 1 — Open the lesson page and wait for feedback to load**

Log in to Cambly and open the lesson you want to study. Make sure the right panel is on the "Feedback" tab. Wait about 10 seconds until you can see the grammar correction cards (not a loading spinner).

**Step 2 — Copy the feedback content**

① Press **F12** (Mac: **⌥⌘I**) and click the **Console** tab at the top of the panel.
② Paste the following and press Enter:

```
copy(document.body.innerText)
```

③ Come back here and paste, adding "**Feedback tab:**" before the content.

**Step 3 — Copy the transcript**

① Click the **"Transcript"** tab in the right panel.
② In the Console, press the **↑** arrow key to bring back the previous command, then press Enter to rerun it.
③ Come back here and paste, adding "**Transcript tab:**" before the content.

**Step 4 — Let me build the note**

Once I have both pieces, I'll output the structured note right away.

---

After the user pastes, Claude extracts from the raw text: stats, teacher name/date, AI grammar cards, tutor written feedback, full transcript — then generates the note.

> **If the text is too long to paste:** send in two messages — first the Feedback tab, then the Transcript tab.

#### Batch (Mode C)

```
1. Ask user to open the past-lessons list page
2. F12 → Console: copy(document.body.innerText), paste to Claude
3. Claude extracts all lesson links and durations from the list text; filters < 30 min; lists the queue
4. Guide through each lesson: open it → copy Feedback tab → copy Transcript tab → paste each
   From the second lesson on, remind: press ↑ Enter in Console — no need to retype
```

---

## Inline Extraction Script (Mode B only)

> **Mode A does not need this script** — Mode A uses `document.body.innerText` and lets Claude parse the raw text.
> **Mode C does not need this script** — Mode C uses `copy(document.body.innerText)` directly.
> This script stays in sync with `scripts/extract-lesson.js`. Supports both Chinese and English Cambly interfaces; accumulates data across tab switches.

```js
(function extractCamblyLesson() {
  'use strict';

  var prev    = window.__camblyLessonData;
  var allText = document.body.innerText;
  var lines   = allText.split('\n');

  var tIdx = allText.indexOf('语音转文字\n点击');
  if (tIdx === -1) tIdx = allText.indexOf('Transcript\nClick');
  var statsText = tIdx > -1 ? allText.slice(0, tIdx) : allText;

  function matchNum(text, pats) {
    for (var i = 0; i < pats.length; i++) {
      var r = text.match(pats[i]);
      if (r) return parseInt(r[1]);
    }
    return null;
  }

  var stats = {
    speakingRatio: matchNum(statsText, [/发言时长占比\s+(\d+)%/, /Speaking time\s+(\d+)%/]),
    wpm:           matchNum(statsText, [/每分钟单词数\s+(\d+)/, /Words per minute\s+(\d+)/]),
    uniqueVocab:   matchNum(statsText, [/不重复词汇量\s+(\d+)/, /Unique words\s+(\d+)/]),
    duration:      matchNum(statsText, [/(\d{1,3})\s*分钟/, /(\d{1,3})\s*minutes?/i]),
  };

  var dm = statsText.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/)
        || statsText.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);

  var nameRe = /^[A-Z][a-zA-Z]+(?: [A-Z][a-zA-Z]+)+$/;
  var tutor  = null;
  for (var i = 0; i < lines.length - 1; i++) {
    if ((lines[i].trim() === '反馈' || lines[i].trim() === 'Lesson feedback')
        && nameRe.test(lines[i + 1].trim())) {
      tutor = lines[i + 1].trim(); break;
    }
  }

  var meta = {
    lessonId: new URLSearchParams(location.search).get('lessonV2Id'),
    tutor:    tutor,
    date:     dm ? (dm[1] + '-' + String(dm[2]).padStart(2,'0') + '-' + String(dm[3]).padStart(2,'0')) : null,
    url:      location.href,
  };

  var tutorFeedback = '';
  var fbA  = allText.indexOf('本次课程反馈');
  var fbB  = allText.indexOf('Lesson feedback');
  var fbIdx = (fbA > -1 && (fbB === -1 || fbA < fbB)) ? fbA : fbB;
  if (fbIdx > -1) {
    var feA   = allText.indexOf('此反馈有帮助吗');
    var feB   = allText.indexOf('Was this feedback helpful');
    var feIdx = (feA > -1 && (feB === -1 || feA < feB)) ? feA : feB;
    tutorFeedback = (feIdx > fbIdx
      ? allText.slice(fbIdx, feIdx)
      : allText.slice(fbIdx, fbIdx + 2000)
    ).trim();
  }

  var aiCards = [];
  var aiA  = allText.indexOf('查看AI反馈');
  var aiB  = allText.indexOf('View AI feedback');
  var aiIdx = (aiA > -1 && (aiB === -1 || aiA < aiB)) ? aiA : aiB;

  if (aiIdx > -1) {
    var TYPES = ['语法','词汇','其他','发音','流利度','Grammar','Vocabulary','Other','Pronunciation','Fluency'];
    var LABEL_MAP = {
      '您说：':'youSaid',   'You said:':'youSaid',   '您说:':'youSaid',
      '建议：':'suggestion','Suggestion:':'suggestion','建议:':'suggestion',
      '您做得好的地方：':'strength','Strength:':'strength','您做得好的地方:':'strength',
      '知识点：':'point',   'Knowledge point:':'point','知识点:':'point',
    };
    var STOP = ['反馈有误','Report an issue'];
    var aiLines = allText.slice(aiIdx).split('\n');
    var ci = 0;
    while (ci < aiLines.length) {
      var aLine = aiLines[ci].trim();
      if (TYPES.indexOf(aLine) !== -1) {
        var card = { type: aLine, youSaid: null, suggestion: null, strength: null, point: null };
        var curKey = null, curBuf = [];
        ci++;
        while (ci < aiLines.length && TYPES.indexOf(aiLines[ci].trim()) === -1) {
          var ln = aiLines[ci].trim();
          if (STOP.indexOf(ln) !== -1) { ci++; break; }
          if (LABEL_MAP[ln] !== undefined) {
            if (curKey) { card[curKey] = curBuf.join('\n').trim(); }
            curKey = LABEL_MAP[ln]; curBuf = [];
          } else if (curKey && ln) {
            curBuf.push(ln);
          }
          ci++;
        }
        if (curKey) { card[curKey] = curBuf.join('\n').trim(); }
        aiCards.push(card);
      } else {
        ci++;
      }
    }
  }

  var transcript = '';
  if (tIdx > -1) {
    var tSec   = allText.slice(tIdx);
    var tCut   = tSec.indexOf('Privacy Preference Center');
    var tClean = tCut > 0 ? tSec.slice(0, tCut) : tSec;
    transcript = tClean.split('\n').filter(function(l) { return l.trim(); }).slice(2).join('\n');
  }

  if (prev && prev.meta && prev.meta.lessonId === meta.lessonId) {
    if (!tutorFeedback && prev.tutorFeedback) tutorFeedback = prev.tutorFeedback;
    if (!aiCards.length && prev.aiCards && prev.aiCards.length) {
      Array.prototype.push.apply(aiCards, prev.aiCards);
    }
    if (!transcript && prev.transcript) transcript = prev.transcript;
    for (var sk in stats) {
      if (stats[sk] === null && prev.stats && prev.stats[sk] != null) stats[sk] = prev.stats[sk];
    }
  }

  var shouldSkip = stats.duration !== null && stats.duration < 30;

  window.__camblyLessonData = {
    meta: meta, stats: stats,
    tutorFeedback: tutorFeedback, aiCards: aiCards,
    transcript: transcript, shouldSkip: shouldSkip,
  };

  console.log('[Cambly] id=' + meta.lessonId + ' cards=' + aiCards.length + ' transcript=' + transcript.length + ' skip=' + shouldSkip);
  if (!aiCards.length)    console.info('[Cambly] No AI cards — run on feedback tab after ~10s');
  if (!transcript.length) console.info('[Cambly] No transcript — switch to transcript tab and run again');
  if (shouldSkip)         console.warn('[Cambly] Duration < 30 min, will be skipped');
  console.log('[Cambly] Copy: copy(JSON.stringify(window.__camblyLessonData, null, 2))');

  return window.__camblyLessonData;
})();
```

---

## List Extraction Script (Mode A / B batch only)

```js
(async function extractCamblyLessonList() {
  'use strict';

  // ── Find the scrollable lesson list container ─────────────────────
  const scrollable = Array.from(document.querySelectorAll('*')).filter(el => {
    const s = getComputedStyle(el);
    return (s.overflowY === 'auto' || s.overflowY === 'scroll')
           && el.scrollHeight > el.clientHeight + 10;
  });
  const container = scrollable[scrollable.length - 1];
  if (!container) {
    console.error('⚠️ Scrollable container not found — confirm you are on the past-lessons page');
    return null;
  }

  // ── Scroll to bottom to load all lessons ─────────────────────────
  let prevHeight = -1;
  let attempts   = 0;
  while (container.scrollHeight !== prevHeight && attempts < 30) {
    prevHeight = container.scrollHeight;
    container.scrollTop = container.scrollHeight;
    await new Promise(r => setTimeout(r, 1200));
    attempts++;
  }

  // ── Intercept window.open and track which card triggered each click ──
  const captured = [];
  const origOpen = window.open;
  window.open = (url) => {
    if (url) captured.push({ url: String(url), cardText: _currentCard?.innerText ?? '' });
    return null;
  };

  let _currentCard = null;
  try {
    document.querySelectorAll('div[role="button"][tabindex="0"]').forEach(card => {
      if (/202\d/.test(card.innerText ?? '')) {
        _currentCard = card;
        card.click();
      }
    });
  } finally {
    window.open = origOpen;
    _currentCard = null;
  }

  // ── Parse lessonId and basic metadata ────────────────────────────
  const lessons = captured
    .map(({ url, cardText }) => {
      const idMatch  = url.match(/lessonV2Id=([^&]+)/);
      if (!idMatch) return null;
      const durMatch = cardText.match(/(\d{1,3})\s*(?:分钟|minutes?)/i);
      return {
        lessonId: idMatch[1],
        url,
        duration: durMatch ? parseInt(durMatch[1]) : null,
      };
    })
    .filter(Boolean);

  window.__camblyLessonList = lessons;

  console.log(`%c✅ Found ${lessons.length} lessons`, 'color:#4caf50;font-weight:bold');
  console.log('%c💡 Copy:%c copy(JSON.stringify(window.__camblyLessonList, null, 2))',
    'color:#2196f3;font-weight:bold', 'color:#ff9800');

  return lessons;
})();
```

---

## Known Issues

| Issue | Solution |
|-------|---------|
| JS `.click()` doesn't switch Cambly inner tabs | **Do not use** `puppeteer_click` or `.click()`; use `elementFromPoint` + native `MouseEvent` dispatch (see "Correct Way to Switch Tabs") |
| `puppeteer_click` reports "Node is either not clickable" | Cambly's tab structure doesn't support direct CSS selector clicks; use the elementFromPoint approach |
| Duplicate `[role="tab"]` elements on the page | Filter with `.getBoundingClientRect().width > 0` to exclude hidden duplicates |
| Complex extraction script reports "Maximum call stack size exceeded" | Don't run complex nested scripts; use `document.body.innerText` and let Claude parse |
| `return` in evaluate reports "Illegal return statement" | Wrap all scripts in an IIFE: `(() => { ... })()` |
| `await` in evaluate throws an error | Use `new Promise(r => setTimeout(r, N))` instead of top-level await |
| Duration is null on lesson list cards | List cards don't display duration; do the duration filter on the detail page instead |
| AI feedback lazy-loads, initially shows "preparing" | Wait 10 seconds on the Feedback tab while scrolling the right panel to trigger loading |
| Feedback and transcript data are on separate tabs | Switch tabs twice, grab `document.body.innerText` each time |
| Some lesson transcripts show "preparing" | Mark ⚠️ skip transcript section; output other sections normally |
| Mode A Puppeteer has no Cambly session on first run | Set `PUPPETEER_HEADLESS=false`, log in manually in the popup window once — session persists |
| Mode A tool names have namespace prefix | Use full names: `mcp__puppeteer__puppeteer_navigate` etc. |
| Mode A MCP not loaded (tools not in list) | Register with `claude mcp add --scope user` to `~/.claude.json`, not `~/.claude/settings.json` |
| Mode B coordinate offset on different screen sizes | Take a screenshot first to confirm coordinates; baseline `(1109, 45)` scales proportionally |
| Can't download files on Cambly domain | Output all notes in the chat window only |

---

## Note Output Format

All text in the user's chosen language. English quotes from the lesson stay in English.

```markdown
## 📒 {YYYYMMDD}_{TEACHER_NAME}

{Date}: {full date} | {Tutor}: {name} | {Duration}: {X} min
{Stats}: {Speaking} {X}% | {WPM} {X} | {Unique vocab} {X}

### {Topic Summary}
1. [Topic 1]
2. [Topic 2]

### {Grammar Corrections}
| {You said} | {Correct form} | {Knowledge point} |
|-----------|--------------|-----------------|
(Source: AI cards + tutor verbal corrections in transcript)

### [Thematic Teaching Section — dynamically named based on lesson content]

### 🗣️ {Natural Expressions from Tutor}
- "original phrase" — {why this expression is natural / idiomatic / worth learning}

### {Useful Vocabulary & Phrases}
| {Word/Phrase} | {Meaning} | {Context} |
|-------------|---------|---------|

### {Tutor Feedback} (if written feedback exists)
- ✅ {Strength}: ...
- ⚠️ {Area to improve}: ...
- 💡 {Practice suggestion}: ...
```

---

## Thematic Teaching Section Rules (most important)

**Core principle: faithfully reproduce every knowledge point the tutor actually taught — nothing omitted, nothing summarized.**

| Type | Trigger | Table columns |
|------|---------|--------------|
| Affixes / Word formation | Tutor teaches prefix/suffix | Prefix/Suffix · Meaning · Examples from lesson |
| Prepositions / Directional words | Tutor explains preposition usage | Preposition · Core meaning · Key points · Example |
| Reading / Business English | Vocabulary breakdown from a text | Word/Phrase · Meaning · Key points |
| Word forms | Tutor covers word form changes | Adjective · Noun · Verb · Collocations |
| Synonym comparison | Tutor contrasts similar words | Word · Meaning · Subtle difference |
| Interview / Role-play | Simulated conversation practice | Question + Answer framework + Key sentence patterns |
| Phrasal verbs | Tutor teaches phrasal verbs | Phrasal verb · Meaning · Key points · Example |
| Giving directions | Describing routes or locations | Pattern · Meaning · Usage notes |

**Strict rule: list exactly as many examples as the tutor gave — no omissions, no additions. A single lesson can have multiple thematic sections.**

---

## Content Selection Rules

**Grammar corrections**: Every AI card ✅ + tutor verbal corrections in transcript ("we say X, not Y") ✅ | Tutor self-repetitions or elaborations ❌

**Useful vocabulary**: Words the tutor actively introduced ✅ + correct forms given during corrections ✅ | Common words / filler words (Yeah, Okay) ❌ | **Must include a "Context" column**

**Natural expressions**: Complete, natural sentences or vivid analogies ✅ | Simple responses ❌ | **Each entry must include an explanation**

**Thematic sections**: Every knowledge point the tutor taught ✅ | Summaries / omissions / self-added content ❌

---

## Output Rules

- Output directly in the chat (can't download files on Cambly domain)
- In batch mode, output notes every 5 lessons
- Process from newest to oldest
- No data / duration < 30 min → mark ⚠️ skip
- AI feedback not yet generated → note "AI feedback pending" in the relevant section
