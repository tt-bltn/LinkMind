---
name: linkmind-capture
description: >
  Capture social media links (Weibo, Xiaohongshu) — extract text, images,
  and metadata, then generate a Markdown summary file in the captures/ directory.
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
npx tsx skills/linkmind/handlers/weibo.ts "<URL>"
```

**Xiaohongshu:**
```bash
npx tsx skills/linkmind/handlers/xiaohongshu.ts "<URL>"
```

The script outputs JSON to stdout. If the JSON contains an `"error"` field,
the extraction failed — analyze the error message and inform the user.

## Step 3: Generate the Markdown file

Using the JSON output, create a Markdown file with this structure:

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

> Source: {platform display name} @{author} | {date}

## Summary

(Write a concise 2-4 sentence summary of the content in Chinese.)

## Original Content

{text}

## Images

(For each image URL, include it as a Markdown image:)
![image]({imageUrl})

## Metadata

- Reposts: {stats.reposts} | Comments: {stats.comments} | Likes: {stats.likes}
```

### File naming

Name the file as: `{date}-{slug}.md`

- `{date}` is `YYYY-MM-DD` format
- `{slug}` is derived from the title — take the first 30 chars, replace spaces with
  hyphens, remove special characters, and lowercase. If the title is in Chinese,
  use the first 10 Chinese characters joined by hyphens.
- Example: `2026-03-22-张三分享成都美食推荐.md`

### Output directory

Save the file to `captures/` in the project root. Create the directory if it
does not exist.

## Step 4: Report result

After saving, tell the user:
- The file path where the note was saved
- The title extracted from the content
- The platform and author
- A brief summary of what was captured

## Error handling

- If the handler script fails, report the error to the user clearly.
- If the URL requires login (HTTP 403 or similar), inform the user that the
  content may be private/login-required.
- If a timeout occurs, suggest the user try again later.
- Never silently fail — always give the user feedback.
