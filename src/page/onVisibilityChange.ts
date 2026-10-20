/**
 * 订阅页面可见性变化（`visibilitychange` 事件）。
 *
 * 特性：
 * - 订阅时立即同步回调一次当前状态（与 `onNetworkChange` 语义一致）
 * - SSR / 非浏览器环境安全：返回 noop，不抛错
 *
 * @param callback 页面可见性变化时的回调，`true` 表示可见（前台），`false` 表示不可见（切走标签页/最小化）
 * @returns 取消订阅函数
 * @example
 * // 页面切走时暂停轮询，回来后恢复
 * const stop = onVisibilityChange((visible) => {
 *   if (visible) resumePolling();
 *   else pausePolling();
 * });
 */
export function onVisibilityChange(callback: (visible: boolean) => void): () => void {
  if (typeof document === "undefined" || typeof document.addEventListener !== "function") {
    return () => {};
  }
  const handler = () => {
    callback(document.visibilityState === "visible");
  };
  callback(document.visibilityState === "visible");
  document.addEventListener("visibilitychange", handler);
  return () => {
    document.removeEventListener("visibilitychange", handler);
  };
}
