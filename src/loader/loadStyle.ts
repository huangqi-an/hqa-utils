import { createResourceLoader, type ResourceLoadOptions } from "./inject.js";

export type { ResourceLoadOptions as LoadStyleOptions };

/**
 * 动态加载外部样式表：创建 `<link rel="stylesheet">` 标签插入页面，加载完成 resolve。
 *
 * 主题切换、按需加载组件样式等场景：
 * - **去重缓存**：同 URL 的并发调用与后续调用共享同一次加载
 * - **失败可重试**：加载失败清缓存，下次调用重新加载
 * - `timeout` 防止 Promise 永远挂起（超时抛 `TimeoutError`）
 *
 * 非浏览器环境（SSR）resolve 空操作，不抛错。
 *
 * @param url 样式表地址
 * @param options 配置项
 * @returns 加载完成的 Promise
 *
 * @example
 * ```ts
 * import { loadStyle } from "@huangqi_an/hqa-utils";
 *
 * await loadStyle("https://cdn.example.com/dark-theme.css");
 * document.body.classList.add("dark");
 * ```
 */
export const loadStyle: (url: string, options?: ResourceLoadOptions) => Promise<void> =
  createResourceLoader("style");
