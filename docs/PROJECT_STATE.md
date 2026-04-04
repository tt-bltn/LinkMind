# LinkMind — 项目状态 (PROJECT_STATE)

> 最后更新：2026-04-04

## 当前阶段：Step 9 完成 — 小宇宙播客支持 ✅

## 阶段总览

| 阶段 | 内容 | 状态 |
|------|------|------|
| Step 1 | 搭骨架 — 目录结构、类型定义、SKILL.md、文档 | ✅ 已完成 |
| Step 2 | 跑通微博 — 实现 weibo.ts 完整抓取逻辑 | ✅ 已完成 |
| Step 3 | 加入小红书 — 实现 xiaohongshu.ts (Playwright) | ✅ 已完成 |
| Step 4 | 打磨体验 — AI 总结、图片下载、错误处理优化 | ✅ 已完成 |
| Step 5 | 图片多模态 — AI 视觉分析图片、提取内容用于总结 | ✅ 已完成 |
| Step 6 | 视频/音频 ASR — yt-dlp 下载、讯飞 LFASR/Whisper 转写、SRT 生成 | ✅ 已完成 |
| Step 7 | 分发与安装 — OpenClaw/ClawHub/Claude Code 多渠道分发、Chrome CDP 替代 Playwright | ✅ 已完成 |
| Step 8 | 微信公众号 — 实现 wechat.ts，HTTP fetch + Chrome CDP 双路径抓取 | ✅ 已完成 |
| Step 9 | 小宇宙播客 — 实现 xiaoyuzhou.ts，平台字幕 + ASR 降级 + 时间打点 | ✅ 已完成 |

---

## Step 1：搭骨架 ✅

**目标：** 建立项目基础结构，所有文件就位，骨架可执行。

| 任务 | 状态 |
|------|------|
| 创建根目录 package.json 和 .gitignore | ✅ |
| 创建 handlers/：package.json, tsconfig.json, types.ts | ✅ |
| 创建 weibo.ts 骨架（入口 + URL 解析 + TODO） | ✅ |
| 创建 xiaohongshu.ts 骨架（入口 + URL 解析 + TODO） | ✅ |
| 编写 SKILL.md（完整 AI 工作流指令） | ✅ |
| 创建 Markdown 模板 templates/note.md | ✅ |
| 创建 captures/ 输出目录 | ✅ |
| 编写 PRD.md 需求文档 | ✅ |
| 编写 ARCH.md 架构文档 | ✅ |
| 编写 PROJECT_STATE.md 项目状态文档 | ✅ |
| npm install 安装依赖 | ✅ |
| 验证骨架可执行 | ✅ |

---

## Step 2：跑通微博 ✅

**目标：** 完整实现 weibo.ts，能抓取真实微博链接并生成 Markdown 文件。

| 任务 | 状态 |
|------|------|
| 实现 fetchWeiboData — 调用 m.weibo.cn API | ✅ |
| 实现 parseWeiboContent — 解析 JSON 响应 | ✅ |
| 实现 HTML 清洗（stripHtml） | ✅ |
| 处理转发微博（retweeted_status） | ✅ |
| 处理视频微博（page_info.urls） | ✅ |
| 处理短链接重定向（t.cn） | ✅ |
| 端到端测试：真实微博链接 → Markdown 文件 | ✅ |

---

## Step 3：加入小红书 ✅

**目标：** 集成 Playwright，实现 xiaohongshu.ts 完整抓取。

| 任务 | 状态 |
|------|------|
| 添加 playwright 依赖 | ✅ |
| 实现浏览器启动和页面导航 | ✅ |
| 实现内容提取（标题、正文、图片、标签） | ✅ |
| 处理 xhslink.com 短链接 | ✅ |
| 处理视频笔记 | ✅ |
| Stealth 模式 / 反爬对策 | ✅ |
| 端到端测试：真实小红书链接 → Markdown 文件 | ✅ |

---

## Step 4：打磨体验 ✅

**目标：** 提升使用体验和内容质量。

