# Video/Audio ASR 转写功能设计文档

> 创建日期：2026-04-04
> 对应项目阶段：Step 6 — 视频 ASR 转写

## 背景

LinkMind 已支持微博、小红书、微信公众号的文本和图片捕获。Step 6 目标是对包含视频/音频的帖子进行语音转文字（ASR），生成 SRT 字幕文件，并将转写文本融入深度总结。

考虑到后续扩展（小红书视频、哔哩哔哩、YouTube、小宇宙播客等），下载层采用通用设计。

## 范围

- 新增 `extract-transcript.ts` 脚本（一个文件）
- 修改 `SKILL.md`（Step 2.7 参数名）
- 修改 `package.json`（新增 npm scripts）
- 修改 `types.ts`（新增 DEPENDENCY 错误码）
- 更新 `docs/PROJECT_STATE.md`

## 设计决策

| 决策项 | 选择 | 理由 |
|--------|------|------|
| ffmpeg 获取方式 | 系统 ffmpeg（检测 PATH） | 极简依赖原则，ffmpeg 是系统级工具 |
| 视频下载工具 | yt-dlp 优先，fetch 兜底 | yt-dlp 支持 1000+ 平台（B站、YouTube、微博等）；fetch 处理直接 CDN URL（小宇宙等） |
| iFlytek API 类型 | 语音转写 LFASR（文件上传批处理） | 适合预录制视频，精度高，实现简洁 |
| ASR 路由 | 讯飞优先，OpenAI Whisper fallback | 两者均可选配，均未配置则报错提示 |
| 翻译处理 | AI 层（SKILL.md）负责 | 转写脚本输出原始语言，AI Agent 在生成深度总结时翻译为中文 |
| 架构模式 | 单文件脚本，JSON stdout | 与 weibo.ts / wechat.ts 保持同构 |

## 处理流程

```
CLI 参数解析（--media-url, --output-dir, --config, --referer）
    ↓
loadConfig() — 读取 ASR 凭据
    ↓
checkDependency("yt-dlp") + checkDependency("ffmpeg")
    ↓
downloadMedia(url, referer)
    ├── yt-dlp -x --audio-format mp3 → /tmp/linkmind-{hash}.mp3
    └── fallback: fetch 下载 → ffmpeg 提取音频（-vn -ar 16000 -ac 1 -f mp3）
    ↓
routeAsr(mp3Path, config)
    ├── 讯飞 LFASR：上传 → 轮询（3s间隔，最多10分钟）→ 解析结果
    └── fallback: OpenAI Whisper（response_format: srt）
    ↓
saveSrt(srtContent, outputDir) → transcript.srt
    ↓
finally: 删除临时文件（/tmp/linkmind-*）
    ↓
stdout: { srtPath, fullText }
```

## 接口规范

### CLI 参数

```bash
npx tsx skills/linkmind/scripts/extract-transcript.ts \
  --media-url "<URL>" \
  --output-dir "<attachments-dir>" \
  --config skills/linkmind/config.json \
  --referer "https://weibo.com"
```

### 成功输出

```json
{
  "srtPath": "transcript.srt",
  "fullText": "今天我们来聊一聊..."
}
```

### 失败输出

```json
{
  "error": "ffmpeg 未找到，请运行: brew install ffmpeg",
  "code": "DEPENDENCY"
}
```

## 内部模块结构

```typescript
checkDependency(cmd: string): void
// 检测系统命令是否可用，缺失则抛 DEPENDENCY 错误

downloadMedia(url: string, referer: string, tmpPath: string): Promise<void>
// yt-dlp 优先下载并转换为 mp3；失败则 fetch 下载原始文件 + ffmpeg 提取音频

transcribeIflytek(mp3Path: string, config: AsrConfig): Promise<AsrResult>
// 上传到讯飞 LFASR → 轮询 → 解析 JSON → 返回 { srt, fullText }

transcribeOpenai(mp3Path: string, config: AsrConfig): Promise<AsrResult>
// POST /audio/transcriptions，response_format=srt

routeAsr(mp3Path: string, config: LinkMindConfig): Promise<AsrResult>
// 路由：讯飞（若配置）→ OpenAI（若配置）→ 报错

parseLfasrResult(json: unknown): AsrResult
// 讯飞 JSON 结果 → SRT 格式 + fullText

main(): Promise<void>
// 串联以上步骤，try/finally 保证临时文件清理
```

## 内部类型

```typescript
interface AsrResult {
  srt: string;      // SRT 格式字幕内容
  fullText: string; // 转写纯文本（用于深度总结）
}
```

## 错误码

在 `types.ts` 现有 `ErrorCode` 中新增：

```typescript
| "DEPENDENCY"  // ffmpeg 或 yt-dlp 未安装
```

## 错误处理策略

| 场景 | code | 行为 |
|------|------|------|
| ffmpeg / yt-dlp 未安装 | DEPENDENCY | 输出安装命令提示 |
| 视频下载失败 | NETWORK | yt-dlp 和 fetch 均失败 |
| ASR 未配置 | AUTH | 提示用户配置 .env |
| 讯飞鉴权失败 | AUTH | fallback 到 OpenAI |
| ASR 轮询超时（>10分钟） | NETWORK | 提示重试 |
| 音频超出大小限制 | UNKNOWN | 说明限制并提示 |

## SRT 格式示例

```srt
1
00:00:00,000 --> 00:00:05,320
今天我们来聊一聊...

2
00:00:05,320 --> 00:00:10,840
这个话题非常有意思
```

## 测试计划

### 单元测试（`test-transcript.ts`，默认运行）

- `parseLfasrResult` — 讯飞 JSON → SRT 格式正确
- SRT 时间戳格式化（毫秒 → `HH:MM:SS,mmm`）
- `checkDependency` 缺失时抛出正确错误码
- ASR 路由：仅讯飞配置时不调用 OpenAI
- ASR 路由：讯飞失败时 fallback 到 OpenAI

### 端到端测试（`--e2e`，需真实凭据）

- 真实微博视频 URL → SRT 文件生成 + fullText 非空

## 修改文件清单

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `skills/linkmind/scripts/extract-transcript.ts` | 新增 | 核心实现，~300 行 |
| `skills/linkmind/scripts/test-transcript.ts` | 新增 | 单元测试 + E2E 测试 |
| `skills/linkmind/scripts/types.ts` | 修改 | 新增 `DEPENDENCY` 错误码 |
| `skills/linkmind/scripts/package.json` | 修改 | 新增 transcript / test:transcript scripts |
| `skills/linkmind/SKILL.md` | 修改 | Step 2.7: --video-url → --media-url；补充多语言翻译说明 |
| `docs/PROJECT_STATE.md` | 修改 | Step 6 任务状态更新 |
