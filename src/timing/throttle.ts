export interface ThrottleOptions {
  /** 周期开始时是否立即执行（默认 true） */
  leading?: boolean;
  /** 周期结束时是否以最后一次参数补执行一次（默认 true） */
  trailing?: boolean;
}

export interface Throttled<T extends (...args: never[]) => void> {
  /** 节流后的调用：每 wait 毫秒最多执行一次（固定节拍，不重置计时） */
  (...args: Parameters<T>): void;
  /** 取消尚未执行的挂起调用 */
  cancel(): void;
  /** 立即执行挂起的调用（若有），不影响后续节流 */
  flush(): void;
}

/**
 * 节流：将高频调用限制为每 wait 毫秒最多执行一次
 *
 * 与防抖不同，节流保证持续触发期间按固定节拍执行：默认周期首立即执行、
 * 周期末以最后一次参数补执行一次；适合滚动加载、拖拽跟随等"持续反馈"的场景。
 *
 * 与 rafThrottle 的区别：以时间窗口为基准，不依赖渲染帧，
 * 适合与渲染节奏无关的频率限制，如网络请求、埋点上报。
 *
 * this 上下文与参数都会透传给原函数。
 * @param fn 需要节流的函数
 * @param wait 节流周期（毫秒）
 * @param options.leading 周期开始时是否立即执行，默认 true
 * @param options.trailing 周期结束时是否以最后一次参数补执行，默认 true
 * @returns 节流函数，附带 cancel() 取消挂起调用、flush() 立即执行挂起调用
 * @example
 * const onScroll = throttle(() => {
 *   updateHeaderShadow(window.scrollY);
 * }, 100);
 *
 * window.addEventListener("scroll", onScroll);
 * // 组件卸载时
 * onScroll.cancel();
 */
export function throttle<T extends (...args: never[]) => void>(
  fn: T,
  wait: number,
  options: ThrottleOptions = {},
): Throttled<T> {
  const leading = options.leading ?? true;
  const trailing = options.trailing ?? true;

  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;
  let lastThis: unknown;
  let lastInvokeTime: number | null = null;

  const invoke = (): void => {
    if (lastArgs === null) return;
    const args = lastArgs;
    const ctx = lastThis;
    lastArgs = null;
    lastThis = undefined;
    lastInvokeTime = Date.now();
    fn.apply(ctx, args);
  };

  const clearTimer = (): void => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const startTimer = (delay: number): void => {
    timer = setTimeout(() => {
      timer = null;
      if (trailing && lastArgs !== null) invoke();
    }, delay);
  };

  const throttled = function (this: unknown, ...args: Parameters<T>): void {
    lastArgs = args;
    // eslint-disable-next-line @typescript-eslint/no-this-alias -- 需要捕获 this 以便在延迟执行时透传给原函数
    lastThis = this;

    const lastTime = lastInvokeTime;
    const elapsed = lastTime === null ? Infinity : Date.now() - lastTime;
    const isCycleStart = lastTime === null || elapsed >= wait;

    if (isCycleStart) {
      // 周期起点：按 leading 决定立即执行或仅确立计时起点
      clearTimer();
      if (leading) {
        invoke();
      } else {
        lastInvokeTime = Date.now();
      }
      startTimer(wait);
      return;
    }

    // 周期内：保持固定节拍，若无挂起 timer 则补挂到周期末尾
    if (timer === null) startTimer(wait - elapsed);
  } as Throttled<T>;

  throttled.cancel = (): void => {
    clearTimer();
    lastArgs = null;
    lastThis = undefined;
    lastInvokeTime = null;
  };

  throttled.flush = (): void => {
    if (timer !== null && lastArgs !== null) {
      clearTimer();
      invoke();
    }
  };

  return throttled;
}
