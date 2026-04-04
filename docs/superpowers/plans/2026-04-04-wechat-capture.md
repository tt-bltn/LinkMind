# 微信公众号文章捕获 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增 `wechat.ts` 处理器，通过 HTTP 优先 + CDP 回退提取微信公众号文章，输出 JSON 到 stdout，与微博/小红书保持一致的接口。

**Architecture:** HTTP 请求解析页面内嵌 JS 变量 (`msg_title`, `nickname`, `ct`, `cover`, `desc`) 和 `#js_content` 正文。若 HTTP 被拦截（403）或内容为空则回退到 CDP（复用 `chrome-cdp.ts`）。统计数据有 Cookie 时通过独立 API 获取，无 Cookie 时置 `null`。

**Tech Stack:** TypeScript ESM / Node.js 22 / tsx / Node.js `fetch` / `chrome-cdp.ts`（已有）

---

## 文件结构

| 操作 | 路径 | 职责 |
|------|------|------|
| Modify | `skills/linkmind/scripts/types.ts` | 扩展 `platform` 联合类型；添加 `WechatContent` 接口 |
| Modify | `skills/linkmind/scripts/config.ts` | `LinkMindConfig.cookies` 添加 `wechat` 字段；`applyEnvOverrides` 读取 `LINKMIND_WXMP_COOKIE` |
| **Create** | `skills/linkmind/scripts/wechat.ts` | 主处理器（URL 验证、HTML 解析、HTTP fetch、CDP 回退、main） |
| **Create** | `skills/linkmind/scripts/test-wechat.ts` | 单元测试（无网络）+ `--e2e` 模式（子进程调用） |
| Modify | `skills/linkmind/.env.example` | 添加 `LINKMIND_WXMP_COOKIE` 示例行 |
| Modify | `skills/linkmind/scripts/package.json` | 添加 `wechat`、`test:wechat`、`test:wechat:e2e` 脚本 |
| Modify | `skills/linkmind/SKILL.md` | 平台识别表、Step 2 指令、Cookie 章节添加微信说明 |

### `wechat.ts` 导出接口（供测试引用）

```typescript
export function extractArticleUrl(url: string): string
export function extractHtmlVar(html: string, varName: string): string | null
export function stripWechatHtml(html: string): string
export function extractContentImages(html: string): string[]
export function formatUnixTimestamp(ts: string): string
export function parseWechatHtml(html: string, originalUrl: string): WechatContent
```

---

## Task 1: 扩展类型与配置

**Files:**
- Modify: `skills/linkmind/scripts/types.ts`
- Modify: `skills/linkmind/scripts/config.ts`

- [ ] **Step 1: 修改 `types.ts`**

在 `CapturedContent` 的 `platform` 字段所在位置，将联合类型从 `"weibo" | "xiaohongshu"` 改为 `"weibo" | "xiaohongshu" | "wechat"`。然后在文件末尾（`isError` 函数之前）添加：

```typescript
export interface WechatContent extends CapturedContent {
  platform: "wechat";
  accountName: string;
  digest: string;
  coverImage: string | null;
  readCount: number | null;
  likeCount: number | null;
  inLookCount: number | null;
}
```

- [ ] **Step 2: 修改 `config.ts`**

在 `LinkMindConfig` 接口的 `cookies` 字段中添加 `wechat` 可选字段：

```typescript
cookies?: {
  weibo?: string;
  xiaohongshu?: string;
  wechat?: string;   // 新增
};
```

在 `applyEnvOverrides` 函数中，在 `cookies.xiaohongshu` 赋值行之后添加：

```typescript
config.cookies.wechat =
  envString("LINKMIND_WXMP_COOKIE") ?? config.cookies.wechat;
```

- [ ] **Step 3: 类型检查**

```bash
cd skills/linkmind/scripts && npm run typecheck
```

Expected: 无报错（`wechat` 类型暂未使用，应通过检查）

- [ ] **Step 4: Commit**

```bash
git add skills/linkmind/scripts/types.ts skills/linkmind/scripts/config.ts
git commit -m "feat(types): add WechatContent interface and extend platform type"
```

---

## Task 2 [TDD]: URL 验证

**Files:**
- Create: `skills/linkmind/scripts/test-wechat.ts`
- Create: `skills/linkmind/scripts/wechat.ts`（骨架）

- [ ] **Step 1: 创建测试文件，写失败测试**

新建 `skills/linkmind/scripts/test-wechat.ts`：

