# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.1.2] - 2026-04-04

### Added

- WeChat Official Account article capture via Chrome DevTools Protocol with HTTP fetch fallback (`skills/linkmind/scripts/wechat.ts`)
- `WechatContent` type with `accountName`, `digest`, `coverImage`, `readCount`, `likeCount`, `inLookCount` fields
- WeChat article stats (read count, like count, "in look" count) with optional cookie support
- WeChat unit and E2E tests (`test-wechat.ts`; run `npm run test:wechat` / `npm run test:wechat:e2e`)
- `npm run wechat "<url>"` script for standalone testing
- SKILL.md updated to recognise `mp.weixin.qq.com` URLs and dispatch to `wechat.ts`

## [0.1.1] - 2026-03-22

### Added

- Interactive setup wizard for Obsidian vault path, platform cookies, and ASR credentials (`skills/linkmind/scripts/setup.ts`; run `npm run setup` from `skills/linkmind/scripts`)

### Changed

- Unified release version **0.1.1** for ClawHub (`clawhub publish … --version`), npm package metadata, and Claude Code plugin manifests (`.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`)

## [0.1.0] - 2026-03-22

### Added

- Weibo content extraction via mobile API (`m.weibo.cn`)
- Xiaohongshu content extraction via Chrome DevTools Protocol (CDP)
- Image download to local Obsidian vault attachments
- AI multimodal image analysis (OCR + visual content extraction)
- AI deep summary generation with structured output
- Cookie support for login-gated content
- Auto-retry with exponential backoff for network requests
- Error categorization with actionable user suggestions
- `.env` support for sensitive credentials (cookies, ASR keys)
- Multi-channel distribution: OpenClaw CLI, ClawHub Registry, Claude Code Plugin
- Chrome CDP module replacing Playwright (zero Chromium download)
- Deep summary reference guide (`references/deep-summary-guide.md`)

### In Progress

- Video ASR transcript via iFlytek LFASR / OpenAI Whisper (`extract-transcript.ts`)
