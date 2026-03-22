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
3. Run a TypeScript handler to extract content (text, images, metadata)
4. Generate a Markdown file with YAML frontmatter and an AI deep summary
5. Save it to `{your-vault}/LinkMind/` — ready to browse in Obsidian

## Supported Platforms

| Platform | URL Patterns | Extraction Method |
|----------|-------------|-------------------|
| Weibo | `weibo.com`, `m.weibo.cn` | Mobile API (`m.weibo.cn`) |
| Xiaohongshu | `xiaohongshu.com`, `xhslink.com` | Playwright headless browser |

## Project Structure

```
LinkMind/
├── skills/linkmind/
│   ├── SKILL.md              # AI workflow instructions
│   ├── config.json           # User config (vault path, cookies)
│   ├── handlers/
│   │   ├── types.ts          # Shared type definitions
│   │   ├── config.ts         # Config reader
│   │   ├── retry.ts          # Retry with exponential backoff
│   │   ├── download-images.ts # Image downloader
│   │   ├── weibo.ts          # Weibo content extractor
│   │   └── xiaohongshu.ts    # Xiaohongshu content extractor
│   └── templates/
│       └── note.md           # Markdown output template
└── docs/
    ├── PRD.md                # Product requirements
    ├── ARCH.md               # Architecture & data flow diagrams
    └── PROJECT_STATE.md      # Development progress tracker
```

Notes are saved to your Obsidian vault:

```
{your-vault}/
└── LinkMind/                          # Auto-created by the skill
    ├── 2026-03-22-xxx.md
    └── attachments/
        └── 2026-03-22-xxx/            # One directory per note
            ├── img-001.jpg
            └── img-002.png
```

## Features

- **Multi-platform extraction** — Weibo (mobile API) and Xiaohongshu (Playwright)
- **AI deep summary** — Structured summary with key takeaways, tailored to content type
- **Image download** — Images are saved locally to `LinkMind/attachments/` inside your vault for full offline access
- **Cookie support** — Configure login cookies for accessing private or login-gated content
- **Auto-retry** — Network requests retry with exponential backoff; errors are categorized with actionable suggestions

## Setup

Requires **Node.js >= 22**.

**1. Install dependencies:**

```bash
cd skills/linkmind/handlers
npm install
```

**2. Configure your Obsidian vault path:**

Create (or edit) `skills/linkmind/config.json`:

```json
{
  "obsidian_vault": "/Users/yourname/MyVault"
}
```

Replace the path with the absolute path to your Obsidian vault directory.

**3. (Optional) Configure cookies for login-gated content:**

Add platform cookies to `skills/linkmind/config.json`:

```json
{
  "obsidian_vault": "/Users/yourname/MyVault",
  "cookies": {
    "weibo": "SUB=xxx; SUBP=yyy",
    "xiaohongshu": "a1=xxx; web_session=yyy"
  }
}
```

To obtain cookies: log in to the platform in a browser, open DevTools (F12) →
Application → Cookies, and copy the relevant values as a semicolon-separated string.

## Usage

### With an AI Agent (primary use case)

This skill works with any agent that supports the [SKILL.md standard](https://openclaw.rocks/blog/mcp-skills-plugins) — OpenClaw, Cursor, Claude Code, GitHub Copilot, etc.

The AI reads `skills/linkmind/SKILL.md` and knows how to:
- Recognize trigger phrases like "让我记录", "帮我保存", "capture this"
- Dispatch to the correct platform handler
- Generate a Markdown note with deep summary and save it to your Obsidian vault

### Standalone handler testing

```bash
cd skills/linkmind/handlers

# Weibo
npx tsx weibo.ts "https://m.weibo.cn/detail/4331051486294436"

# Xiaohongshu
npx tsx xiaohongshu.ts "https://www.xiaohongshu.com/explore/6a7b8c9d0e1f"
```

Handlers output JSON to stdout, which the AI agent consumes to generate the final Markdown file.

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
---

# 成都美食探店推荐

> 来源：微博 @美食达人 | 2026-03-22

## 深度总结

（AI 生成的深度总结，包含叙述性段落和关键要点）

**关键要点：**
- （要点一）
- （要点二）

## 原文内容

（原始文字内容）

## 图片

![图片](attachments/2026-03-22-成都美食探店推荐/img-001.jpg)

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

See [docs/PROJECT_STATE.md](docs/PROJECT_STATE.md) for detailed progress.

## Tech Stack

- **TypeScript** (ES2022, ESM) with [tsx](https://github.com/privatenumber/tsx) for zero-config execution
- **Node.js built-in fetch** for Weibo mobile API
- **Playwright** (Step 3) for Xiaohongshu browser rendering
- **SKILL.md** standard for cross-platform AI agent compatibility

## Documentation

- [PRD.md](docs/PRD.md) — Product requirements and acceptance criteria
- [ARCH.md](docs/ARCH.md) — Architecture, data flow diagrams, and design decisions
- [PROJECT_STATE.md](docs/PROJECT_STATE.md) — Phase-by-phase development tracker

## License

Personal use.