```typescript
/**
 * WeChat handler tests
 * Usage: npx tsx test-wechat.ts [--e2e]
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  extractArticleUrl,
  extractHtmlVar,
  stripWechatHtml,
  extractContentImages,
  formatUnixTimestamp,
  parseWechatHtml,
} from "./wechat.js";
import type { WechatContent } from "./types.js";

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
// Unit: extractArticleUrl
// ---------------------------------------------------------------------------

function testExtractArticleUrl(): void {
  console.log("\n[extractArticleUrl]");

  const shortUrl = "https://mp.weixin.qq.com/s/AbCdEfGhIjKlMnOp";
  assertEqual(extractArticleUrl(shortUrl), shortUrl, "短链保持不变");

  const longUrl =
    "https://mp.weixin.qq.com/s?__biz=MzA4NzQzMzU4Mg==&mid=12345&idx=1&sn=abc";
  assertEqual(extractArticleUrl(longUrl), longUrl, "长链保持不变");

  let threw = false;
  try {
    extractArticleUrl("https://weibo.com/foo");
  } catch {
    threw = true;
  }
  assert(threw, "非微信链接抛出错误");

  threw = false;
  try {
    extractArticleUrl("not-a-url");
  } catch {
    threw = true;
  }
  assert(threw, "无效 URL 抛出错误");

  threw = false;
  try {
    extractArticleUrl("https://mp.weixin.qq.com/profile?src=3");
  } catch {
    threw = true;
  }
  assert(threw, "非文章页路径抛出错误");
}

// (其余测试函数将在后续 Task 中追加)

async function run(): Promise<void> {
  const runE2E = process.argv.includes("--e2e");

  console.log("=== WeChat Handler Tests ===");

  testExtractArticleUrl();

  if (runE2E) {
    console.log("\n[E2E] 将在 Task 8 中添加");
  } else {
    console.log("\n[E2E] Skipped (pass --e2e to run)");
  }

  console.log(`\n--- Results: ${passed} passed, ${failed} failed ---`);
  if (failed > 0) process.exit(1);
}

run();
```

- [ ] **Step 2: 确认测试失败**

```bash
cd skills/linkmind/scripts && npx tsx test-wechat.ts
```

Expected: 报错 `Cannot find module './wechat.js'`（文件不存在）

- [ ] **Step 3: 创建 `wechat.ts` 骨架，实现 `extractArticleUrl`**

新建 `skills/linkmind/scripts/wechat.ts`：

```typescript
/**
 * WeChat Official Account article handler
 * Usage: npx tsx wechat.ts "<url>"
 * Output: JSON to stdout
 */

import { fileURLToPath } from "node:url";
import type { WechatContent, HandlerError, ErrorCode } from "./types.js";
import { withRetry, isRetryableError } from "./retry.js";
import { loadConfig, parseConfigArg } from "./config.js";
import { launchWithPage } from "./chrome-cdp.js";

const DESKTOP_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) " +
  "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

// ---------------------------------------------------------------------------
// URL validation
// ---------------------------------------------------------------------------

export function extractArticleUrl(url: string): string {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    throw new Error(`无效的 URL: ${url}`);
  }

  if (!u.hostname.includes("mp.weixin.qq.com")) {
    throw new Error(`不是微信公众号链接: ${url}`);
  }

  // 必须是文章路径：/s/<id> 或 /s?... 查询参数形式
  const isShort = /^\/s\/[A-Za-z0-9_-]+/.test(u.pathname);
  const isLong = u.pathname === "/s" && u.searchParams.has("__biz");
  if (!isShort && !isLong) {
    throw new Error(`不是微信文章链接（路径格式不匹配）: ${url}`);
  }

  return url;
}

// Placeholder exports — implemented in later tasks
export function extractHtmlVar(_html: string, _varName: string): string | null {
  throw new Error("Not implemented");
}
export function stripWechatHtml(_html: string): string {
  throw new Error("Not implemented");
}
export function extractContentImages(_html: string): string[] {
  throw new Error("Not implemented");
}
export function formatUnixTimestamp(_ts: string): string {
  throw new Error("Not implemented");
}
export function parseWechatHtml(_html: string, _originalUrl: string): WechatContent {
  throw new Error("Not implemented");
}

// ---------------------------------------------------------------------------
// Main (stub)
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const url = process.argv[2];
  if (!url) {
    const err: HandlerError = { error: "请提供微信公众号文章链接作为参数" };
    console.log(JSON.stringify(err));
    process.exit(1);
  }
  console.log(JSON.stringify({ error: "处理器尚未完整实现" }));
  process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
```

- [ ] **Step 4: 确认测试通过**

```bash
cd skills/linkmind/scripts && npx tsx test-wechat.ts
```

Expected:
```
=== WeChat Handler Tests ===

[extractArticleUrl]
  ✓ 短链保持不变
  ✓ 长链保持不变
  ✓ 非微信链接抛出错误
  ✓ 无效 URL 抛出错误
  ✓ 非文章页路径抛出错误

--- Results: 5 passed, 0 failed ---
```

- [ ] **Step 5: Commit**

```bash
git add skills/linkmind/scripts/wechat.ts skills/linkmind/scripts/test-wechat.ts
git commit -m "feat(wechat): scaffold handler with URL validation + tests"
```

---

## Task 3 [TDD]: HTML 变量提取

**Files:**
- Modify: `skills/linkmind/scripts/test-wechat.ts`（追加 `testExtractHtmlVar`）
- Modify: `skills/linkmind/scripts/wechat.ts`（实现 `extractHtmlVar`）

- [ ] **Step 1: 追加失败测试到 `test-wechat.ts`**

在 `testExtractArticleUrl` 函数定义之后、`run()` 函数之前，追加：

```typescript
function testExtractHtmlVar(): void {
  console.log("\n[extractHtmlVar]");

  const html = `<script>
