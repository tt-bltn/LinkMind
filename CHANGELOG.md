# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.3.0] - 2026-04-04

### Added

- 小宇宙 (Xiaoyuzhou) podcast support (`skills/linkmind/scripts/xiaoyuzhou.ts`)
  - Short link resolution (`xyzfm.link/s/xxx`) with URL fragment preserved — fetches raw `Location` header to retain `#ts=` timestamp
  - Episode metadata via `__NEXT_DATA__` scraping (no auth required)
  - Platform subtitle download via `POST /v1/episode-transcript/get` API (`x-jike-access-token` JWT)
  - Time-window filtering: ±2 minutes around user-specified timestamp; applied even when full subtitles available
  - ASR fallback via `extract-transcript.ts --start/--end` when platform subtitles unavailable
  - 金句摘录 in `## 字幕摘录` section, with episode-absolute timestamps (SRT offset + startSeconds)
  - `XiaoyuzhouContent` type with `podcast`, `episodeId`, `durationSeconds`, `timestampSeconds`, `subtitleUrl`, `audioUrl`
  - 25 unit tests (`npm run test:xiaoyuzhou`)
- `extract-transcript.ts` time-window parameters (`--start`, `--end`)
  - `parseTimeArg()` utility: parses `MM:SS`, `HH:MM:SS`, or plain seconds
  - `downloadMedia()` extended with `startSeconds?`/`endSeconds?`: passes `--download-sections` to yt-dlp, `-ss`/`-to` to ffmpeg fallback
- SKILL.md Step 2.A (download platform subtitle), Step 2.B (time-window filter), Step 2.C (ASR fallback for audio)
- `LINKMIND_XIAOYUZHOU_TOKEN` in `.env.example` with instructions for obtaining the JWT via Charles/mitmproxy

### Fixed

- `resolveShortLink`: switched from `redirect: "follow"` to `redirect: "manual"` to preserve URL fragment (`#ts=…`) in the `Location` header; previously `timestampSeconds` was always `null` for short links

## [0.2.0] - 2026-04-04

### Added

- Video/audio ASR transcription (`skills/linkmind/scripts/extract-transcript.ts`)
  - yt-dlp as primary media downloader (supports Weibo, Xiaohongshu, Bilibili, YouTube, podcasts)
  - Direct `fetch` fallback for CDN audio URLs (e.g. Xiaoyuzhou podcasts)
  - iFlytek LFASR integration (file upload + async polling, HMAC-SHA1 auth)
  - OpenAI Whisper integration as fallback (`response_format: srt`)
  - SRT subtitle file saved to `{vault}/LinkMind/attachments/{date}-{slug}/transcript.srt`
  - Transcript `fullText` passed to AI deep summary; non-Chinese transcripts translated in summary
  - `try/finally` cleanup of all temporary files
- `DEPENDENCY` error code in `ErrorCode` type for missing system tools (yt-dlp, ffmpeg)
- Unit tests: `parseLfasrResult`, `formatSrtTime`, `checkDependency`, ASR routing logic
- E2E test skeleton in `test-transcript.ts` (`npm run test:transcript:e2e`)
- `npm run transcript` and `npm run test:transcript` scripts
- `LINKMIND_OPENAI_MODEL` config option for custom Whisper model names

### Changed

- SKILL.md Step 2.7: `--video-url` parameter renamed to `--media-url` (broader platform support)
- SKILL.md Step 2.7: added multilingual transcript note (translate to Chinese in deep summary)
- SKILL.md 金句摘录：简化选取规则，去除三类型配额体系（观点型/概念定义型/行动指导型），改为直接选取最具洞察力或代表性的 3 句
- `.claude/skills/linkmind-capture/SKILL.md`：同步 `--media-url` 参数名修正，与主 SKILL.md 保持一致

## [0.1.3] - 2026-04-04

### Added

- `richContent` field on `WechatContent`: Markdown with inline images at their original positions, faithfully reflecting the author's image placement in WeChat articles
- `convertWechatHtmlToMd()` function in `wechat.ts`: converts WeChat article HTML to Markdown preserving inline `![](url)` at each image's original position
- 16 new unit tests covering `convertWechatHtmlToMd` and `richContent` field population

### Changed

- SKILL.md Step 3: WeChat notes now use `richContent` (image+text interleaved) for `## 原文内容`, skipping the separate `## 图片` section; Weibo/Xiaohongshu are unchanged
- SKILL.md Steps 2.5–2.6: updated WeChat image download and analysis workflow to produce resolved `richContent` with local paths and analysis blockquotes inserted inline
- `stripWechatHtml` and `convertWechatHtmlToMd`: block-level HTML elements (`</p>`, `</div>`, `</section>`, `</ul>`, `</ol>`, `</h1-6>` etc.) now emit paragraph breaks before tag stripping, fixing paragraph/list-item concatenation that caused formatting loss in complex articles

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
