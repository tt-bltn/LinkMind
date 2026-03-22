# LinkMind

AI Agent Skill that captures social media content into your Obsidian vault as structured Markdown notes. Give it a link, get back a note with title, author, date, original content, and an AI-powered deep summary — all saved directly to your Obsidian knowledge base.

## How It Works

Tell your AI agent:

```
让我记录 https://weibo.com/1234567890/AbCdEfG
```

LinkMind will:

1. Read your Obsidian vault path from `skills/linkmind/config.json`
2. Identify the platform from the URL
3. Run a TypeScript script to extract content (text, images, metadata)
4. Download images and analyze each with AI vision (extract text, visual info)
5. Generate a Markdown file with YAML frontmatter, AI deep summary, and per-image analysis
6. Save it to `{your-vault}/LinkMind/` — ready to browse in Obsidian

## Supported Platforms

| Platform | URL Patterns | Extraction Method |
|----------|-------------|-------------------|
| Weibo | `weibo.com`, `m.weibo.cn` | Mobile API (`m.weibo.cn`) |
| Xiaohongshu | `xiaohongshu.com`, `xhslink.com` | Chrome DevTools Protocol (CDP) |

## Project Structure

```
LinkMind/
├── skills/linkmind/           # Self-contained distributable skill
│   ├── SKILL.md               # AI workflow instructions (with OpenClaw metadata)
│   ├── config.template.json   # Config template (copy to config.json)
│   ├── scripts/
│   │   ├── types.ts           # Shared type definitions
│   │   ├── config.ts          # Config reader (.env + config.json)
│   │   ├── retry.ts           # Retry with exponential backoff
│   │   ├── chrome-cdp.ts      # Chrome DevTools Protocol client
│   │   ├── download-images.ts # Image downloader
│   │   ├── extract-transcript.ts # Video ASR transcript
│   │   ├── weibo.ts           # Weibo content extractor
│   │   └── xiaohongshu.ts     # Xiaohongshu content extractor (CDP)
│   ├── references/
│   │   └── deep-summary-guide.md
│   └── templates/
│       └── note.md            # Markdown output template
├── .claude-plugin/
│   └── marketplace.json       # Claude Code plugin registration
└── docs/
    ├── PRD.md                 # Product requirements
    ├── ARCH.md                # Architecture & data flow diagrams
    └── PROJECT_STATE.md       # Development progress tracker
```

Notes are saved to your Obsidian vault:

```
{your-vault}/
└── LinkMind/                          # Auto-created by the skill
    ├── 2026-03-22-xxx.md
    └── attachments/
        └── 2026-03-22-xxx/            # One directory per note
            ├── img-001.jpg
            ├── img-002.png
            └── transcript.srt         # Video transcript (if video + ASR configured)
```

## Features

- **Multi-platform extraction** — Weibo (mobile API) and Xiaohongshu (Chrome CDP)
- **AI deep summary** — Structured summary with key takeaways, tailored to content type
- **Image download** — Images are saved locally to `LinkMind/attachments/` inside your vault for full offline access
- **Image multimodal analysis** — AI reads each downloaded image, extracts visible text (OCR) and key visual information, appends analysis after each image in the note, and incorporates findings into the deep summary
- **Video ASR transcript** — Extract audio from videos, transcribe via iFlytek or OpenAI Whisper, save as SRT subtitles; transcript text is used in AI summary generation
- **Cookie support** — Configure login cookies for accessing private or login-gated content
- **Auto-retry** — Network requests retry with exponential backoff; errors are categorized with actionable suggestions

## Installation

There are three ways to install LinkMind:

**Option A — OpenClaw CLI** (recommended for OpenClaw users):

```bash
openclaw skills add https://github.com/tt-bltn/LinkMind
```

**Option B — ClawHub Registry:**

```bash
npx clawhub@latest install linkmind-capture
```

**Option C — Claude Code Plugin:**

```
/plugin marketplace add tt-bltn/LinkMind
```

**Option D — Manual clone:**

```bash
git clone https://github.com/tt-bltn/LinkMind.git
cd LinkMind/skills/linkmind/scripts
npm install
```

## Setup

Requires **Node.js >= 22** and **Google Chrome** (for Xiaohongshu extraction).

**1. Install dependencies:**

```bash
cd skills/linkmind/scripts
npm install
```

**2. Configure your Obsidian vault path:**

```bash
cp skills/linkmind/config.template.json skills/linkmind/config.json
```

Edit `skills/linkmind/config.json` and set your vault path:

```json
{
  "obsidian_vault": "/Users/yourname/MyVault"
}
```

**3. (Optional) Configure secrets via `.env`:**

Create `skills/linkmind/.env` for sensitive credentials:

