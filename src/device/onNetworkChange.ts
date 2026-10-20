import { isBrowser } from "../client/env.js";

/**
 * 订阅网络在线/离线状态变化
 *
 * 监听 window 的 online / offline 事件；订阅时立即同步回调一次当前状态。
 * 非浏览器环境返回空操作函数（SSR 安全）。
 * @param cb 状态变化回调，参数为当前是否在线
 * @returns 取消订阅函数
 * @example
 * const unsubscribe = onNetworkChange((online) => {
 *   offlineTip.hidden = online;
 * });
 *
 * // 组件卸载时
 * unsubscribe();
 */
export function onNetworkChange(cb: (online: boolean) => void): () => void {
  if (!isBrowser()) return () => {};
  const handle = (): void => cb(navigator.onLine);
  handle();
  window.addEventListener("online", handle);
  window.addEventListener("offline", handle);
  return () => {
    window.removeEventListener("online", handle);
    window.removeEventListener("offline", handle);
  };
}
