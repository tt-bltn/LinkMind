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

// ---------------------------------------------------------------------------
// HTML variable extraction
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// HTML content cleaning
// ---------------------------------------------------------------------------

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
    let url: string | null = null;
    if (dataSrc && dataSrc.startsWith("http")) {
      url = dataSrc;
    } else if (src && src.startsWith("http")) {
      url = src;
    }
    // Filter: only accept mmbiz CDN images
    if (url && url.includes("mmbiz.qpic.cn")) {
      results.push(url);
    }
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
// parseWechatHtml — implemented in Task 5
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
