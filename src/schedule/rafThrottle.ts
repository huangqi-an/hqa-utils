export interface RafThrottled<T extends (...args: never[]) => void> {
  /** 帧节流后的调用：同一帧内的多次调用只执行最后一次（取最后一次参数） */
  (...args: Parameters<T>): void;
  /** 取消尚未执行的帧回调 */
  cancel(): void;
}

/**
 * 帧节流：将高频调用合并到每个动画帧最多执行一次
 *
 * 与基于时间窗口的节流不同，帧节流以渲染节奏为基准：
 * 一帧内的多次调用只保留最后一次参数，在下次绘制前统一执行。
 * 适合 scroll / mousemove / resize 等高频事件驱动渲染的场景。
 *
 * 回调中的异常会直接抛出到全局（不吞错），节流状态不受影响。
 * 无 requestAnimationFrame 的环境降级为 setTimeout 16ms。
 * @param fn 需要节流的函数
 * @returns 节流函数，附带 cancel() 取消未执行的调用
 * @example
 * const render = rafThrottle((x: number) => {
 *   el.style.transform = `translateX(${x}px)`;
 * });
 *
 * window.addEventListener("mousemove", (e) => render(e.clientX));
 * // 组件卸载时
 * render.cancel();
 */
export function rafThrottle<T extends (...args: never[]) => void>(
  fn: T,
): RafThrottled<T> {
  let pendingArgs: Parameters<T> | null = null;
  let scheduled = false;

  const run = (): void => {
    scheduled = false;
    const args = pendingArgs;
    pendingArgs = null;
    if (args !== null) fn(...args);
  };

  const schedule = (): void => {
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(run);
    } else {
      setTimeout(run, 16);
    }
  };

  const throttled = (...args: Parameters<T>): void => {
    pendingArgs = args;
    if (!scheduled) {
      scheduled = true;
      schedule();
    }
  };

  throttled.cancel = (): void => {
    pendingArgs = null;
  };

  return throttled;
}
