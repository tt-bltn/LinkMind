# LinkMind — 产品需求文档 (PRD)

## 1. 背景

社交媒体上有大量优质内容（微博、小红书、公众号、B站、Twitter 等），但这些内容分散在不同平台，难以统一管理和回顾。LinkMind 旨在通过 AI Agent Skill 的方式，让用户只需提供一个链接，即可自动抓取内容（文本、图片、视频）并整理成结构化的 Markdown 笔记，存入用户的 Obsidian 知识库，与用户已有的笔记体系无缝融合。

## 2. 目标用户

个人使用者（自用工具），主要场景：
- 看到一篇好的微博/小红书帖子，想快速保存下来
- 需要将分散在各平台的优质内容集中归档
- 希望离线也能查阅之前保存的内容

## 3. 用户故事

```
作为一个信息收集者，
当我看到一个有价值的社交媒体帖子时，
我想要对 AI 说"让我记录 <链接>"，
然后 AI 自动抓取内容，生成一个包含标题、时间、原文、图片的 Markdown 文件，
保存到我的 Obsidian 知识库中，
这样我可以在 Obsidian 中随时查阅、搜索和关联这些内容。
```

```
作为一个 Obsidian 用户，
我想要在 Skill 配置中指定我的 Obsidian 知识库路径，
这样 LinkMind 可以自动将笔记保存到正确的位置，
并且图片等资源也存入知识库对应的附件目录中。
```

## 4. 功能范围

### P0 — 核心功能（MVP）

| 功能 | 说明 |
|------|------|
| 微博链接抓取 | 支持 `weibo.com` 和 `m.weibo.cn` 链接，提取文字、图片、作者、时间 |
| 小红书链接抓取 | 支持 `xiaohongshu.com` 和 `xhslink.com` 链接，提取标题、正文、图片、标签 |
| Markdown 生成 | 统一的 frontmatter 格式，包含元信息和正文内容 |
| Obsidian 知识库存储 | 用户配置 Obsidian Vault 路径，笔记自动保存到 Vault 下的 `LinkMind/` 子目录，文件名包含日期和标题摘要 |
| Obsidian Vault 配置 | 用户在 Skill 配置文件中指定 Obsidian Vault 的绝对路径，Skill 读取该配置确定输出目录 |
| AI 深度总结 | AI 基于原文生成一段深度总结，涵盖核心观点、关键信息、背景脉络及价值点，帮助用户快速理解内容全貌而无需通读原文 |

### P1 — 增强功能

| 功能 | 说明 |
|------|------|
| 图片本地化 | 将图片下载到 Obsidian Vault 的附件目录（如 `LinkMind/attachments/`），Markdown 引用相对路径 |
| 图片多模态内容提取 | AI Agent 通过多模态能力分析已下载的图片，提取文字和视觉信息，结果附加在每张图片后并参与深度总结 |
| 视频 ASR 转写 | 视频微博/笔记提取音频 → ASR 语音识别 → 生成 SRT 字幕文件，保存到 attachments，转写文本参与 AI 深度总结 |
| Cookie 管理 | 支持配置登录态，抓取需要登录的内容 |
| 错误重试 | 自动重试机制，应对网络波动和反爬 |

#### 图片多模态内容提取 — 详细说明

**处理流程：**

1. Handler 抓取到 `images` 数组（已有能力）
2. 图片下载到 Vault 附件目录（Step 2.5 已实现）
3. AI Agent 使用 Read 工具逐张读取已下载的图片文件
4. AI Agent 利用自身多模态能力分析每张图片，提取：
   - 图片中的可见文字（OCR 内容、标题、水印等）
   - 关键视觉元素及其含义（图表、截图、照片场景等）
   - 与帖子内容相关的补充信息
5. 提取结果以 blockquote 形式附加在笔记中每张图片的 Markdown 引用之后
6. 所有图片的提取内容汇总后，与原文文本（及视频转写文本，如有）一起作为深度总结的输入

**技术要点：**

- 完全依赖 AI Agent 的多模态能力，无需额外 API 配置或外部依赖
- Read 工具原生支持 JPEG/PNG/GIF/WebP 格式图片
- 每张图片独立分析，单张失败不影响其他图片的处理
- 图片内容提取聚焦于**信息价值**：优先提取有意义的文字和数据，简要描述视觉场景

**笔记中的呈现格式：**

