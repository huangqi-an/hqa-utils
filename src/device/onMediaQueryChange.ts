import { isBrowser } from "../client/env.js";

/**
 * 订阅媒体查询匹配状态变化
 *
 * 底层为 matchMedia + change 事件；订阅时立即同步回调一次当前匹配状态。
 * 非浏览器环境返回空操作函数（SSR 安全）。
 * @param query 媒体查询表达式，如 "(prefers-color-scheme: dark)"
 * @param cb 匹配状态变化回调，参数为当前是否匹配
 * @returns 取消订阅函数
 * @example
 * const unsubscribe = onMediaQueryChange("(prefers-color-scheme: dark)", (dark) => {
 *   document.documentElement.dataset.theme = dark ? "dark" : "light";
 * });
 *
 * // 组件卸载时
 * unsubscribe();
 */
export function onMediaQueryChange(
  query: string,
  cb: (matches: boolean) => void,
): () => void {
  if (!isBrowser() || typeof window.matchMedia !== "function") return () => {};
  const mql = window.matchMedia(query);
  const handle = (event: MediaQueryListEvent): void => cb(event.matches);
  cb(mql.matches);
  if (typeof mql.addEventListener === "function") {
    mql.addEventListener("change", handle);
    return () => mql.removeEventListener("change", handle);
  }
  // 兼容旧版 Safari（< 14）的 addListener / removeListener
  mql.addListener(handle);
  return () => mql.removeListener(handle);
}
