# LinkMind

[English](README.md) | 中文

AI Agent Skill，将社交媒体内容抓取到你的 Obsidian 知识库中，生成结构化的 Markdown 笔记。给它一个链接，即可获得包含标题、作者、日期、原文内容和 AI 深度总结的笔记 —— 直接保存到你的 Obsidian 知识库。

## 工作原理

对你的 AI Agent 说：

```
让我记录 https://weibo.com/1234567890/AbCdEfG
```

LinkMind 会：

1. 从 `skills/linkmind/config.json` 读取你的 Obsidian 知识库路径
2. 识别链接所属平台
3. 运行 TypeScript 脚本提取内容（文字、图片、元数据）
4. 下载图片并用 AI 视觉能力逐张分析（提取文字、视觉信息）
5. 生成带有 YAML frontmatter、AI 深度总结和图片分析的 Markdown 文件
6. 保存到 `{你的知识库}/LinkMind/` —— 可直接在 Obsidian 中浏览

## 支持平台

| 平台 | URL 模式 | 抓取方式 |
|------|---------|---------|
| 微博 | `weibo.com`, `m.weibo.cn` | 移动端 API (`m.weibo.cn`) |
| 小红书 | `xiaohongshu.com`, `xhslink.com` | Chrome DevTools Protocol (CDP) |

## 项目结构

```
LinkMind/
├── skills/linkmind/           # 可独立分发的 skill 目录
│   ├── SKILL.md               # AI 工作流指令（含 OpenClaw 元数据）
│   ├── config.template.json   # 配置模板（复制为 config.json 使用）
│   ├── scripts/
│   │   ├── types.ts           # 共享类型定义
│   │   ├── setup.ts           # 交互式配置向导
    │   │   ├── config.ts          # 配置读取器（.env + config.json）
    │   │   ├── retry.ts           # 指数退避重试
│   │   ├── chrome-cdp.ts      # Chrome DevTools Protocol 客户端
│   │   ├── download-images.ts # 图片下载器
│   │   ├── extract-transcript.ts # 视频 ASR 转写
│   │   ├── weibo.ts           # 微博内容提取器
│   │   └── xiaohongshu.ts     # 小红书内容提取器 (CDP)
│   ├── references/
│   │   └── deep-summary-guide.md
│   └── templates/
│       └── note.md            # Markdown 输出模板
├── .claude-plugin/
│   ├── plugin.json            # Claude Code 插件清单
│   └── marketplace.json       # Claude Code marketplace 目录
├── CHANGELOG.md
└── docs/
    ├── PRD.md                 # 产品需求文档
    ├── ARCH.md                # 架构与数据流图
    └── PROJECT_STATE.md       # 开发进度追踪
```

笔记保存到你的 Obsidian 知识库：

```
{你的知识库}/
└── LinkMind/                          # 由 skill 自动创建
    ├── 2026-03-22-xxx.md
    └── attachments/
        └── 2026-03-22-xxx/            # 每篇笔记一个子目录
            ├── img-001.jpg
            ├── img-002.png
            └── transcript.srt         # 视频转写字幕（需配置 ASR）
```

## 功能特性

- **多平台抓取** — 微博（移动端 API）和小红书（Chrome CDP）
- **AI 深度总结** — 结构化总结，含关键要点，按内容类型定制
- **图片下载** — 图片保存到知识库的 `LinkMind/attachments/` 目录，支持完全离线访问
- **图片多模态分析** — AI 读取每张下载的图片，提取可见文字（OCR）和关键视觉信息，分析结果附加在笔记中每张图片后，并融入深度总结
- **视频 ASR 转写** — 从视频中提取音频，通过讯飞或 OpenAI Whisper 转写，保存为 SRT 字幕；转写文本用于 AI 总结生成
- **Cookie 支持** — 配置登录 Cookie 以访问需要登录的内容
- **自动重试** — 网络请求自动指数退避重试；错误按类型分类并提供可操作的建议

## 安装

**方式一 — ClawHub Registry：**

```bash
npx clawhub@latest install linkmind-capture
```

> **提示：** ClawHub 安装时可能会显示 VirusTotal Code Insight 安全警告，提示该 skill "可疑"。这是误报，原因是代码中包含了对网页抓取工具来说完全正常的模式 —— 向外部网站（微博、小红书）发送 HTTP 请求、浏览器 Cookie 处理、Chrome DevTools Protocol 自动化（`Runtime.evaluate`）、以及 API 密钥配置（讯飞 / OpenAI）。所有凭据仅在本地使用，不会向第三方发送任何数据。安装前可以在 `skills/linkmind/scripts/` 中查看完整源码。

**方式二 — OpenClaw 手动安装：**

```bash
git clone https://github.com/tt-bltn/LinkMind.git /tmp/LinkMind
cp -r /tmp/LinkMind/skills/linkmind ~/.openclaw/skills/linkmind
cd ~/.openclaw/skills/linkmind/scripts && npm install
```

或者通过符号链接添加到你的工作区：

