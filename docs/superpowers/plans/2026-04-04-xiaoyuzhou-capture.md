# 小宇宙播客捕获 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 LinkMind 新增小宇宙播客平台支持，优先下载平台字幕，按用户指定时间点/范围截取内容，生成 Obsidian 笔记。

**Architecture:** `xiaoyuzhou.ts` 负责解析短链、调 API 获取元数据（含字幕 URL），SKILL.md 编排层新增 Step 2.X（字幕获取降级链）和 Step 2.Y（时间窗口截取），`extract-transcript.ts` 扩展 `--start`/`--end` 参数支持部分音频 ASR。

**Tech Stack:** TypeScript ESM, Node.js fetch, yt-dlp `--download-sections`, ffmpeg `-ss -to`

---

## Task 1: 新增 XiaoyuzhouContent 类型

**Files:**
- Modify: `skills/linkmind/scripts/types.ts`

- [ ] **Step 1: 在 types.ts 中新增类型**

在文件末尾（`isError` 函数之前）插入：

```typescript
export interface XiaoyuzhouContent extends CapturedContent {
  platform: "xiaoyuzhou";
  episodeId: string;
  podcast: string;                  // 节目名称（如"42章经"）
  durationSeconds: number;          // 音频总时长（秒）
  timestampSeconds: number | null;  // 分享时打点的时间（秒），无则 null
  subtitleUrl: string | null;       // 平台提供的字幕文件 URL，无则 null
  description: string;              // 节目 shownotes / 简介
}
```

同时将 `CapturedContent.platform` 字段的类型从：

```typescript
platform: "weibo" | "xiaohongshu" | "wechat";
```

更新为：

```typescript
platform: "weibo" | "xiaohongshu" | "wechat" | "xiaoyuzhou";
```

- [ ] **Step 2: 验证类型检查通过**

```bash
cd skills/linkmind/scripts && npm run typecheck
```

期望输出：无报错

- [ ] **Step 3: Commit**

```bash
git add skills/linkmind/scripts/types.ts
git commit -m "feat(types): add XiaoyuzhouContent type"
```

---

## Task 2: 实现 URL 解析工具函数

**Files:**
- Create: `skills/linkmind/scripts/xiaoyuzhou.ts`（本任务写前半部分）
- Create: `skills/linkmind/scripts/test-xiaoyuzhou.ts`（本任务写对应测试）

- [ ] **Step 1: 写测试（先写，后实现）**

创建 `skills/linkmind/scripts/test-xiaoyuzhou.ts`：

