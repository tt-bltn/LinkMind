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
| 视频内容支持 | 视频微博/笔记提取音频并转写成文字 |
| Cookie 管理 | 支持配置登录态，抓取需要登录的内容 |
| 错误重试 | 自动重试机制，应对网络波动和反爬 |

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

## 6. 技术约束

- Skill 形式开发，兼容 OpenClaw / Cursor / Claude Code 等 AI 工具
- Handler 脚本用 TypeScript 编写，通过 `tsx` 运行
- 微博抓取使用 `m.weibo.cn` 移动端 API（无需登录）
- 小红书抓取使用 Playwright headless browser
- 零外部服务依赖（所有处理本地完成）
- 用户通过 `skills/linkmind/config.json` 配置 Obsidian Vault 路径，Skill 在执行前读取该配置
- 输出目录为 `{obsidian_vault}/LinkMind/`，图片附件目录为 `{obsidian_vault}/LinkMind/attachments/`

## 7. 配置说明

用户需在 `skills/linkmind/config.json` 中指定 Obsidian Vault 路径：

```json
{
  "obsidian_vault": "/Users/yourname/ObsidianVault"
}
```

| 配置项 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `obsidian_vault` | string | 是 | Obsidian Vault 的绝对路径，笔记将保存到该路径下的 `LinkMind/` 子目录 |

Skill 执行时：
1. 读取 `skills/linkmind/config.json`
2. 校验 `obsidian_vault` 路径存在且可写
3. 自动在 Vault 下创建 `LinkMind/` 和 `LinkMind/attachments/` 子目录（如不存在）
4. 笔记保存到 `{obsidian_vault}/LinkMind/YYYY-MM-DD-{slug}.md`

## 8. 非目标

- 不做用户系统 / 多租户
- 不做 Web UI（纯 CLI + AI Agent 交互）
- 不做实时推送 / 订阅功能（MVP 阶段）
- 不做付费 API 调用（自抓取）
