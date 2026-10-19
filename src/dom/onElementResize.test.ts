// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { onElementResize } from "./onElementResize.js";

/** 手动 stub ResizeObserver：捕获回调，用 emit() 手动触发 */
function stubRO() {
  let cb: ((entries: ResizeObserverEntry[]) => void) | null = null;
  const observe = vi.fn();
  const disconnect = vi.fn(() => {
    cb = null;
  });
  class FakeResizeObserver {
    constructor(callback: (entries: ResizeObserverEntry[]) => void) {
      cb = callback;
    }
    observe = observe;
    disconnect = disconnect;
    unobserve = vi.fn();
  }
  vi.stubGlobal("ResizeObserver", FakeResizeObserver);
  const entry = (width: number, height: number): ResizeObserverEntry =>
    ({ contentRect: { width, height } }) as ResizeObserverEntry;
  return {
    observe,
    disconnect,
    emit(...entries: ResizeObserverEntry[]): void {
      cb?.(entries);
    },
    entry,
  };
}

describe("onElementResize", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("observe 目标元素，尺寸变化时回调宽高", () => {
    const ro = stubRO();
    const el = document.createElement("div");
    const cb = vi.fn();
    const stop = onElementResize(el, cb);

    expect(ro.observe).toHaveBeenCalledWith(el);
    ro.emit(ro.entry(320, 240));

    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith({ width: 320, height: 240 });
    stop();
    expect(ro.disconnect).toHaveBeenCalled();
  });

  it("多次变化逐次回调", () => {
    const ro = stubRO();
    const el = document.createElement("div");
    const cb = vi.fn();
    onElementResize(el, cb);

    ro.emit(ro.entry(100, 100));
    ro.emit(ro.entry(200, 150));

    expect(cb).toHaveBeenCalledTimes(2);
    expect(cb).toHaveBeenLastCalledWith({ width: 200, height: 150 });
  });

  it("stop 后变化不再回调，stop 幂等", () => {
    const ro = stubRO();
    const el = document.createElement("div");
    const cb = vi.fn();
    const stop = onElementResize(el, cb);

    stop();
    expect(() => stop()).not.toThrow();
    ro.emit(ro.entry(999, 999));
    expect(cb).not.toHaveBeenCalled();
  });

  it("无 ResizeObserver 环境（SSR/旧浏览器）返回 noop", () => {
    vi.stubGlobal("ResizeObserver", undefined);
    const el = document.createElement("div");
    const stop = onElementResize(el, vi.fn());
    expect(() => stop()).not.toThrow();
  });
});
