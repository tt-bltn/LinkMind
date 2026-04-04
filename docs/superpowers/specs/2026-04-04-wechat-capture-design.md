# 微信公众号文章捕获功能设计

**日期：** 2026-04-04
**状态：** 已审核
**范围：** 为 LinkMind 新增微信公众号（`mp.weixin.qq.com`）平台支持

---

## 1. 目标

允许用户将微信公众号文章链接传给 LinkMind，自动提取完整内容（标题、正文、图片、封面、摘要、统计数据），生成结构化 Markdown 笔记保存到 Obsidian vault，与现有微博/小红书功能保持一致的用户体验。

---

## 2. 架构与数据流

新增文件 `skills/linkmind/scripts/wechat.ts`，遵循与 `weibo.ts` 完全相同的模式：

```
URL 输入
  → URL 解析（支持两种格式）
  → HTTP 提取（解析 HTML + 内嵌 JS 变量）
      ├─ 成功 → 组装 WechatContent → 输出 JSON
      └─ 失败（403 / 内容为空）→ CDP 回退
          → 用系统 Chrome 渲染页面后提取
          → 组装 WechatContent → 输出 JSON
```

### URL 格式支持

| 格式 | 示例 |
|------|------|
| 短链 | `mp.weixin.qq.com/s/{msgId}` |
| 长链 | `mp.weixin.qq.com/s?__biz=xxx&mid=xxx&idx=1&sn=xxx` |

### HTTP 提取策略

微信文章 HTML 内嵌了多个 JS 变量（无需 JS 执行，正则提取即可）：

```javascript
var msg_title = "文章标题";
var nickname = "公众号名称";
var ct = "1712345678";       // Unix 时间戳
var cover = "https://...";    // 封面图 URL
var desc = "文章摘要";
```

正文在 `<div id="js_content">` 中，标准 HTML 结构，可直接解析。
统计数据（阅读/点赞/在看）通过页面内的 `appmsgtoken` 请求独立 API：
- **有 Cookie**：请求统计 API，填充 readCount / likeCount / inLookCount
- **无 Cookie**：统计字段置为 `null`，不报错，继续正常流程

### CDP 回退条件

- HTTP 响应 403 / 被拦截
- HTTP 成功但 `#js_content` 为空（内容未渲染）
- HTML 内缺少关键内嵌变量（`msg_title` 缺失）

CDP 回退使用与 `xiaohongshu.ts` 相同的 `chrome-cdp.ts` 客户端。

---

## 3. 数据类型

### 扩展 `types.ts`

```typescript
// platform 联合类型扩展
platform: "weibo" | "xiaohongshu" | "wechat"

export interface WechatContent extends CapturedContent {
  platform: "wechat";
  accountName: string;       // 公众号名称（与 author 相同，保留语义字段）
  digest: string;            // 文章摘要
  coverImage: string | null; // 封面图 URL
  readCount: number | null;  // 阅读数（需 Cookie）
  likeCount: number | null;  // 点赞数（需 Cookie）
  inLookCount: number | null; // 在看数（需 Cookie）
}
```

### 字段映射

| 字段 | 来源 | 备注 |
|------|------|------|
| `title` | `var msg_title` | 文章标题 |
| `author` | `var nickname` | 公众号名称 |
| `accountName` | `var nickname` | 与 author 相同，语义别名 |
| `date` | `var ct`（Unix 时间戳） | 转换为 `YYYY-MM-DD` |
| `text` | `<div id="js_content">` HTML | 富文本清洗为纯文本 |
| `images` | 正文所有 `<img>` src | 过滤广告/1×1 像素装饰图 |
| `coverImage` | `var cover` 或 `og:image` meta | 封面图 |
| `digest` | `var desc` 或 `og:description` meta | 摘要 |
| `videoUrl` | 正文内 `<video>` src（如有） | 无视频则为 `null` |
| `readCount` | 统计 API（需 Cookie） | 无 Cookie 时为 `null` |
| `likeCount` | 统计 API（需 Cookie） | 无 Cookie 时为 `null` |
| `inLookCount` | 统计 API（需 Cookie） | 无 Cookie 时为 `null` |

---

## 4. 图片下载

与现有逻辑一致，使用 `download-images.ts`，但 referer 设置为：

```
--referer "https://mp.weixin.qq.com"
```

微信图片 URL 带签名参数，设置正确 Referer 可显著提高下载成功率。失败时回退到原始远程 URL（行为与其他平台一致）。

---

## 5. 错误处理

| 场景 | 错误码 | 处理方式 |
|------|--------|----------|
| HTTP 403 / 被拦截 | — | 自动切换 CDP，不报错 |
| CDP 也失败 | `AUTH` | 提示配置 Cookie |
| 文章已删除 | `NOT_FOUND` | 提示核查链接 |
| 网络超时 | `NETWORK` | 建议重试 |
| HTML 解析失败 | `PARSE` | 建议提 issue |
| 统计 API 失败 | — | 不报错，stats 置 `null` |

---

## 6. 需修改的文件

| 文件 | 修改内容 |
|------|----------|
| `skills/linkmind/scripts/types.ts` | 添加 `WechatContent` 接口；扩展 `platform` 联合类型 |
| `skills/linkmind/SKILL.md` | 平台识别表添加微信；Cookie 配置章节添加微信说明；Step 3 元信息模板适配（显示阅读/点赞/在看） |
| `skills/linkmind/.env.example` | 添加 `LINKMIND_WXMP_COOKIE` 示例行 |
| `skills/linkmind/scripts/package.json` | 添加 `wechat` 和 `test:wechat` npm 脚本 |

### SKILL.md 平台识别表

```markdown
| Platform        | URL patterns                      |
|-----------------|-----------------------------------|
| **Weibo**       | `weibo.com`, `m.weibo.cn`        |
| **Xiaohongshu** | `xiaohongshu.com`, `xhslink.com` |
| **WeChat**      | `mp.weixin.qq.com`               |
```

### Cookie 配置新增

```bash
# 微信公众号 Cookie（可选，用于获取阅读/点赞/在看统计数据）
LINKMIND_WXMP_COOKIE="appmsgticket=xxx; wxuin=xxx; ..."
```

---

## 7. 新增文件

| 文件 | 说明 |
|------|------|
| `skills/linkmind/scripts/wechat.ts` | 主处理器（HTTP 优先 + CDP 回退） |
| `skills/linkmind/scripts/test-wechat.ts` | 单元测试（URL 解析、HTML 解析）+ `--e2e` 模式 |

---

## 8. 不在本次范围内

- 微信视频号内容（不同平台，URL 格式不同）
- 付费文章解锁
- 历史文章批量导入
- 视频 ASR 转写（沿用现有 `extract-transcript.ts` 框架，待后续集成）
