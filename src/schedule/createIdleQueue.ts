/**
 * 创建空闲任务队列，将低优先级任务批量推迟到浏览器空闲时段执行。
 *
 * - 任务按 FIFO 顺序执行；每个空闲切片内根据 `deadline.timeRemaining()` 决定是否继续，
 *   剩余任务自动等下一个空闲切片，不阻塞渲染
 * - 无 `requestIdleCallback` 的环境（旧浏览器 / Node / SSR）降级为 `setTimeout`，
 *   按 `timeSlice` 时间片预算分批执行
 * - `push` 返回携带任务结果的 Promise；任务抛错、或任务被 `clear` / `destroy` 取消时 reject
 *
 * @param options 配置项
 * @param options.timeout 传给 `requestIdleCallback` 的超时毫秒数，页面长期繁忙时任务仍会被
 *   执行（防饥饿）；默认不开启
 * @param options.timeSlice 降级环境下每批任务的时间预算（毫秒），默认 `12`
 * @returns 队列实例
 *
 * @example
 * ```ts
 * const queue = createIdleQueue({ timeout: 2000 });
 *
 * // 空闲时批量预取
 * queue.push(() => prefetch("/users"));
 * const report = await queue.push(() => buildReport());
 *
 * // 视频播放期间暂停预取
 * video.addEventListener("play", () => queue.pause());
 * video.addEventListener("pause", () => queue.resume());
 * ```
 */
export interface CreateIdleQueueOptions {
  /** 传给 `requestIdleCallback` 的超时毫秒数，防任务饥饿；默认不开启 */
  timeout?: number;
  /** 降级环境下每批任务的时间预算（毫秒），默认 `12` */
  timeSlice?: number;
}

export interface IdleQueue {
  /**
   * 入队一个任务（FIFO），返回携带任务结果的 Promise。
   *
   * 任务同步抛错或返回 rejected Promise 时，该 Promise 以对应错误 reject；
   * 任务被 `clear` / `destroy` 取消时以取消错误 reject。
   * fire-and-forget 场景请自行附加 `catch`，否则可能产生 unhandled rejection。
   */
  push<T>(task: () => T | PromiseLike<T>): Promise<T>;
  /** 待执行任务数 */
  readonly size: number;
  /** 清空所有待执行任务，其 Promise 以取消错误 reject */
  clear(): void;
  /** 暂停派发，已入队任务保留，恢复派发用 `resume` */
  pause(): void;
  /** 恢复派发并立即调度 */
  resume(): void;
  /** 销毁队列：清空任务、撤销已排定的调度，之后 `push` 直接 reject */
  destroy(): void;
}

interface QueueEntry {
  task: () => unknown;
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}

/** 后续任务的剩余时间阈值（毫秒），留出余量避免单帧超时 */
const MIN_TIME_REMAINING = 1;
/** 降级环境下 setTimeout 的延迟（毫秒），与 whenIdle 保持一致 */
const FALLBACK_DELAY = 1;

const createCancelledError = (): Error => {
  const error = new Error("idle queue task cancelled");
  error.name = "IdleQueueCancelledError";
  return error;
};

const createDestroyedError = (): Error => {
  const error = new Error("idle queue destroyed");
  error.name = "IdleQueueDestroyedError";
  return error;
};

const isDeadline = (value: unknown): value is IdleDeadline => {
  return typeof value === "object" && value !== null && typeof (value as IdleDeadline).timeRemaining === "function";
};

export function createIdleQueue(options?: CreateIdleQueueOptions): IdleQueue {
  const { timeout, timeSlice = 12 } = options ?? {};
  const budget = Math.max(0, timeSlice);

  const tasks: QueueEntry[] = [];
  let scheduled = false;
  let paused = false;
  let destroyed = false;
  let cancelScheduled: (() => void) | null = null;

  const runTask = (entry: QueueEntry): void => {
    try {
      entry.resolve(entry.task());
    } catch (error) {
      entry.reject(error);
    }
  };

  const hasBudget = (deadline: unknown, start: number): boolean => {
    if (isDeadline(deadline)) return deadline.timeRemaining() > MIN_TIME_REMAINING;
    return Date.now() - start < budget;
  };

  const schedule = (): void => {
    if (scheduled || paused || destroyed || tasks.length === 0) return;
    scheduled = true;
    if (typeof requestIdleCallback === "function") {
      const handle = requestIdleCallback(drain, timeout === undefined ? undefined : { timeout });
      cancelScheduled = () => cancelIdleCallback(handle);
    } else {
      const handle = setTimeout(drain, FALLBACK_DELAY);
      cancelScheduled = () => clearTimeout(handle);
    }
  };

  const drain = (deadline?: unknown): void => {
    scheduled = false;
    cancelScheduled = null;
    if (destroyed || paused) return;
    const start = Date.now();
    // 首个任务无条件执行，保证每次调度都有进展（含 timeout 触发时 timeRemaining 为 0 的场景）
    do {
      const entry = tasks.shift();
      if (!entry) return;
      runTask(entry);
    } while (!paused && tasks.length > 0 && hasBudget(deadline, start));
    if (tasks.length > 0) schedule();
  };

  return {
    push<T>(task: () => T | PromiseLike<T>): Promise<T> {
      if (destroyed) return Promise.reject(createDestroyedError());
      return new Promise<T>((resolve, reject) => {
        tasks.push({
          task: task as () => unknown,
          resolve: resolve as (value: unknown) => void,
          reject,
        });
        schedule();
      });
    },
    get size(): number {
      return tasks.length;
    },
    clear(): void {
      while (tasks.length > 0) {
        tasks.shift()?.reject(createCancelledError());
      }
    },
    pause(): void {
      paused = true;
    },
    resume(): void {
      paused = false;
      schedule();
    },
    destroy(): void {
      if (destroyed) return;
      destroyed = true;
      cancelScheduled?.();
      cancelScheduled = null;
      while (tasks.length > 0) {
        tasks.shift()?.reject(createDestroyedError());
      }
    },
  };
}
