# LinkMind — 项目状态 (PROJECT_STATE)

> 最后更新：2026-03-22

## 当前阶段：Step 7 — 分发与安装 ✅

## 阶段总览

| 阶段 | 内容 | 状态 |
|------|------|------|
| Step 1 | 搭骨架 — 目录结构、类型定义、SKILL.md、文档 | ✅ 已完成 |
| Step 2 | 跑通微博 — 实现 weibo.ts 完整抓取逻辑 | ✅ 已完成 |
| Step 3 | 加入小红书 — 实现 xiaohongshu.ts (Playwright) | ✅ 已完成 |
| Step 4 | 打磨体验 — AI 总结、图片下载、错误处理优化 | ✅ 已完成 |
| Step 5 | 图片多模态 — AI 视觉分析图片、提取内容用于总结 | ✅ 已完成 |
| Step 6 | 视频 ASR — 音频提取、语音转文字 (讯飞/Whisper)、SRT 生成 | 🔧 进行中 |
| Step 7 | 分发与安装 — OpenClaw/ClawHub/Claude Code 多渠道分发、Chrome CDP 替代 Playwright | ✅ 已完成 |

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

## Step 6：视频 ASR 转写（进行中）

**目标：** 视频帖子提取音频 → ASR 语音识别 → 生成 SRT 字幕文件，转写文本参与深度总结。

| 任务 | 状态 |
|------|------|
| 实现 extract-transcript.ts 脚本 | ⬜ |
| ffmpeg 音频提取集成 | ⬜ |
| 科大讯飞 LFASR 语音转写集成 | ⬜ |
| OpenAI Whisper API 集成 | ⬜ |
| ASR 服务路由逻辑（优先讯飞、fallback OpenAI） | ⬜ |
| SRT 字幕文件生成 | ⬜ |
| SKILL.md 添加 Step 2.7 视频转写指令 | ⬜ |
| 临时文件清理（只保留 SRT） | ⬜ |
| 端到端测试：含视频的微博/小红书链接 → SRT + 笔记 | ⬜ |

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

## 技术栈

- **语言：** TypeScript (ES2022, ESM)
- **运行器：** tsx
- **Node.js：** >= 22
- **微博抓取：** Node.js 内置 fetch + m.weibo.cn API
- **小红书抓取：** Chrome DevTools Protocol (CDP)，复用系统 Chrome
- **图片分析：** AI Agent 多模态能力（零外部依赖）
- **音频提取：** ffmpeg-static (npm)
- **ASR：** 科大讯飞 LFASR / OpenAI Whisper
- **AI 集成：** SKILL.md (OpenClaw / Cursor / Claude Code 兼容)
- **分发渠道：** OpenClaw CLI / ClawHub Registry / Claude Code Plugin
