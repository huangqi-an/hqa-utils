/**
 * 延时指定毫秒数
 * @param ms 延迟毫秒数
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 带并发上限地执行异步任务，返回所有结果（保持输入顺序）
 * @param tasks 任务工厂列表
 * @param concurrency 最大并发数，默认 Infinity
 */
export async function runWithLimit<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number = Number.POSITIVE_INFINITY,
): Promise<T[]> {
  if (concurrency < 1) {
    throw new RangeError("concurrency must be >= 1");
  }
  const results = new Array<T>(tasks.length);
  let next = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, tasks.length) },
    async () => {
      while (next < tasks.length) {
        const i = next++;
        results[i] = await tasks[i]!();
      }
    },
  );
  await Promise.all(workers);
  return results;
}

/**
 * 超时错误：任务在限定时间内未完成时抛出
 */
export class TimeoutError extends Error {
  constructor(message = "Operation timed out") {
    super(message);
    this.name = "TimeoutError";
  }
}

/**
 * 为任务设置超时限制，超时后抛出 TimeoutError
 * @param task Promise 或返回 Promise/值的函数
 * @param ms 超时毫秒数
 * @param message 超时时的错误信息，默认包含超时时长
 * @example
 * const result = await withTimeout(fetchSomething(), 3000);
 * const result2 = await withTimeout(() => doWork(), 1000, "干活太慢了");
 */
export function withTimeout<T>(
  task: Promise<T> | (() => Promise<T> | T),
  ms: number,
  message?: string,
): Promise<T> {
  if (!Number.isFinite(ms) || ms < 0) {
    throw new RangeError("ms must be a non-negative finite number");
  }
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new TimeoutError(message ?? `Operation timed out after ${ms}ms`)),
      ms,
    );
    Promise.resolve()
      .then(() => (typeof task === "function" ? task() : task))
      .then(
        (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        (error: unknown) => {
          clearTimeout(timer);
          reject(error);
        },
      );
  });
}
