import { sleep } from "./sleep.js";

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
