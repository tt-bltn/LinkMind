# 小宇宙播客捕获功能设计文档

**日期：** 2026-04-04
**状态：** 已确认，待实现

---

## 背景

LinkMind 现已支持微博、小红书、微信公众号三个平台。本文档描述新增小宇宙（xiaoyuzhou.fm）播客平台支持的设计，核心能力包括：

- 解析分享链接（含时间戳的短链）
- 优先下载平台字幕，无字幕时按需做音频 ASR
- 按用户指定的时间点/范围截取内容后再总结
- 生成结构化 Obsidian 笔记

---

## 整体架构

遵循现有"脚本提取 JSON → AI 编排总结"模式，新增小宇宙作为第四个平台：

```
用户分享链接（含/不含时间戳）
    ↓
xiaoyuzhou.ts（新脚本）
    ├─ 解析短链 xyzfm.link → episode ID + timestampSeconds
    ├─ 调 API 获取：标题、播客名、主播、音频URL、封面、字幕URL、时长
    └─ 输出 JSON

SKILL.md 编排层（新增小宇宙分支）
    ├─ Step 1：识别平台（新增 xiaoyuzhoufm.com / xyzfm.link 匹配）
    ├─ Step 2：调 xiaoyuzhou.ts，获取 JSON
    ├─ Step 2.X：获取字幕文本
    ├─ Step 2.Y：按时间窗口截取字幕片段
    └─ Step 3：生成笔记（总结只覆盖截取片段）
```

---

## xiaoyuzhou.ts 脚本

### 输入

命令行参数：
```bash
npx tsx skills/linkmind/scripts/xiaoyuzhou.ts "<URL>" --config skills/linkmind/config.json
```

URL 可为：
- 短链：`https://xyzfm.link/s/Qlkr7p`
- 完整链接：`https://www.xiaoyuzhoufm.com/episode/{id}#ts={seconds}?s=...`

### 处理流程

1. HTTP GET 短链，跟随重定向（不解析 body，只取最终 Location）
2. 从最终 URL 提取：
   - `episodeId`：路径中的 `episode/{id}`
   - `timestampSeconds`：fragment 中的 `#ts={n}`，无则为 `null`
3. 调小宇宙 API（实现阶段抓包确认端点，预期为 `api.xiaoyuzhoufm.com/v1/episode/{id}`）获取元数据
4. 从响应中提取字幕 URL（如有）和音频 URL

### 输出 JSON

```json
{
  "platform": "xiaoyuzhou",
  "episodeId": "69b4d2f9f8b8079bfa3ae7f2",
  "title": "OpenClaw 之后，我只想未来 3-6 个月的事情",
  "podcast": "42章经",
  "author": "魏武挥",
  "date": "2026-03-14",
  "description": "节目简介文字...",
  "audioUrl": "https://cdn.xiaoyuzhoufm.com/...",
  "durationSeconds": 3430,
  "timestampSeconds": 1023,
  "subtitleUrl": "https://... 或 null",
  "coverImage": "https://...",
  "originalUrl": "https://www.xiaoyuzhoufm.com/episode/69b4d2f9f8b8079bfa3ae7f2",
  "fetchedAt": "2026-04-04T14:00:00.000Z"
}
```

错误时输出标准 `HandlerError` 格式（含 `error` / `code` / `details`）。

### 新增类型（types.ts）

```typescript
export interface XiaoyuzhouContent extends CapturedContent {
  platform: "xiaoyuzhou";
  episodeId: string;
  podcast: string;
  durationSeconds: number;
  timestampSeconds: number | null;
  subtitleUrl: string | null;
  description: string;
}
```

---

## SKILL.md 编排扩展

### Step 1 新增平台识别

| 平台 | URL 模式 |
|------|----------|
| 小宇宙 | `xiaoyuzhoufm.com`, `xyzfm.link` |

### Step 2.X：获取字幕文本

```
subtitleUrl 存在？
  ├─ 是 → 下载字幕文件（SRT/JSON），解析为带时间戳的片段列表
  └─ 否 → 检查是否有时间限定（timestampSeconds 或用户提供的范围）
            ├─ 有时间限定 → 用 extract-transcript.ts 只处理对应时段
            │   （传入 --start 和 --end 参数限定下载/转写范围）
            └─ 无时间限定 → 询问用户：
                "这集音频时长 {HH:MM}，请提供你感兴趣的时间点或时间范围，
                 或回复「全部」以转写完整音频（耗时较长）"
                 → 用户确认后再执行
```

### Step 2.Y：时间窗口截取

字幕/转写文本获取后，按以下规则确定"有效片段"：

| 用户输入 | 截取范围 |
|----------|----------|
| 时间点（如 `17:03` / `#ts=1023`） | `[timestamp - 2min, timestamp + 2min]` |
| 明确时间范围（如 `10:00–25:00`） | 该范围内全部片段 |
| 用户提到关键信息 | 全范围内，对关键信息相关片段在总结中重点展开（关键信息从对话上下文获取，无需脚本传参） |
| 无时间限定（用户确认全部） | 全部片段 |

截取操作在字幕文本层面进行（按时间戳过滤行），不需要重新转写。

### extract-transcript.ts 扩展

新增 `--start` / `--end` 参数（格式 `MM:SS` 或秒数），用于：
- 音频下载时告知 yt-dlp 下载范围（`--download-sections`）
- ASR 上传时只上传对应片段

---

## 笔记格式

### YAML frontmatter

```yaml
---
title: '{title}'
date: {date}
platform: xiaoyuzhou
podcast: '{podcast}'
author: '{author}'
original_url: "{originalUrl}"
captured_at: {fetchedAt}
duration: {durationSeconds}
focus_start: '{focusStart 或 null}'
focus_end: '{focusEnd 或 null}'
has_transcript: {true/false}
---
```

### 正文结构

```markdown
# {title}

> 来源：小宇宙 · {podcast} @{author} | {date} | 时长 {HH:MM:SS}

## 深度总结

> 以下总结覆盖 {focusStart}–{focusEnd} 片段（如有时间限定）

（AI 生成，遵循 deep-summary-guide.md，重点展开用户提到的关键信息）

## 字幕片段

（截取的字幕原文，保留时间戳，格式：`[MM:SS] 文字`）

## 节目简介

{description}
```

### 文件命名

`{date}-{podcast}-{slug}.md`，保存至 `{vault}/LinkMind/`

---

## 错误处理

| 场景 | 处理方式 |
|------|----------|
| 短链解析失败 | `NETWORK` 错误，建议检查网络 |
| API 返回无效 | `PARSE` 错误，建议上报 issue |
| 字幕下载失败 | 降级到 ASR 流程，通知用户 |
| 无字幕 + 无时间限定 | 询问用户确认范围，不静默跳过 |
| ASR 未配置 | `AUTH` 错误，提示配置 .env |

---

## 实现阶段待确认事项

1. **小宇宙 API 端点**：实现阶段用 Charles/mitmproxy 抓包 App 请求，确认元数据 API 和字幕 API 的实际 URL 与鉴权方式
2. **字幕文件格式**：可能是 SRT、WebVTT 或自定义 JSON，需解析适配
3. **yt-dlp `--download-sections` 兼容性**：确认对小宇宙音频 CDN 是否有效，无效时改用 ffmpeg 按时间截取已下载文件

---

## 不在本期范围内

- 小宇宙评论/弹幕捕获
- 播客订阅列表同步
- 封面图片下载（节目封面作为元信息，不进 attachments）
