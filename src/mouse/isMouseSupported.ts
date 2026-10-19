/**
 * 检测设备是否拥有鼠标类精确指针
 *
 * 基于 CSS Media Queries Level 4 的 `(pointer: fine)` 查询：
 * 主输入设备为鼠标 / 触控板时返回 true，
 * 主输入设备为触屏（手机 / 平板）时返回 false。
 * @example
 * if (isMouseSupported()) {
 *   // 显示 hover 提示、右键菜单等仅鼠标可用的交互
 * }
 */
export function isMouseSupported(): boolean {
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return false;
  }
  return window.matchMedia("(pointer: fine)").matches;
}