var msg_title = "测试文章标题";
var nickname = '公众号名称';
var ct = "1712345678";
var cover = "";
var appmsgtoken = 'tok123';
</script>`;

  assertEqual(extractHtmlVar(html, "msg_title"), "测试文章标题", "双引号字符串");
  assertEqual(extractHtmlVar(html, "nickname"), "公众号名称", "单引号字符串");
  assertEqual(extractHtmlVar(html, "ct"), "1712345678", "数字字符串");
  assertEqual(extractHtmlVar(html, "cover"), "", "空字符串");
  assertEqual(extractHtmlVar(html, "appmsgtoken"), "tok123", "单引号 token");
  assertEqual(extractHtmlVar(html, "nonexistent"), null, "不存在的变量 → null");

  // 变量名含特殊字符不应匹配前缀
  const html2 = `<script>var msg_title_extra = "错误值"; var msg_title = "正确值";</script>`;
  assertEqual(extractHtmlVar(html2, "msg_title"), "正确值", "精确匹配变量名");
}
```

在 `run()` 函数中 `testExtractArticleUrl()` 调用之后追加：

```typescript
testExtractHtmlVar();
```

- [ ] **Step 2: 确认新测试失败**

```bash
cd skills/linkmind/scripts && npx tsx test-wechat.ts
```

Expected: `testExtractHtmlVar` 中的断言全部失败（`Not implemented`）

- [ ] **Step 3: 在 `wechat.ts` 中实现 `extractHtmlVar`**

将 `extractHtmlVar` 的占位实现替换为：

```typescript
export function extractHtmlVar(html: string, varName: string): string | null {
  // 匹配 var <name> = "value"; 或 var <name> = 'value';
  // 使用 \b 确保精确匹配变量名（不匹配前缀）
  const re = new RegExp(
    `var\\s+${varName}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`,
    "s",
  );
  const m = html.match(re);
  if (!m) return null;
  return m[1] !== undefined ? m[1] : m[2] ?? null;
}
```

- [ ] **Step 4: 确认所有测试通过**

```bash
cd skills/linkmind/scripts && npx tsx test-wechat.ts
```

Expected: 全部通过，`0 failed`

- [ ] **Step 5: Commit**

```bash
git add skills/linkmind/scripts/wechat.ts skills/linkmind/scripts/test-wechat.ts
git commit -m "feat(wechat): implement extractHtmlVar with tests"
```

---

## Task 4 [TDD]: HTML 内容清洗与图片提取

**Files:**
- Modify: `skills/linkmind/scripts/test-wechat.ts`
- Modify: `skills/linkmind/scripts/wechat.ts`

- [ ] **Step 1: 追加失败测试**

在 `testExtractHtmlVar` 之后追加以下三个测试函数，并在 `run()` 中调用：

```typescript
function testStripWechatHtml(): void {
  console.log("\n[stripWechatHtml]");

  assertEqual(stripWechatHtml("<p>你好世界</p>"), "你好世界", "去除 p 标签");
  assertEqual(stripWechatHtml("第一行<br/>第二行"), "第一行\n第二行", "br 转换为换行");
  assertEqual(
    stripWechatHtml("<style>.foo { color: red; }</style>内容"),
    "内容",
    "去除 style 标签及内容",
  );
  assertEqual(
    stripWechatHtml("<script>var x = 1;</script>内容"),
    "内容",
    "去除 script 标签及内容",
  );
  assertEqual(
    stripWechatHtml("&lt;strong&gt;&amp;测试&lt;/strong&gt;"),
    "<strong>&测试</strong>",
    "解码 HTML 实体",
  );
  assertEqual(stripWechatHtml("  前后空格  "), "前后空格", "去除首尾空格");

  const withTripleNewlines = stripWechatHtml("<p>段落一</p><p></p><p>段落二</p>");
  assert(!withTripleNewlines.includes("\n\n\n"), "连续换行不超过两个");
}

function testExtractContentImages(): void {
  console.log("\n[extractContentImages]");

  const html = `<div id="js_content">
    <img data-src="https://mmbiz.qpic.cn/real1.jpg" src="about:blank"/>
    <img src="https://mmbiz.qpic.cn/direct.jpg"/>
    <img data-src="https://mmbiz.qpic.cn/real2.jpg" src="about:blank"/>
    <img src="https://res.wx.qq.com/icon.png" data-src=""/>
    <img data-src="data:image/gif;base64,R0lGO" src="about:blank"/>
  </div>`;

  const imgs = extractContentImages(html);
  assertEqual(imgs.length, 3, "提取 3 张真实图片");
  assertEqual(imgs[0], "https://mmbiz.qpic.cn/real1.jpg", "优先使用 data-src");
  assertEqual(imgs[1], "https://mmbiz.qpic.cn/direct.jpg", "无 data-src 时使用 src");
  assertEqual(imgs[2], "https://mmbiz.qpic.cn/real2.jpg", "第三张图正确");
}

function testFormatUnixTimestamp(): void {
  console.log("\n[formatUnixTimestamp]");

  assertEqual(formatUnixTimestamp("1712345678"), "2024-04-05", "Unix 时间戳 → YYYY-MM-DD");
  const today = new Date().toISOString().slice(0, 10);
  assertEqual(formatUnixTimestamp("0"), today, "零值 → 今天");
  assertEqual(formatUnixTimestamp("invalid"), today, "无效值 → 今天");
}
```

在 `run()` 的 `testExtractHtmlVar()` 调用之后追加：

```typescript
testStripWechatHtml();
testExtractContentImages();
testFormatUnixTimestamp();
```

- [ ] **Step 2: 确认新测试失败**

```bash
cd skills/linkmind/scripts && npx tsx test-wechat.ts
```

Expected: 新增测试失败（`Not implemented`），之前的测试仍通过