```typescript
/**
 * Xiaoyuzhou handler tests
 * Usage: npx tsx test-xiaoyuzhou.ts [--e2e]
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { parseEpisodeUrl } from "./xiaoyuzhou.js";

const exec = promisify(execFile);

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string): void {
  if (condition) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.log(`  ✗ ${label}`);
  }
}

function assertEqual(actual: unknown, expected: unknown, label: string): void {
  const ok = actual === expected;
  if (!ok) {
    label += ` (got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)})`;
  }
  assert(ok, label);
}

// ---------------------------------------------------------------------------
// Unit: parseEpisodeUrl
// ---------------------------------------------------------------------------

function testParseEpisodeUrl(): void {
  console.log("\n[parseEpisodeUrl]");

  // 带时间戳的完整链接（#ts 在 ? 前）
  const r1 = parseEpisodeUrl(
    "https://www.xiaoyuzhoufm.com/episode/69b4d2f9f8b8079bfa3ae7f2#ts=1023?s=eyJ1IjoiNWY"
  );
  assertEqual(r1.episodeId, "69b4d2f9f8b8079bfa3ae7f2", "提取 episodeId");
  assertEqual(r1.timestampSeconds, 1023, "提取 timestampSeconds=1023");

  // 不带时间戳
  const r2 = parseEpisodeUrl(
    "https://www.xiaoyuzhoufm.com/episode/abc123"
  );
  assertEqual(r2.episodeId, "abc123", "不带时间戳时提取 episodeId");
  assertEqual(r2.timestampSeconds, null, "不带时间戳时 timestampSeconds 为 null");

  // ts=0 边界情况
  const r3 = parseEpisodeUrl(
    "https://www.xiaoyuzhoufm.com/episode/xyz#ts=0"
  );
  assertEqual(r3.timestampSeconds, 0, "ts=0 解析为 0（非 null）");

  // 非小宇宙链接抛错
  let threw = false;
  try {
    parseEpisodeUrl("https://weibo.com/foo");
  } catch {
    threw = true;
  }
  assert(threw, "非小宇宙链接抛出错误");
}

// ---------------------------------------------------------------------------
// E2E: Full handler pipeline
// ---------------------------------------------------------------------------

async function testE2E(): Promise<void> {
  console.log("\n[E2E] 运行小宇宙处理器...");

  const testUrl = "https://xyzfm.link/s/Qlkr7p";

  try {
    const { stdout } = await exec(
      "npx",
      ["tsx", "xiaoyuzhou.ts", testUrl, "--config", "../config.json"],
      { cwd: import.meta.dirname, timeout: 30_000 },
    );

    let result: Record<string, any>;
    try {
      result = JSON.parse(stdout);
    } catch {
      assert(false, "stdout 是合法 JSON");
      console.log("  Raw stdout:", stdout.slice(0, 300));
      return;
    }

    if (result.error) {
      console.log(`  ⚠ 处理器错误: ${result.error} (code: ${result.code})`);
      if (result.code === "NETWORK" || result.code === "AUTH") {
        console.log("  → 跳过 E2E 断言（网络/认证问题）");
        return;
      }
      assert(false, `处理器成功返回内容`);
      return;
    }

    assert(true, "stdout 是合法 JSON");
    assertEqual(result.platform, "xiaoyuzhou", "platform 为 xiaoyuzhou");
    assert(typeof result.episodeId === "string" && result.episodeId.length > 0, "episodeId 非空");
    assert(typeof result.title === "string" && result.title.length > 0, "title 非空");
    assert(typeof result.podcast === "string" && result.podcast.length > 0, "podcast 非空");
    assert(typeof result.audioUrl === "string" && result.audioUrl.startsWith("http"), "audioUrl 是 HTTP URL");
    assert(typeof result.durationSeconds === "number" && result.durationSeconds > 0, "durationSeconds > 0");
    assertEqual(result.timestampSeconds, 1023, "timestampSeconds=1023（17:03）");
    console.log(`  → Title: ${result.title}`);
    console.log(`  → Podcast: ${result.podcast}`);
    console.log(`  → Duration: ${result.durationSeconds}s`);
    console.log(`  → SubtitleUrl: ${result.subtitleUrl ?? "(none)"}`);
  } catch (e: any) {
    assert(false, `处理器正常执行（${e.message}）`);
  }
}

async function run(): Promise<void> {
  const runE2E = process.argv.includes("--e2e");

  console.log("=== Xiaoyuzhou Handler Tests ===");

  testParseEpisodeUrl();

  if (runE2E) {
    await testE2E();
  } else {
    console.log("\n[E2E] Skipped (pass --e2e to run)");
  }

  console.log(`\n--- Results: ${passed} passed, ${failed} failed ---`);
  if (failed > 0) process.exit(1);
}

run();
```

- [ ] **Step 2: 运行测试确认失败（因为 xiaoyuzhou.ts 还不存在）**

```bash
cd skills/linkmind/scripts && npx tsx test-xiaoyuzhou.ts
```

期望：报错 `Cannot find module './xiaoyuzhou.js'`

- [ ] **Step 3: 创建 xiaoyuzhou.ts 并实现 parseEpisodeUrl**

创建 `skills/linkmind/scripts/xiaoyuzhou.ts`：

```typescript
/**
 * Xiaoyuzhou (小宇宙) podcast handler
 * Usage: npx tsx xiaoyuzhou.ts "<url>" --config skills/linkmind/config.json
 * Output: JSON to stdout
 */

import { fileURLToPath } from "node:url";
import type { XiaoyuzhouContent, HandlerError, ErrorCode } from "./types.js";
import { withRetry, isRetryableError } from "./retry.js";
import { loadConfig, parseConfigArg } from "./config.js";

const MOBILE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) " +
  "AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148";

// ---------------------------------------------------------------------------
// URL parsing
// ---------------------------------------------------------------------------

export interface ParsedEpisodeUrl {
  episodeId: string;
  timestampSeconds: number | null;
}

/**
 * Parse a full xiaoyuzhoufm.com episode URL.
 * Handles: https://www.xiaoyuzhoufm.com/episode/{id}#ts={seconds}?s=...
 */
export function parseEpisodeUrl(url: string): ParsedEpisodeUrl {
  if (!url.includes("xiaoyuzhoufm.com")) {
    throw new Error(`不是小宇宙链接: ${url}`);
  }

  // Extract episode ID from path /episode/{id}
  const idMatch = url.match(/\/episode\/([a-f0-9]+)/i);
  if (!idMatch) {
    throw new Error(`无法从 URL 中提取 episode ID: ${url}`);
  }
  const episodeId = idMatch[1];

  // Extract timestamp from fragment #ts={seconds}
  // URL may look like: /episode/{id}#ts=1023?s=... (fragment before query)
  const tsMatch = url.match(/#ts=(\d+)/);
  const timestampSeconds = tsMatch ? parseInt(tsMatch[1], 10) : null;

  return { episodeId, timestampSeconds };
}

/**
 * Resolve a short link (xyzfm.link/s/xxx) by following HTTP redirect.
 * Returns the final URL (xiaoyuzhoufm.com/episode/...).
 */
export async function resolveShortLink(url: string): Promise<string> {
  const resp = await fetch(url, {
    method: "HEAD",
    redirect: "follow",
    headers: { "User-Agent": MOBILE_UA },
  });
  // fetch with redirect: "follow" gives us the final URL
  return resp.url;
}
```

