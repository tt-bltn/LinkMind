/**
 * Xiaoyuzhou handler tests
 * Usage: npx tsx test-xiaoyuzhou.ts [--e2e]
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { parseEpisodeUrl } from "./xiaoyuzhou.js";

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
// Unit: parseEpisodeUrl
// ---------------------------------------------------------------------------

function testParseEpisodeUrl(): void {
  console.log("\n[parseEpisodeUrl]");

  // 带时间戳的完整链接（#ts 在 ? 前）
  const r1 = parseEpisodeUrl(
    "https://www.xiaoyuzhoufm.com/episode/69b4d2f9f8b8079bfa3ae7f2#ts=1023?s=eyJ1IjoiNWY"
  );
  assertEqual(r1.episodeId, "69b4d2f9f8b8079bfa3ae7f2", "提取 episodeId");
  assertEqual(r1.timestampSeconds, 1023, "提取 timestampSeconds=1023");

  // 不带时间戳
  const r2 = parseEpisodeUrl(
    "https://www.xiaoyuzhoufm.com/episode/abc123"
  );
  assertEqual(r2.episodeId, "abc123", "不带时间戳时提取 episodeId");
  assertEqual(r2.timestampSeconds, null, "不带时间戳时 timestampSeconds 为 null");

  // ts=0 边界情况
  const r3 = parseEpisodeUrl(
    "https://www.xiaoyuzhoufm.com/episode/xyz#ts=0"
  );
  assertEqual(r3.timestampSeconds, 0, "ts=0 解析为 0（非 null）");

  // 非小宇宙链接抛错
  let threw = false;
  try {
    parseEpisodeUrl("https://weibo.com/foo");
  } catch {
    threw = true;
  }
  assert(threw, "非小宇宙链接抛出错误");
}

// ---------------------------------------------------------------------------
// E2E: Full handler pipeline
// ---------------------------------------------------------------------------

async function testE2E(): Promise<void> {
  console.log("\n[E2E] 运行小宇宙处理器...");

  const testUrl = "https://xyzfm.link/s/Qlkr7p";

  try {
    const { stdout } = await exec(
      "npx",
      ["tsx", "xiaoyuzhou.ts", testUrl, "--config", "../config.json"],
      { cwd: import.meta.dirname, timeout: 30_000 },
    );

    let result: Record<string, any>;
    try {
      result = JSON.parse(stdout);
    } catch {
      assert(false, "stdout 是合法 JSON");
      console.log("  Raw stdout:", stdout.slice(0, 300));
      return;
    }

    if (result.error) {
      console.log(`  ⚠ 处理器错误: ${result.error} (code: ${result.code})`);
      if (result.code === "NETWORK" || result.code === "AUTH") {
        console.log("  → 跳过 E2E 断言（网络/认证问题）");
        return;
      }
      assert(false, `处理器成功返回内容`);
      return;
    }

    assert(true, "stdout 是合法 JSON");
    assertEqual(result.platform, "xiaoyuzhou", "platform 为 xiaoyuzhou");
    assert(typeof result.episodeId === "string" && result.episodeId.length > 0, "episodeId 非空");
    assert(typeof result.title === "string" && result.title.length > 0, "title 非空");
    assert(typeof result.podcast === "string" && result.podcast.length > 0, "podcast 非空");
    assert(typeof result.audioUrl === "string" && result.audioUrl.startsWith("http"), "audioUrl 是 HTTP URL");
    assert(typeof result.durationSeconds === "number" && result.durationSeconds > 0, "durationSeconds > 0");
    assertEqual(result.timestampSeconds, 1023, "timestampSeconds=1023（17:03）");
    console.log(`  → Title: ${result.title}`);
    console.log(`  → Podcast: ${result.podcast}`);
    console.log(`  → Duration: ${result.durationSeconds}s`);
    console.log(`  → SubtitleUrl: ${result.subtitleUrl ?? "(none)"}`);
  } catch (e: any) {
    assert(false, `处理器正常执行（${e.message}）`);
  }
}

async function run(): Promise<void> {
  const runE2E = process.argv.includes("--e2e");

  console.log("=== Xiaoyuzhou Handler Tests ===");

  testParseEpisodeUrl();

  if (runE2E) {
    await testE2E();
  } else {
    console.log("\n[E2E] Skipped (pass --e2e to run)");
  }

  console.log(`\n--- Results: ${passed} passed, ${failed} failed ---`);
  if (failed > 0) process.exit(1);
}

run();
