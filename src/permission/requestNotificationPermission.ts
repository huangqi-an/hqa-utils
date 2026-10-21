/**
 * 通知授权状态，与 Notification API 规范一致（注意与 Permissions API
 * 的 `"prompt"` 不同，这里未询问时为 `"default"`）。
 */
export type NotificationPermissionState = "granted" | "denied" | "default";

/**
 * 向用户申请通知授权，返回授权结果。
 *
 * 浏览器语义：
 * - 首次调用弹出授权框，resolve 用户的选择
 * - 已授权 / 已拒绝时再次调用**不会弹窗**，直接返回当前状态
 * - 用户关闭授权框（未选择）为 `"default"`
 *
 * 返回 `"granted"` 后即可安全使用 `new Notification(...)`；
 * 建议配合 `onPermissionChange("notifications", ...)` 跟随后续变化
 * （用户可能随时在浏览器设置里改主意）。
 *
 * 非浏览器环境或浏览器不支持 Notification API 时返回 `null`，不抛错。
 * 旧版 Safari 的回调式 `requestPermission(callback)` 签名已兼容。
 *
 * @returns 授权结果；环境不支持时为 `null`
 *
 * @example
 * ```ts
 * import { requestNotificationPermission, onPermissionChange } from "@huangqi_an/hqa-utils";
 *
 * const result = await requestNotificationPermission();
 * if (result === "granted") {
 *   new Notification("已开启提醒");
 * } else if (result === "default") {
 *   // 用户关掉了弹窗，别打扰，留个入口就好
 * }
 *
 * // 跟随后续变化
 * onPermissionChange("notifications", (state) => syncBanner(state));
 * ```
 */
export function requestNotificationPermission(): Promise<NotificationPermissionState | null> {
  if (typeof window === "undefined" || typeof Notification === "undefined") {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    let settled = false;
    const done = (state: NotificationPermissionState | null): void => {
      if (settled) return;
      settled = true;
      resolve(state);
    };

    try {
      const maybePromise = Notification.requestPermission((state) => {
        // 旧版 Safari 仅回调式签名；新版浏览器回调与 Promise 并存，
        // Promise.resolve 与回调都触发时由 settled 保证只取第一个
        done(state);
      });
      if (maybePromise && typeof maybePromise.then === "function") {
        maybePromise.then(
          (state) => done(state),
          () => done(null),
        );
      }
    } catch {
      done(null);
    }
  });
}
