/**
 * Xiaohongshu (RedNote) content handler
 * Usage: npx tsx xiaohongshu.ts "<xiaohongshu-url>"
 * Output: JSON to stdout
 *
 * Uses Playwright for browser-based content extraction.
 */

import { fileURLToPath } from "node:url";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import type { XiaohongshuContent, HandlerError } from "./types.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DESKTOP_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) " +
  "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

const NAVIGATION_TIMEOUT = 30_000;
const CONTENT_WAIT_TIMEOUT = 15_000;

// ---------------------------------------------------------------------------
// URL parsing
// ---------------------------------------------------------------------------

export function extractNoteId(url: string): string {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    throw new Error(`无效的 URL: ${url}`);
  }

  const host = u.hostname;
  const path = u.pathname;

  if (host.includes("xiaohongshu.com")) {
    const m = path.match(/\/(?:explore|discovery\/item)\/([a-f0-9]+)/);
    if (m) return m[1];
    const m2 = path.match(/\/user\/profile\/[^/]+\/([a-f0-9]+)/);
    if (m2) return m2[1];
  }

  if (host.includes("xhslink.com")) {
    const m = path.match(/\/([A-Za-z0-9]+)/);
    if (m) return m[1];
  }

  throw new Error(`无法从 URL 中解析小红书笔记 ID: ${url}`);
}

// ---------------------------------------------------------------------------
// Short link resolution
// ---------------------------------------------------------------------------

async function resolveShortUrl(url: string): Promise<string> {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return url;
  }

  if (!u.hostname.includes("xhslink.com")) return url;

  let current = url;
  for (let i = 0; i < 5; i++) {
    const resp = await fetch(current, {
      headers: { "User-Agent": DESKTOP_UA },
      redirect: "manual",
    });
    const location = resp.headers.get("location");
    if (!location) break;
    current = location.startsWith("http")
      ? location
      : new URL(location, current).href;
    if (current.includes("xiaohongshu.com")) return current;
  }

  return current;
}

// ---------------------------------------------------------------------------
// Browser helpers
// ---------------------------------------------------------------------------

async function createStealthContext(browser: Browser): Promise<BrowserContext> {
  const context = await browser.newContext({
    userAgent: DESKTOP_UA,
    viewport: { width: 1280, height: 800 },
    locale: "zh-CN",
    timezoneId: "Asia/Shanghai",
    extraHTTPHeaders: {
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    },
  });

  await context.addInitScript({
    content: `
      Object.defineProperty(navigator, "webdriver", { get: function() { return undefined; } });
      Object.defineProperty(navigator, "plugins", { get: function() { return [1, 2, 3, 4, 5]; } });
      Object.defineProperty(navigator, "languages", { get: function() { return ["zh-CN", "zh", "en"]; } });
      window.chrome = { runtime: {} };
    `,
  });

  return context;
}

// ---------------------------------------------------------------------------
// Content extraction — __INITIAL_STATE__
// ---------------------------------------------------------------------------

interface RawNoteData {
  title: string;
  desc: string;
  imageList: Array<{ urlDefault: string; url?: string; infoList?: Array<{ url: string }> }>;
  video?: { consumer?: { originVideoKey?: string }; media?: { stream?: { h264?: Array<{ masterUrl?: string }> } } };
  tagList: Array<{ name: string }>;
  user: { nickname: string; avatar?: string };
  time: number;
  interactInfo: {
    likedCount: string;
    collectedCount: string;
    commentCount: string;
  };
  type: string;
}

