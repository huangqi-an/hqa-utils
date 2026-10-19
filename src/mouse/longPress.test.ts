// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { onLongPress } from "./longPress.js";

describe("onLongPress（长按检测）", () => {
  let el: HTMLDivElement;

  beforeEach(() => {
    vi.useFakeTimers();
    el = document.createElement("div");
    document.body.appendChild(el);
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  function pressDown(): void {
    el.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
  }

  function pressUp(): void {
    window.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
  }

  function cancel(): void {
    window.dispatchEvent(new PointerEvent("pointercancel", { bubbles: true }));
  }

  it("按住超过默认 delay（600ms）后触发回调，参数为按下事件", () => {
    const callback = vi.fn();
    const stop = onLongPress(el, callback);
    pressDown();
    vi.advanceTimersByTime(599);
    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback.mock.calls[0]?.[0]).toBeInstanceOf(PointerEvent);
    stop();
  });

  it("delay 内松开（pointerup）则不触发", () => {
    const callback = vi.fn();
    const stop = onLongPress(el, callback);
    pressDown();
    vi.advanceTimersByTime(300);
    pressUp();
    vi.advanceTimersByTime(1000);
    expect(callback).not.toHaveBeenCalled();
    stop();
  });

  it("delay 内触发 pointercancel 则不触发", () => {
    const callback = vi.fn();
    const stop = onLongPress(el, callback);
    pressDown();
    cancel();
    vi.advanceTimersByTime(1000);
    expect(callback).not.toHaveBeenCalled();
    stop();
  });

  it("指针移出元素（pointerleave）取消计时", () => {
    const callback = vi.fn();
    const stop = onLongPress(el, callback);
    pressDown();
    el.dispatchEvent(new PointerEvent("pointerleave"));
    vi.advanceTimersByTime(1000);
    expect(callback).not.toHaveBeenCalled();
    stop();
  });

  it("自定义 delay 生效", () => {
    const callback = vi.fn();
    const stop = onLongPress(el, callback, { delay: 100 });
    pressDown();
    vi.advanceTimersByTime(99);
    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledTimes(1);
    stop();
  });

  it("默认持续监听：触发后再次长按可再次触发", () => {
    const callback = vi.fn();
    const stop = onLongPress(el, callback);
    pressDown();
    vi.advanceTimersByTime(600);
    pressUp();
    pressDown();
    vi.advanceTimersByTime(600);
    expect(callback).toHaveBeenCalledTimes(2);
    stop();
  });

  it("once: true 触发一次后自动停止监听", () => {
    const callback = vi.fn();
    const stop = onLongPress(el, callback, { once: true });
    pressDown();
    vi.advanceTimersByTime(600);
    pressUp();
    pressDown();
    vi.advanceTimersByTime(1000);
    expect(callback).toHaveBeenCalledTimes(1);
    stop();
  });

  it("重复按下时重置计时，不会叠加触发", () => {
    const callback = vi.fn();
    const stop = onLongPress(el, callback);
    pressDown();
    vi.advanceTimersByTime(300);
    pressDown();
    vi.advanceTimersByTime(599);
    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledTimes(1);
    stop();
  });

  it("stop() 后解除全部监听", () => {
    const callback = vi.fn();
    const stop = onLongPress(el, callback);
    stop();
    pressDown();
    vi.advanceTimersByTime(1000);
    expect(callback).not.toHaveBeenCalled();
  });

  it.each([-1, NaN, Infinity])("delay 为 %p 时抛出 RangeError", (delay) => {
    expect(() => onLongPress(el, vi.fn(), { delay })).toThrow(RangeError);
  });
});
