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

// ---------------------------------------------------------------------------
// Unit: extractHtmlVar
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Unit: stripWechatHtml
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Unit: extractContentImages
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Unit: formatUnixTimestamp
// ---------------------------------------------------------------------------

function testFormatUnixTimestamp(): void {
  console.log("\n[formatUnixTimestamp]");

  assertEqual(formatUnixTimestamp("1712345678"), "2024-04-05", "Unix 时间戳 → YYYY-MM-DD");
  const today = new Date().toISOString().slice(0, 10);
  assertEqual(formatUnixTimestamp("0"), today, "零值 → 今天");
  assertEqual(formatUnixTimestamp("invalid"), today, "无效值 → 今天");
}

// ---------------------------------------------------------------------------
// Unit: parseWechatHtml
// ---------------------------------------------------------------------------

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

async function run(): Promise<void> {
  const runE2E = process.argv.includes("--e2e");

  console.log("=== WeChat Handler Tests ===");

  testExtractArticleUrl();
  testExtractHtmlVar();
  testStripWechatHtml();
  testExtractContentImages();
  testFormatUnixTimestamp();
  testParseWechatHtml();

  if (runE2E) {
    console.log("\n[E2E] 将在 Task 8 中添加");
  } else {
    console.log("\n[E2E] Skipped (pass --e2e to run)");
  }

  console.log(`\n--- Results: ${passed} passed, ${failed} failed ---`);
  if (failed > 0) process.exit(1);
}

run();