- [ ] **Step 3: 实现三个函数**

在 `wechat.ts` 中，将三个函数的占位实现替换为：

```typescript
export function stripWechatHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&#x([0-9a-fA-F]+);/gi, (_, hex) =>
      String.fromCodePoint(parseInt(hex, 16)),
    )
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function extractContentImages(html: string): string[] {
  const results: string[] = [];
  const imgRe = /<img\s[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = imgRe.exec(html)) !== null) {
    const tag = m[0];
    const dataSrc = tag.match(/data-src="([^"]+)"/)?.[1];
    const src = tag.match(/\bsrc="([^"]+)"/)?.[1];
    const url = (dataSrc && dataSrc.startsWith("http")) ? dataSrc
      : (src && src.startsWith("http")) ? src
      : null;
    if (url) results.push(url);
  }
  return results;
}

export function formatUnixTimestamp(ts: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const n = parseInt(ts, 10);
  if (!n || isNaN(n)) return today;
  const d = new Date(n * 1000);
  if (isNaN(d.getTime())) return today;
  return d.toISOString().slice(0, 10);
}
```

- [ ] **Step 4: 确认所有测试通过**

```bash
cd skills/linkmind/scripts && npx tsx test-wechat.ts
```

Expected: 全部通过，`0 failed`

- [ ] **Step 5: Commit**

```bash
git add skills/linkmind/scripts/wechat.ts skills/linkmind/scripts/test-wechat.ts
git commit -m "feat(wechat): implement HTML parsing helpers with tests"
```

---

## Task 5 [TDD]: 内容组装 `parseWechatHtml`

**Files:**
- Modify: `skills/linkmind/scripts/test-wechat.ts`
- Modify: `skills/linkmind/scripts/wechat.ts`

- [ ] **Step 1: 追加失败测试**

在 `testFormatUnixTimestamp` 之后追加，并在 `run()` 中调用：

```typescript
function testParseWechatHtml(): void {
  console.log("\n[parseWechatHtml]");

  const mockHtml = `<!DOCTYPE html><html>
<head>
<meta property="og:image" content="https://og-fallback.jpg"/>
</head>
<script>
var msg_title = "测试文章";
var nickname = "测试公众号";
var ct = "1712345678";
var cover = "https://cover.jpg";
var desc = "这是文章摘要";
</script>
<div id="js_content">
  <p>文章正文第一段</p>
  <img data-src="https://mmbiz.qpic.cn/img1.jpg" src="about:blank"/>
  <p>文章正文第二段</p>
</div>
</html>`;

  const url = "https://mp.weixin.qq.com/s/TestId123";
  const result: WechatContent = parseWechatHtml(mockHtml, url);

  assertEqual(result.platform, "wechat", "platform 为 wechat");
  assertEqual(result.title, "测试文章", "title 来自 msg_title");
  assertEqual(result.author, "测试公众号", "author 来自 nickname");
  assertEqual(result.accountName, "测试公众号", "accountName 来自 nickname");
  assertEqual(result.date, "2024-04-05", "date 由 ct 时间戳转换");
  assertEqual(result.digest, "这是文章摘要", "digest 来自 desc");
  assertEqual(result.coverImage, "https://cover.jpg", "coverImage 来自 cover 变量");
  assert(result.text.includes("文章正文第一段"), "text 包含正文内容");
  assertEqual(result.images.length, 1, "提取 1 张图片");
  assertEqual(result.images[0], "https://mmbiz.qpic.cn/img1.jpg", "图片 URL 正确");
  assertEqual(result.readCount, null, "无 Cookie 时 readCount 为 null");
  assertEqual(result.likeCount, null, "无 Cookie 时 likeCount 为 null");
  assertEqual(result.inLookCount, null, "无 Cookie 时 inLookCount 为 null");
  assertEqual(result.originalUrl, url, "originalUrl 保持原始链接");
  assert(typeof result.fetchedAt === "string", "fetchedAt 存在");
  assertEqual(result.videoUrl, null, "无视频时 videoUrl 为 null");

  // og:image 作为 cover 的回退
  const htmlNoCover = mockHtml.replace(`var cover = "https://cover.jpg";`, `var cover = "";`);
  const result2 = parseWechatHtml(htmlNoCover, url);
  assertEqual(result2.coverImage, "https://og-fallback.jpg", "cover 为空时回退到 og:image");
}
```

在 `run()` 中追加 `testParseWechatHtml();`

- [ ] **Step 2: 确认测试失败**

```bash
cd skills/linkmind/scripts && npx tsx test-wechat.ts
```

Expected: `testParseWechatHtml` 失败（`Not implemented`）

- [ ] **Step 3: 实现 `parseWechatHtml`**

将 `wechat.ts` 中 `parseWechatHtml` 的占位实现替换为：

```typescript
function makeTitle(text: string): string {
  const firstLine = text.split("\n")[0];
  if (firstLine.length <= 30) return firstLine;
  return firstLine.slice(0, 30) + "…";
}

function extractOgMeta(html: string, property: string): string | null {
  const m = html.match(
    new RegExp(`<meta[^>]+property="${property}"[^>]+content="([^"]*)"`, "i"),
  );
  return m ? m[1] : null;
}

