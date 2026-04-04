# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**LinkMind** 是一个 AI Agent Skill，自动捕获微博、小红书等社交媒体内容并转换为结构化 Markdown 笔记，保存到用户的 Obsidian 知识库。

核心功能：
- 微博：通过 `m.weibo.cn` JSON API 提取（无需 JavaScript 渲染）
- 小红书：通过自定义 Chrome DevTools Protocol 客户端提取（使用系统 Chrome）
- AI 深度摘要、图片多模态分析、视频 ASR 转录
- 笔记以统一格式保存到 Obsidian vault

## 开发命令

所有脚本命令均在 `skills/linkmind/scripts/` 目录下执行：

```bash
cd skills/linkmind/scripts

# 安装依赖
npm install

# 类型检查
npm run typecheck

# 交互式配置向导
npm run setup
npm run setup -- --vault /path/to/vault

# 运行平台处理器（输出 JSON 到 stdout）
npm run weibo "<url>"
npm run xiaohongshu "<url>"

# 测试（单元测试）
npm run test:weibo
npm run test:xhs

# 测试（端到端，调用真实 URL）
npm run test:weibo -- --e2e
npm run test:xhs -- --e2e
```

根目录发布命令：
```bash
npm run clawhub:publish   # 发布到 ClawHub
npm run clawhub:sync      # 同步到 ClawHub
```

## 架构

### 整体架构：AI Agent + 处理脚本混合模式

```
用户输入 (AI Agent)
    ↓
[SKILL.md 工作流指令]
    ├→ Step 0: 读取 config.json，验证 vault 路径
    ├→ Step 1: 识别平台 (weibo / xiaohongshu)
    ├→ Step 2: 调用处理器脚本，获取 JSON 结构化数据
    ├→ Step 2.5: 下载图片到 vault attachments 目录
    ├→ Step 2.6: AI 多模态图片分析（OCR + 视觉内容）
    ├→ Step 2.7: 视频音频提取 → ASR → SRT（进行中）
    ├→ Step 3: 生成带 YAML frontmatter 的 Markdown 文件
    └→ Step 4: 报告结果给用户
```

**职责分工：**
- `SKILL.md`：AI 驱动的编排，深度摘要生成，文件 I/O，错误处理
- `weibo.ts` / `xiaohongshu.ts`：平台特定的数据提取，输出 JSON 到 stdout
- `chrome-cdp.ts`：自定义 Chrome DevTools Protocol 客户端（替代 Playwright，节省约 200MB）
- `config.ts`：配置加载（config.json + .env，优先级分层）
- `retry.ts`：指数退避重试逻辑
- `download-images.ts`：并发图片下载（5 并发，带 referer）
- `setup.ts`：交互式配置向导（@clack/prompts）

### 配置优先级

```
process.env > 项目级 .env > 用户级 ~/.linkmind/.env > config.json
```

- 敏感凭证（cookies, ASR API keys）存于 `.env`（不进 git）
- 非敏感配置（vault 路径）存于 `config.json`（不进 git）
- 模板文件：`config.template.json` 和 `.env.example`

### 错误码体系

`types.ts` 中定义的错误码：`NETWORK` | `AUTH` | `RATE_LIMIT` | `NOT_FOUND` | `PARSE` | `UNKNOWN`

SKILL.md 根据错误码给出不同的处理建议（重试/配置 cookie/验证 URL 等）。

## 技术栈

- **语言**：TypeScript ES2022，严格模式，ESM 模块
- **运行时**：Node.js >= 22，使用 `tsx` 直接执行（无构建步骤）
- **依赖极简**：核心功能仅用 Node.js 内置 `fetch`，无 Playwright/Puppeteer
- **分发**：SKILL.md 格式（兼容 OpenClaw / Cursor / Claude Code）

## 输出格式

笔记保存路径：`{vault}/LinkMind/YYYY-MM-DD-{slug}.md`
图片保存路径：`{vault}/LinkMind/attachments/{date}-{slug}/`

## 视频 ASR（进行中）

`extract-transcript.ts` 正在实现中：ffmpeg 提取音频 → iFlytek/OpenAI Whisper ASR → SRT 生成。
目前框架已就绪，集成尚未完成（见 `docs/PROJECT_STATE.md` Step 6）。
