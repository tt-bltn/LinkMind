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
