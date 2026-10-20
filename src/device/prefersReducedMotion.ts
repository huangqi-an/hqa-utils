import { isBrowser } from "../client/env.js";

/**
 * 查询系统是否要求减少动画（prefers-reduced-motion: reduce）
 *
 * 适合在动画/过渡前做能力判断；需要响应系统实时切换时配合
 * onMediaQueryChange("(prefers-reduced-motion: reduce)", cb) 使用。
 * 非浏览器环境返回 false（SSR 安全）。
 * @returns 系统要求减少动画时为 true
 * @example
 * const duration = prefersReducedMotion() ? 0 : 300;
 */
export function prefersReducedMotion(): boolean {
  if (!isBrowser() || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
