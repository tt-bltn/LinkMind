# LinkMind — 项目状态 (PROJECT_STATE)

> 最后更新：2026-03-22

## 当前阶段：Step 1 — 搭骨架 ✅

## 阶段总览

| 阶段 | 内容 | 状态 |
|------|------|------|
| Step 1 | 搭骨架 — 目录结构、类型定义、SKILL.md、文档 | ✅ 已完成 |
| Step 2 | 跑通微博 — 实现 weibo.ts 完整抓取逻辑 | ⬜ 待开始 |
| Step 3 | 加入小红书 — 实现 xiaohongshu.ts (Playwright) | ⬜ 待开始 |
| Step 4 | 打磨体验 — AI 总结、图片下载、错误处理优化 | ⬜ 待开始 |

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
| 创建 captures/ 输出目录 | ✅ |
| 编写 PRD.md 需求文档 | ✅ |
| 编写 ARCH.md 架构文档 | ✅ |
| 编写 PROJECT_STATE.md 项目状态文档 | ✅ |
| npm install 安装依赖 | ✅ |
| 验证骨架可执行 | ✅ |

---

## Step 2：跑通微博（待开始）

**目标：** 完整实现 weibo.ts，能抓取真实微博链接并生成 Markdown 文件。

| 任务 | 状态 |
|------|------|
| 实现 fetchWeiboData — 调用 m.weibo.cn API | ⬜ |
| 实现 parseWeiboContent — 解析 JSON 响应 | ⬜ |
| 实现 HTML 清洗（stripHtml） | ⬜ |
| 处理转发微博（retweeted_status） | ⬜ |
| 处理视频微博（page_info.urls） | ⬜ |
| 处理短链接重定向（t.cn） | ⬜ |
| 端到端测试：真实微博链接 → Markdown 文件 | ⬜ |

---

## Step 3：加入小红书（待开始）

**目标：** 集成 Playwright，实现 xiaohongshu.ts 完整抓取。

| 任务 | 状态 |
|------|------|
| 添加 playwright 依赖 | ⬜ |
| 实现浏览器启动和页面导航 | ⬜ |
| 实现内容提取（标题、正文、图片、标签） | ⬜ |
| 处理 xhslink.com 短链接 | ⬜ |
| 处理视频笔记 | ⬜ |
| Stealth 模式 / 反爬对策 | ⬜ |
| 端到端测试：真实小红书链接 → Markdown 文件 | ⬜ |

---

## Step 4：打磨体验（待开始）

**目标：** 提升使用体验和内容质量。

| 任务 | 状态 |
|------|------|
| AI 总结质量优化（在 SKILL.md 中改进提示词） | ⬜ |
| 图片下载到本地 captures/images/ | ⬜ |
| Cookie 配置支持 | ⬜ |
| 错误处理和重试策略增强 | ⬜ |
| README.md 编写 | ⬜ |

---

## 技术栈

- **语言：** TypeScript (ES2022, ESM)
- **运行器：** tsx
- **Node.js：** v25.2.1
- **微博抓取：** Node.js 内置 fetch + m.weibo.cn API
- **小红书抓取：** Playwright (Step 3 添加)
- **AI 集成：** SKILL.md (OpenClaw / Cursor / Claude Code 兼容)
