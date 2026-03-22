/**
 * Xiaohongshu (RedNote) content handler
 * Usage: npx tsx xiaohongshu.ts "<xiaohongshu-url>"
 * Output: JSON to stdout
 *
 * Requires Playwright for browser-based content extraction.
 * Playwright will be added as a dependency in Step 3.
 */

import type { XiaohongshuContent, HandlerError } from "./types.js";

// ---------------------------------------------------------------------------
// URL parsing
// ---------------------------------------------------------------------------

function extractNoteId(url: string): string {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    throw new Error(`无效的 URL: ${url}`);
  }

  const host = u.hostname;
  const path = u.pathname;

  // xiaohongshu.com/explore/{noteId} or /discovery/item/{noteId}
  if (host.includes("xiaohongshu.com")) {
    const m = path.match(/\/(?:explore|discovery\/item)\/([a-f0-9]+)/);
    if (m) return m[1];
    // xiaohongshu.com/user/profile/{uid}/{noteId}
    const m2 = path.match(/\/user\/profile\/[^/]+\/([a-f0-9]+)/);
    if (m2) return m2[1];
  }

  // xhslink.com/{shortId}
  if (host.includes("xhslink.com")) {
    const m = path.match(/\/([A-Za-z0-9]+)/);
    if (m) return m[1];
  }

  throw new Error(`无法从 URL 中解析小红书笔记 ID: ${url}`);
}

// ---------------------------------------------------------------------------
// Content fetch (Playwright — Step 3)
// ---------------------------------------------------------------------------

async function fetchXiaohongshuData(
  _noteId: string,
): Promise<Record<string, any>> {
  // TODO [Step 3]: implement Playwright-based content extraction
  // 1. Launch headless browser with mobile viewport
  // 2. Navigate to note URL
  // 3. Wait for content to render
  // 4. Extract title, text, images, author, tags
  // 5. Close browser and return structured data

  throw new Error(
    `[未实现] 小红书抓取功能将在 Step 3 中实现。noteId=${_noteId}`
  );
}

// ---------------------------------------------------------------------------
// Content assembly
// ---------------------------------------------------------------------------

function parseXiaohongshuContent(
  _data: Record<string, any>,
  originalUrl: string,
): XiaohongshuContent {
  // TODO [Step 3]: parse extracted data into XiaohongshuContent
  return {
    platform: "xiaohongshu",
    title: "",
    author: "",
    date: "",
    text: "",
    images: [],
    videoUrl: null,
    tags: [],
    stats: { likes: 0, collects: 0, comments: 0 },
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
    const noteId = extractNoteId(url);
    const data = await fetchXiaohongshuData(noteId);
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

main();
