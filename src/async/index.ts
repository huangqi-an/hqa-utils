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

export interface RetryOptions {
  /** 失败后的最大重试次数，默认 3（即最多执行 1 + retries 次） */
  retries?: number;
  /** 基础重试间隔毫秒数，默认 0（立即重试） */
  delay?: number;
  /** 退避策略：fixed 固定间隔，exponential 指数递增（delay * 2^(n-1)），默认 fixed */
  backoff?: "fixed" | "exponential";
  /** 每次重试前的回调，参数为上次的错误和即将进行的第几次重试 */
  onRetry?: (error: unknown, attempt: number) => void;
  /** 判断某个错误是否需要重试，返回 false 时立即抛出该错误 */
  shouldRetry?: (error: unknown) => boolean;
}

/**
 * 失败后自动重试，重试次数耗尽仍失败则抛出最后一次的错误
 * @param task 任务函数，可返回 Promise 或同步值
 * @param options 重试配置
 * @example
 * // 最多重试 5 次，指数退避，从 200ms 开始翻倍
 * const data = await retry(() => fetch(url), {
 *   retries: 5,
 *   delay: 200,
 *   backoff: "exponential",
 *   shouldRetry: (e) => e instanceof HttpError && e.status >= 500,
 * });
 */
export async function retry<T>(
  task: () => Promise<T> | T,
  options: RetryOptions = {},
): Promise<T> {
  const {
    retries = 3,
    delay = 0,
    backoff = "fixed",
    onRetry,
    shouldRetry,
  } = options;
  if (!Number.isInteger(retries) || retries < 0) {
    throw new RangeError("retries must be a non-negative integer");
  }
  if (!Number.isFinite(delay) || delay < 0) {
    throw new RangeError("delay must be a non-negative finite number");
  }

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      if (shouldRetry && !shouldRetry(error)) break;
      if (attempt < retries) {
        onRetry?.(error, attempt + 1);
        const wait = backoff === "exponential" ? delay * 2 ** attempt : delay;
        if (wait > 0) await sleep(wait);
      }
    }
  }
  throw lastError;
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
