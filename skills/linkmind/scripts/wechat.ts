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
    // Accept any http article image; exclude WeChat UI resource domains
    const WECHAT_UI_DOMAINS = ["res.wx.qq.com"];
    if (url && !WECHAT_UI_DOMAINS.some((d) => url.includes(d))) {
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

// ---------------------------------------------------------------------------
// Helper functions for parseWechatHtml
// ---------------------------------------------------------------------------

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
      // Short-form URL: lacks mid/sn in URL; skip stats
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
