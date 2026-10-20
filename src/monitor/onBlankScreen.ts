import {
  isPageBlank,
  type BlankScreenResult,
  type IsPageBlankOptions,
} from "./isPageBlank.js";

/**
 * onBlankScreen 的配置项。
 */
export interface OnBlankScreenOptions extends IsPageBlankOptions {
  /** 检测间隔毫秒数，默认 `2000` */
  interval?: number;
  /** 连续多少次白屏才触发回调（防瞬时抖动误报），默认 `3` */
  consecutive?: number;
  /** 订阅时立即做首次检测，默认 `true` */
  immediate?: boolean;
}

/**
 * 白屏轮询监测：按间隔反复调用 {@link isPageBlank}，连续白屏达到
 * `consecutive` 次后回调一次。
 *
 * 触发语义（防刷屏）：持续白屏期间只回调一次；检测到恢复（非白）
 * 后计数清零，之后再次连续白屏才会再次回调。
 *
 * 非浏览器环境（SSR）返回 noop，不抛错。
 *
 * @param callback 连续白屏达到阈值时触发，参数为最后一次检测结果
 * @param options 配置项
 * @returns 停止监测的函数
 *
 * @example
 * ```ts
 * const stop = onBlankScreen((result) => {
 *   report("连续白屏", result); // { blank, blankCount, total }
 * }, { interval: 2000, consecutive: 3 });
 *
 * stop(); // 组件卸载时停止
 * ```
 */
export function onBlankScreen(
  callback: (result: BlankScreenResult) => void,
  options?: OnBlankScreenOptions,
): () => void {
  if (typeof window === "undefined" || typeof window.setInterval !== "function") {
    return () => {};
  }

  const { interval = 2000, consecutive = 3, immediate = true, ...rest } = options ?? {};
  let streak = 0;
  let reported = false;

  const check = (): void => {
    const result = isPageBlank(rest);
    if (result.blank) {
      streak++;
      if (!reported && streak >= consecutive) {
        reported = true;
        callback(result);
      }
    } else {
      // 恢复：重置计数，允许下一个白屏事件再次触发
      streak = 0;
      reported = false;
    }
  };

  if (immediate) check();
  const timer = window.setInterval(check, interval);

  return () => window.clearInterval(timer);
}
