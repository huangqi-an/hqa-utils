export type ScrollDirection = "up" | "down";

export interface OnScrollDirectionOptions {
  /** 容忍带（像素）：带内滚动不触发方向变化，用于过滤触摸/惯性抖动，默认 0 */
  tolerance?: number;
}

/**
 * 监听滚动方向变化，方向反转时触发（`"down"` 向下 / `"up"` 向上）。
 *
 * 只检测垂直方向；订阅后的第一次滚动即按实际方向触发。垂直位置无变化
 * （如纯水平滚动、iOS 顶/底回弹被截断）不会触发。
 * 适合"向下滚隐藏、向上滚显示"的悬浮头部/返回顶部按钮交互。
 * @param target 滚动源：窗口（整页滚动）或元素（内部滚动）
 * @param callback 方向变化时的回调
 * @param options `tolerance`：容忍带像素数，默认 0（任何位移都算方向变化）
 * @returns 取消订阅函数
 * @example
 * // 向下滚隐藏头部，向上滚显示
 * onScrollDirection(window, (dir) => {
 *   header.classList.toggle("hidden", dir === "down");
 * });
 */
export function onScrollDirection(
  target: HTMLElement | Window,
  callback: (direction: ScrollDirection) => void,
  options: OnScrollDirectionOptions = {},
): () => void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return () => {};
  }
  const tolerance = options.tolerance ?? 0;
  // 用 "scrollY" in 识别窗口（元素上没有 scrollY；部分环境的 window 会代理 scrollTop，用 "scrollTop" in 会误判）
  const getTop = (): number => ("scrollY" in target ? window.scrollY : target.scrollTop);
  let lastY = getTop();
  const handler = (): void => {
    const y = getTop();
    if (y > lastY + tolerance) {
      callback("down");
      lastY = y;
    } else if (y < lastY - tolerance) {
      callback("up");
      lastY = y;
    }
    // 带内滚动不触发也不更新基准
  };
  target.addEventListener("scroll", handler, { passive: true });
  return () => {
    target.removeEventListener("scroll", handler);
  };
}
