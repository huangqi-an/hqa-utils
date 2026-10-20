/**
 * 获取滚动进度百分比（0 ~ 100）。
 *
 * - 不传参数：计算整页（窗口）滚动进度
 * - 传入元素：计算该元素的内部滚动进度
 * - 内容不超出可滚动区域时返回 100（无可滚动余地，视为已到末尾）
 * - 非浏览器环境且未传元素时返回 0
 * @param target 可选的滚动容器元素；缺省时计算窗口滚动
 * @returns 0 ~ 100 之间的数字（已按边界收敛，iOS 回弹等越界值不会超出范围）
 * @example
 * // 阅读进度条
 * window.addEventListener(
 *   "scroll",
 *   () => {
 *     bar.style.width = `${getScrollPercent()}%`;
 *   },
 *   { passive: true },
 * );
 */
export function getScrollPercent(target?: HTMLElement): number {
  if (target === undefined) {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return 0;
    }
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (max <= 0) return 100;
    return Math.min(Math.max((window.scrollY / max) * 100, 0), 100);
  }
  const max = target.scrollHeight - target.clientHeight;
  if (max <= 0) return 100;
  return Math.min(Math.max((target.scrollTop / max) * 100, 0), 100);
}