function extractVideoUrl(html: string): string | null {
  const m = html.match(/<video[^>]*>[\s\S]*?<source[^>]+src="([^"]+)"/i)
    ?? html.match(/<video[^>]+src="([^"]+)"/i);
  return m ? m[1] : null;
}

export function parseWechatHtml(html: string, originalUrl: string): WechatContent {
  const title = extractHtmlVar(html, "msg_title") ?? extractOgMeta(html, "og:title") ?? "";
  const nickname = extractHtmlVar(html, "nickname") ?? "";
  const ct = extractHtmlVar(html, "ct") ?? "0";
  const coverVar = extractHtmlVar(html, "cover") ?? "";
  const coverImage = coverVar || extractOgMeta(html, "og:image") || null;
  const digest = extractHtmlVar(html, "desc") ?? extractOgMeta(html, "og:description") ?? "";

  // Extract #js_content
  const contentMatch = html.match(/<div[^>]+id="js_content"[^>]*>([\s\S]*?)<\/div>/i);
  const contentHtml = contentMatch ? contentMatch[1] : "";
  const text = stripWechatHtml(contentHtml);
  const images = extractContentImages(contentHtml);
  const videoUrl = extractVideoUrl(contentHtml);

  return {
    platform: "wechat",
    title: title || makeTitle(text),
    author: nickname || "未知",
    accountName: nickname || "未知",
    date: formatUnixTimestamp(ct),
    digest,
    coverImage: coverImage || null,
    text,
    images,
    videoUrl,
    readCount: null,
    likeCount: null,
    inLookCount: null,
    originalUrl,
    fetchedAt: new Date().toISOString(),
  };
}
```

- [ ] **Step 4: 确认所有测试通过**

```bash
cd skills/linkmind/scripts && npx tsx test-wechat.ts
```

Expected: 全部通过，`0 failed`

- [ ] **Step 5: Commit**

```bash
git add skills/linkmind/scripts/wechat.ts skills/linkmind/scripts/test-wechat.ts
git commit -m "feat(wechat): implement parseWechatHtml content assembly with tests"
```

---

## Task 6: HTTP Fetch + 统计 API

**Files:**
- Modify: `skills/linkmind/scripts/wechat.ts`

- [ ] **Step 1: 实现 `fetchViaHttp` 和统计 API**

在 `parseWechatHtml` 之后、`main()` 之前添加：

```typescript
// ---------------------------------------------------------------------------
// Validity check
// ---------------------------------------------------------------------------

function isExtractionValid(content: WechatContent): boolean {
  return content.title.length > 0 && content.text.length > 0;
}

// ---------------------------------------------------------------------------
// Stats API (optional, requires cookie)
// ---------------------------------------------------------------------------

interface WechatStats {
  readCount: number | null;
  likeCount: number | null;
  inLookCount: number | null;
}

async function fetchStats(
  pageHtml: string,
  pageUrl: string,
  cookie: string,
): Promise<WechatStats> {
  const empty: WechatStats = { readCount: null, likeCount: null, inLookCount: null };
  try {
    const appmsgtoken = extractHtmlVar(pageHtml, "appmsgtoken");
    if (!appmsgtoken) return empty;

    const u = new URL(pageUrl);
    const biz = u.searchParams.get("__biz");
    const mid = u.searchParams.get("mid");
    const sn = u.searchParams.get("sn");
    const idx = u.searchParams.get("idx") ?? "1";

    if (!biz || !mid || !sn) {
      // Short-form URL: try to extract from page HTML
      const bizFromPage = extractHtmlVar(pageHtml, "biz");
      if (!bizFromPage) return empty;
      // Short-form lacks mid/sn in URL; skip stats
      return empty;
    }

    const statsUrl = `https://mp.weixin.qq.com/mp/getappmsgext?__biz=${biz}&mid=${mid}&sn=${sn}&idx=${idx}&appmsgtoken=${encodeURIComponent(appmsgtoken)}&f=json`;

    const resp = await fetch(statsUrl, {
      headers: {
        "User-Agent": DESKTOP_UA,
        Referer: pageUrl,
        Cookie: cookie,
      },
    });

    if (!resp.ok) return empty;
    const json = await resp.json() as Record<string, any>;
    const stat = json?.appmsgstat;
    if (!stat) return empty;

    return {
      readCount: typeof stat.read_num === "number" ? stat.read_num : null,
      likeCount: typeof stat.like_num === "number" ? stat.like_num : null,
      inLookCount: typeof stat.old_like_num === "number" ? stat.old_like_num : null,
    };
  } catch {
    return empty;
  }
}

// ---------------------------------------------------------------------------
// HTTP fetch path
// ---------------------------------------------------------------------------

