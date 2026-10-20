import { isBrowser } from "../client/env.js";

/**
 * 查询系统是否偏好深色配色（prefers-color-scheme: dark）
 *
 * 适合作为主题初始值的判断依据；需要响应系统实时切换时配合
 * onMediaQueryChange("(prefers-color-scheme: dark)", cb) 使用。
 * 非浏览器环境返回 false（SSR 安全）。
 * @returns 系统偏好深色时为 true
 * @example
 * const theme = prefersDarkScheme() ? "dark" : "light";
 */
export function prefersDarkScheme(): boolean {
  if (!isBrowser() || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}
