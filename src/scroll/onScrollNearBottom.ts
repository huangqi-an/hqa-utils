export interface OnScrollNearBottomOptions {
  /** 距底部多少像素内视为"接近底部"，默认 100 */
  threshold?: number;
}

/**
 * 监听滚动接近底部，用于无限加载 / "加载更多"。
 *
 * 触发语义：订阅时立即检查一次（内容不满屏时开箱即用），之后每次滚动事件中
 * 只要距底部 ≤ threshold 就触发。**同一停留期间可能多次触发**（例如异步加载
 * 期间用户继续滚动），请自行加加载锁防重；加载完成后若仍在底部区域，用户
 * 继续滚动会自然再次触发。
 * @param target 滚动源：窗口（整页滚动）或元素（内部滚动）
 * @param callback 接近底部时的回调
 * @param options `threshold`：距底部多少像素内触发，默认 100
 * @returns 取消订阅函数
 * @example
 * // 无限加载（自带加载锁防重复触发）
 * let loading = false;
 * const stop = onScrollNearBottom(window, async () => {
 *   if (loading) return;
 *   loading = true;
 *   await loadNextPage();
 *   loading = false;
 * });
 */
export function onScrollNearBottom(
  target: HTMLElement | Window,
  callback: () => void,
  options: OnScrollNearBottomOptions = {},
): () => void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return () => {};
  }
  const threshold = options.threshold ?? 100;
  const distanceToBottom = (): number =>
    // 用 "scrollY" in 识别窗口（元素上没有 scrollY；部分环境的 window 会代理 scrollTop，用 "scrollTop" in 会误判）
    "scrollY" in target
      ? document.documentElement.scrollHeight - window.innerHeight - window.scrollY
      : target.scrollHeight - target.clientHeight - target.scrollTop;
  const check = (): void => {
    if (distanceToBottom() <= threshold) callback();
  };
  target.addEventListener("scroll", check, { passive: true });
  check();
  return () => {
    target.removeEventListener("scroll", check);
  };
}
