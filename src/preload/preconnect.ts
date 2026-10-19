/**
 * 提前与目标源站建立连接（DNS + TCP + TLS），后续请求到该域名的资源可省去握手时间。
 *
 * 典型场景：页面即将请求第三方 CDN / API 域名（如字体站、统计脚本），
 * 在关键路径前调用可显著降低首字节延迟。
 *
 * 同一 origin 的重复调用会跳过（每个 origin 只插入一次 link）。
 * SSR / Node 下为静默空操作。
 *
 * @param url - 目标源站地址（通常只需 origin，如 `https://fonts.example.com`）
 * @returns 是否实际插入了 link（已存在或 SSR 下返回 `false`）
 *
 * @example
 * ```ts
 * // 应用启动时预热第三方字体站
 * preconnectTo("https://fonts.gstatic.com");
 * ```
 */
export function preconnectTo(url: string): boolean {
  return insertHintLink(url, "preconnect", true);
}

/**
 * 提前解析目标域名的 DNS。`preconnectTo` 的轻量替代——只做 DNS 解析，
 * 不建立 TCP/TLS 连接，开销更小、收益也更小，适合需要兼容旧浏览器的场景。
 *
 * 同一 origin 的重复调用会跳过。SSR / Node 下为静默空操作。
 *
 * @param url - 目标源站地址
 * @returns 是否实际插入了 link（已存在或 SSR 下返回 `false`）
 *
 * @example
 * ```ts
 * dnsPrefetch("https://analytics.example.com");
 * ```
 */
export function dnsPrefetch(url: string): boolean {
  return insertHintLink(url, "dns-prefetch", false);
}

/** 已插入过连接提示的 origin 集合（模块级去重） */
const hinted = new Set<string>();

/** 解析 origin；非法 URL 返回 null */
function toOrigin(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

/** 插入 link 提示标签；origin 已处理过时跳过 */
function insertHintLink(url: string, rel: string, crossOrigin: boolean): boolean {
  if (typeof document === "undefined") return false;

  const origin = toOrigin(url);
  if (origin === null || origin === "null") return false;
  if (hinted.has(`${rel}:${origin}`)) return false;

  const link = document.createElement("link");
  link.rel = rel;
  link.href = origin;
  if (crossOrigin) link.crossOrigin = "anonymous";
  document.head.appendChild(link);
  hinted.add(`${rel}:${origin}`);
  return true;
}
