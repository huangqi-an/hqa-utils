/**
 * 判断当前运行环境是否为浏览器（存在 window 与 document）
 *
 * 通过特性检测而非 UA 判断，Node / SSR / Web Worker 等环境返回 false。
 * @example
 * if (isBrowser()) {
 *   document.title = "hello";
 * }
 */
export function isBrowser(): boolean {
  return (
    typeof window !== "undefined" && typeof window.document !== "undefined"
  );
}

/**
 * 安全获取当前 User-Agent 字符串
 *
 * 浏览器环境返回 navigator.userAgent；无 navigator 的环境返回 null。
 * 注意：Node 21+ 提供了全局 navigator（userAgent 形如 "Node.js/24"），此时会返回该值。
 * 某些隐私浏览器返回空字符串，此时同样返回 null。
 * @example
 * const ua = getUserAgent();
 * if (ua) console.log(ua);
 */
export function getUserAgent(): string | null {
  if (typeof navigator === "undefined") return null;
  return navigator.userAgent || null;
}