- [ ] **Step 4: 运行测试确认 parseEpisodeUrl 通过**

```bash
cd skills/linkmind/scripts && npx tsx test-xiaoyuzhou.ts
```

期望：`[parseEpisodeUrl]` 下所有断言通过，`failed = 0`

- [ ] **Step 5: Commit**

```bash
git add skills/linkmind/scripts/xiaoyuzhou.ts skills/linkmind/scripts/test-xiaoyuzhou.ts
git commit -m "feat(xiaoyuzhou): add URL parsing and short link resolution"
```

---

## Task 3: API 发现 + 元数据获取

**Files:**
- Modify: `skills/linkmind/scripts/xiaoyuzhou.ts`（新增 API 函数）

> **注意：** 小宇宙 API 为非公开接口，需在实现开始时通过 curl 探测确认。以下端点为基于 App 行为的推断，以实际探测结果为准。

- [ ] **Step 1: 探测 API 端点**

运行以下命令，确认 episode 元数据端点：

```bash
EPISODE_ID="69b4d2f9f8b8079bfa3ae7f2"

# 尝试 v1 端点（最常见）
curl -s -o /dev/null -w "%{http_code}" \
  "https://api.xiaoyuzhoufm.com/v1/episode/${EPISODE_ID}" \
  -H "User-Agent: Xiaoyuzhou/2.57.1 (iPhone; iOS 17.0)"

# 如果返回 200，再拿完整响应：
curl -s "https://api.xiaoyuzhoufm.com/v1/episode/${EPISODE_ID}" \
  -H "User-Agent: Xiaoyuzhou/2.57.1 (iPhone; iOS 17.0)" | python3 -m json.tool | head -80
```

**根据探测结果决定后续实现路径：**
- 若 200 且含 `enclosure.url`（音频）→ 按下方代码实现
- 若 401/403 → 需在请求头中加 `x-jike-access-token`，用 Charles/mitmproxy 从 App 抓包获取 token 格式
- 若 404 → 尝试 `/v1/episodes/{id}`（复数形式）

- [ ] **Step 2: 在 xiaoyuzhou.ts 中添加 API 客户端**

在 `resolveShortLink` 函数后追加（根据 Step 1 探测结果调整端点和字段名）：