```bash
# Platform cookies (for login-gated content)
LINKMIND_WEIBO_COOKIE="SUB=xxx; SUBP=yyy"
LINKMIND_XHS_COOKIE="a1=xxx; web_session=yyy"

# ASR credentials (for video transcript)
LINKMIND_IFLYTEK_APP_ID=your_app_id
LINKMIND_IFLYTEK_API_KEY=your_api_key
LINKMIND_IFLYTEK_API_SECRET=your_api_secret
LINKMIND_OPENAI_API_KEY=sk-xxx
```

Alternatively, you can still put cookies and ASR config in `config.json` — environment variables take precedence when both are set.

To obtain cookies: log in to the platform in a browser, open DevTools (F12) →
Application → Cookies, and copy the relevant values as a semicolon-separated string.

| ASR Provider | How to get credentials |
|----------|----------------------|
| iFlytek (科大讯飞) | Register at [xfyun.cn](https://www.xfyun.cn/), create an app, enable "语音转写" service |
| OpenAI Whisper | Get API key at [platform.openai.com](https://platform.openai.com/api-keys) |

Configure at least one ASR provider to enable video transcript. When both are configured, iFlytek is preferred (with OpenAI as fallback). Without ASR configuration, video posts will still be captured but without transcript.

## Usage

### With an AI Agent (primary use case)

This skill works with any agent that supports the [SKILL.md standard](https://openclaw.rocks/blog/mcp-skills-plugins) — OpenClaw, Cursor, Claude Code, GitHub Copilot, etc.

The AI reads `skills/linkmind/SKILL.md` and knows how to:
- Recognize trigger phrases like "让我记录", "帮我保存", "capture this"
- Dispatch to the correct platform handler
- Generate a Markdown note with deep summary and save it to your Obsidian vault

### Standalone script testing

```bash
cd skills/linkmind/scripts

# Weibo
npx tsx weibo.ts "https://m.weibo.cn/detail/4331051486294436"

# Xiaohongshu
npx tsx xiaohongshu.ts "https://www.xiaohongshu.com/explore/6a7b8c9d0e1f"
```

Scripts output JSON to stdout, which the AI agent consumes to generate the final Markdown file.

## Output Format

Each captured note is a Markdown file with YAML frontmatter:

```markdown
---
title: "成都美食探店推荐"
date: 2026-03-22
platform: weibo
author: "美食达人"
original_url: https://weibo.com/xxx/xxx
captured_at: 2026-03-22T14:30:00.000Z
has_video: true
has_transcript: true
---

# 成都美食探店推荐

> 来源：微博 @美食达人 | 2026-03-22

## 深度总结

（AI 生成的深度总结，综合原文文字 + 视频转写内容）

**关键要点：**
- （要点一）
- （要点二）

## 原文内容

（原始文字内容）

## 视频转写

> 📎 字幕文件：[transcript.srt](attachments/2026-03-22-成都美食探店推荐/transcript.srt)

大家好，今天给大家分享一下成都的美食推荐……

## 图片

![图片](attachments/2026-03-22-成都美食探店推荐/img-001.jpg)

> **图片内容：** 一张火锅店外观照片，招牌写着"老成都火锅"，门口有排队的顾客。

## 元信息

- 转发: 123 | 评论: 45 | 点赞: 678
```

## Roadmap

| Phase | Description | Status |
|-------|-------------|--------|
| Step 1 | Project scaffold, types, SKILL.md, docs | Done |
| Step 2 | Weibo handler — full extraction via mobile API | Done |
| Step 3 | Xiaohongshu handler — Playwright-based extraction | Done |
| Step 4 | Polish — image download, AI summary tuning, cookies, error handling | Done |
| Step 5 | Image multimodal — AI vision analysis of images, content extraction for summary | Done |
| Step 6 | Video ASR — audio extraction, speech-to-text (iFlytek/Whisper), SRT generation | In Progress |
| Step 7 | Distribution — OpenClaw/ClawHub/Claude Code install, Chrome CDP, .env config | Done |

See [docs/PROJECT_STATE.md](docs/PROJECT_STATE.md) for detailed progress.

## Tech Stack

- **TypeScript** (ES2022, ESM) with [tsx](https://github.com/privatenumber/tsx) for zero-config execution
- **Node.js built-in fetch** for Weibo mobile API
- **Chrome DevTools Protocol** for Xiaohongshu (uses system Chrome, zero extra download)
- **AI Agent multimodal vision** for image content extraction and OCR
- **ffmpeg-static** for video-to-audio extraction
- **iFlytek LFASR / OpenAI Whisper** for speech-to-text transcription
- **SKILL.md** standard for cross-platform AI agent compatibility (OpenClaw / Cursor / Claude Code)

## Documentation

- [PRD.md](docs/PRD.md) — Product requirements and acceptance criteria
- [ARCH.md](docs/ARCH.md) — Architecture, data flow diagrams, and design decisions
- [PROJECT_STATE.md](docs/PROJECT_STATE.md) — Phase-by-phase development tracker

## License

Personal use.
