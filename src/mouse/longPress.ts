export interface LongPressOptions {
  /** 触发长按的等待时长（毫秒），默认 600 */
  delay?: number;
  /** 触发一次后是否自动停止监听，默认 false */
  once?: boolean;
}

/**
 * 为元素绑定长按检测，按下并保持 delay 毫秒后触发回调
 *
 * 基于 Pointer Events，鼠标长按与触屏长按均可触发。
 * 按下期间发生以下任一情况则取消本次计时：
 * - 在任意位置松开（window 的 pointerup / pointercancel）
 * - 指针移出元素（el 的 pointerleave）
 *
 * 注意：触屏长按可能同时触发浏览器原生行为（如菜单），
 * 如需屏蔽请在业务侧处理。
 * @param el 监听按下的元素
 * @param callback 长按触发回调，参数为触发时的 pointerdown 事件
 * @param options 配置项
 * @returns 停止监听函数，调用后解除全部事件绑定
 * @example
 * const stop = onLongPress(el, (event) => {
 *   console.log("长按触发", event.clientX);
 * }, { delay: 800, once: true });
 *
 * stop(); // 不再需要时停止监听
 */
export function onLongPress(
  el: HTMLElement,
  callback: (event: PointerEvent) => void,
  options: LongPressOptions = {},
): () => void {
  const { delay = 600, once = false } = options;
  if (!Number.isFinite(delay) || delay < 0) {
    throw new RangeError("delay must be a non-negative finite number");
  }

  let timer: ReturnType<typeof setTimeout> | null = null;

  const clearTimer = (): void => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  function handleDown(event: PointerEvent): void {
    // 重复按下时重置计时，避免多个计时器叠加
    clearTimer();
    timer = setTimeout(() => {
      timer = null;
      callback(event);
      if (once) stop();
    }, delay);
  }

  function handleCancel(): void {
    clearTimer();
  }

  function stop(): void {
    clearTimer();
    el.removeEventListener("pointerdown", handleDown);
    window.removeEventListener("pointerup", handleCancel);
    window.removeEventListener("pointercancel", handleCancel);
    el.removeEventListener("pointerleave", handleCancel);
  }

  el.addEventListener("pointerdown", handleDown);
  window.addEventListener("pointerup", handleCancel);
  window.addEventListener("pointercancel", handleCancel);
  el.addEventListener("pointerleave", handleCancel);

  return stop;
}
