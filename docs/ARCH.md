# LinkMind — 架构文档 (ARCH)

## 1. 系统概览

LinkMind 是一个 AI Agent Skill，采用 **SKILL.md + Handler 脚本** 的混合架构。
AI 负责意图识别、深度总结和文件生成，Handler 脚本负责平台抓取和数据结构化。
笔记输出到用户配置的 Obsidian Vault，与用户已有的知识库无缝融合。

```mermaid
flowchart LR
    User["用户输入链接"] --> Agent["AI Agent"]
    Agent --> Config["读取 config.json<br/>获取 Vault 路径"]
    Config --> Skill["SKILL.md<br/>工作流指令"]
    Skill --> Dispatch{"识别平台"}
    Dispatch -->|weibo.com| WeiboHandler["weibo.ts"]
    Dispatch -->|xiaohongshu.com| XhsHandler["xiaohongshu.ts"]
    WeiboHandler --> JSON["结构化 JSON"]
    XhsHandler --> JSON
    JSON --> Agent
    Agent --> Markdown["生成 Markdown<br/>含深度总结"]
    Markdown --> File["写入 Obsidian Vault<br/>LinkMind/"]
    File --> Report["向用户报告结果"]
```

## 2. 组件职责

### 2.1 SKILL.md — AI 工作流指令

| 职责 | 说明 |
|------|------|
| 意图触发 | 识别"让我记录"等触发词 |
| 配置读取 | 读取 `config.json`，获取用户 Obsidian Vault 路径 |
| 平台分发 | 根据 URL 模式判断调用哪个 handler |
| 深度总结 | 基于 handler 输出的 JSON 生成深度总结（核心观点、关键信息、背景脉络、价值点） |
| Markdown 生成 | 按模板格式组装 frontmatter + 正文 |
| 文件写入 | 命名和保存到 Obsidian Vault 的 `LinkMind/` 子目录 |
| 错误处理 | 向用户报告失败原因和建议 |

### 2.2 Handler 脚本 — 平台抓取

每个 handler 是一个独立的 TypeScript 脚本，通过 CLI 调用，输入 URL，输出 JSON。

```mermaid
flowchart TD
    subgraph handler ["Handler 脚本内部流程"]
        Input["接收 URL 参数"] --> Parse["解析 URL → 提取 ID"]
        Parse --> Fetch["调用平台 API / 浏览器抓取"]
        Fetch --> Clean["清洗 HTML → 纯文本"]
        Clean --> Assemble["组装 CapturedContent JSON"]
        Assemble --> Output["JSON → stdout"]
    end
```

| handler | 抓取方式 | 依赖 |
|---------|---------|------|
| `weibo.ts` | `m.weibo.cn` 移动端 JSON API | Node.js 内置 fetch |
| `xiaohongshu.ts` | Playwright headless browser | playwright |

### 2.3 类型系统 — types.ts

所有 handler 共享 `CapturedContent` 接口，确保输出格式统一。
各平台可扩展为子类型（`WeiboContent`、`XiaohongshuContent`），
携带平台特有字段（如微博的转发信息、小红书的标签）。

```mermaid
classDiagram
    class CapturedContent {
        +string platform
        +string title
        +string author
        +string date
        +string text
        +string[] images
        +string|null videoUrl
        +string originalUrl
        +string fetchedAt
    }

    class WeiboContent {
        +object|null repostOf
        +object stats
    }

    class XiaohongshuContent {
        +string[] tags
        +object stats
    }

    CapturedContent <|-- WeiboContent
    CapturedContent <|-- XiaohongshuContent
```

## 3. 技术选型

| 决策 | 选择 | 理由 |
|------|------|------|
| 扩展形式 | Skill（非 Plugin） | 跨平台兼容、轻量、工作流天然适配 |
| 语言 | TypeScript | 类型安全、Node.js 生态丰富 |
| TS 运行器 | tsx | 零配置、快速、无需编译步骤 |
| 微博抓取 | m.weibo.cn 移动端 API | 无需登录、返回 JSON、轻量 |
| 小红书抓取 | Playwright | 反爬严格需要浏览器渲染 |
| 输出格式 | Markdown + YAML frontmatter | 通用、可搜索、Obsidian 原生兼容 |
| 输出目标 | 用户 Obsidian Vault | 与已有知识库融合、支持双向链接和图谱 |
| 用户配置 | config.json | 轻量、无需额外依赖、AI 可直接读取 |

## 4. 数据流

```mermaid
sequenceDiagram
    participant U as 用户
    participant A as AI Agent
    participant C as config.json
    participant S as SKILL.md
    participant H as Handler 脚本
    participant P as 平台 API

    U->>A: "让我记录 https://weibo.com/xxx"
    A->>S: 匹配触发词，加载 Skill 指令
    A->>C: 读取 Obsidian Vault 路径
    C-->>A: obsidian_vault: "/Users/xxx/MyVault"
    S->>A: 识别为微博平台
    A->>H: npx tsx weibo.ts "URL"
    H->>P: GET m.weibo.cn/statuses/show?id=xxx
    P-->>H: JSON response
    H-->>A: CapturedContent JSON (stdout)
    A->>A: 生成深度总结
    A->>A: 组装 Markdown (frontmatter + 深度总结 + 正文)
    A-->>U: 保存到 {Vault}/LinkMind/2026-03-22-xxx.md ✓
```

## 5. 目录结构

```
LinkMind/
├── skills/linkmind/
│   ├── SKILL.md              # AI 读取的工作流指令
│   ├── config.json           # 用户配置（Obsidian Vault 路径等）
│   ├── handlers/
│   │   ├── package.json      # handler 依赖
│   │   ├── tsconfig.json     # TypeScript 配置
│   │   ├── types.ts          # 共享类型定义
│   │   ├── weibo.ts          # 微博 handler
│   │   └── xiaohongshu.ts    # 小红书 handler
│   └── templates/
│       └── note.md           # Markdown 模板参考
├── docs/                     # 项目文档
├── package.json              # 根项目配置
└── .gitignore

用户 Obsidian Vault（输出目标）：
{obsidian_vault}/
└── LinkMind/                 # 由 Skill 自动创建
    ├── 2026-03-22-xxx.md     # 抓取的笔记
    └── attachments/          # 图片附件（P1）
```

## 6. 扩展点

### 新增平台

1. 在 `handlers/` 下新建 `{platform}.ts`
2. 实现 URL 解析 + 内容抓取 + 输出 `CapturedContent` JSON
3. 在 `SKILL.md` 中添加平台 URL 模式和调用指令
4. 在 `types.ts` 中新增平台子类型（如需要）

### 视频处理（P1）

```
视频 URL → ffmpeg 下载 → ffmpeg 提取音频 → Whisper API 转文字 → 合入 text 字段
```

可作为独立 handler 或在现有 handler 中扩展。

### 图片本地化（P1）

在 handler 中增加图片下载逻辑，或在 SKILL.md 中指导 AI 使用 curl 下载。
图片保存到 Obsidian Vault 的 `LinkMind/attachments/{date}-{slug}/` 子目录，
Markdown 中使用相对路径引用，确保 Obsidian 内可正常显示。
