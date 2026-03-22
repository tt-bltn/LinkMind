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

## 深度总结

（AI 根据内容生成的深度总结：核心观点、关键信息、背景脉络、价值点，帮助读者无需通读原文即可全面理解内容）

## 原文内容

{{text}}

## 图片

{{#each images}}
![图片]({{this}})
{{/each}}

## 元信息

- 转发: {{stats.reposts}} | 评论: {{stats.comments}} | 点赞: {{stats.likes}}
