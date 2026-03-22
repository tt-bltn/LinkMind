---
name: linkmind-capture
description: >
  Capture social media links (Weibo, Xiaohongshu) — extract text, images,
  and metadata, then generate a Markdown note with AI deep summary,
  saved to the user's Obsidian vault.
triggers:
  - "让我记录"
  - "帮我保存"
  - "帮我记录"
  - "记录这个链接"
  - "capture this"
  - "save this link"
allowed-tools: Shell, Read, Write, Glob, Grep
---

# LinkMind — Social Media Content Capture

When the user provides a social media link and asks you to capture/record/save it,
follow the workflow below.

## Step 0: Read configuration

Read the config file at `skills/linkmind/config.json` to get the user's Obsidian
vault path:

```json
{
  "obsidian_vault": "/absolute/path/to/vault"
}
```

- If the file does not exist or `obsidian_vault` is empty, tell the user:
  "请先在 `skills/linkmind/config.json` 中配置你的 Obsidian 知识库路径。"
  and provide the example JSON above.
- Verify the vault directory exists. If not, inform the user that the path is invalid.
- The output directory is `{obsidian_vault}/LinkMind/`. Create it if it does not exist.

## Step 1: Identify the platform

Match the URL against these patterns:

| Platform       | URL patterns                                                 |
|----------------|--------------------------------------------------------------|
| **Weibo**      | `weibo.com`, `m.weibo.cn`                                   |
| **Xiaohongshu**| `xiaohongshu.com`, `xhslink.com`                            |

If the URL does not match any supported platform, tell the user:
"目前 LinkMind 支持微博和小红书链接，该链接暂不支持。"

## Step 2: Run the handler script

The handler scripts live at `skills/linkmind/handlers/`.
Run the corresponding handler from the project root:

**Weibo:**
```bash
npx tsx skills/linkmind/handlers/weibo.ts "<URL>" --config skills/linkmind/config.json
```

**Xiaohongshu:**
```bash
npx tsx skills/linkmind/handlers/xiaohongshu.ts "<URL>" --config skills/linkmind/config.json
```

The script outputs JSON to stdout. If the JSON contains an `"error"` field,
the extraction failed — check the `"code"` field for the error category
(`NETWORK`, `AUTH`, `RATE_LIMIT`, `NOT_FOUND`, `PARSE`, `UNKNOWN`) and the
`"details"` field for a user-friendly suggestion. Report both to the user.

## Step 2.5: Download images to vault

If the JSON contains an `images` array with one or more URLs, download them
locally so the note is fully viewable offline in Obsidian.

1. Determine the slug (see file naming rules in Step 3).
2. Set the attachments directory: `{obsidian_vault}/LinkMind/attachments/{date}-{slug}/`
3. Run the download script:

```bash
npx tsx skills/linkmind/handlers/download-images.ts \
  --urls "{comma-separated image URLs}" \
  --output-dir "{attachments directory}" \
  --referer "{platform homepage, e.g. https://weibo.com or https://www.xiaohongshu.com}"
```

4. The script outputs a JSON mapping: `{ "original_url": "img-001.jpg", ... }`.
   A `null` value means that image failed to download.
5. For successfully downloaded images, use the relative path in Markdown:
   `![image](attachments/{date}-{slug}/img-001.jpg)`
6. For failed downloads, fall back to the original remote URL.

If the `images` array is empty, skip this step.

## Step 3: Generate the Markdown file

Using the JSON output (and local image paths from Step 2.5), create a Markdown
file with this structure:

```markdown
---
title: "{title}"
date: {date}
platform: {platform}
author: "{author}"
original_url: {originalUrl}
captured_at: {fetchedAt}
---

# {title}

> 来源：{platform display name} @{author} | {date}

## 深度总结

(Generate the deep summary following the **Deep Summary Guidelines** below.)

## 原文内容

{text}

## 图片

(For each image, use the local path if downloaded, otherwise the remote URL:)
![图片](attachments/{date}-{slug}/img-001.jpg)

## 元信息

- 转发: {stats.reposts} | 评论: {stats.comments} | 点赞: {stats.likes}
```

### File naming