```bash
git clone https://github.com/tt-bltn/LinkMind.git ~/LinkMind
ln -s ~/LinkMind/skills/linkmind <your-workspace>/skills/linkmind
cd ~/LinkMind/skills/linkmind/scripts && npm install
```

**方式三 — Claude Code 插件：**

```
/plugin marketplace add tt-bltn/LinkMind
/plugin install linkmind-capture@linkmind
```

先添加 marketplace，再安装插件。安装后配置你的 Obsidian 知识库路径。

**方式四 — Cursor / 其他 AI Agent：**

```bash
git clone https://github.com/tt-bltn/LinkMind.git
cd LinkMind/skills/linkmind/scripts
npm install
```

AI Agent 读取 `skills/linkmind/SKILL.md` 获取工作流指令。

## 配置

需要 **Node.js >= 22** 和 **Google Chrome**（用于小红书抓取）。

**1. 安装依赖：**

```bash
cd skills/linkmind/scripts
npm install
```

**2. 运行交互式配置向导：**

```bash
npm run setup
```

向导将引导你完成：
- **Obsidian 知识库路径**（必填）— 会验证路径是否存在
- **平台 Cookie**（可选）— 用于获取需要登录的内容
- **ASR 凭据**（可选）— 用于视频转写（讯飞 / OpenAI Whisper）

非敏感配置写入 `config.json`，凭据写入 `.env`。

可以随时重新运行 `npm run setup` 更新配置。非交互式使用（CI、脚本）：

```bash
npm run setup -- --vault /Users/yourname/MyVault
```

<details>
<summary><strong>手动配置（替代方式）</strong></summary>

```bash
cp skills/linkmind/config.template.json skills/linkmind/config.json
```

编辑 `skills/linkmind/config.json`，设置你的知识库路径：

```json
{
  "obsidian_vault": "/Users/yourname/MyVault"
}
```

创建 `skills/linkmind/.env` 存放敏感凭据：

```bash
# 平台 Cookie（用于需要登录的内容）
LINKMIND_WEIBO_COOKIE="SUB=xxx; SUBP=yyy"
LINKMIND_XHS_COOKIE="a1=xxx; web_session=yyy"

# ASR 凭据（用于视频转写）
LINKMIND_IFLYTEK_APP_ID=your_app_id
LINKMIND_IFLYTEK_API_KEY=your_api_key
LINKMIND_IFLYTEK_API_SECRET=your_api_secret
LINKMIND_OPENAI_API_KEY=sk-xxx
```

同时设置时环境变量优先。

</details>

获取 Cookie：在浏览器中登录平台，打开开发者工具 (F12) → Application → Cookies，复制相关值为分号分隔的字符串。

