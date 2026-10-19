export type RafLoopCallback = (time: number, delta: number) => void;

/**
 * 持续动画循环：每帧调用一次回调，直到调用返回的停止函数
 *
 * 回调参数：
 * - `time`：当前帧时间戳（rAF 传入的原生时间）
 * - `delta`：与上一帧的间隔毫秒数，首帧为 0，可直接用于帧率无关的动画插值
 *
 * 回调抛出的异常会终止循环（rAF 链断开），避免错误在每帧反复刷屏。
 * 无 requestAnimationFrame 的环境（Node / SSR）不启动循环，返回 noop。
 * @param cb 每帧执行的回调
 * @returns 停止函数，调用后不再触发后续帧
 * @example
 * const stop = onRafLoop((time, delta) => {
 *   x += speed * (delta / 1000); // 帧率无关的位移
 *   el.style.transform = `translateX(${x}px)`;
 * });
 *
 * // 组件卸载时
 * stop();
 */
export function onRafLoop(cb: RafLoopCallback): () => void {
  if (typeof requestAnimationFrame !== "function") return () => {};

  let stopped = false;
  let lastTime: number | null = null;
  let rafId = 0;

  const tick = (time: number): void => {
    if (stopped) return;
    const delta = lastTime === null ? 0 : time - lastTime;
    lastTime = time;
    cb(time, delta);
    if (!stopped) rafId = requestAnimationFrame(tick);
  };

  rafId = requestAnimationFrame(tick);

  return () => {
    stopped = true;
    cancelAnimationFrame(rafId);
  };
}
