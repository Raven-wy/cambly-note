# cambly-note

**Every Cambly lesson, fully captured.** Stop losing what your tutor taught — Claude auto-extracts grammar corrections, vocabulary, idioms & feedback into structured study notes.

> 🌐 [中文](#中文) · [English](#english) · [日本語](#日本語) · [한국어](#한국어)

---

## English

### What it does

After each Cambly lesson, this skill turns the raw page data into a structured study note:

- **Grammar corrections** — every AI card + tutor verbal corrections from the transcript
- **Vocabulary & phrases** — words the tutor actively introduced, with context
- **Natural expressions** — idiomatic sentences worth imitating, each with an explanation
- **Thematic teaching section** — dynamically named based on what the tutor actually taught (prefixes/suffixes, phrasal verbs, prepositions, synonym comparison, interview simulation, etc.)
- **Tutor feedback** — strengths, areas to improve, practice suggestions
- **Full transcript** — speech-to-text from the lesson

Notes output in your chosen language: English, 中文, 日本語, 한국어, or any other.

### Three modes

| Mode | How it works | Best for |
|------|-------------|---------|
| **A — Full Auto** | Claude navigates Cambly via Puppeteer MCP and extracts everything | Batch processing, power users |
| **B — Semi-Auto** | Claude operates your browser via computer use | Users with Claude Max |
| **C — Manual** | You copy two text snippets from DevTools console, Claude parses them | Everyone — zero setup, most reliable |

**Not sure which to use? Start with Mode C.** Notes ready in under 5 minutes, no installation needed.

### Setup

#### Mode C (no setup needed)
Just load the skill and say: *"Help me organize my latest Cambly lesson"*

#### Mode A (one-time setup)
```bash
npm install -g mcp-server-puppeteer
claude mcp add puppeteer $(which mcp-server-puppeteer) --scope user -e PUPPETEER_HEADLESS=false
```
Then start a new Claude Code session — done.

### Usage

Load `SKILL.md` into your Claude Code session, then say:
- *"Organize my latest Cambly lesson"*
- *"Process the last 5 Cambly lessons in batch"*
- *"Help me make notes for this lesson: [URL]"*

Claude will ask which mode and language you want, then guide you through the rest.

### Files

```
cambly-note/
├── SKILL.md                    ← Claude Code skill (English)
├── SKILL.zh.md                 ← Claude Code skill (中文)
├── scripts/
│   ├── extract-lesson.js       ← Single lesson extraction script
│   └── extract-lesson-list.js  ← Batch lesson list script
├── templates/
│   ├── note-template-zh.md     ← 中文 label reference
│   ├── note-template-en.md     ← English label reference
│   ├── note-template-ja.md     ← 日本語 label reference
│   └── note-template-ko.md     ← 한국어 label reference
└── examples/
    └── sample_virtual_lesson.md ← Example output (fictional data)
```

### Known limitations

- Notes can only be output in the chat window — Cambly's domain blocks file downloads
- AI feedback cards lazy-load; allow ~10 seconds after opening the lesson
- Lesson list cards don't show duration — duration filtering happens on the detail page
- Cambly's inner tabs can't be clicked via standard JS `.click()` or CSS selector — the skill works around this automatically

---

## 中文

### 功能介绍

每节 Cambly 课结束后，这个 skill 自动把页面原始内容整理成结构化笔记：

- **语法纠正** — AI 纠正卡片全部 + 转录中老师口头纠正
- **实用词汇** — 老师主动教的新词，附语境
- **地道表达** — 值得模仿的自然句型，每条附解释
- **专题教学板块** — 根据课程内容动态命名（词缀、短语动词、介词、近义词辨析、面试模拟等）
- **外教反馈** — 优点、待改进项、练习建议
- **完整转录** — 课程语音转文字全文

笔记支持多语言输出：中文、English、日本語、한국어或其他。

### 三种模式

| 模式 | 方式 | 适合人群 |
|------|------|---------|
| **A — 全自动** | Claude 通过 Puppeteer MCP 自动导航 Cambly 并提取数据 | 批量处理、进阶用户 |
| **B — 半自动** | Claude 通过 computer use 操作你的浏览器 | Claude Max 用户 |
| **C — 手动引导** | 你从浏览器控制台复制两段文字粘给 Claude，Claude 解析 | 所有人——零配置，最稳定 |

**不确定选哪个？直接用模式 C**，5 分钟内出笔记，无需安装任何东西。

### 使用方法

把 `SKILL.zh.md` 加载到 Claude Code session，然后说：
- *"帮我整理最新一节 Cambly 课"*
- *"批量处理最近 5 节课"*
- *"帮我整理这节课：[URL]"*

Claude 会询问模式和语言，然后引导你完成全程。

### 模式 A 安装（一次性）

```bash
npm install -g mcp-server-puppeteer
claude mcp add puppeteer $(which mcp-server-puppeteer) --scope user -e PUPPETEER_HEADLESS=false
```

开新 session 即可使用。

---

## 日本語

### できること

Cambly のレッスン後、このスキルがページのデータを構造化された学習ノートに自動整理します：

- **文法修正** — AI 修正カード全件 + 文字起こし中の先生の口頭修正
- **語彙・フレーズ** — 先生が積極的に教えた単語（文脈付き）
- **自然な表現** — 真似する価値のある慣用的な表現（解説付き）
- **テーマ別セクション** — 授業内容に応じて動的に命名（接頭辞/接尾辞、句動詞、前置詞、類義語比較、面接シミュレーションなど）
- **先生のフィードバック** — 良い点、改善点、練習の提案
- **完全な文字起こし** — レッスン全文の音声テキスト化

ノートの出力言語：English、中文、日本語、한국어、その他。

### 3つのモード

| モード | 方法 | 適した利用者 |
|--------|------|------------|
| **A — 全自動** | Claude が Puppeteer MCP で Cambly を操作してデータを取得 | まとめて処理したい上級ユーザー |
| **B — 半自動** | Claude が computer use でブラウザを操作 | Claude Max ユーザー |
| **C — 手動** | DevTools コンソールから 2 つのテキストをコピー＆ペースト | 全員対応・設定不要・最も安定 |

**迷ったら Mode C を選んでください。** インストール不要で 5 分以内にノートが完成します。

### 使い方

`SKILL.md` を Claude Code セッションに読み込んで、次のように言うだけ：
- *「最新の Cambly レッスンをまとめて」*
- *「最近の 5 レッスンをまとめて処理して」*
- *「このレッスンのノートを作って：[URL]」*

Claude がモードと言語を確認し、あとはすべてガイドします。

---

## 한국어

### 기능 소개

Cambly 수업 후, 이 스킬이 페이지 데이터를 구조화된 학습 노트로 자동 정리합니다：

- **문법 교정** — AI 교정 카드 전체 + 전사에서 선생님의 구두 교정
- **어휘 & 표현** — 선생님이 직접 가르친 새 단어 (맥락 포함)
- **자연스러운 표현** — 따라 배울 가치 있는 관용적 표현 (설명 포함)
- **주제별 섹션** — 수업 내용에 따라 동적으로 명명 (접두사/접미사, 구동사, 전치사, 유의어 비교, 면접 시뮬레이션 등)
- **선생님 피드백** — 잘한 점, 개선할 점, 연습 제안
- **전체 전사** — 수업 음성-텍스트 전문

노트 출력 언어: English, 中文, 日本語, 한국어, 기타.

### 세 가지 모드

| 모드 | 방법 | 추천 대상 |
|------|------|---------|
| **A — 전자동** | Claude가 Puppeteer MCP로 Cambly를 자동 탐색하여 데이터 추출 | 일괄 처리, 파워 유저 |
| **B — 반자동** | Claude가 computer use로 브라우저 조작 | Claude Max 사용자 |
| **C — 수동** | DevTools 콘솔에서 텍스트 2개 복사-붙여넣기, Claude가 분석 | 모든 사용자 — 설정 불필요, 가장 안정적 |

**어떤 모드를 선택할지 모르겠다면 Mode C를 사용하세요.** 설치 없이 5분 이내에 노트가 완성됩니다.

### 사용 방법

`SKILL.md`를 Claude Code 세션에 로드한 후 다음과 같이 말하세요：
- *"최신 Cambly 수업을 정리해줘"*
- *"최근 5개 수업을 일괄 처리해줘"*
- *"이 수업 노트 만들어줘: [URL]"*

Claude가 모드와 언어를 확인하고 나머지 과정을 안내합니다.

---

## License

MIT
