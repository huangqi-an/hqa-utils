import type { PermissionQueryState } from "./queryPermission.js";

/**
 * onPermissionChange 的回调参数即权限状态（`"granted"` / `"denied"` / `"prompt"`）。
 */
export type { PermissionQueryState as PermissionState };

/**
 * 监听权限状态变化：订阅时先回调一次当前状态，之后用户在浏览器设置里
 * 改动权限（通常切回标签页时派发 change）时再次回调。
 *
 * 与库内其他订阅 API（`onNetworkChange` / `onVisibilityChange`）语义一致，
 * 配合权限引导 UI 很顺手：denied 时展示"去设置开启"提示，用户改完回来
 * 自动切到可用状态。
 *
 * 权限名当前浏览器不支持时（原生 query 抛 TypeError）不回调，返回 noop。
 * 非浏览器环境返回 noop，不抛错。
 *
 * @param name 权限名（如 `"geolocation"`、`"notifications"`、`"camera"`）
 * @param callback 状态回调，首次为订阅时的当前状态
 * @returns 取消订阅的函数
 *
 * @example
 * ```ts
 * const stop = onPermissionChange("notifications", (state) => {
 *   banner.update(state); // denied → 引导开启；granted → 收起提示
 * });
 *
 * stop(); // 组件卸载时取消
 * ```
 */
export function onPermissionChange(
  name: PermissionName | (string & {}),
  callback: (state: PermissionQueryState) => void,
): () => void {
  if (typeof navigator === "undefined" || !navigator.permissions?.query) return () => {};

  let stopped = false;
  let status: PermissionStatus | null = null;
  const onChange = (): void => {
    if (!stopped && status) callback(status.state);
  };

  void navigator.permissions
    .query({ name: name as PermissionName })
    .then((result) => {
      if (stopped) return;
      status = result;
      callback(result.state); // 订阅时立即同步当前状态
      result.addEventListener("change", onChange);
    })
    .catch(() => {
      // 未知权限名：静默，不回调
    });

  return () => {
    stopped = true;
    status?.removeEventListener("change", onChange);
  };
}