```markdown
![图片](attachments/{date}-{slug}/img-001.jpg)

> **图片内容：** 图片展示了一张成都火锅的菜单截图，标注了推荐菜品：毛肚（68元）、鸭肠（38元）、黄喉（32元）。右下角水印为"美食达人推荐"。

![图片](attachments/{date}-{slug}/img-002.jpg)

> **图片内容：** 一锅红油火锅的特写照片，汤底颜色鲜红，表面飘有大量花椒和干辣椒，旁边摆放着一盘切好的毛肚。
```

#### 视频 ASR 转写 — 详细说明

**处理流程：**

1. Handler 抓取到 `videoUrl`（已有能力）
2. 下载视频到临时目录
3. 使用 ffmpeg 从视频中提取音频（WAV/MP3）
4. 调用 ASR 服务将音频转为带时间戳的文本
5. 生成 SRT 字幕文件，保存到 `{vault}/LinkMind/attachments/{date}-{slug}/transcript.srt`
6. 处理完成后删除临时视频和音频文件（只保留 SRT）
7. AI 深度总结时，将 SRT 中的纯文本作为补充输入

**ASR 服务支持：**

| 服务商 | 优先级 | API 类型 | 说明 |
|--------|--------|----------|------|
| 科大讯飞 | 优先 | 语音转写（非实时） | 支持长音频，返回带时间戳的分段结果 |
| OpenAI Whisper | 备选 | `/v1/audio/transcriptions` | 支持 `verbose_json` 格式获取时间戳 |

- 用户在 `config.json` 中配置 ASR 服务参数，配置了哪个就用哪个
- 同时配置时，优先使用科大讯飞
- 未配置 ASR 时，跳过视频转写步骤，仅在笔记中记录视频链接

**文件策略：**

- 只保留 SRT 字幕文件，视频和音频处理后删除，节省 Vault 空间
- ffmpeg 通过 npm 包 `ffmpeg-static` 自动安装，无需用户手动配置

### P1 — 分发与安装

| 功能 | 说明 |
|------|------|
| 多渠道分发 | 支持 OpenClaw CLI (`npx skills add`)、ClawHub Registry (`clawhub install`)、Claude Code Plugin (`/plugin marketplace add`) 三种安装方式 |
| Skill 自包含 | `skills/linkmind/` 目录可独立分发，无需依赖仓库外部文件 |
| Chrome CDP 替代 Playwright | 小红书抓取从 Playwright 迁移到 Chrome CDP，复用用户系统 Chrome，消除 ~200MB Chromium 下载 |
| 配置模板化 | 仓库中不含真实配置，安装时由用户生成 `config.json`，敏感信息存入 `.env` |
| 运行时评估 | 评估从 tsx 切换到 Bun（`npx -y bun` 零安装、更快启动） |

#### 多渠道分发 — 详细说明

**目标：** 让其他用户通过命令行一键安装 LinkMind skill 到自己的 AI Agent 环境。

**三条安装渠道：**

| 渠道 | 命令 | 机制 |
|------|------|------|
| OpenClaw CLI | `npx skills add tt-bltn/LinkMind` | 从 GitHub 直接拉取仓库内的 skill 目录 |
| ClawHub Registry | `clawhub install linkmind-capture` | 各 skill 单独发布到 ClawHub 注册表 |
| Claude Code Plugin | `/plugin marketplace add tt-bltn/LinkMind` | 通过 `.claude-plugin/marketplace.json` 注册为 Claude Code 插件市场 |

**所需改动：**

1. SKILL.md frontmatter 添加 `metadata.openclaw` 字段（含 homepage、requires）
2. 仓库根目录添加 `.claude-plugin/marketplace.json`
3. 添加 ClawHub 发布脚本

#### Chrome CDP 替代 Playwright — 详细说明

**动机：** Playwright 依赖独立下载的 Chromium 浏览器（~200MB），是用户安装 LinkMind 的最大障碍。改用 Chrome DevTools Protocol (CDP) 直接连接用户系统已安装的 Chrome，可以：

- 零额外下载：所有用户的电脑上通常已安装 Chrome
- 天然通过反检测：系统 Chrome 不会被识别为自动化浏览器
- 复用已有 session：用户已登录的小红书 cookies 可以直接使用

**技术方案：**

| Playwright API | CDP 等价方案 |
|---------------|-------------|
| `chromium.launch()` | 查找系统 Chrome 可执行文件，以 `--remote-debugging-port` 启动 |
| `page.evaluate()` | `Runtime.evaluate` CDP 命令 |
| `context.addInitScript()` | `Page.addScriptToEvaluateOnNewDocument` CDP 命令 |
| `page.mouse.move()` | `Input.dispatchMouseEvent` CDP 命令 |
| `context.addCookies()` | 系统 Chrome 已有用户登录态，或通过 `Network.setCookies` |