async function fetchViaHttp(url: string, cookie?: string): Promise<WechatContent | null> {
  const headers: Record<string, string> = {
    "User-Agent": DESKTOP_UA,
    Accept: "text/html,application/xhtml+xml",
    "Accept-Language": "zh-CN,zh;q=0.9",
  };
  if (cookie) headers["Cookie"] = cookie;

  let resp: Response;
  try {
    resp = await withRetry(
      () =>
        fetch(url, { headers, redirect: "follow" }),
      { shouldRetry: isRetryableError },
    );
  } catch {
    return null;
  }

  if (resp.status === 403 || resp.status === 401) return null;
  if (!resp.ok) return null;

  const html = await resp.text();
  const content = parseWechatHtml(html, url);

  if (!isExtractionValid(content)) return null;

  // Try to fetch stats if cookie present
  if (cookie) {
    const stats = await fetchStats(html, url, cookie);
    content.readCount = stats.readCount;
    content.likeCount = stats.likeCount;
    content.inLookCount = stats.inLookCount;
  }

  return content;
}
```

- [ ] **Step 2: 确认现有单元测试仍通过**

```bash
cd skills/linkmind/scripts && npx tsx test-wechat.ts
```

Expected: 全部通过

- [ ] **Step 3: Commit**

```bash
git add skills/linkmind/scripts/wechat.ts
git commit -m "feat(wechat): implement HTTP fetch path with optional stats API"
```

---

## Task 7: CDP 回退 + Main

**Files:**
- Modify: `skills/linkmind/scripts/wechat.ts`

- [ ] **Step 1: 实现 CDP 回退**

在 `fetchViaHttp` 之后添加：

```typescript
// ---------------------------------------------------------------------------
// CDP DOM extraction script
// ---------------------------------------------------------------------------

const WECHAT_CDP_EXTRACT = `(() => {
  function getVar(name) {
    try { return String(eval(name) ?? ''); } catch { return ''; }
  }
  function qs(sel) {
    var el = document.querySelector(sel);
    return el ? el.textContent.trim() : '';
  }
  var contentEl = document.querySelector('#js_content');
  var descHtml = contentEl ? contentEl.innerHTML : '';
  var imgs = Array.from(document.querySelectorAll('#js_content img'))
    .map(function(img) {
      return img.getAttribute('data-src') || img.getAttribute('src') || '';
    })
    .filter(function(s) { return s && s.startsWith('http'); });
  return {
    msg_title: getVar('msg_title') || qs('#activity-name') || qs('.rich_media_title'),
    nickname: getVar('nickname') || qs('#js_name') || qs('.profile_nickname'),
    ct: getVar('ct') || '',
    cover: getVar('cover') || '',
    desc: getVar('desc') || '',
    descHtml: descHtml,
    images: imgs,
  };
})()`;

// ---------------------------------------------------------------------------
// CDP fetch path
// ---------------------------------------------------------------------------

function parseCookieString(
  cookieStr: string,
  domain: string,
): Array<{ name: string; value: string; domain: string; path: string }> {
  return cookieStr
    .split(";")
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const eqIdx = pair.indexOf("=");
      if (eqIdx === -1) return null;
      return {
        name: pair.slice(0, eqIdx).trim(),
        value: pair.slice(eqIdx + 1).trim(),
        domain,
        path: "/",
      };
    })
    .filter(Boolean) as Array<{ name: string; value: string; domain: string; path: string }>;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

