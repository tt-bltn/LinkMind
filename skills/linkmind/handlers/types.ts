export interface CapturedContent {
  platform: "weibo" | "xiaohongshu";
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

export interface HandlerError {
  error: string;
  url?: string;
  details?: string;
}

export type HandlerResult = CapturedContent | HandlerError;

export function isError(result: HandlerResult): result is HandlerError {
  return "error" in result;
}