async function extractFromInitialState(page: Page, noteId: string): Promise<RawNoteData | null> {
  // String-based evaluation avoids tsx/esbuild __name decorator leaking into browser.
  // Uses a WeakSet-based serializer to handle Vue reactive circular references.
  return page.evaluate(`(() => {
    var state = window.__INITIAL_STATE__;
    if (!state) return null;

    var noteMap =
      (state.note && state.note.noteDetailMap) ||
      (state.note && state.note.noteMap) ||
      null;
    if (!noteMap) return null;

    var entry = noteMap["${noteId}"];
    var note = (entry && entry.note) ? entry.note : entry;
    if (!note || (!note.title && !note.desc)) return null;

    function unwrap(v) {
      if (v && typeof v === 'object' && '_rawValue' in v) return v._rawValue;
      if (v && typeof v === 'object' && '_value' in v) return v._value;
      return v;
    }
    function str(v) { var u = unwrap(v); return (u == null) ? "" : String(u); }
    function num(v) { var u = unwrap(v); return (typeof u === 'number') ? u : 0; }
    function arr(v) { var u = unwrap(v); return Array.isArray(u) ? u : []; }

    var seen = new WeakSet();
    function safeClone(obj, depth) {
      if (depth > 6 || obj == null) return obj;
      if (typeof obj !== 'object') return obj;
      if (seen.has(obj)) return null;
      seen.add(obj);
      if (Array.isArray(obj)) return obj.map(function(v) { return safeClone(v, depth + 1); });
      var out = {};
      Object.keys(obj).forEach(function(k) {
        if (k.indexOf('__') === 0 || k === 'dep' || k === 'effect' || k === 'computed') return;
        try { out[k] = safeClone(obj[k], depth + 1); } catch(e) {}
      });
      return out;
    }

    return safeClone({
      title: str(note.title),
      desc: str(note.desc),
      imageList: arr(note.imageList),
      video: note.video || null,
      tagList: arr(note.tagList),
      user: {
        nickname: str(note.user && (note.user.nickname || note.user.name)),
        avatar: str(note.user && (note.user.avatar || note.user.images)),
      },
      time: num(note.time),
      interactInfo: {
        likedCount: str(note.interactInfo && note.interactInfo.likedCount),
        collectedCount: str(note.interactInfo && note.interactInfo.collectedCount),
        commentCount: str(note.interactInfo && note.interactInfo.commentCount),
      },
      type: str(note.type),
    }, 0);
  })()`) as unknown as RawNoteData | null;
}

// ---------------------------------------------------------------------------
// Content extraction — DOM fallback
// ---------------------------------------------------------------------------

async function extractFromDOM(page: Page): Promise<RawNoteData> {
  // String-based evaluation avoids tsx/esbuild __name decorator leaking into the browser
  return page.evaluate(`(() => {
    function qs(sel) {
      var el = document.querySelector(sel);
      return (el && el.textContent) ? el.textContent.trim() : "";
    }

    var title =
      qs("#detail-title") ||
      qs(".note-top .title") ||
      qs("[class*='title']") ||
      "";

    var desc =
      qs("#detail-desc") ||
      qs(".note-text") ||
      qs("[class*='desc']") ||
      "";

    var imgElements = document.querySelectorAll(
      ".swiper-slide img, .note-image img, [class*='carousel'] img, #noteContainer img"
    );
    var imageList = Array.from(imgElements)
      .map(function(img) {
        var src = img.src || img.getAttribute("data-src") || "";
        return { urlDefault: src };
      })
      .filter(function(i) { return i.urlDefault && i.urlDefault.indexOf("avatar") === -1; });

    var videoEl = document.querySelector("video source, video");
    var videoSrc = videoEl
      ? (videoEl.src || videoEl.getAttribute("src") || "")
      : "";

    var authorEl =
      document.querySelector(".author-container .username") ||
      document.querySelector("[class*='author'] [class*='name']") ||
      document.querySelector(".user-info .name");
    var authorName = (authorEl && authorEl.textContent) ? authorEl.textContent.trim() : "";

    var tags = [];
    document
      .querySelectorAll('a[href*="search_result"], a[href*="tag"]')
      .forEach(function(a) {
        var text = (a.textContent || "").trim().replace(/^#/, "");
        if (text) tags.push({ name: text });
      });

    function parseCount(sel) {
      var text = qs(sel);
      return text.replace(/[^\\d]/g, "") || "0";
    }

    return {
      title: title,
      desc: desc,
      imageList: imageList,
      video: videoSrc
        ? { consumer: { originVideoKey: videoSrc } }
        : undefined,
      tagList: tags,
      user: { nickname: authorName },
      time: 0,
      interactInfo: {
        likedCount: parseCount(".like-wrapper .count, [class*='like'] [class*='count']"),
        collectedCount: parseCount(".collect-wrapper .count, [class*='collect'] [class*='count']"),
        commentCount: parseCount(".chat-wrapper .count, [class*='comment'] [class*='count']"),
      },
      type: videoSrc ? "video" : "normal",
    };
  })()`) as unknown as RawNoteData;
}

// ---------------------------------------------------------------------------
// Content fetch (Playwright)
// ---------------------------------------------------------------------------

