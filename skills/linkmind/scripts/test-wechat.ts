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
