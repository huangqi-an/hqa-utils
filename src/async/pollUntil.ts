import { sleep } from "./sleep.js";
import { TimeoutError } from "./withTimeout.js";

/**
 * 次数用尽错误：轮询达到最大尝试次数仍未满足完成条件时抛出
 */
export class PollAttemptsExhaustedError extends Error {
  /** 已执行的尝试次数 */
  readonly attempts: number;

  constructor(attempts: number, message?: string) {
    super(message ?? `Polling failed after ${attempts} attempts`);
    this.name = "PollAttemptsExhaustedError";
    this.attempts = attempts;
  }
}

export interface PollUntilOptions {
  /** 轮询间隔毫秒数，默认 1000；作为指数退避的初始间隔 */
  interval?: number;
  /** 总超时毫秒数，超时后以 TimeoutError reject */
  timeout?: number;
  /** 最大尝试次数（含首次），用尽后以 PollAttemptsExhaustedError reject */
  maxAttempts?: number;
  /** 指数退避倍率，默认 1（固定间隔） */
  backoff?: number;
  /** 退避间隔的上限毫秒数，默认不设上限 */
  maxInterval?: number;
  /** task 抛错时是否忽略并继续轮询，默认 false（错误直接 reject） */
  tolerateErrors?: boolean;
}

/**
 * 轮询：反复执行 task，直到 isDone(result) 为 true 时以最后一次结果 resolve
 *
 * 采用串行节拍：等待间隔从每次 task 完成后起算，task 耗时超过 interval 时
 * 不会重叠请求；首次调用立即执行（不先等待）。
 *
 * - 超时（timeout）或次数用尽（maxAttempts）时分别抛出 TimeoutError /
 *   PollAttemptsExhaustedError
 * - 默认 task 抛错立即 reject；传 tolerateErrors: true 可容忍偶发错误继续轮询
 * - 未设 timeout 与 maxAttempts 且 isDone 永不满足时将无限轮询
 * @param task 每轮执行的查询函数
 * @param isDone 完成判断，默认按真值判断（truthy 即完成）
 * @param options.interval 轮询间隔毫秒数，默认 1000
 * @param options.timeout 总超时毫秒数
 * @param options.maxAttempts 最大尝试次数（含首次）
 * @param options.backoff 指数退避倍率，默认 1
 * @param options.maxInterval 退避间隔上限毫秒数
 * @param options.tolerateErrors 是否容忍 task 抛错继续轮询，默认 false
 * @returns 最后一次（已完成）尝试的结果
 * @throws {TimeoutError} 超过 timeout 仍未完成
 * @throws {PollAttemptsExhaustedError} 超过 maxAttempts 次仍未完成
 * @throws {RangeError} 参数不合法（同步抛出）
 * @example
 * // 轮询导出任务状态：每 2s 查一次，最多等 60s
 * const result = await pollUntil(
 *   () => fetch(`/api/tasks/${id}`).then((r) => r.json()),
 *   (data) => data.status === "done",
 *   { interval: 2000, timeout: 60_000 },
 * );
 *
 * // 弱网下容忍偶发请求失败，间隔指数退避（1s → 2s → 4s，上限 8s）
 * const config = await pollUntil(
 *   () => fetchConfig(),
 *   (data) => data !== null,
 *   { interval: 1000, backoff: 2, maxInterval: 8000, tolerateErrors: true },
 * );
 */
export function pollUntil<T>(
  task: () => T | Promise<T>,
  isDone: (result: T) => boolean = Boolean,
  options: PollUntilOptions = {},
): Promise<T> {
  const interval = options.interval ?? 1000;
  const backoff = options.backoff ?? 1;
  const maxInterval = options.maxInterval ?? Infinity;
  const timeout = options.timeout;
  const maxAttempts = options.maxAttempts;
  const tolerateErrors = options.tolerateErrors ?? false;

  if (!Number.isFinite(interval) || interval < 0) {
    throw new RangeError("interval must be a non-negative finite number");
  }
  if (timeout !== undefined && (!Number.isFinite(timeout) || timeout < 0)) {
    throw new RangeError("timeout must be a non-negative finite number");
  }
  if (maxAttempts !== undefined && (!Number.isInteger(maxAttempts) || maxAttempts < 1)) {
    throw new RangeError("maxAttempts must be an integer >= 1");
  }
  if (!Number.isFinite(backoff) || backoff < 1) {
    throw new RangeError("backoff must be a finite number >= 1");
  }
  if (options.maxInterval !== undefined && (!Number.isFinite(maxInterval) || maxInterval < 0)) {
    throw new RangeError("maxInterval must be a non-negative finite number");
  }

  async function run(): Promise<T> {
    const deadline = timeout !== undefined ? Date.now() + timeout : Infinity;
    let attempts = 0;
    let currentInterval = interval;

    while (true) {
      if (Date.now() >= deadline) {
        throw new TimeoutError(`Polling timed out after ${timeout}ms`);
      }
      if (maxAttempts !== undefined && attempts >= maxAttempts) {
        throw new PollAttemptsExhaustedError(attempts);
      }

      attempts++;
      try {
        const result = await task();
        if (isDone(result)) return result;
      } catch (error) {
        if (!tolerateErrors) throw error;
      }

      // 串行节拍：间隔从 task 完成后起算，且不超过剩余预算（避免睡过 deadline）
      const remaining = deadline - Date.now();
      await sleep(Math.max(0, Math.min(currentInterval, maxInterval, remaining)));
      currentInterval *= backoff;
    }
  }

  return run();
}
