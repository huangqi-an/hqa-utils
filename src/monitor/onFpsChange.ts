import { onRafLoop } from "../schedule/onRafLoop.js";

/**
 * 单个采样窗口的帧率数据。
 */
export interface FpsSample {
  /** 窗口内平均帧率（帧/秒，取整） */
  fps: number;
  /** 窗口内实际渲染的帧数 */
  frames: number;
  /** 窗口实际耗时（毫秒） */
  elapsed: number;
}

/**
 * onFpsChange 的配置项。
 */
export interface OnFpsChangeOptions {
  /** 采样窗口毫秒数，默认 `1000`（每秒回调一次） */
  interval?: number;
}

/**
 * 持续监测页面帧率（FPS）：基于 requestAnimationFrame 逐帧计数，
 * 每过一个采样窗口回调一次窗口内的平均帧率。
 *
 * 动画 / 游戏 / 重交互页面的卡顿监控原语：回调拿到 `fps` 后由调用方
 * 自行判断阈值（如 `fps < 30` 视为卡顿）并决定上报策略。
 *
 * 后台标签页（rAF 被浏览器暂停）或窗口内没有任何帧时跳过结算，
 * 避免上报无意义的 0。需要一次性测量用 {@link measureFps}。
 *
 * 无 requestAnimationFrame 的环境（SSR / Node）返回 noop，不抛错。
 *
 * @param callback 每个采样窗口结束时的回调
 * @param options 配置项
 * @returns 停止监测的函数
 *
 * @example
 * ```ts
 * const stop = onFpsChange(({ fps }) => {
 *   if (fps < 30) reporter.report("卡顿", { fps });
 * });
 *
 * stop(); // 组件卸载时停止
 * ```
 */
export function onFpsChange(
  callback: (sample: FpsSample) => void,
  options?: OnFpsChangeOptions,
): () => void {
  if (typeof window === "undefined" || typeof requestAnimationFrame !== "function") {
    return () => {};
  }

  const { interval = 1000 } = options ?? {};
  let frames = 0;
  let windowStart = Date.now();

  const stopLoop = onRafLoop(() => {
    frames++;
  });

  const settle = (): void => {
    const count = frames;
    frames = 0;
    const start = windowStart;
    windowStart = Date.now();
    // 无帧（后台标签页 rAF 暂停）或页面隐藏时跳过，避免上报无意义的 0
    if (count === 0 || document.visibilityState === "hidden") return;
    const elapsed = Math.max(windowStart - start, 1);
    callback({ fps: Math.round((count / elapsed) * 1000), frames: count, elapsed });
  };

  const timer = window.setInterval(settle, interval);

  return () => {
    stopLoop();
    window.clearInterval(timer);
  };
}
