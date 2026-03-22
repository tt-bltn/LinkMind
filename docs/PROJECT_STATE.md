# LinkMind — 项目状态 (PROJECT_STATE)

> 最后更新：2026-03-22

## 当前阶段：Step 6 — 视频 ASR 转写 🚧

## 阶段总览

| 阶段 | 内容 | 状态 |
|------|------|------|
| Step 1 | 搭骨架 — 目录结构、类型定义、SKILL.md、文档 | ✅ 已完成 |
| Step 2 | 跑通微博 — 实现 weibo.ts 完整抓取逻辑 | ✅ 已完成 |
| Step 3 | 加入小红书 — 实现 xiaohongshu.ts (Playwright) | ✅ 已完成 |
| Step 4 | 打磨体验 — AI 深度总结、图片下载至 Vault、错误处理优化 | ✅ 已完成 |
| Step 5 | 图片多模态 — 多模态模型分析图片内容、提取信息参与总结 | ✅ 已完成 |
| Step 6 | 视频 ASR — 视频音频提取、语音转写、SRT 生成、总结集成 | 🚧 进行中 |

---

## Step 1：搭骨架

**目标：** 建立项目基础结构，所有文件就位，骨架可执行。

| 任务 | 状态 |
|------|------|
| 创建根目录 package.json 和 .gitignore | ✅ |
| 创建 handlers/：package.json, tsconfig.json, types.ts | ✅ |
| 创建 weibo.ts 骨架（入口 + URL 解析 + TODO） | ✅ |
| 创建 xiaohongshu.ts 骨架（入口 + URL 解析 + TODO） | ✅ |
| 编写 SKILL.md（完整 AI 工作流指令） | ✅ |
| 创建 Markdown 模板 templates/note.md | ✅ |
| 创建 config.json 配置文件（Obsidian Vault 路径） | ✅ |
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
| 实现微博访客 cookie 自动获取 | ✅ |
| 端到端测试：真实微博链接 → JSON 输出（41 tests passed） | ✅ |

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
| 端到端测试：真实小红书链接 → JSON 输出（42 tests passed） | ✅ |

**技术要点：**

- 小红书反爬严格，headless 模式会被拦截。使用 headed 模式 (`headless: false`) 绕过检测
- 先访问首页获取会话 cookie（`a1`, `web_session` 等），再导航到笔记页面
- 数据提取优先从 `window.__INITIAL_STATE__`（Vue SSR 状态）中获取结构化 JSON
- DOM 选择器作为兜底方案
- 使用 string-based `page.evaluate` 避免 tsx/esbuild `__name` 装饰器泄漏到浏览器上下文
- Vue 响应式对象的循环引用通过 `WeakSet` + `safeClone` 处理

---

## Step 4：打磨体验 ✅

**目标：** 提升使用体验和内容质量。

| 任务 | 状态 |
|------|------|
| 错误处理和重试策略增强（retry.ts、错误分类） | ✅ |
| Cookie 配置支持（config.ts、config.json cookies 字段） | ✅ |
| 图片下载到 Obsidian Vault 的 LinkMind/attachments/（download-images.ts） | ✅ |
| AI 深度总结质量优化（SKILL.md 结构化提示词） | ✅ |
| README.md 更新 | ✅ |

**技术要点：**

- `retry.ts`：指数退避 + 抖动 (jitter)，区分可重试错误 (网络/5xx) 和不可重试错误 (4xx)
- `config.ts`：统一配置读取，支持 `cookies.weibo` / `cookies.xiaohongshu` 字段
- `download-images.ts`：并行下载 (并发 5)，Content-Type 自动推断扩展名，失败优雅降级到远程 URL
- `types.ts` 新增 `ErrorCode` 枚举，`HandlerError` 增加 `code` 和 `details` 字段
- SKILL.md 深度总结按内容类型分策略，包含叙述段落 + 关键要点格式

---

## Step 5：图片多模态内容提取 ✅

**目标：** 利用 AI Agent 的多模态能力分析已下载的图片，提取图片中的文字和视觉信息，将提取内容附加在笔记中每张图片后面，并将所有图片提取内容作为深度总结的补充输入。

| 任务 | 状态 |
|------|------|
| 文档更新（PRD / ARCH / PROJECT_STATE / SKILL.md / README） | ✅ |
| SKILL.md 新增 Step 2.6 图片多模态分析工作流 | ✅ |
| SKILL.md 更新 Markdown 模板 — 每张图片后增加提取内容 | ✅ |
| SKILL.md 更新深度总结指引 — 加入图片内容作为输入源 | ✅ |
| 更新 frontmatter 模板 — 新增 has_image_analysis 字段 | ✅ |
| 端到端测试：含多图微博链接 → 图片分析 → 内容附加在图片后 | ✅ |
| 端到端测试：含多图小红书链接 → 图片分析 → 深度总结包含图片信息 | ✅ |
| 端到端测试：图片下载失败时优雅跳过分析 | ✅ |