```typescript
// ---------------------------------------------------------------------------
// API client
// ---------------------------------------------------------------------------

const API_BASE = "https://api.xiaoyuzhoufm.com";
const APP_UA = "Xiaoyuzhou/2.57.1 (iPhone; iOS 17.0)";

interface XyzApiEpisode {
  eid: string;
  title: string;
  description: string;
  publishedAt: string;         // ISO date string
  duration: number;            // seconds
  enclosure: { url: string };  // audio URL
  podcast: {
    title: string;
    author: string;
  };
  image: { picUrl: string };
  transcriptUrl?: string | null; // subtitle file URL (if available)
}

/**
 * Fetch episode metadata from Xiaoyuzhou API.
 * Adjust endpoint / field names based on actual API probe results from Task 3 Step 1.
 */
async function fetchEpisodeApi(episodeId: string): Promise<XyzApiEpisode> {
  const resp = await withRetry(
    () =>
      fetch(`${API_BASE}/v1/episode/${episodeId}`, {
        headers: {
          "User-Agent": APP_UA,
          "Accept": "application/json",
        },
      }),
    { shouldRetry: isRetryableError },
  );

  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw Object.assign(
      new Error(`小宇宙 API 失败: HTTP ${resp.status} ${body.slice(0, 100)}`),
      { httpStatus: resp.status },
    );
  }

  const data = await resp.json() as { data?: XyzApiEpisode } | XyzApiEpisode;
  // Some APIs wrap response in { data: ... }
  const episode = ("data" in data && data.data) ? data.data : data as XyzApiEpisode;
  return episode;
}

/**
 * Build XiaoyuzhouContent from resolved URL + API data.
 */
async function fetchEpisodeData(
  finalUrl: string,
  timestampSeconds: number | null,
): Promise<XiaoyuzhouContent> {
  const { episodeId } = parseEpisodeUrl(finalUrl);
  const ep = await fetchEpisodeApi(episodeId);

  const date = ep.publishedAt
    ? new Date(ep.publishedAt).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  return {
    platform: "xiaoyuzhou",
    episodeId,
    title: ep.title ?? "",
    podcast: ep.podcast?.title ?? "",
    author: ep.podcast?.author ?? ep.podcast?.title ?? "",
    date,
    description: ep.description ?? "",
    text: ep.description ?? "",
    images: ep.image?.picUrl ? [ep.image.picUrl] : [],
    videoUrl: null,
    audioUrl: ep.enclosure?.url ?? "",
    durationSeconds: ep.duration ?? 0,
    timestampSeconds,
    subtitleUrl: ep.transcriptUrl ?? null,
    coverImage: ep.image?.picUrl ?? null,
    originalUrl: `https://www.xiaoyuzhoufm.com/episode/${episodeId}`,
    fetchedAt: new Date().toISOString(),
  } as XiaoyuzhouContent;
}
```

> **⚠ 字段名适配：** 上面的 `XyzApiEpisode` 字段（`eid`, `enclosure`, `transcriptUrl` 等）是基于常见 podcast API 约定的推断。Step 1 探测后，根据实际响应 JSON 的字段名调整此 interface。

- [ ] **Step 3: 类型检查**

```bash
cd skills/linkmind/scripts && npm run typecheck
```

期望：无报错

- [ ] **Step 4: Commit**

```bash
git add skills/linkmind/scripts/xiaoyuzhou.ts
git commit -m "feat(xiaoyuzhou): add API client and fetchEpisodeData"
```

---

## Task 4: 字幕解析工具函数

**Files:**
- Modify: `skills/linkmind/scripts/xiaoyuzhou.ts`（新增字幕相关函数）
- Modify: `skills/linkmind/scripts/test-xiaoyuzhou.ts`（新增字幕测试）

- [ ] **Step 1: 在 test-xiaoyuzhou.ts 中新增字幕测试**

在 `testParseEpisodeUrl` 函数后插入：

```typescript
// ---------------------------------------------------------------------------
// Unit: parseSubtitleEntries
// ---------------------------------------------------------------------------

import { parseSubtitleEntries, filterByTimeWindow, formatSubtitleSegment } from "./xiaoyuzhou.js";

function testParseSubtitleEntries(): void {
  console.log("\n[parseSubtitleEntries]");

  // SRT format
  const srt = `1
00:00:05,000 --> 00:00:08,000
大家好，欢迎收听本期节目。

2
00:01:03,000 --> 00:01:10,500
今天我们来聊聊人工智能的未来。

3
00:02:30,000 --> 00:02:45,000
这是第三句话。
`;

  const entries = parseSubtitleEntries(srt);
  assertEqual(entries.length, 3, "解析出 3 条字幕");
  assertEqual(entries[0].startSeconds, 5, "第一条 startSeconds=5");
  assertEqual(entries[0].endSeconds, 8, "第一条 endSeconds=8");
  assertEqual(entries[0].text, "大家好，欢迎收听本期节目。", "第一条文本正确");
  assertEqual(entries[1].startSeconds, 63, "第二条 startSeconds=63（1分3秒）");
  assertEqual(entries[2].startSeconds, 150, "第三条 startSeconds=150（2分30秒）");

  // Empty input
  const empty = parseSubtitleEntries("");
  assertEqual(empty.length, 0, "空字符串解析为空数组");
}

function testFilterByTimeWindow(): void {
  console.log("\n[filterByTimeWindow]");

  const entries = [
    { startSeconds: 10, endSeconds: 15, text: "A" },
    { startSeconds: 60, endSeconds: 65, text: "B" },  // 1:00
    { startSeconds: 120, endSeconds: 130, text: "C" }, // 2:00
    { startSeconds: 200, endSeconds: 210, text: "D" }, // 3:20
  ];

  // Time point 17:03 = 1023s → window [1003s, 1043s]: none of these, but let's test with smaller values
  // Window [55s, 135s]: should include B (60-65) and C (120-130)
  const filtered = filterByTimeWindow(entries, 55, 135);
  assertEqual(filtered.length, 2, "窗口 [55s,135s] 含 2 条");
  assertEqual(filtered[0].text, "B", "第一条为 B");
  assertEqual(filtered[1].text, "C", "第二条为 C");

  // null window = all entries
  const all = filterByTimeWindow(entries, null, null);
  assertEqual(all.length, 4, "null 窗口返回全部");
}