async function fetchViaCdp(url: string, cookie?: string): Promise<WechatContent> {
  const browser = await withRetry(
    () => launchWithPage({ headless: false }),
    { maxAttempts: 2, baseDelayMs: 2000 },
  );

  try {
    const { page } = browser;

    if (cookie) {
      const parsed = parseCookieString(cookie, ".weixin.qq.com");
      if (parsed.length) await page.setCookies(parsed);
    }

    await page.navigate(url, { timeout: 30_000 });
    await sleep(3000);

    await page.waitForSelector("#js_content, #activity-name", 15_000).catch(() => {});
    await sleep(1500);

    interface CdpExtractResult {
      msg_title: string;
      nickname: string;
      ct: string;
      cover: string;
      desc: string;
      descHtml: string;
      images: string[];
    }

    const raw = await page.evaluate<CdpExtractResult>(WECHAT_CDP_EXTRACT);

    if (!raw || (!raw.msg_title && !raw.descHtml)) {
      throw new Error("CDP 无法提取微信文章内容，可能被拦截或需要登录");
    }

    const text = stripWechatHtml(raw.descHtml);
    const title = raw.msg_title || makeTitle(text);

    return {
      platform: "wechat",
      title,
      author: raw.nickname || "未知",
      accountName: raw.nickname || "未知",
      date: formatUnixTimestamp(raw.ct),
      digest: raw.desc || "",
      coverImage: raw.cover || null,
      text,
      images: raw.images,
      videoUrl: null,
      readCount: null,
      likeCount: null,
      inLookCount: null,
      originalUrl: url,
      fetchedAt: new Date().toISOString(),
    };
  } finally {
    await browser.close();
  }
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

async function fetchWechatData(url: string, cookie?: string): Promise<WechatContent> {
  const httpResult = await fetchViaHttp(url, cookie);
  if (httpResult) return httpResult;
  return fetchViaCdp(url, cookie);
}
```

- [ ] **Step 2: 实现完整 `main()` 函数**

将 `wechat.ts` 末尾的 `main` stub 替换为：

```typescript
// ---------------------------------------------------------------------------
// Error categorization
// ---------------------------------------------------------------------------

function categorizeError(e: unknown): { code: ErrorCode; details: string } {
  const msg = e instanceof Error ? e.message : String(e);
  const lower = msg.toLowerCase();
  const status = (e as any)?.httpStatus as number | undefined;

  if (status === 404 || lower.includes("无效的 url") || lower.includes("不是微信"))
    return { code: "NOT_FOUND", details: "请检查链接是否是微信公众号文章链接" };
  if (status === 403 || status === 401 || lower.includes("登录") || lower.includes("拦截"))
    return { code: "AUTH", details: "内容需要登录，请在 .env 中配置 LINKMIND_WXMP_COOKIE（参考 .env.example）" };
  if (status === 429 || lower.includes("rate") || lower.includes("频繁"))
    return { code: "RATE_LIMIT", details: "请求过于频繁，建议稍后重试" };
  if (lower.includes("无法提取") || lower.includes("parse") || lower.includes("变更"))
    return { code: "PARSE", details: "内容解析失败，页面结构可能已变更，请提 issue" };
  if (
    lower.includes("fetch") ||
    lower.includes("network") ||
    lower.includes("timeout") ||
    lower.includes("econnr") ||
    lower.includes("chrome")
  )
    return { code: "NETWORK", details: "网络请求失败，建议检查网络连接后重试" };

  return { code: "UNKNOWN", details: "建议稍后重试" };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const url = process.argv[2];

  if (!url) {
    const err: HandlerError = { error: "请提供微信公众号文章链接作为参数" };
    console.log(JSON.stringify(err));
    process.exit(1);
  }

  try {
    const configPath = parseConfigArg(process.argv);
    let configCookie: string | undefined;
    if (configPath) {
      try {
        const cfg = loadConfig(configPath);
        if (cfg.cookies?.wechat) configCookie = cfg.cookies.wechat;
      } catch {
        // Non-fatal; proceed without cookie
      }
    }

    const canonical = extractArticleUrl(url);
    const content = await fetchWechatData(canonical, configCookie);
    console.log(JSON.stringify(content, null, 2));
  } catch (e) {
    const { code, details } = categorizeError(e);
    const err: HandlerError = {
      error: e instanceof Error ? e.message : String(e),
      code,
      url,
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

- [ ] **Step 3: 类型检查**

```bash
cd skills/linkmind/scripts && npm run typecheck
```

Expected: 无报错

- [ ] **Step 4: 单元测试仍通过**

```bash
cd skills/linkmind/scripts && npx tsx test-wechat.ts
```

Expected: 全部通过

- [ ] **Step 5: Commit**

```bash
git add skills/linkmind/scripts/wechat.ts
git commit -m "feat(wechat): implement CDP fallback and main entry point"
```

---

## Task 8: E2E 测试

**Files:**
- Modify: `skills/linkmind/scripts/test-wechat.ts`

- [ ] **Step 1: 追加 E2E 测试函数**

在 `test-wechat.ts` 中，`testParseWechatHtml` 之后追加，并在 `run()` 的 `if (runE2E)` 分支替换占位内容：

```typescript
async function testE2E(): Promise<void> {
  console.log("\n[E2E] 用真实微信文章链接运行处理器...");

  // 腾讯新闻公众号的一篇公开文章（替换为可访问的真实链接）
  const testUrl =
    "https://mp.weixin.qq.com/s/example_replace_with_real_url";

  try {
    const { stdout } = await exec(
      "npx",
      ["tsx", "wechat.ts", testUrl],
      { cwd: import.meta.dirname, timeout: 30_000 },
    );

    let result: Record<string, any>;
    try {
      result = JSON.parse(stdout);
    } catch {
      assert(false, "stdout 是合法 JSON");
      console.log("  Raw stdout:", stdout.slice(0, 200));
      return;
    }

    if (result.error) {
      console.log(`  ⚠ 处理器返回错误: ${result.error} (code: ${result.code})`);
      console.log(`  详情: ${result.details}`);
      // E2E 中网络错误不算测试失败（环境问题）
      if (result.code === "NETWORK" || result.code === "AUTH") {
        console.log("  → 跳过 E2E 断言（网络/认证问题）");
        return;
      }
      assert(false, `处理器成功返回内容（错误: ${result.error}）`);
      return;
    }

    assert(true, "stdout 是合法 JSON");
    assertEqual(result.platform, "wechat", "platform 为 wechat");
    assert(typeof result.author === "string" && result.author.length > 0, "author 非空");
    assert(typeof result.text === "string" && result.text.length > 0, "text 非空");
    assert(typeof result.date === "string" && /\d{4}-\d{2}-\d{2}/.test(result.date), "date 格式正确");
    assert(typeof result.title === "string" && result.title.length > 0, "title 非空");
    assert(typeof result.fetchedAt === "string", "fetchedAt 存在");

    console.log(`  → Author: ${result.author}`);
    console.log(`  → Title: ${result.title}`);
    console.log(`  → Date: ${result.date}`);
    console.log(`  → Images: ${result.images?.length ?? 0}`);
    console.log(`  → Digest: ${result.digest?.slice(0, 50)}`);
    console.log(`  → Stats: reads=${result.readCount} likes=${result.likeCount} inLooks=${result.inLookCount}`);
  } catch (e: any) {
    assert(false, `处理器正常执行（${e.message}）`);
  }
}
```

在 `run()` 函数中，将 `if (runE2E)` 分支更新为：

```typescript
if (runE2E) {
  await testE2E();
} else {
  console.log("\n[E2E] Skipped (pass --e2e to run)");
}
```

- [ ] **Step 2: 用一个真实的微信文章 URL 替换 E2E 测试中的占位 URL**

打开 `test-wechat.ts`，将 `testUrl` 替换为一个实际可公开访问的微信文章链接（运行者自行填写）。

- [ ] **Step 3: 运行单元测试确认通过**

```bash
cd skills/linkmind/scripts && npx tsx test-wechat.ts
```

Expected: 全部通过

- [ ] **Step 4: （可选）运行 E2E 测试**

```bash
cd skills/linkmind/scripts && npx tsx test-wechat.ts --e2e
```

Expected: 成功获取文章内容，JSON 格式正确；若因网络/认证问题返回错误则跳过断言

- [ ] **Step 5: Commit**

```bash
git add skills/linkmind/scripts/test-wechat.ts
git commit -m "test(wechat): add E2E test for full handler pipeline"
```

---

## Task 9: 周边文件更新

**Files:**
- Modify: `skills/linkmind/.env.example`
- Modify: `skills/linkmind/scripts/package.json`
- Modify: `skills/linkmind/SKILL.md`

- [ ] **Step 1: 更新 `.env.example`**

在 `LINKMIND_XHS_COOKIE=` 行之后添加：

```bash
# 微信公众号 Cookie（可选，用于获取阅读/点赞/在看统计数据）
# 获取方式：微信内打开文章 → 复制链接到浏览器 → F12 → Application → Cookies → mp.weixin.qq.com
LINKMIND_WXMP_COOKIE=
```

- [ ] **Step 2: 更新 `package.json`**

在 `"test:xhs:e2e"` 条目之后添加：

```json
"wechat": "tsx wechat.ts",
"test:wechat": "tsx test-wechat.ts",
"test:wechat:e2e": "tsx test-wechat.ts --e2e"
```

- [ ] **Step 3: 更新 `SKILL.md`**

**3a.** 将 Step 1 的平台识别表替换为：

```markdown
| Platform        | URL patterns                                                  |
|-----------------|---------------------------------------------------------------|
| **Weibo**       | `weibo.com`, `m.weibo.cn`                                    |
| **Xiaohongshu** | `xiaohongshu.com`, `xhslink.com`                             |
| **WeChat**      | `mp.weixin.qq.com`                                           |
```

将 Step 1 末尾的不支持提示更新为：
```
"目前 LinkMind 支持微博、小红书和微信公众号链接，该链接暂不支持。"
```

**3b.** 在 Step 2 的 Xiaohongshu 脚本块之后添加：

```markdown
**WeChat:**
\```bash
npx tsx skills/linkmind/scripts/wechat.ts "<URL>" --config skills/linkmind/config.json
\```
```

同时在 Step 2.5（下载图片）的 `--referer` 示例中补充微信说明，确保 AI 在处理微信文章时使用正确的 Referer：

```markdown
--referer "{platform homepage: https://weibo.com / https://www.xiaohongshu.com / https://mp.weixin.qq.com}"
```

**3c.** 在 Cookie 配置章节的 `LINKMIND_XHS_COOKIE` 行之后添加：

```bash
LINKMIND_WXMP_COOKIE="appmsgticket=xxx; wxuin=xxx; ..."
```

并在说明文字中补充：微信 Cookie 用于获取阅读/点赞/在看统计数据，不影响基础内容提取。

**3d.** 在 Step 3 的元信息模板中，为微信平台添加统计字段说明（在元信息注释处）：

```markdown
(For WeChat articles, use:
- 阅读: {readCount ?? '—'} | 点赞: {likeCount ?? '—'} | 在看: {inLookCount ?? '—'})
```

- [ ] **Step 4: 类型检查确保通过**

```bash
cd skills/linkmind/scripts && npm run typecheck
```

Expected: 无报错

- [ ] **Step 5: 运行所有单元测试**

```bash
cd skills/linkmind/scripts && npx tsx test-wechat.ts && npx tsx test-weibo.ts && npx tsx test-xiaohongshu.ts
```

Expected: 三个测试套件全部通过

- [ ] **Step 6: Commit**

```bash
git add skills/linkmind/.env.example skills/linkmind/scripts/package.json skills/linkmind/SKILL.md
git commit -m "feat(wechat): update SKILL.md, env.example, package.json for WeChat support"
```

---

## Task 10: Code Review

**节点说明：** 所有实现完成后，在合并前进行代码审查。

- [ ] **Step 1: 确认所有测试通过**

```bash
cd skills/linkmind/scripts && npx tsx test-wechat.ts && npx tsx test-weibo.ts && npx tsx test-xiaohongshu.ts && npm run typecheck
```

Expected: 全部通过，无类型错误

- [ ] **Step 2: 调用 Code Review skill**

使用 `superpowers:requesting-code-review` skill 对以下变更范围进行审查：
- `skills/linkmind/scripts/wechat.ts`（新文件）
- `skills/linkmind/scripts/test-wechat.ts`（新文件）
- `skills/linkmind/scripts/types.ts`（扩展接口）
- `skills/linkmind/scripts/config.ts`（新增 cookie 字段）
- `skills/linkmind/SKILL.md`（平台支持说明）

重点关注：
1. HTTP 回退到 CDP 的触发条件是否合理
2. `extractContentImages` 的过滤逻辑是否会漏掉图片或引入噪声
3. 统计 API 失败是否静默处理（不应影响主流程）
4. 错误码分类是否覆盖常见场景

- [ ] **Step 3: 根据 Review 意见修改，重新运行测试**

```bash
cd skills/linkmind/scripts && npx tsx test-wechat.ts
```

- [ ] **Step 4: 最终 Commit（如有修改）**

```bash
git add -p   # 精确 stage 修改
git commit -m "fix(wechat): address code review feedback"
```
