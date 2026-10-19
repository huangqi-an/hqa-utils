export interface IdleDeadline {
  /** 本次回调是否由 timeout 强制触发（而非真正等到空闲） */
  didTimeout: boolean;
  /** 预计剩余的空闲时间（毫秒），建议在其归零前让出主线程 */
  timeRemaining(): number;
}

export interface WhenIdleOptions {
  /** 最长等待毫秒数，始终等不到空闲时按此时间强制执行 */
  timeout?: number;
}

/**
 * 等待主线程空闲（requestIdleCallback 的 Promise 化）
 *
 * 用于低优先级任务：预加载、日志上报、非关键计算等。
 * 无 requestIdleCallback 的环境降级为 setTimeout 1ms，
 * 并传入模拟的 deadline（didTimeout: true、timeRemaining 恒为 0），API 形状不变。
 * @returns 无 fn 时 resolve IdleDeadline；有 fn 时 resolve 其返回值
 * @throws fn 同步抛出的错误会转化为 Promise 拒绝
 * @throws options.timeout 不是非负有限数时抛出 RangeError
 * @example
 * // 空闲时预加载下一页数据
 * await whenIdle(() => prefetchNextPage());
 * @example
 * // 根据 deadline 分片处理，避免长时间占用空闲窗口
 * await whenIdle((deadline) => {
 *   while (deadline.timeRemaining() > 0 && tasks.length) {
 *     tasks.pop()();
 *   }
 * }, { timeout: 2000 });
 */
export function whenIdle(options?: WhenIdleOptions): Promise<IdleDeadline>;
export function whenIdle<T>(
  fn: (deadline: IdleDeadline) => T,
  options?: WhenIdleOptions,
): Promise<T>;
export function whenIdle<T>(
  fnOrOptions?: ((deadline: IdleDeadline) => T) | WhenIdleOptions,
  maybeOptions?: WhenIdleOptions,
): Promise<T | IdleDeadline> {
  const fn = typeof fnOrOptions === "function" ? fnOrOptions : undefined;
  const options = typeof fnOrOptions === "function" ? maybeOptions : fnOrOptions;
  const { timeout } = options ?? {};
  if (timeout !== undefined && (!Number.isFinite(timeout) || timeout < 0)) {
    return Promise.reject(
      new RangeError("timeout must be a non-negative finite number"),
    );
  }

  return new Promise<T | IdleDeadline>((resolve, reject) => {
    const callback = (deadline: IdleDeadline): void => {
      try {
        resolve(fn ? fn(deadline) : deadline);
      } catch (error) {
        reject(error);
      }
    };

    if (typeof requestIdleCallback === "function") {
      requestIdleCallback(
        callback,
        timeout !== undefined ? { timeout } : undefined,
      );
    } else {
      setTimeout(
        () =>
          callback({
            didTimeout: true,
            timeRemaining: () => 0,
          }),
        1,
      );
    }
  });
}
