import { onFpsChange, type FpsSample } from "./onFpsChange.js";

/**
 * measureFps 的配置项。
 */
export interface MeasureFpsOptions {
  /** 采样时长毫秒数，默认 `1000` */
  duration?: number;
}

/**
 * 一次性测量页面帧率：采样 `duration` 毫秒，resolve 该时段的平均帧率。
 *
 * 内部基于 {@link onFpsChange}，适合按需测量（如进入重交互页面前后对比）
 * 而非挂机监测。需要持续监测用 onFpsChange。
 *
 * 无 requestAnimationFrame 的环境（SSR / Node）resolve `null`，不抛错、不挂起。
 *
 * @param options 配置项
 * @returns 采样结果；SSR 环境为 `null`
 *
 * @example
 * ```ts
 * const sample = await measureFps({ duration: 1000 });
 * if (sample && sample.fps < 30) {
 *   reporter.report("卡顿", sample);
 * }
 * ```
 */
export function measureFps(options?: MeasureFpsOptions): Promise<FpsSample | null> {
  if (typeof window === "undefined" || typeof requestAnimationFrame !== "function") {
    return Promise.resolve(null);
  }

  const { duration = 1000 } = options ?? {};
  return new Promise((resolve) => {
    const stop = onFpsChange((sample) => {
      stop();
      resolve(sample);
    }, { interval: duration });
  });
}
