/**
 * 权限状态，与 Permissions API 规范一致。
 */
export type PermissionQueryState = "granted" | "denied" | "prompt";

/**
 * 查询浏览器权限状态（不触发授权弹窗）。
 *
 * 调用定位 / 通知 / 摄像头 / 剪贴板等敏感 API 前先查状态：
 * - `"granted"` 已授权，直接用
 * - `"denied"` 已拒绝——浏览器不会再弹窗，引导用户去设置开启
 * - `"prompt"` 尚未询问——此时调用对应 API 才会弹授权框
 *
 * 权限名各浏览器支持不一（Firefox 无 camera/microphone，Safari 更少），
 * 未知权限名原生会抛 TypeError——本函数捕获后返回 `null`（无法判定），
 * 可放心对多个权限名并发查询。
 *
 * 非浏览器环境或浏览器不支持 Permissions API 时返回 `null`，不抛错。
 *
 * @param name 权限名（如 `"geolocation"`、`"notifications"`、`"camera"`、`"clipboard-read"`）
 * @returns 权限状态；无法判定时为 `null`
 *
 * @example
 * ```ts
 * const state = await queryPermission("geolocation");
 * if (state === "granted") locate();
 * else if (state === "denied") showSetupGuide(); // 引导去浏览器设置开启
 * else requestLocate(); // "prompt"：调用 API 弹出授权框
 * ```
 */
export async function queryPermission(
  name: PermissionName | (string & {}),
): Promise<PermissionQueryState | null> {
  if (typeof navigator === "undefined" || !navigator.permissions?.query) return null;

  try {
    const status = await navigator.permissions.query({ name: name as PermissionName });
    return status.state;
  } catch {
    // 未知权限名：各浏览器以 TypeError 拒绝，视为无法判定
    return null;
  }
}
