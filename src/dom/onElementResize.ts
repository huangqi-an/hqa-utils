/**
 * 监听元素自身尺寸变化，基于 ResizeObserver。
 *
 * 与 `window.resize` 的关键区别：resize 事件只在窗口尺寸变化时触发，
 * 而元素因内容增删、父容器布局变化导致的尺寸变化只有 ResizeObserver 能捕获。
 * 图表自适应容器、虚拟列表重算等场景的封装，返回 `stop()` 取消监听。
 *
 * 不支持 ResizeObserver 的环境（旧浏览器 / SSR）返回 noop，不抛错。
 *
 * @param el 目标元素
 * @param callback 尺寸变化时的回调，参数为内容区尺寸（不含 padding / border）
 * @returns 停止监听的函数
 *
 * @example
 * ```ts
 * const stop = onElementResize(chartContainer, ({ width, height }) => {
 *   chart.resize({ width, height });
 * });
 *
 * stop(); // 组件卸载时停止
 * ```
 */
export interface ElementResizeInfo {
  /** 内容区宽度（px，不含 padding / border） */
  width: number;
  /** 内容区高度（px，不含 padding / border） */
  height: number;
}

export function onElementResize(
  el: Element,
  callback: (info: ElementResizeInfo) => void,
): () => void {
  if (typeof ResizeObserver !== "function") return () => {};

  const observer = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const { width, height } = entry.contentRect;
      callback({ width, height });
    }
  });
  observer.observe(el);

  return () => observer.disconnect();
}
