/**
 * Media transcript extractor
 * Usage: npx tsx extract-transcript.ts --media-url "<URL>" --output-dir "<dir>" --config <path> --referer "<url>"
 * Output: JSON to stdout
 */

import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createHash, createHmac } from "node:crypto";
import { readFileSync, writeFileSync, unlinkSync, existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ErrorCode, HandlerError } from "./types.js";
import { loadConfig, parseConfigArg } from "./config.js";
import type { LinkMindConfig } from "./config.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AsrResult {
  srt: string;      // SRT formatted subtitle content
  fullText: string; // plain text transcript (for deep summary)
}

export interface TranscriptOutput {
  srtPath: string;
  fullText: string;
}

// ---------------------------------------------------------------------------
// SRT time formatting
// ---------------------------------------------------------------------------

/**
 * Format milliseconds as SRT timestamp: HH:MM:SS,mmm
 */
export function formatSrtTime(ms: number): string {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1_000);
  const millis = ms % 1_000;
  return (
    String(h).padStart(2, "0") + ":" +
    String(m).padStart(2, "0") + ":" +
    String(s).padStart(2, "0") + "," +
    String(millis).padStart(3, "0")
  );
}

// ---------------------------------------------------------------------------
// iFlytek LFASR result parsing
// ---------------------------------------------------------------------------

interface LfasrWord {
  wb: number;  // word begin (10ms units)
  we: number;  // word end (10ms units)
  w: string;   // word text
}

/**
 * Parse iFlytek LFASR orderResult JSON string → SRT + fullText
 * Time unit in iFlytek response: 10ms (multiply × 10 to get ms)
 */
export function parseLfasrResult(orderResult: string): AsrResult {
  const data = JSON.parse(orderResult) as {
    lattice: Array<{ json_1best: string }>;
  };

  const entries: Array<{ start: number; end: number; text: string }> = [];

  for (const item of data.lattice ?? []) {
    const sentence = JSON.parse(item.json_1best) as {
      rt: Array<{ w: LfasrWord[] }>;
    };
    const words: LfasrWord[] = (sentence.rt ?? []).flatMap((rt) => rt.w ?? []);
    if (words.length === 0) continue;

    const start = words[0].wb * 10;
    const end = words[words.length - 1].we * 10;
    const text = words.map((w) => w.w).join("").trim();
    if (text) entries.push({ start, end, text });
  }

  if (entries.length === 0) return { srt: "", fullText: "" };

  const srt = entries
    .map(
      (e, i) =>
        `${i + 1}\n${formatSrtTime(e.start)} --> ${formatSrtTime(e.end)}\n${e.text}`,
    )
    .join("\n\n");

  const fullText = entries.map((e) => e.text).join(" ");

  return { srt, fullText };
}

// ---------------------------------------------------------------------------
// System dependency check
// ---------------------------------------------------------------------------

const INSTALL_HINTS: Record<string, string> = {
  "yt-dlp": "brew install yt-dlp  # 或: pip install yt-dlp",
  "ffmpeg": "brew install ffmpeg",
};

/**
 * Check if a system command exists in PATH.
 * Throws an error with depCode="DEPENDENCY" if not found.
 */
export function checkDependency(cmd: string): void {
  const result = spawnSync("which", [cmd], { encoding: "utf-8" });
  if (result.status !== 0) {
    const hint = INSTALL_HINTS[cmd] ?? `请安装 ${cmd}`;
    const err = new Error(`${cmd} 未找到，请运行: ${hint}`);
    (err as any).depCode = "DEPENDENCY";
    throw err;
  }
}