**技术要点：**

- AI Agent 的 Read 工具原生支持读取图片文件（JPEG/PNG/GIF/WebP），无需额外依赖或外部 API
- 图片在 Step 2.5 已下载到 Vault，Step 2.6 直接读取本地文件进行分析
- 对每张图片提取：可见文字（OCR）、关键视觉元素、与内容相关的信息
- 提取结果以 blockquote 形式附加在笔记中每张图片的 Markdown 引用之后
- 所有图片提取内容汇总后作为深度总结的补充输入（与原文文本、视频转写文本并列）
- 分析失败不阻断主流程：单张图片分析失败时标注失败提示，继续处理其他图片
- 完全在 SKILL.md 工作流中完成，无需独立的 handler 脚本

---

## Step 6：视频 ASR 转写 🚧

**目标：** 为含视频的微博/小红书笔记提取音频、语音转写为 SRT 字幕，转写文本参与 AI 深度总结。

| 任务 | 状态 |
|------|------|
| 文档更新（PRD / ARCH / PROJECT_STATE / SKILL.md / README） | 🚧 |
| 添加 ffmpeg-static 依赖 | ⬜ |
| 实现视频下载逻辑（fetch 下载到 os.tmpdir()） | ⬜ |
| 实现 ffmpeg 音频提取（视频 → WAV） | ⬜ |
| 实现科大讯飞 ASR 客户端（语音转写 LFASR：上传→轮询→获取结果） | ⬜ |
| 实现 OpenAI Whisper ASR 客户端（verbose_json 格式获取时间戳） | ⬜ |
| 实现 ASR 路由逻辑（优先讯飞→fallback OpenAI→均未配置则跳过） | ⬜ |
| 实现 SRT 生成器（时间戳 + 文本 → 标准 SRT 格式） | ⬜ |
| 组装 extract-transcript.ts CLI 入口（参数解析、流程串联、错误处理） | ⬜ |
| 更新 config.ts — 支持读取 asr 配置 | ⬜ |
| 更新 types.ts — 新增 TranscriptResult / ASR 相关类型 | ⬜ |
| 临时文件清理（处理完成后删除视频和音频文件） | ⬜ |
| SKILL.md 更新 — 新增 Step 2.7 视频转写工作流 | 🚧 |
| SKILL.md 更新 — Markdown 模板加入"视频转写"章节 | 🚧 |
| SKILL.md 更新 — 深度总结指引加入转写文本参考 | 🚧 |
| 端到端测试：含视频微博链接 → SRT 生成 → Markdown 含转写 | ⬜ |
| 端到端测试：含视频小红书链接 → SRT 生成 → Markdown 含转写 | ⬜ |
| 端到端测试：无 ASR 配置时正常跳过转写 | ⬜ |

**技术要点（规划）：**

- `ffmpeg-static`：npm 包提供平台对应的 ffmpeg 静态二进制，import 后即得到 ffmpeg 路径
- 科大讯飞语音转写 (LFASR)：WebSocket/HTTP 方式上传音频文件，轮询任务状态，获取带时间戳的分段结果
- OpenAI Whisper API：POST `/v1/audio/transcriptions`，`response_format=verbose_json` 获取 segments 时间戳
- SRT 格式：序号 + 时间轴 (`HH:MM:SS,mmm --> HH:MM:SS,mmm`) + 文本内容
- 临时文件使用 `os.tmpdir()` 存放，处理完成后只保留 `transcript.srt` 到 attachments
- ASR 失败不阻断主流程：SKILL.md 捕获错误后继续生成笔记，仅跳过转写章节

---

## 技术栈

- **语言：** TypeScript (ES2022, ESM)
- **运行器：** tsx
- **Node.js：** v25.2.1
- **微博抓取：** Node.js 内置 fetch + m.weibo.cn API
- **小红书抓取：** Playwright (Step 3 添加)
- **图片多模态分析：** AI Agent 内置多模态能力 (Step 5 添加)
- **音频提取：** ffmpeg-static (npm 包，Step 6 添加)
- **ASR 语音识别：** 科大讯飞语音转写 / OpenAI Whisper API (Step 6 添加)
- **字幕格式：** SRT
- **输出目标：** 用户 Obsidian Vault（通过 config.json 配置路径）
- **AI 集成：** SKILL.md (OpenClaw / Cursor / Claude Code 兼容)
