# LinkMind

English | [中文](README_CN.md)

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
│   └── plugin.json            # Claude Code plugin manifest
├── CHANGELOG.md
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

**Option A — ClawHub Registry:**

```bash
npx clawhub@latest install linkmind-capture
```

**Option B — OpenClaw manual install:**

```bash
git clone https://github.com/tt-bltn/LinkMind.git /tmp/LinkMind
cp -r /tmp/LinkMind/skills/linkmind ~/.openclaw/skills/linkmind
cd ~/.openclaw/skills/linkmind/scripts && npm install
```

Or symlink into your workspace:

```bash
git clone https://github.com/tt-bltn/LinkMind.git ~/LinkMind
ln -s ~/LinkMind/skills/linkmind <your-workspace>/skills/linkmind
cd ~/LinkMind/skills/linkmind/scripts && npm install
```

**Option C — Claude Code Plugin:**

```
/plugin install https://github.com/tt-bltn/LinkMind
```

This installs the plugin directly from GitHub. After installation, follow the post-install prompt to configure your Obsidian vault path.

**Option D — Cursor / other AI agents:**

```bash
git clone https://github.com/tt-bltn/LinkMind.git
cd LinkMind/skills/linkmind/scripts
npm install
```

The AI agent reads `skills/linkmind/SKILL.md` for workflow instructions.

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
title: '深度解读ReAct：让大模型学会边思考边行动'
date: 2026-03-18
platform: weibo
author: 'AI前沿观察'
original_url: "https://weibo.com/7654321098/ReAcTpaper"
captured_at: 2026-03-22T10:15:00.000Z
has_video: true
has_transcript: true
has_image_analysis: true
---

# 深度解读ReAct：让大模型学会边思考边行动

> 来源：微博 @AI前沿观察 | 2026-03-18

## 深度总结

**内容类型：** 教程

**核心主题：** 解读 ReAct（Reasoning + Acting）框架，展示大模型如何通过交替生成推理轨迹和执行动作来完成复杂任务。

**结构化摘要：**

| 维度 | 内容 |
|------|------|
| 论文来源 | Yao et al., 2022, "ReAct: Synergizing Reasoning and Acting in Language Models" |
| 核心思想 | 将 Chain-of-Thought 推理与外部工具调用交织，形成 Thought → Action → Observation 循环 |
| 对比方法 | 纯 CoT（仅推理、易产生幻觉）、纯 Act（仅执行、缺乏规划） |
| 典型应用 | HotpotQA 多跳问答、FEVER 事实验证、ALFWorld/WebShop 交互任务 |

**关键要点：**
- ReAct 让模型在每一步先输出 Thought（分析当前状态、制定计划），再输出 Action（调用搜索、查表等工具），最后接收 Observation（工具返回结果），形成闭环推理
- 相比纯 Chain-of-Thought，ReAct 显著降低了幻觉率，因为推理过程有外部事实校验
- ReAct 框架直接启发了 LangChain Agent、AutoGPT 等主流 AI Agent 架构的设计

## 原文内容

【AI Agent必读论文】今天带大家深度拆解ReAct框架。

一句话总结：让大模型不只是"想"，还要"做"——推理和行动交替进行，每一步都有外部世界的反馈来校正方向。

传统的Chain-of-Thought让模型一口气想完再回答，问题是想多了容易产生幻觉。ReAct的做法是把推理拆成小步骤，每步推理后立刻执行一个动作（比如搜索），拿到真实结果后再继续推理。

举个例子，问"乔布斯和比尔盖茨谁更年轻？"：
- Thought 1: 我需要分别查两个人的出生年份
- Action 1: Search[乔布斯 出生年份]
- Observation 1: 1955年2月24日
- Thought 2: 乔布斯1955年出生，现在查比尔盖茨
- Action 2: Search[比尔盖茨 出生年份]
- Observation 2: 1955年10月28日
- Thought 3: 两人都是1955年出生，盖茨晚8个月，所以盖茨更年轻
- Action 3: Finish[比尔盖茨]

这个Thought→Action→Observation的循环就是ReAct的核心范式，也是今天几乎所有AI Agent框架的基础。

## 视频转写

> 📎 字幕文件：[transcript.srt](attachments/2026-03-18-深度解读ReAct-让大模型学会边思考边行动/transcript.srt)

大家好，今天我们来聊一篇非常重要的论文，ReAct。这篇论文可以说是AI Agent领域的奠基之作。它的核心思想其实很简单，就是让大模型在回答问题的时候，不要一口气想完，而是边想边做。每想一步就执行一个动作，比如去搜索引擎查一下，拿到结果后再继续往下想……

## 图片

![图片](attachments/2026-03-18-深度解读ReAct-让大模型学会边思考边行动/img-001.jpg)

> **图片内容：** ReAct框架流程图，左侧标注"Thought"（黄色），中间标注"Action"（蓝色），右侧标注"Observation"（绿色），箭头形成循环。底部对比了纯CoT（仅Thought链）和纯Act（仅Action链）的局限性。

![图片](attachments/2026-03-18-深度解读ReAct-让大模型学会边思考边行动/img-002.jpg)

> **图片内容：** HotpotQA实验结果表格，ReAct在Exact Match上达到35.1%，优于纯CoT的29.4%和纯Act的25.7%。标注"ReAct + CoT-SC"组合方法达到最佳成绩40.2%。

## 元信息

- 转发: 2.1k | 评论: 387 | 点赞: 5.6k
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

MIT
