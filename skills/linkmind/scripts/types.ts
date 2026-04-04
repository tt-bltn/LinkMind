export interface CapturedContent {
  platform: "weibo" | "xiaohongshu" | "wechat";
  title: string;
  author: string;
  authorAvatar?: string;
  date: string;
  text: string;
  images: string[];
  videoUrl: string | null;
  originalUrl: string;
  fetchedAt: string;
  /** Platform-specific metadata */
  extra?: Record<string, unknown>;
}

export interface WeiboContent extends CapturedContent {
  platform: "weibo";
  repostOf: { author: string; text: string } | null;
  stats: {
    reposts: number;
    comments: number;
    likes: number;
  };
}

export interface XiaohongshuContent extends CapturedContent {
  platform: "xiaohongshu";
  tags: string[];
  stats: {
    likes: number;
    collects: number;
    comments: number;
  };
}

export type ErrorCode =
  | "NETWORK"
  | "AUTH"
  | "RATE_LIMIT"
  | "NOT_FOUND"
  | "PARSE"
  | "UNKNOWN";

export interface HandlerError {
  error: string;
  code?: ErrorCode;
  url?: string;
  details?: string;
}

export type HandlerResult = CapturedContent | HandlerError;

export interface WechatContent extends CapturedContent {
  platform: "wechat";
  accountName: string;
  digest: string;
  coverImage: string | null;
  readCount: number | null;
  likeCount: number | null;
  inLookCount: number | null;
}

export function isError(result: HandlerResult): result is HandlerError {
  return "error" in result;
}