| 任务 | 状态 |
|------|------|
| AI 总结质量优化（在 SKILL.md 中改进提示词） | ✅ |
| 图片下载到本地 Obsidian Vault 附件目录 | ✅ |
| Cookie 配置支持 | ✅ |
| 错误处理和重试策略增强 | ✅ |
| README.md 编写 | ✅ |

---

## Step 5：图片多模态 ✅

**目标：** AI Agent 利用多模态能力分析已下载的图片，提取文字和视觉信息，融入深度总结。

| 任务 | 状态 |
|------|------|
| SKILL.md 添加 Step 2.6 图片分析指令 | ✅ |
| AI 逐张读取图片并提取 OCR 文字和视觉信息 | ✅ |
| 分析结果以 blockquote 附加在笔记中每张图片后 | ✅ |
| 图片分析内容作为深度总结的补充输入 | ✅ |
| 单张图片分析失败不阻断整体流程 | ✅ |

---

## Step 6：视频 ASR 转写 ✅

**目标：** 媒体（视频/音频）提取音频 → ASR 语音识别 → 生成 SRT 字幕文件，转写文本参与深度总结。

| 任务 | 状态 |
|------|------|
| 实现 extract-transcript.ts 脚本 | ✅ |
| yt-dlp 媒体下载（优先）+ fetch 兜底 | ✅ |
| 科大讯飞 LFASR 语音转写集成 | ✅ |
| OpenAI Whisper API 集成 | ✅ |
| ASR 服务路由逻辑（优先讯飞、fallback OpenAI） | ✅ |
| SRT 字幕文件生成 | ✅ |
| SKILL.md 更新 Step 2.7（--media-url，多语言说明） | ✅ |
| 临时文件清理（try/finally） | ✅ |
| 端到端测试骨架（test-transcript.ts） | ✅ |

---

## Step 7：分发与安装 ✅

**目标：** 让用户通过命令行一键安装 LinkMind skill 到自己的 AI Agent 环境（OpenClaw、Claude Code、Cursor 等），消除 Playwright 重依赖，对齐 OpenClaw 生态规范。

### 7.1 多渠道分发

| 任务 | 状态 |
|------|------|
| SKILL.md frontmatter 添加 `metadata.openclaw` 字段 | ✅ |
| 添加 `.claude-plugin/plugin.json` 标准插件清单 | ✅ |
| 支持 `/plugin install` GitHub URL 直接安装（Claude Code） | ✅ |
| 支持 OpenClaw 手动安装（clone → 复制到 `~/.openclaw/skills/`） | ✅ |
| 支持 `clawhub install linkmind-capture`（ClawHub Registry 单独安装） | ✅ |
| 添加 ClawHub 发布脚本（`npm run clawhub:publish`） | ✅ |

### 7.2 Skill 目录自包含化

| 任务 | 状态 |
|------|------|
| `handlers/` 重命名为 `scripts/`（对齐 OpenClaw 约定） | ✅ |
| 确保 `skills/linkmind/` 目录可独立分发（无外部依赖） | ✅ |
| `config.json` 改为 `config.template.json`（模板，不含真实值） | ✅ |
| `.gitignore` 排除 `skills/linkmind/config.json` | ✅ |

### 7.3 Chrome CDP 替代 Playwright（小红书）

| 任务 | 状态 |
|------|------|
| 实现 Chrome CDP 工具模块 `chrome-cdp.ts`（查找系统 Chrome、启动 CDP 连接） | ✅ |
| 用 `Runtime.evaluate` 替代 `page.evaluate` 提取 `__INITIAL_STATE__` | ✅ |
| 用 `Page.addScriptToEvaluateOnNewDocument` 替代 `addInitScript` 反检测注入 | ✅ |
| 用 `Input.dispatchMouseEvent` 替代 `page.mouse.move` 鼠标模拟 | ✅ |
| xiaohongshu.ts 从 Playwright 迁移到 Chrome CDP | ✅ |
| 移除 Playwright 依赖（消除 ~200MB Chromium 下载） | ✅ |
| 单元测试通过（32/32） | ✅ |

### 7.4 运行时与配置优化