Name the file as: `{date}-{slug}.md`

- `{date}` is `YYYY-MM-DD` format
- `{slug}` is derived from the title — take the first 30 chars, replace spaces with
  hyphens, remove special characters, and lowercase. If the title is in Chinese,
  use the first 10 Chinese characters joined by hyphens.
- Example: `2026-03-22-张三分享成都美食推荐.md`

### Output directory

Save the file to `{obsidian_vault}/LinkMind/` (the vault path from Step 0).
Create the `LinkMind/` subdirectory if it does not exist.

## Step 4: Report result

After saving, tell the user:
- The file path where the note was saved (the full Obsidian vault path)
- The title extracted from the content
- The platform and author
- A brief overview of the deep summary

## Deep Summary Guidelines

When writing the "深度总结" section, follow these rules:

### 1. Classify the content type

First, silently determine which category the content falls into:

| Type | Signals |
|------|---------|
| **观点/分析** | Opinion piece, commentary, hot take, editorial |
| **教程/攻略** | How-to, step-by-step, tips, guide |
| **新闻/事件** | Breaking news, event report, announcement |
| **个人故事** | Personal experience, diary, travel log |
| **产品/测评** | Product review, comparison, unboxing |
| **清单/推荐** | List post, recommendations, resources |

### 2. Write a structured summary

Use **structured fields + bullet points / tables**, NOT narrative paragraphs.
All text in **Chinese**. Use third-person perspective, NOT AI perspective
("我为您总结了…"). Every summary must contain the following header fields:

```markdown
**内容类型：** （类型标签，如 教程/攻略、观点/分析 等）
**核心主题：** （一句话概括，≤30 字）
```

Then, based on content type, add the structured body below the header fields.
Choose the most appropriate format for the content:

#### Format A: Table — for lists, comparisons, tech stacks, recommendations

Use when the original content enumerates items with clear attributes.

```markdown
**选型/清单：**

| 分类 | 工具/选项 | 关键理由 |
|------|-----------|----------|
| … | … | … |
```

#### Format B: Steps — for tutorials, guides, workflows

Use when the original content describes a sequential process.

```markdown
**流程/步骤：**

1. **步骤名** — 简要说明
2. **步骤名** — 简要说明
3. …
```

#### Format C: Bullet points — for opinions, stories, news, reviews

Use for content that doesn't fit a table or steps format.

```markdown
**要点：**

- **论点/事件/观点** — 展开说明（一句话）
- **论点/事件/观点** — 展开说明（一句话）
- …
```

### 3. Add key takeaways

After the structured body, always add 2-3 bullet points:

```markdown
**关键要点：**
- （要点一）
- （要点二）
- （要点三）
```

### 4. Style rules

- NO narrative paragraphs — use fields, bullets, and tables only.
- Be specific — include names, numbers, and concrete details from the original.
- Keep each bullet to 1-2 sentences max.
- Do NOT pad with filler phrases like "总的来说" or "值得一提的是".
- Do NOT repeat the title verbatim in the summary.
- If the original content mixes formats (e.g., steps + a list of tools),
  combine Format A and B as needed.

## Error handling

- If the handler script fails, report the error to the user clearly.
- Use the `code` field to tailor your response:
  - `NETWORK` — suggest checking network and retrying
  - `AUTH` — tell the user the content may require login; suggest configuring
    cookies (see below)
  - `RATE_LIMIT` — suggest waiting a few minutes before retrying
  - `NOT_FOUND` — ask the user to verify the link is correct
  - `PARSE` — the platform structure may have changed; suggest reporting the issue
- If a timeout occurs, suggest the user try again later.
- Never silently fail — always give the user feedback.

## Cookie configuration (optional)

If content requires login, users can add platform cookies to
`skills/linkmind/config.json`:

```json
{
  "obsidian_vault": "/path/to/vault",
  "cookies": {
    "weibo": "SUB=xxx; SUBP=yyy",
    "xiaohongshu": "a1=xxx; web_session=yyy"
  }
}
```

To obtain cookies: log in to the platform in a browser, open DevTools → Application →
Cookies, and copy the relevant cookie values as a semicolon-separated string.
