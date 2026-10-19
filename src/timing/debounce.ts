export interface DebounceOptions {
  /** 防抖周期内首次调用是否立即执行（默认 false） */
  leading?: boolean;
  /** 静默期结束后是否以最后一次参数补执行一次（默认 true） */
  trailing?: boolean;
}

export interface Debounced<T extends (...args: never[]) => void> {
  /** 防抖后的调用：静默 wait 毫秒后才真正执行（取最后一次参数） */
  (...args: Parameters<T>): void;
  /** 取消尚未执行的挂起调用 */
  cancel(): void;
  /** 立即执行挂起的调用（若有），不影响后续防抖 */
  flush(): void;
}

/**
 * 防抖：将高频调用合并为"停止触发 wait 毫秒后"的一次执行（取最后一次参数）
 *
 * 每次调用都会重置等待计时，只有静默超过 wait 毫秒后才真正执行；
 * 适合搜索输入联想、resize 结束后重算布局等"等停下来再执行"的场景。
 *
 * this 上下文与参数都会透传给原函数。
 * @param fn 需要防抖的函数
 * @param wait 静默等待时长（毫秒）
 * @param options.leading 周期首次调用是否立即执行，默认 false
 * @param options.trailing 静默结束后是否以最后一次参数补执行，默认 true
 * @returns 防抖函数，附带 cancel() 取消挂起调用、flush() 立即执行挂起调用
 * @example
 * const onSearch = debounce((keyword: string) => {
 *   fetchSuggestions(keyword);
 * }, 300);
 *
 * input.addEventListener("input", (e) => onSearch(e.target.value));
 * // 组件卸载时
 * onSearch.cancel();
 */
export function debounce<T extends (...args: never[]) => void>(
  fn: T,
  wait: number,
  options: DebounceOptions = {},
): Debounced<T> {
  const leading = options.leading ?? false;
  const trailing = options.trailing ?? true;

  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;
  let lastThis: unknown;

  const invoke = (): void => {
    if (lastArgs === null) return;
    const args = lastArgs;
    const ctx = lastThis;
    lastArgs = null;
    lastThis = undefined;
    fn.apply(ctx, args);
  };

  const clearTimer = (): void => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const debounced = function (this: unknown, ...args: Parameters<T>): void {
    lastArgs = args;
    // eslint-disable-next-line @typescript-eslint/no-this-alias -- 需要捕获 this 以便在延迟执行时透传给原函数
    lastThis = this;
    const isNewCycle = timer === null;
    clearTimer();
    if (isNewCycle && leading) invoke();
    timer = setTimeout(() => {
      timer = null;
      if (trailing && lastArgs !== null) invoke();
    }, wait);
  } as Debounced<T>;

  debounced.cancel = (): void => {
    clearTimer();
    lastArgs = null;
    lastThis = undefined;
  };

  debounced.flush = (): void => {
    if (timer !== null && lastArgs !== null) {
      clearTimer();
      invoke();
    }
  };

  return debounced;
}
