import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export interface LinkMindConfig {
  obsidian_vault: string;
  cookies?: {
    weibo?: string;
    xiaohongshu?: string;
  };
}

export function loadConfig(configPath: string): LinkMindConfig {
  const abs = resolve(configPath);
  const raw = readFileSync(abs, "utf-8");
  const parsed = JSON.parse(raw) as LinkMindConfig;

  if (!parsed.obsidian_vault) {
    throw new Error(
      "config.json 缺少 obsidian_vault 字段，请配置你的 Obsidian 知识库路径",
    );
  }

  return parsed;
}

/**
 * Parse a `--config <path>` argument from argv. Returns the config path or
 * undefined if not provided.
 */
export function parseConfigArg(argv: string[]): string | undefined {
  const idx = argv.indexOf("--config");
  if (idx !== -1 && idx + 1 < argv.length) {
    return argv[idx + 1];
  }
  return undefined;
}
