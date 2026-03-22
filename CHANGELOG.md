# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

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