async function fetchXiaohongshuData(
  noteId: string,
  _originalUrl: string,
): Promise<RawNoteData> {
  const noteUrl = `https://www.xiaohongshu.com/explore/${noteId}`;

  // Headed mode is required — Xiaohongshu detects headless browsers and blocks
  // content loading entirely. On macOS/Linux-with-display this opens a brief
  // Chromium window that closes automatically after extraction.
  const browser = await chromium.launch({
    headless: false,
    args: [
      "--disable-blink-features=AutomationControlled",
      "--no-sandbox",
      "--disable-dev-shm-usage",
    ],
  });

  try {
    const context = await createStealthContext(browser);
    const page = await context.newPage();
    page.setDefaultTimeout(NAVIGATION_TIMEOUT);

    // Visit homepage first to acquire session cookies (a1, web_session, etc.)
    // Without these cookies the note page returns a login wall.
    await page.goto("https://www.xiaohongshu.com/explore", {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(2000);

    // Navigate to the actual note
    await page.goto(noteUrl, { waitUntil: "domcontentloaded" });

    // Wait for the note content container to appear
    await page
      .waitForSelector("#noteContainer, .note-container, .note-detail", {
        timeout: CONTENT_WAIT_TIMEOUT,
      })
      .catch(() => {});

    // Settle time for SPA hydration
    await page.waitForTimeout(2000);

    // Primary: extract from Vue SSR state
    let data = await extractFromInitialState(page, noteId);

    // Fallback: DOM extraction
    if (!data || (!data.title && !data.desc)) {
      data = await extractFromDOM(page);
    }

    if (!data || (!data.title && !data.desc)) {
      throw new Error(
        "无法提取笔记内容，可能被反爬拦截或页面结构已变更",
      );
    }

    await context.close();
    return data;
  } finally {
    await browser.close();
  }
}

// ---------------------------------------------------------------------------
// Content assembly
// ---------------------------------------------------------------------------

function extractImageUrls(imageList: RawNoteData["imageList"]): string[] {
  return imageList
    .map((img) => {
      if (img.infoList?.length) {
        const last = img.infoList[img.infoList.length - 1];
        if (last.url) return last.url;
      }
      return img.url ?? img.urlDefault;
    })
    .filter(Boolean)
    .map((url) => (url.startsWith("//") ? `https:${url}` : url));
}

function extractVideoUrl(video: RawNoteData["video"]): string | null {
  if (!video) return null;
  const streams = video.media?.stream?.h264;
  if (streams?.length) {
    const best = streams[0];
    if (best.masterUrl) return best.masterUrl;
  }
  const key = video.consumer?.originVideoKey;
  if (key) {
    return key.startsWith("http")
      ? key
      : `https://sns-video-bd.xhscdn.com/${key}`;
  }
  return null;
}

function extractTags(tagList: RawNoteData["tagList"], text: string): string[] {
  const tagSet = new Set<string>();
  for (const t of tagList) {
    if (t.name) tagSet.add(t.name);
  }
  const hashtagMatches = text.match(/#([^#\s]+)/g);
  if (hashtagMatches) {
    for (const m of hashtagMatches) {
      const clean = m.replace(/^#/, "").replace(/\[话题\]$/, "");
      if (clean) tagSet.add(clean);
    }
  }
  return [...tagSet];
}

function formatTimestamp(ts: number): string {
  if (!ts) return new Date().toISOString().slice(0, 10);
  const d = new Date(ts);
  if (isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function parseStatCount(val: string): number {
  const str = String(val).trim();
  if (!str || str === "") return 0;
  if (str.endsWith("w") || str.endsWith("万")) {
    return Math.round(parseFloat(str) * 10000);
  }
  const n = parseInt(str, 10);
  return isNaN(n) ? 0 : n;
}

function makeTitle(title: string, desc: string): string {
  const raw = title || desc;
  if (!raw) return "小红书笔记";
  const firstLine = raw.split("\n")[0];
  if (firstLine.length <= 30) return firstLine;
  return firstLine.slice(0, 30) + "…";
}

export function parseXiaohongshuContent(
  data: RawNoteData,
  originalUrl: string,
): XiaohongshuContent {
  const fullText = [data.title, data.desc].filter(Boolean).join("\n\n");
  const tags = extractTags(data.tagList, fullText);

  return {
    platform: "xiaohongshu",
    title: makeTitle(data.title, data.desc),
    author: data.user.nickname || "未知",
    authorAvatar: data.user.avatar || undefined,
    date: formatTimestamp(data.time),
    text: data.desc || data.title || "",
    images: extractImageUrls(data.imageList),
    videoUrl: extractVideoUrl(data.video),
    tags,
    stats: {
      likes: parseStatCount(data.interactInfo.likedCount),
      collects: parseStatCount(data.interactInfo.collectedCount),
      comments: parseStatCount(data.interactInfo.commentCount),
    },
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
    const err: HandlerError = { error: "请提供小红书链接作为参数" };
    console.log(JSON.stringify(err));
    process.exit(1);
  }

  try {
    const resolved = await resolveShortUrl(url);
    const noteId = extractNoteId(resolved);
    const data = await fetchXiaohongshuData(noteId, url);
    const content = parseXiaohongshuContent(data, url);
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

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
