/**
 * extract-transcript tests
 * Usage: npx tsx test-transcript.ts [--e2e]
 */

import {
  formatSrtTime,
  parseLfasrResult,
} from "./extract-transcript.js";

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
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) {
    label += ` (got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)})`;
  }
  assert(ok, label);
}

// ---------------------------------------------------------------------------
// Unit: formatSrtTime
// ---------------------------------------------------------------------------

function testFormatSrtTime(): void {
  console.log("\n[formatSrtTime]");
  assertEqual(formatSrtTime(0),        "00:00:00,000", "0ms → 00:00:00,000");
  assertEqual(formatSrtTime(1000),     "00:00:01,000", "1000ms → 00:00:01,000");
  assertEqual(formatSrtTime(61500),    "00:01:01,500", "61500ms → 00:01:01,500");
  assertEqual(formatSrtTime(3661250),  "01:01:01,250", "3661250ms → 01:01:01,250");
  assertEqual(formatSrtTime(5320),     "00:00:05,320", "5320ms → 00:00:05,320");
}

// ---------------------------------------------------------------------------
// Unit: parseLfasrResult
// ---------------------------------------------------------------------------

function testParseLfasrResult(): void {
  console.log("\n[parseLfasrResult]");

  // iFlytek LFASR orderResult format: JSON string with lattice array
  // Time unit: 10ms (multiply × 10 to get ms)
  const orderResult = JSON.stringify({
    lattice: [
      {
        json_1best: JSON.stringify({
          rt: [{ w: [
            { wb: 0,   we: 200,  w: "今天" },
            { wb: 200, we: 532,  w: "我们来聊" },
          ] }],
        }),
      },
      {
        json_1best: JSON.stringify({
          rt: [{ w: [
            { wb: 600,  we: 800,  w: "这个话题" },
            { wb: 800,  we: 1084, w: "很有意思" },
          ] }],
        }),
      },
    ],
  });

  const result = parseLfasrResult(orderResult);

  assert(result.srt.includes("00:00:00,000 --> 00:00:05,320"), "第一句时间戳正确");
  assert(result.srt.includes("今天我们来聊"), "第一句文本正确");
  assert(result.srt.includes("00:00:06,000 --> 00:00:10,840"), "第二句时间戳正确");
  assert(result.srt.includes("这个话题很有意思"), "第二句文本正确");
  assert(result.srt.startsWith("1\n"), "SRT 从序号 1 开始");
  assert(result.fullText.includes("今天我们来聊"), "fullText 包含第一句");
  assert(result.fullText.includes("这个话题很有意思"), "fullText 包含第二句");

  // Empty lattice
  const emptyResult = parseLfasrResult(JSON.stringify({ lattice: [] }));
  assertEqual(emptyResult.srt, "", "空 lattice → 空 SRT");
  assertEqual(emptyResult.fullText, "", "空 lattice → 空 fullText");
}

// ---------------------------------------------------------------------------
// Run all unit tests
// ---------------------------------------------------------------------------

const isE2E = process.argv.includes("--e2e");

testFormatSrtTime();
testParseLfasrResult();

// E2E tests defined in Task 9

if (!isE2E) {
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}
