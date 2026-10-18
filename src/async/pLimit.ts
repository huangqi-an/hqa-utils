/**
 * 队列清空错误：排队中的任务被 clearQueue 丢弃时抛出
 */
export class QueueClearedError extends Error {
  constructor(message = "Task was cleared from the queue before execution") {
    super(message);
    this.name = "QueueClearedError";
  }
}

export interface LimitFunction {
  /** 执行任务，超过并发上限时排队等待 */
  <T>(fn: () => Promise<T> | T): Promise<T>;
  /** 当前正在执行的任务数 */
  readonly activeCount: number;
  /** 当前排队等待的任务数 */
  readonly pendingCount: number;
  /** 清空排队中的任务，并以 QueueClearedError reject 它们的 Promise；正在执行的任务不受影响 */
  clearQueue(): void;
}

/**
 * 创建一个并发锁，限制同时执行的任务数量（信号量式，可反复使用）
 * @param concurrency 最大并发数
 * @example
 * const limit = pLimit(2);
 * const results = await Promise.all(
 *   urls.map((url) => limit(() => fetch(url))),
 * );
 */
export function pLimit(concurrency: number): LimitFunction {
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new RangeError("concurrency must be a positive integer");
  }

  interface QueuedTask {
    fn: () => unknown;
    resolve: (value: unknown) => void;
    reject: (reason: unknown) => void;
  }

  const queue: QueuedTask[] = [];
  let activeCount = 0;

  const dequeue = (): void => {
    while (activeCount < concurrency && queue.length > 0) {
      const { fn, resolve, reject } = queue.shift()!;
      activeCount++;
      Promise.resolve()
        .then(fn)
        .then(resolve, reject)
        .finally(() => {
          activeCount--;
          dequeue();
        });
    }
  };

  const limit = (<T>(fn: () => Promise<T> | T): Promise<T> =>
    new Promise<T>((resolve, reject) => {
      queue.push({
        fn,
        resolve: resolve as (value: unknown) => void,
        reject,
      });
      dequeue();
    })) as LimitFunction;

  return Object.defineProperties(limit, {
    activeCount: { get: () => activeCount },
    pendingCount: { get: () => queue.length },
    clearQueue: {
      value: () => {
        const dropped = queue.splice(0);
        for (const { reject } of dropped) {
          reject(new QueueClearedError());
        }
      },
    },
  });
}
