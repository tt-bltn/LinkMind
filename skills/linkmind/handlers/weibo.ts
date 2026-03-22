/**
 * Weibo content handler
 * Usage: npx tsx weibo.ts "<weibo-url>"
 * Output: JSON to stdout
 */

import type { WeiboContent, HandlerError } from "./types.js";

// ---------------------------------------------------------------------------
// URL parsing
// ---------------------------------------------------------------------------

const BASE62_ALPHABET =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

function base62ToMid(base62: string): string {
  const groups: string[] = [];
  for (let i = base62.length; i > 0; i -= 4) {
    const start = Math.max(0, i - 4);
    const group = base62.slice(start, i);
    let num = 0;
    for (const ch of group) {
      num = num * 62 + BASE62_ALPHABET.indexOf(ch);
    }
    groups.unshift(start === 0 ? String(num) : String(num).padStart(7, "0"));
  }
  return groups.join("");
}

function extractWeiboId(url: string): string {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    throw new Error(`无效的 URL: ${url}`);
  }

  const host = u.hostname;
  const path = u.pathname;

  // m.weibo.cn/detail/{mid} or m.weibo.cn/status/{mid}
  if (host.includes("m.weibo.cn")) {
    const m = path.match(/\/(?:detail|status)\/(\d+)/);
    if (m) return m[1];
  }

  // weibo.com/{uid}/{base62}
  if (host.includes("weibo.com")) {
    const m = path.match(/\/(\d+)\/([A-Za-z0-9]+)/);
    if (m) return /^\d+$/.test(m[2]) ? m[2] : base62ToMid(m[2]);
  }

  // query param ?id=xxx
  const idParam = u.searchParams.get("id");
  if (idParam && /^\d+$/.test(idParam)) return idParam;

  throw new Error(`无法从 URL 中解析微博 ID: ${url}`);
}

// ---------------------------------------------------------------------------
// HTML cleanup
// ---------------------------------------------------------------------------

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<a[^>]*>#([^<]+)#<\/a>/gi, "#$1#")
    .replace(/<a[^>]*>@([^<]+)<\/a>/gi, "@$1")
    .replace(/<img[^>]*alt="([^"]*)"[^>]*>/gi, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .trim();
}

// ---------------------------------------------------------------------------
// Date parsing — Weibo format: "Sun Mar 22 14:30:00 +0800 2026"
// ---------------------------------------------------------------------------

function parseWeiboDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// API fetch
// ---------------------------------------------------------------------------

const MOBILE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) " +
  "AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148";

async function fetchWeiboData(mid: string): Promise<Record<string, any>> {
  // TODO [Step 2]: implement full API call
  // const resp = await fetch(`https://m.weibo.cn/statuses/show?id=${mid}`, {
  //   headers: {
  //     "User-Agent": MOBILE_UA,
  //     Referer: "https://m.weibo.cn",
  //     Accept: "application/json",
  //   },
  // });
  // if (!resp.ok) throw new Error(`API 请求失败: HTTP ${resp.status}`);
  // const json = await resp.json();
  // if (json.ok !== 1) throw new Error(`微博返回错误: ${json.msg ?? "未知"}`);
  // return json.data;

  throw new Error(
    `[未实现] 微博抓取功能将在 Step 2 中实现。mid=${mid}`
  );
}

// ---------------------------------------------------------------------------
// Content assembly
// ---------------------------------------------------------------------------

function parseWeiboContent(
  _data: Record<string, any>,
  originalUrl: string,
): WeiboContent {
  // TODO [Step 2]: parse API response into WeiboContent
  return {
    platform: "weibo",
    title: "",
    author: "",
    date: "",
    text: "",
    images: [],
    videoUrl: null,
    repostOf: null,
    stats: { reposts: 0, comments: 0, likes: 0 },
    originalUrl,
    fetchedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const url = process.argv[2];

  if (!url) {
    const err: HandlerError = { error: "请提供微博链接作为参数" };
    console.log(JSON.stringify(err));
    process.exit(1);
  }

  try {
    const mid = extractWeiboId(url);
    const data = await fetchWeiboData(mid);
    const content = parseWeiboContent(data, url);
    console.log(JSON.stringify(content, null, 2));
  } catch (e) {
    const err: HandlerError = {
      error: e instanceof Error ? e.message : String(e),
      url,
    };
    console.log(JSON.stringify(err, null, 2));
    process.exit(1);
  }
}

main();
