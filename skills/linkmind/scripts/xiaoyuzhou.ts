/**
 * Xiaoyuzhou (小宇宙) podcast handler
 * Usage: npx tsx xiaoyuzhou.ts "<url>" --config skills/linkmind/config.json
 * Output: JSON to stdout
 */

import { fileURLToPath } from "node:url";
import type { XiaoyuzhouContent, HandlerError, ErrorCode } from "./types.js";
import { withRetry, isRetryableError } from "./retry.js"; // used in later tasks
import { loadConfig, parseConfigArg } from "./config.js"; // used in later tasks

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
  const idMatch = url.match(/\/episode\/([\w]+)/i);
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

// ---------------------------------------------------------------------------
// Web page scraping (no auth needed)
// ---------------------------------------------------------------------------

const WEB_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";
const APP_UA = "Xiaoyuzhou/2.105.1 (build:3386; iOS 26.4.0)";
const API_BASE = "https://api.xiaoyuzhoufm.com";

interface XyzPageEpisode {
  eid: string;
  title: string;
  pubDate: string;
  description: string;
  shownotes: string;
  duration: number;
  enclosure: { url: string };
  transcriptMediaId?: string | null;
  podcast: {
    title: string;
    author: string;
    image: { picUrl: string };
  };
}

/**
 * Fetch episode metadata by scraping the web page __NEXT_DATA__ JSON.
 * No authentication required.
 */
async function fetchEpisodePage(episodeId: string): Promise<XyzPageEpisode> {
  const url = `https://www.xiaoyuzhoufm.com/episode/${episodeId}`;
  const resp = await withRetry(
    () => fetch(url, { headers: { "User-Agent": WEB_UA } }),
    { shouldRetry: isRetryableError },
  );
  if (!resp.ok) {
    throw Object.assign(
      new Error(`小宇宙页面请求失败: HTTP ${resp.status}`),
      { httpStatus: resp.status },
    );
  }
  const html = await resp.text();
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) {
    throw new Error("无法从页面提取 __NEXT_DATA__，页面结构可能已变更");
  }
  const data = JSON.parse(m[1]) as {
    props: { pageProps: { episode: XyzPageEpisode } };
  };
  const ep = data?.props?.pageProps?.episode;
  if (!ep?.eid) {
    throw new Error("__NEXT_DATA__ 中未找到 episode 数据");
  }
  return ep;
}

/**
 * Fetch transcript URL from Xiaoyuzhou API.
 * Requires x-jike-access-token. Returns null if not configured or not available.
 */
async function fetchTranscriptUrl(
  eid: string,
  mediaId: string,
  token: string,
): Promise<string | null> {
  try {
    const resp = await fetch(`${API_BASE}/v1/episode-transcript/get`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": APP_UA,
        "x-jike-access-token": token,
      },
      body: JSON.stringify({ eid, mediaId }),
    });
    if (!resp.ok) return null;
    const json = await resp.json() as { data?: { transcriptUrl?: string } };
    return json?.data?.transcriptUrl ?? null;
  } catch (e) {
    process.stderr.write(`[linkmind] 字幕 URL 获取失败（不影响主流程）: ${(e as Error).message}\n`);
    return null;
  }
}

/**
 * Fetch complete episode data for Xiaoyuzhou platform.
 * Scrapes web page for metadata, optionally fetches transcript URL.
 */
export async function fetchEpisodeData(
  episodeId: string,
  timestampSeconds: number | null,
  token: string | undefined,
): Promise<XiaoyuzhouContent> {
  const ep = await fetchEpisodePage(episodeId);

  const date = ep.pubDate
    ? new Date(ep.pubDate).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  // Fetch transcript URL if token is configured and mediaId is available
  let subtitleUrl: string | null = null;
  if (token && ep.transcriptMediaId) {
    subtitleUrl = await fetchTranscriptUrl(ep.eid, ep.transcriptMediaId, token);
  }

  return {
    platform: "xiaoyuzhou",
    episodeId: ep.eid,
    title: ep.title ?? "",
    podcast: ep.podcast?.title ?? "",
    author: ep.podcast?.author ?? ep.podcast?.title ?? "",
    date,
    description: ep.description ?? "",
    text: ep.description ?? "",
    images: ep.podcast?.image?.picUrl ? [ep.podcast.image.picUrl] : [],
    videoUrl: null,
    audioUrl: ep.enclosure?.url ?? "",
    durationSeconds: ep.duration ?? 0,
    timestampSeconds,
    subtitleUrl,
    originalUrl: `https://www.xiaoyuzhoufm.com/episode/${episodeId}`,
    fetchedAt: new Date().toISOString(),
  } as XiaoyuzhouContent;
}