function testFormatSubtitleSegment(): void {
  console.log("\n[formatSubtitleSegment]");

  const entries = [
    { startSeconds: 63, endSeconds: 70, text: "今天我们聊聊 AI。" },
    { startSeconds: 150, endSeconds: 160, text: "这是很重要的一点。" },
  ];

  const result = formatSubtitleSegment(entries);
  assert(result.includes("[01:03]"), "包含 [01:03] 时间戳");
  assert(result.includes("[02:30]"), "包含 [02:30] 时间戳");
  assert(result.includes("今天我们聊聊 AI。"), "包含第一条文本");
  assert(result.includes("这是很重要的一点。"), "包含第二条文本");
}
```

在 `run()` 函数中 `testParseEpisodeUrl()` 后添加：

```typescript
  testParseSubtitleEntries();
  testFilterByTimeWindow();
  testFormatSubtitleSegment();
```

- [ ] **Step 2: 运行确认测试失败**

```bash
cd skills/linkmind/scripts && npx tsx test-xiaoyuzhou.ts
```

期望：因 `parseSubtitleEntries` 未定义而报错

- [ ] **Step 3: 在 xiaoyuzhou.ts 中实现字幕工具函数**

在 `fetchEpisodeData` 函数后追加：

```typescript
// ---------------------------------------------------------------------------
// Subtitle utilities
// ---------------------------------------------------------------------------

export interface SubtitleEntry {
  startSeconds: number;
  endSeconds: number;
  text: string;
}

/**
 * Parse SRT subtitle content into structured entries.
 * Handles both SRT (HH:MM:SS,mmm --> HH:MM:SS,mmm) and
 * WebVTT (HH:MM:SS.mmm --> HH:MM:SS.mmm) timestamp formats.
 */
export function parseSubtitleEntries(content: string): SubtitleEntry[] {
  if (!content.trim()) return [];

  const entries: SubtitleEntry[] = [];
  // Split on double newlines to get blocks
  const blocks = content.trim().split(/\n\n+/);

  for (const block of blocks) {
    const lines = block.trim().split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) continue;

    // Find timestamp line (contains "-->")
    const tsLine = lines.find((l) => l.includes("-->"));
    if (!tsLine) continue;

    const tsMatch = tsLine.match(
      /(\d{1,2}):(\d{2}):(\d{2})[,.](\d+)\s*-->\s*(\d{1,2}):(\d{2}):(\d{2})[,.](\d+)/,
    );
    if (!tsMatch) continue;

    const toSeconds = (h: string, m: string, s: string) =>
      parseInt(h, 10) * 3600 + parseInt(m, 10) * 60 + parseInt(s, 10);

    const startSeconds = toSeconds(tsMatch[1], tsMatch[2], tsMatch[3]);
    const endSeconds = toSeconds(tsMatch[5], tsMatch[6], tsMatch[7]);

    // Text is everything after the timestamp line (skip sequence number line)
    const textLines = lines.filter(
      (l) => l !== tsLine && !/^\d+$/.test(l) && !l.startsWith("WEBVTT"),
    );
    const text = textLines.join(" ").trim();

    if (text) entries.push({ startSeconds, endSeconds, text });
  }

  return entries;
}

/**
 * Filter subtitle entries to those overlapping [startSec, endSec].
 * Pass null for both to return all entries.
 */
export function filterByTimeWindow(
  entries: SubtitleEntry[],
  startSec: number | null,
  endSec: number | null,
): SubtitleEntry[] {
  if (startSec === null && endSec === null) return entries;
  return entries.filter(
    (e) =>
      (startSec === null || e.endSeconds >= startSec) &&
      (endSec === null || e.startSeconds <= endSec),
  );
}

/**
 * Format subtitle entries as "[MM:SS] text" lines for Obsidian note.
 */
export function formatSubtitleSegment(entries: SubtitleEntry[]): string {
  return entries
    .map((e) => {
      const m = Math.floor(e.startSeconds / 60).toString().padStart(2, "0");
      const s = (e.startSeconds % 60).toString().padStart(2, "0");
      return `[${m}:${s}] ${e.text}`;
    })
    .join("\n");
}

/**
 * Download subtitle file and parse into entries.
 */
