/**
 * 监听元素进入 / 离开视口，基于 IntersectionObserver。
 *
 * 曝光埋点、图片懒加载、进入视口触发动画等场景的封装：
 * - `threshold` 指定交叉比例阈值（如 `0.5` = 可见超过 50% 才触发）
 * - `once` 触发一次后自动停止观察
 * - 返回 `stop()` 取消观察
 *
 * 不支持 IntersectionObserver 的环境（旧浏览器 / SSR）返回 noop，不抛错。
 *
 * @param el 目标元素
 * @param callback 交叉状态变化时的回调，参数为原生 `IntersectionObserverEntry`
 * @param options 配置项
 * @returns 停止观察的函数
 *
 * @example
 * ```ts
 * const stop = onElementVisible(card, (entry) => {
 *   if (entry.isIntersecting) report("曝光", { id: card.dataset.id });
 * }, { threshold: 0.5, once: true });
 *
 * stop(); // 组件卸载时停止
 * ```
 */
export interface OnElementVisibleOptions {
  /** 交叉比例阈值 0~1，默认 `0`（任意可见即触发） */
  threshold?: number;
  /** 触发一次后自动停止观察，默认 `false` */
  once?: boolean;
}

export function onElementVisible(
  el: Element,
  callback: (entry: IntersectionObserverEntry) => void,
  options?: OnElementVisibleOptions,
): () => void {
  if (typeof IntersectionObserver !== "function") return () => {};

  const { threshold = 0, once = false } = options ?? {};
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        callback(entry);
        if (once && entry.isIntersecting) {
          observer.disconnect();
          return;
        }
      }
    },
    { threshold },
  );
  observer.observe(el);

  return () => observer.disconnect();
}
