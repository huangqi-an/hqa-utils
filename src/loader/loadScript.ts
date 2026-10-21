import { createResourceLoader, type ResourceLoadOptions } from "./inject.js";

export type { ResourceLoadOptions as LoadScriptOptions };

/**
 * 动态加载外部脚本：创建 `<script>` 标签插入页面，加载完成 resolve。
 *
 * 第三方 SDK 按需加载（地图 / 图表 / 支付组件）的标准姿势——
 * 用到时才拉取，不阻塞首屏：
 * - **去重缓存**：同 URL 的并发调用与后续调用共享同一次加载，
 *   不会插入重复标签
 * - **失败可重试**：加载失败清缓存，下次调用重新加载
 * - `attrs` 透传 `integrity` / `crossOrigin` 等（SRI 校验场景）
 * - `timeout` 防止弱网下 Promise 永远挂起（超时抛 `TimeoutError`）
 *
 * 非浏览器环境（SSR）resolve 空操作，不抛错。
 *
 * @param url 脚本地址
 * @param options 配置项
 * @returns 加载完成的 Promise
 *
 * @example
 * ```ts
 * import { loadScript } from "@huangqi_an/hqa-utils";
 *
 * await loadScript("https://maps.example.com/api.js", {
 *   attrs: { crossOrigin: "anonymous" },
 *   timeout: 10000,
 * });
 * window.initMap?.();
 * ```
 */
export const loadScript: (url: string, options?: ResourceLoadOptions) => Promise<void> =
  createResourceLoader("script");
