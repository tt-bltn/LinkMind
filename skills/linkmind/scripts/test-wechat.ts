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

// (其余测试函数将在后续 Task 中追加)

async function run(): Promise<void> {
  const runE2E = process.argv.includes("--e2e");

  console.log("=== WeChat Handler Tests ===");

  testExtractArticleUrl();
  testExtractHtmlVar();

  if (runE2E) {
    console.log("\n[E2E] 将在 Task 8 中添加");
  } else {
    console.log("\n[E2E] Skipped (pass --e2e to run)");
  }

  console.log(`\n--- Results: ${passed} passed, ${failed} failed ---`);
  if (failed > 0) process.exit(1);
}

run();