**风险点：** 需要先做 POC 验证小红书的反爬系统是否会检测 CDP 的 `--remote-debugging-port` 参数。如果验证不通过，保留 Playwright 作为 fallback（安装时提示用户选择平台支持范围）。

#### Skill 自包含 — 详细说明

**目标：** `skills/linkmind/` 目录被分发后无需任何外部文件即可运行。

**改动清单：**

1. `handlers/` 重命名为 `scripts/`（对齐 OpenClaw 生态约定）
2. `config.json` 改为 `config.template.json`（仓库中不含真实路径和密钥）
3. 安装工具根据模板 + 用户输入生成真实的 `config.json`
4. 敏感配置（cookies、ASR API keys）迁移到 `.env` 文件
5. SKILL.md 中过长的深度总结指南拆分到 `references/` 目录

### P2 — 扩展功能

| 功能 | 说明 |
|------|------|
| 更多平台 | 支持微信公众号、B站视频、Twitter/X |
| 批量抓取 | 一次性提供多个链接，批量处理 |
| 标签系统 | 用户可为记录添加自定义标签 |
| 搜索功能 | 基于 frontmatter 和全文的本地搜索 |

## 5. 验收标准

### P0 验收标准

- [ ] 用户在 `skills/linkmind/config.json` 中配置 Obsidian Vault 路径后，Skill 正确读取
- [ ] 未配置 Vault 路径时，Skill 提示用户先完成配置
- [ ] 用户输入"让我记录 https://weibo.com/xxx/xxx"后，AI 自动调用 Skill
- [ ] 微博链接成功提取文字、图片 URL、作者名、发布时间
- [ ] 小红书链接成功提取标题、正文、图片 URL、作者名
- [ ] 生成的 Markdown 文件包含完整 frontmatter（title/date/platform/author/original_url）
- [ ] 文件自动保存到用户 Obsidian Vault 的 `LinkMind/` 子目录，命名格式为 `YYYY-MM-DD-{slug}.md`
- [ ] Markdown 中包含 AI 生成的深度总结（涵盖核心观点、关键信息和价值点，而非简单摘要）
- [ ] 抓取失败时向用户返回清晰的错误信息

### P1 验收标准 — 图片多模态内容提取

- [ ] 含图片的微博链接：图片下载后，每张图片被 AI Agent 读取并分析
- [ ] 含图片的小红书链接：同上
- [ ] 每张图片的分析结果以 blockquote 形式附加在笔记中对应图片之后
- [ ] 分析结果包含图片中的可见文字和关键视觉信息
- [ ] 图片分析内容作为深度总结的补充输入
- [ ] 深度总结的 `**内容来源：**` 字段正确标注包含图片分析
- [ ] frontmatter 中 `has_image_analysis` 字段正确反映是否进行了图片分析
- [ ] 单张图片分析失败时，不阻断整体流程，标注失败提示并继续处理其他图片
- [ ] 无图片内容时，跳过图片分析步骤，笔记中图片章节无分析 blockquote

### P1 验收标准 — 视频 ASR 转写

- [ ] 含视频的微博链接：成功下载视频、提取音频、调用 ASR 生成 SRT 文件
- [ ] 含视频的小红书链接：同上
- [ ] SRT 文件保存到 `{vault}/LinkMind/attachments/{date}-{slug}/transcript.srt`
- [ ] SRT 格式正确：序号、时间轴 (`HH:MM:SS,mmm --> HH:MM:SS,mmm`)、文本内容
- [ ] 处理完成后临时视频和音频文件已删除，只保留 SRT
- [ ] 科大讯飞 ASR：配置 `app_id` / `api_key` / `api_secret` 后可正常调用
- [ ] OpenAI Whisper ASR：配置 `api_key` 后可正常调用
- [ ] 同时配置两个 ASR 时，优先使用科大讯飞
- [ ] 未配置 ASR 时，跳过转写步骤，笔记中仅保留视频链接
- [ ] Markdown 笔记中包含"视频转写"章节，内联 SRT 纯文本并链接到 SRT 文件
- [ ] AI 深度总结综合考虑原文文本 + 视频转写文本
- [ ] ASR 失败时（网络错误、鉴权失败等）不阻断整体流程，向用户报告错误并继续生成笔记