| 任务 | 状态 |
|------|------|
| 敏感配置（cookies、ASR 密钥）迁移到 `.env` 文件 | ✅ |
| 支持项目级和用户级配置优先级（`.env` > `config.json`） | ✅ |
| `config.ts` 自带 `.env` 解析（零外部依赖） | ✅ |
| SKILL.md 拆分：深度总结指南移到 `references/deep-summary-guide.md` | ✅ |

---

## Step 8：微信公众号支持 ✅

**目标：** 实现微信公众号文章抓取，支持 HTTP 直取和 Chrome CDP 双路径，提取正文、图片、阅读/点赞/在看数据。

| 任务 | 状态 |
|------|------|
| 实现 `wechat.ts` handler | ✅ |
| HTTP fetch 路径（直接请求 mp.weixin.qq.com） | ✅ |
| Chrome CDP fallback（应对反爬限制） | ✅ |
| URL 校验（支持 `/s/<id>` 短路径和 `/s?__biz=...` 长路径） | ✅ |
| HTML 变量提取（`var msg_title`, `var ct` 等）| ✅ |
| 正文清洗（HTML → 纯文本）| ✅ |
| 文章图片提取（`data-src` / `src`，过滤 UI 资源域名）| ✅ |
| 统计数据提取（阅读数、点赞数、在看数，可选 cookie）| ✅ |
| `WechatContent` 类型定义（含 `accountName`、`digest`、`coverImage` 等）| ✅ |
| SKILL.md 添加 `mp.weixin.qq.com` 平台识别和 `wechat.ts` 调用指令 | ✅ |
| 单元测试（`test-wechat.ts`）| ✅ |
| E2E 测试支持（`npm run test:wechat:e2e`）| ✅ |

---

---

## Step 9：小宇宙播客支持 ✅

**目标：** 实现小宇宙播客抓取，支持剧集元数据提取、平台字幕下载、ASR 音频转写降级、时间打点窗口过滤。

| 任务 | 状态 |
|------|------|
| 实现 `xiaoyuzhou.ts` handler | ✅ |
| 短链接解析（`xyzfm.link/s/xxx`），`redirect: "manual"` 保留 `#ts=` 片段 | ✅ |
| 剧集元数据提取（`__NEXT_DATA__` scraping，无需鉴权） | ✅ |
| 平台字幕下载（`POST /v1/episode-transcript/get`，`x-jike-access-token` JWT） | ✅ |
| 时间打点时间窗口过滤（±2 分钟，`subtitleEntries` 过滤） | ✅ |
| ASR 音频降级（`audioUrl` + `--start`/`--end` 时间参数） | ✅ |
| `extract-transcript.ts` 扩展 `--start`/`--end` 参数（`parseTimeArg`，yt-dlp `--download-sections`，ffmpeg `-ss`/`-to`） | ✅ |
| SKILL.md Steps 2.A（字幕下载）、2.B（时间过滤）、2.C（ASR 降级）、字幕摘录区块、金句摘录 | ✅ |
| `XiaoyuzhouContent` 类型定义（`podcast`、`episodeId`、`durationSeconds`、`timestampSeconds`、`subtitleUrl`、`audioUrl`） | ✅ |
| `.env.example` 添加 `LINKMIND_XIAOYUZHOU_TOKEN` | ✅ |
| 25 个单元测试（`npm run test:xiaoyuzhou`） | ✅ |
| Bug fix：`resolveShortLink` 改用 `redirect: "manual"` 保留 URL 片段 | ✅ |

---

## 技术栈

- **语言：** TypeScript (ES2022, ESM)
- **运行器：** tsx
- **Node.js：** >= 22
- **微博抓取：** Node.js 内置 fetch + m.weibo.cn API
- **小红书抓取：** Chrome DevTools Protocol (CDP)，复用系统 Chrome
- **微信抓取：** Node.js 内置 fetch（HTTP 路径）+ Chrome CDP fallback
- **图片分析：** AI Agent 多模态能力（零外部依赖）
- **音频提取：** ffmpeg-static (npm)
- **ASR：** 科大讯飞 LFASR / OpenAI Whisper
- **AI 集成：** SKILL.md (OpenClaw / Cursor / Claude Code 兼容)
- **分发渠道：** OpenClaw CLI / ClawHub Registry / Claude Code Plugin
