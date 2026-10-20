export interface OnScrollStopOptions {
  /** 判定"停止"的静默时长（毫秒），默认 150 */
  delay?: number;
}

/**
 * 监听滚动停止：滚动事件静默 `delay` 毫秒后触发一次回调。
 *
 * 常用于"滚动停下后再做计算"：懒加载图片、显示回到顶部按钮、惯性滚动结束后做对齐等。
 * @param target 滚动源：窗口（整页滚动）或元素（内部滚动）
 * @param callback 滚动停止时的回调
 * @param options `delay`：判定停止的静默时长（毫秒），默认 150
 * @returns 取消订阅函数（会同时清掉挂起未触发的回调）
 * @example
 * // 惯性滚动结束后显示悬浮操作按钮
 * const stop = onScrollStop(window, () => showFab(), { delay: 200 });
 */
export function onScrollStop(
  target: HTMLElement | Window,
  callback: () => void,
  options: OnScrollStopOptions = {},
): () => void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return () => {};
  }
  const delay = options.delay ?? 150;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const handler = (): void => {
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(callback, delay);
  };
  target.addEventListener("scroll", handler, { passive: true });
  return () => {
    if (timer !== undefined) clearTimeout(timer);
    target.removeEventListener("scroll", handler);
  };
}