| ASR 服务商 | 如何获取凭据 |
|-----------|-----------|
| 科大讯飞 | 在 [xfyun.cn](https://www.xfyun.cn/) 注册，创建应用，开通「语音转写」服务 |
| OpenAI Whisper | 在 [platform.openai.com](https://platform.openai.com/api-keys) 获取 API Key |

至少配置一个 ASR 服务商以启用视频转写。两者都配置时优先使用讯飞（OpenAI 作为备选）。未配置 ASR 时，视频帖子仍会被抓取，但不包含转写内容。

## 使用方法

### 配合 AI Agent 使用（主要用法）

本 skill 兼容任何支持 [SKILL.md 标准](https://openclaw.rocks/blog/mcp-skills-plugins) 的 Agent — OpenClaw、Cursor、Claude Code、GitHub Copilot 等。

AI 读取 `skills/linkmind/SKILL.md` 后会自动：
- 识别触发词，如"让我记录"、"帮我保存"、"capture this"
- 分发到对应平台的处理脚本
- 生成带深度总结的 Markdown 笔记并保存到你的 Obsidian 知识库

### 独立脚本测试

```bash
cd skills/linkmind/scripts

# 微博
npx tsx weibo.ts "https://m.weibo.cn/detail/4331051486294436"

# 小红书
npx tsx xiaohongshu.ts "https://www.xiaohongshu.com/explore/6a7b8c9d0e1f"
```

脚本输出 JSON 到 stdout，AI Agent 消费后生成最终的 Markdown 文件。

## 输出格式

每篇抓取的笔记是一个带 YAML frontmatter 的 Markdown 文件：

```markdown
---
title: '深度解读ReAct：让大模型学会边思考边行动'
date: 2026-03-18
platform: weibo
author: 'AI前沿观察'
original_url: "https://weibo.com/7654321098/ReAcTpaper"
captured_at: 2026-03-22T10:15:00.000Z
has_video: true
has_transcript: true
has_image_analysis: true
---

# 深度解读ReAct：让大模型学会边思考边行动

> 来源：微博 @AI前沿观察 | 2026-03-18

## 深度总结

**内容类型：** 教程

**核心主题：** 解读 ReAct（Reasoning + Acting）框架，展示大模型如何通过交替生成推理轨迹和执行动作来完成复杂任务。

**结构化摘要：**

| 维度 | 内容 |
|------|------|
| 论文来源 | Yao et al., 2022, "ReAct: Synergizing Reasoning and Acting in Language Models" |
| 核心思想 | 将 Chain-of-Thought 推理与外部工具调用交织，形成 Thought → Action → Observation 循环 |
| 对比方法 | 纯 CoT（仅推理、易产生幻觉）、纯 Act（仅执行、缺乏规划） |
| 典型应用 | HotpotQA 多跳问答、FEVER 事实验证、ALFWorld/WebShop 交互任务 |

**关键要点：**
- ReAct 让模型在每一步先输出 Thought（分析当前状态、制定计划），再输出 Action（调用搜索、查表等工具），最后接收 Observation（工具返回结果），形成闭环推理
- 相比纯 Chain-of-Thought，ReAct 显著降低了幻觉率，因为推理过程有外部事实校验
- ReAct 框架直接启发了 LangChain Agent、AutoGPT 等主流 AI Agent 架构的设计

## 原文内容

【AI Agent必读论文】今天带大家深度拆解ReAct框架。

一句话总结：让大模型不只是"想"，还要"做"——推理和行动交替进行，每一步都有外部世界的反馈来校正方向。

传统的Chain-of-Thought让模型一口气想完再回答，问题是想多了容易产生幻觉。ReAct的做法是把推理拆成小步骤，每步推理后立刻执行一个动作（比如搜索），拿到真实结果后再继续推理。

举个例子，问"乔布斯和比尔盖茨谁更年轻？"：
- Thought 1: 我需要分别查两个人的出生年份
- Action 1: Search[乔布斯 出生年份]
- Observation 1: 1955年2月24日
- Thought 2: 乔布斯1955年出生，现在查比尔盖茨
- Action 2: Search[比尔盖茨 出生年份]
- Observation 2: 1955年10月28日
- Thought 3: 两人都是1955年出生，盖茨晚8个月，所以盖茨更年轻
- Action 3: Finish[比尔盖茨]

这个Thought→Action→Observation的循环就是ReAct的核心范式，也是今天几乎所有AI Agent框架的基础。

## 视频转写

> 📎 字幕文件：[transcript.srt](attachments/2026-03-18-深度解读ReAct-让大模型学会边思考边行动/transcript.srt)

大家好，今天我们来聊一篇非常重要的论文，ReAct。这篇论文可以说是AI Agent领域的奠基之作。它的核心思想其实很简单，就是让大模型在回答问题的时候，不要一口气想完，而是边想边做。每想一步就执行一个动作，比如去搜索引擎查一下，拿到结果后再继续往下想……

## 图片

![图片](attachments/2026-03-18-深度解读ReAct-让大模型学会边思考边行动/img-001.jpg)

> **图片内容：** ReAct框架流程图，左侧标注"Thought"（黄色），中间标注"Action"（蓝色），右侧标注"Observation"（绿色），箭头形成循环。底部对比了纯CoT（仅Thought链）和纯Act（仅Action链）的局限性。

![图片](attachments/2026-03-18-深度解读ReAct-让大模型学会边思考边行动/img-002.jpg)

> **图片内容：** HotpotQA实验结果表格，ReAct在Exact Match上达到35.1%，优于纯CoT的29.4%和纯Act的25.7%。标注"ReAct + CoT-SC"组合方法达到最佳成绩40.2%。

## 元信息

- 转发: 2.1k | 评论: 387 | 点赞: 5.6k
```

## 开发路线

| 阶段 | 描述 | 状态 |
|------|------|------|
| Step 1 | 项目骨架、类型定义、SKILL.md、文档 | 已完成 |
| Step 2 | 微博处理器 — 通过移动端 API 完整抓取 | 已完成 |
| Step 3 | 小红书处理器 — 基于 Playwright 的抓取 | 已完成 |
| Step 4 | 打磨体验 — 图片下载、AI 总结优化、Cookie、错误处理 | 已完成 |
| Step 5 | 图片多模态 — AI 视觉分析图片、提取内容用于总结 | 已完成 |
| Step 6 | 视频 ASR — 音频提取、语音转文字（讯飞/Whisper）、SRT 生成 | 进行中 |
| Step 7 | 分发 — OpenClaw/ClawHub/Claude Code 安装、Chrome CDP、.env 配置 | 已完成 |

详见 [docs/PROJECT_STATE.md](docs/PROJECT_STATE.md)。

## 技术栈

- **TypeScript** (ES2022, ESM) + [tsx](https://github.com/privatenumber/tsx) 零配置执行
- **Node.js 内置 fetch** 调用微博移动端 API
- **Chrome DevTools Protocol** 抓取小红书（复用系统 Chrome，无需额外下载）
- **AI Agent 多模态视觉** 提取图片内容和 OCR
- **ffmpeg-static** 视频转音频
- **讯飞 LFASR / OpenAI Whisper** 语音转文字
- **SKILL.md** 标准，跨平台 AI Agent 兼容（OpenClaw / Cursor / Claude Code）

## 文档

- [PRD.md](docs/PRD.md) — 产品需求和验收标准
- [ARCH.md](docs/ARCH.md) — 架构、数据流图和设计决策
- [PROJECT_STATE.md](docs/PROJECT_STATE.md) — 分阶段开发进度追踪

## 许可证

MIT
