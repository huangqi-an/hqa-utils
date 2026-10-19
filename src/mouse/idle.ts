export interface MouseIdleOptions {
  /** 监听活动事件的目标，默认 window */
  target?: EventTarget;
}

/**
 * 监听鼠标空闲：在 target 上无 mousemove / mousedown 达到 ms 毫秒后触发一次回调
 *
 * 任何活动都会重置计时；触发后自动停止监听（一次性语义），
 * 需要循环检测请在回调内重新调用本函数。
 * @param callback 空闲达到阈值后触发
 * @param ms 空闲阈值（毫秒），必须为正数
 * @param options 配置项
 * @returns 停止监听函数，调用后解除全部事件绑定并取消计时
 * @example
 * // 用户 30 秒无操作后暂停自动轮播
 * const stop = onMouseIdle(() => carousel.pause(), 30_000);
 */
export function onMouseIdle(
  callback: () => void,
  ms: number,
  options: MouseIdleOptions = {},
): () => void {
  if (!Number.isFinite(ms) || ms <= 0) {
    throw new RangeError("ms must be a positive finite number");
  }

  const target: EventTarget | null =
    options.target ?? (typeof window !== "undefined" ? window : null);
  if (!target) return () => {};

  let timer: ReturnType<typeof setTimeout> | null = null;

  const reset = (): void => {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      stop();
      callback();
    }, ms);
  };

  const stop = (): void => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    target.removeEventListener("mousemove", reset);
    target.removeEventListener("mousedown", reset);
  };

  target.addEventListener("mousemove", reset, { passive: true });
  target.addEventListener("mousedown", reset, { passive: true });
  reset();

  return stop;
}