export async function downloadSubtitle(subtitleUrl: string): Promise<SubtitleEntry[]> {
  const resp = await fetch(subtitleUrl, {
    headers: { "User-Agent": APP_UA },
  });
  if (!resp.ok) {
    throw new Error(`字幕下载失败: HTTP ${resp.status}`);
  }
  const content = await resp.text();
  return parseSubtitleEntries(content);
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
cd skills/linkmind/scripts && npx tsx test-xiaoyuzhou.ts
```

期望：所有断言通过，`failed = 0`

- [ ] **Step 5: Commit**

```bash
git add skills/linkmind/scripts/xiaoyuzhou.ts skills/linkmind/scripts/test-xiaoyuzhou.ts
git commit -m "feat(xiaoyuzhou): add subtitle parsing, time window filter, and format utils"
```

---

## Task 5: 主处理器 + CLI 入口

**Files:**
- Modify: `skills/linkmind/scripts/xiaoyuzhou.ts`（新增 main + 错误处理）
- Modify: `skills/linkmind/scripts/package.json`（新增脚本条目）

- [ ] **Step 1: 在 xiaoyuzhou.ts 末尾追加错误处理和 main 函数**

```typescript
// ---------------------------------------------------------------------------
// Error categorization
// ---------------------------------------------------------------------------

function categorizeError(e: unknown): { code: ErrorCode; details: string } {
  const msg = e instanceof Error ? e.message : String(e);
  const lower = msg.toLowerCase();
  const httpStatus = (e as any).httpStatus as number | undefined;

  if (httpStatus === 401 || httpStatus === 403)
    return { code: "AUTH", details: msg };
  if (httpStatus === 404)
    return { code: "NOT_FOUND", details: msg };
  if (
    lower.includes("timeout") ||
    lower.includes("fetch failed") ||
    lower.includes("econnreset") ||
    lower.includes("network")
  )
    return { code: "NETWORK", details: msg };
  if (lower.includes("无法解析") || lower.includes("parse"))
    return { code: "PARSE", details: msg };
  return { code: "UNKNOWN", details: msg };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const rawUrl = args[0];
  const configPath = parseConfigArg(process.argv);

  if (!rawUrl || !configPath) {
    const err: HandlerError = {
      error: "用法: npx tsx xiaoyuzhou.ts <url> --config <path>",
    };
    console.log(JSON.stringify(err));
    process.exit(1);
  }

  try {
    // Resolve short link if needed
    const finalUrl = rawUrl.includes("xyzfm.link")
      ? await resolveShortLink(rawUrl)
      : rawUrl;

    // Parse timestamp from URL
    const { timestampSeconds } = parseEpisodeUrl(finalUrl);

    // Fetch episode metadata
    const content = await fetchEpisodeData(finalUrl, timestampSeconds);
    console.log(JSON.stringify(content, null, 2));
  } catch (e) {
    const { code, details } = categorizeError(e);
    const err: HandlerError = {
      error: e instanceof Error ? e.message : String(e),
      code,
      details,
    };
    console.log(JSON.stringify(err, null, 2));
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
```

- [ ] **Step 2: 更新 package.json 新增脚本**

在 `scripts` 对象中，`"wechat"` 条目后添加：

```json
"xiaoyuzhou": "tsx xiaoyuzhou.ts",
"test:xiaoyuzhou": "tsx test-xiaoyuzhou.ts",
"test:xiaoyuzhou:e2e": "tsx test-xiaoyuzhou.ts --e2e",
```

- [ ] **Step 3: 类型检查**

```bash
cd skills/linkmind/scripts && npm run typecheck
```

期望：无报错

- [ ] **Step 4: 运行单元测试**

```bash
cd skills/linkmind/scripts && npm run test:xiaoyuzhou
```

期望：所有断言通过

- [ ] **Step 5: 运行 E2E 测试（需要网络，确认 API 可用）**

```bash
cd skills/linkmind/scripts && npm run test:xiaoyuzhou:e2e
```

期望：返回节目元数据 JSON，`platform="xiaoyuzhou"`，`title` 和 `audioUrl` 非空

- [ ] **Step 6: Commit**

```bash
git add skills/linkmind/scripts/xiaoyuzhou.ts skills/linkmind/scripts/package.json
git commit -m "feat(xiaoyuzhou): add main handler, CLI entrypoint, and npm scripts"
```

---

## Task 6: extract-transcript.ts 扩展 --start/--end 参数

**Files:**
- Modify: `skills/linkmind/scripts/extract-transcript.ts`

- [ ] **Step 1: 更新 main 函数解析 --start/--end**

在 `extract-transcript.ts` 的 `main()` 函数中，找到 `getArg` 定义后，在读取 `mediaUrl` 等参数处添加：

```typescript
const startArg = getArg("--start");  // "MM:SS" 或秒数字符串，可选
const endArg   = getArg("--end");    // "MM:SS" 或秒数字符串，可选
```

添加解析辅助函数（在 `main` 函数外部，`categorizeError` 之前）：

```typescript
/**
 * Parse "MM:SS", "HH:MM:SS", or plain seconds string → total seconds.
 * Returns null if input is undefined or unparseable.
 */
export function parseTimeArg(value: string | undefined): number | null {
  if (!value) return null;
  if (/^\d+$/.test(value)) return parseInt(value, 10);
  const parts = value.split(":").map(Number);
  if (parts.some(isNaN)) return null;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}
```

- [ ] **Step 2: 更新 downloadMedia 使用时间窗口**

在 `downloadMedia` 函数签名后添加可选参数，并修改 yt-dlp 调用：

将函数签名从：
```typescript
export async function downloadMedia(
  url: string,
  referer: string,
  outputMp3Path: string,
): Promise<void>
```

改为：
```typescript
export async function downloadMedia(
  url: string,
  referer: string,
  outputMp3Path: string,
  startSeconds?: number | null,
  endSeconds?: number | null,
): Promise<void>
```

在 yt-dlp args 数组中（`"--quiet"` 之前），添加时间窗口参数：

```typescript
// Time window: only download the relevant segment
...(startSeconds != null || endSeconds != null
  ? ["--download-sections", `*${startSeconds ?? 0}-${endSeconds ?? "inf"}`]
  : []),
```

在 ffmpeg fallback 的 args 中（`"-vn"` 之后），添加：

```typescript
// Time window for ffmpeg fallback
...(startSeconds != null ? ["-ss", String(startSeconds)] : []),
...(endSeconds != null ? ["-to", String(endSeconds)] : []),
```

- [ ] **Step 3: 在 main() 中把解析的时间传给 downloadMedia**

找到 `await downloadMedia(mediaUrl, referer, tmpMp3);` 这行，改为：

```typescript
const startSeconds = parseTimeArg(startArg);
const endSeconds   = parseTimeArg(endArg);
await downloadMedia(mediaUrl, referer, tmpMp3, startSeconds, endSeconds);
```

- [ ] **Step 4: 类型检查**

```bash
cd skills/linkmind/scripts && npm run typecheck
```

期望：无报错

- [ ] **Step 5: Commit**

```bash
git add skills/linkmind/scripts/extract-transcript.ts
git commit -m "feat(transcript): add --start/--end time window for partial audio download"
```

---

## Task 7: 更新 SKILL.md

**Files:**
- Modify: `skills/linkmind/SKILL.md`

- [ ] **Step 1: 更新 Step 1 平台识别表**

在 SKILL.md 的 Step 1 平台识别表格中，在 WeChat 行后追加：

```markdown
| **小宇宙**      | `xiaoyuzhoufm.com`, `xyzfm.link`                             |
```

同时更新不支持提示文字为：
```
"目前 LinkMind 支持微博、小红书、微信公众号和小宇宙链接，该链接暂不支持。"
```

- [ ] **Step 2: 在 Step 2 中新增小宇宙处理器调用**

在 WeChat 处理器示例后追加：

```markdown
**小宇宙：**
```bash
npx tsx skills/linkmind/scripts/xiaoyuzhou.ts "<URL>" --config skills/linkmind/config.json
```

输出 JSON 字段含义：
- `timestampSeconds`：分享时打点的秒数（null 表示无时间点）
- `subtitleUrl`：平台提供的字幕文件 URL（null 表示无字幕）
- `audioUrl`：音频文件下载地址
- `durationSeconds`：音频总时长（秒）
```

- [ ] **Step 3: 在 Step 2.7 之后插入 Step 2.X 和 Step 2.Y**

在 `## Step 3: Generate the Markdown file` 之前插入：

````markdown
## Step 2.X: 获取小宇宙字幕（仅小宇宙平台）

仅当平台为小宇宙时执行本步骤。

**字幕获取逻辑：**

```
subtitleUrl 不为 null？
  ├─ 是 → 直接下载字幕文件，解析为带时间戳的片段列表（SubtitleEntry[]）
  │        下载命令示意（AI 直接用 fetch 下载文本内容即可）：
  │        GET {subtitleUrl}  → SRT 或 WebVTT 文本
  └─ 否 → 检查是否有时间限定（timestampSeconds 不为 null，或用户在对话中提供了范围）
            ├─ 有时间限定 → 计算 [startSec, endSec]（见 Step 2.Y），然后运行：
            │   npx tsx skills/linkmind/scripts/extract-transcript.ts \
            │     --media-url "{audioUrl}" \
            │     --output-dir "{attachments directory}" \
            │     --config skills/linkmind/config.json \
            │     --referer "https://www.xiaoyuzhoufm.com" \
            │     --start "{startSec}" \
            │     --end "{endSec}"
            │   将 ASR 结果（fullText）按换行拆分为伪字幕片段列表
            └─ 无时间限定 → 询问用户：
                "这集音频时长 {HH:MM:SS}，请提供感兴趣的时间点或范围，
                 或回复「全部」以转写完整音频（时长较长，耗时可能超过 5 分钟）"
                等待用户回复后再继续
```

**如果 ASR 未配置（.env 中无 ASR 变量）：**
在笔记中注明：`⚠️ 字幕获取失败：ASR 服务未配置，无法转写音频。` 并继续生成笔记（无字幕片段）。

## Step 2.Y: 时间窗口截取（仅小宇宙平台）

从 Step 2.X 获得完整字幕片段列表后，根据时间限定截取：

| 条件 | startSec | endSec |
|------|----------|--------|
| `timestampSeconds` 不为 null（分享时打点） | `timestampSeconds - 120` | `timestampSeconds + 120` |
| 用户在对话中明确说了时间点（如"17:03"） | `时间点秒数 - 120` | `时间点秒数 + 120` |
| 用户在对话中明确说了时间范围（如"10:00-25:00"） | 范围起始秒数 | 范围结束秒数 |
| 用户回复「全部」或无任何时间限定 | null（不截取） | null（不截取） |

**startSec 最小值为 0**（避免负数）。

截取结果存为"有效字幕段"，仅此段内容参与 Step 3 的深度总结。
用户如果额外提到了关键信息（如"重点关注 AI 监管的部分"），从对话上下文获取，在总结中对关键信息相关片段重点展开。
````

- [ ] **Step 4: 在 Step 3 中新增小宇宙笔记格式**

在 `### File naming` 之前，在 `(Omit stats lines that are null for all fields.)` 末尾追加：

````markdown
(For **小宇宙** podcasts: use the following format instead of the generic template above:)

```markdown
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

# {title}

> 来源：小宇宙 · {podcast} @{author} | {date} | 时长 {HH:MM:SS}
> （如有时间限定）以下内容覆盖 {focusStart}–{focusEnd} 片段

## 深度总结

（仅基于 Step 2.Y 截取的有效字幕段生成；遵循 deep-summary-guide.md；
  对用户提到的关键信息重点展开。如无字幕，则仅基于节目简介总结。）

## 字幕片段

（Step 2.Y 截取的有效字幕段原文，每行格式：`[MM:SS] 文字`）

（如无字幕且 ASR 未执行，写：`⚠️ 本集暂无字幕。`）

## 节目简介

{description}

## 元信息

- 时长：{HH:MM:SS}
- 节目：{podcast}
- 打点时间：{MM:SS 或 "—"}
```
````

- [ ] **Step 5: 更新 SKILL.md 顶部 description 和 triggers**

将 frontmatter 中的 `description` 更新为：
```
Capture social media links (Weibo, Xiaohongshu, WeChat, Xiaoyuzhou) — extract text, images/audio, and metadata, then generate a Markdown note with AI deep summary, saved to the user's Obsidian vault.
```

在 `triggers` 列表中追加：
```yaml
  - "帮我总结这个播客"
  - "记录这个播客"
```

- [ ] **Step 6: 验证 SKILL.md 结构完整**

通读 SKILL.md，确认：
- Step 1 表格含小宇宙
- Step 2 含小宇宙处理器命令
- Step 2.X 和 Step 2.Y 存在且完整
- Step 3 含小宇宙笔记格式
- Step 4 报告字段中提及是否有字幕/ASR

- [ ] **Step 7: Commit**

```bash
git add skills/linkmind/SKILL.md
git commit -m "feat(skill): add xiaoyuzhou platform support with subtitle and time window"
```

---

## Task 8: 最终验证

- [ ] **Step 1: 完整类型检查**

```bash
cd skills/linkmind/scripts && npm run typecheck
```

期望：无报错

- [ ] **Step 2: 所有单元测试**

```bash
cd skills/linkmind/scripts && npm run test:xiaoyuzhou
```

期望：所有断言通过

- [ ] **Step 3: E2E 测试（需网络）**

```bash
cd skills/linkmind/scripts && npm run test:xiaoyuzhou:e2e
```

期望：正确返回节目元数据，含 `title`、`podcast`、`audioUrl`、`timestampSeconds=1023`

- [ ] **Step 4: 回归测试（确保现有平台不受影响）**

```bash
cd skills/linkmind/scripts && npm run test:weibo && npm run test:xhs && npm run test:wechat
```

期望：所有已有测试通过

- [ ] **Step 5: 最终 commit**

```bash
git add -A
git commit -m "feat: add xiaoyuzhou podcast capture support"
```
