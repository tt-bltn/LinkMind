---
title: "{{title}}"
date: {{date}}
platform: {{platform}}
author: "{{author}}"
original_url: {{originalUrl}}
captured_at: {{fetchedAt}}
---

# {{title}}

> 来源：{{platformDisplayName}} @{{author}} | {{date}}

## 总结

（AI 根据内容生成的 2-4 句中文摘要）

## 原文内容

{{text}}

## 图片

{{#each images}}
![图片]({{this}})
{{/each}}

## 元信息

- 转发: {{stats.reposts}} | 评论: {{stats.comments}} | 点赞: {{stats.likes}}