### P1 验收标准 — 分发与安装

- [ ] 仓库包含 `.claude-plugin/marketplace.json`，可通过 `/plugin marketplace add tt-bltn/LinkMind` 安装
- [ ] SKILL.md frontmatter 包含 `metadata.openclaw` 字段
- [ ] `skills/linkmind/` 目录可独立分发（不依赖仓库根目录文件）
- [ ] `handlers/` 已重命名为 `scripts/`，SKILL.md 中的路径同步更新
- [ ] 仓库中不含真实用户配置（`config.json` 改为模板）
- [ ] 敏感信息（cookies、ASR keys）通过 `.env` 文件管理
- [ ] Chrome CDP 方案 POC 验证完成（通过/不通过均需记录结论）
- [ ] 若 CDP POC 通过：小红书 handler 已迁移到 CDP，Playwright 依赖已移除
- [ ] 若 CDP POC 不通过：Playwright 保留，安装时明确提示需下载 Chromium（~200MB）
- [ ] 安装说明（README）涵盖三种安装渠道

## 6. 技术约束

- Skill 形式开发，兼容 OpenClaw / Cursor / Claude Code 等 AI 工具
- Handler 脚本用 TypeScript 编写，通过 `tsx` 运行
- 微博抓取使用 `m.weibo.cn` 移动端 API（无需登录）
- 小红书抓取使用 Playwright headless browser
- 音频提取使用 `ffmpeg-static` npm 包（自动安装，无需系统级依赖）
- ASR 语音识别依赖外部 API（科大讯飞 / OpenAI Whisper），需用户配置 API 密钥
- 用户通过 `skills/linkmind/config.json` 配置 Obsidian Vault 路径和 ASR 参数，Skill 在执行前读取该配置
- 输出目录为 `{obsidian_vault}/LinkMind/`，附件目录为 `{obsidian_vault}/LinkMind/attachments/`

## 7. 配置说明

用户需在 `skills/linkmind/config.json` 中进行配置：

```json
{
  "obsidian_vault": "/Users/yourname/ObsidianVault",
  "cookies": {
    "weibo": "",
    "xiaohongshu": ""
  },
  "asr": {
    "provider": "iflytek",
    "iflytek": {
      "app_id": "",
      "api_key": "",
      "api_secret": ""
    },
    "openai": {
      "api_key": "",
      "base_url": ""
    }
  }
}
```

| 配置项 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `obsidian_vault` | string | 是 | Obsidian Vault 的绝对路径，笔记将保存到该路径下的 `LinkMind/` 子目录 |
| `cookies.weibo` | string | 否 | 微博登录 cookie，用于抓取需要登录的内容 |
| `cookies.xiaohongshu` | string | 否 | 小红书登录 cookie |
| `asr.provider` | string | 否 | 优先使用的 ASR 服务：`"iflytek"` 或 `"openai"`，默认 `"iflytek"` |
| `asr.iflytek.app_id` | string | 否 | 科大讯飞开放平台 App ID |
| `asr.iflytek.api_key` | string | 否 | 科大讯飞 API Key |
| `asr.iflytek.api_secret` | string | 否 | 科大讯飞 API Secret |
| `asr.openai.api_key` | string | 否 | OpenAI API Key |
| `asr.openai.base_url` | string | 否 | OpenAI API Base URL（可选，用于自定义端点） |

**ASR 配置逻辑：**
- 未配置 `asr` 时，视频笔记仅保留视频链接，不进行转写
- 只配置了讯飞 → 使用讯飞
- 只配置了 OpenAI → 使用 OpenAI
- 都配置了 → 优先讯飞，讯飞失败时 fallback 到 OpenAI

Skill 执行时：
1. 读取 `skills/linkmind/config.json`
2. 校验 `obsidian_vault` 路径存在且可写
3. 自动在 Vault 下创建 `LinkMind/` 和 `LinkMind/attachments/` 子目录（如不存在）
4. 笔记保存到 `{obsidian_vault}/LinkMind/YYYY-MM-DD-{slug}.md`
5. 如有视频且配置了 ASR，执行转写并保存 SRT 到 `LinkMind/attachments/{date}-{slug}/`

## 8. 非目标

- 不做用户系统 / 多租户
- 不做 Web UI（纯 CLI + AI Agent 交互）
- 不做实时推送 / 订阅功能（MVP 阶段）
- 不做付费 API 调用（自抓取）
