// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { onElementVisible } from "./onElementVisible.js";

/** 手动 stub IntersectionObserver：捕获回调与配置，用 emit() 手动触发 */
function stubIO() {
  let cb: ((entries: IntersectionObserverEntry[]) => void) | null = null;
  let capturedOptions: unknown;
  const observe = vi.fn();
  const disconnect = vi.fn(() => {
    cb = null;
  });
  class FakeIntersectionObserver {
    constructor(
      callback: (entries: IntersectionObserverEntry[]) => void,
      options?: IntersectionObserverInit,
    ) {
      cb = callback;
      capturedOptions = options;
    }
    observe = observe;
    disconnect = disconnect;
    unobserve = vi.fn();
    takeRecords = () => [];
    root = null;
    rootMargin = "";
    scrollMargin = "";
    thresholds = [];
  }
  vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
  const entry = (isIntersecting: boolean, ratio = 1): IntersectionObserverEntry =>
    ({ isIntersecting, intersectionRatio: ratio }) as IntersectionObserverEntry;
  return {
    observe,
    disconnect,
    get options() {
      return capturedOptions;
    },
    get pending() {
      return cb !== null;
    },
    emit(...entries: IntersectionObserverEntry[]): void {
      cb?.(entries);
    },
    entry,
  };
}

describe("onElementVisible", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("observe 目标元素，交叉时回调原生 entry", () => {
    const io = stubIO();
    const el = document.createElement("div");
    const cb = vi.fn();
    const stop = onElementVisible(el, cb);

    expect(io.observe).toHaveBeenCalledWith(el);
    io.emit(io.entry(true, 0.8));

    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith(
      expect.objectContaining({ isIntersecting: true, intersectionRatio: 0.8 }),
    );
    expect(io.pending).toBe(true); // 未 once，继续观察
    stop();
    expect(io.disconnect).toHaveBeenCalled();
  });

  it("threshold 透传给 IntersectionObserver", () => {
    const io = stubIO();
    const el = document.createElement("div");
    onElementVisible(el, vi.fn(), { threshold: 0.5 });
    expect(io.options).toEqual({ threshold: 0.5 });
  });

  it("默认 threshold 为 0", () => {
    const io = stubIO();
    const el = document.createElement("div");
    onElementVisible(el, vi.fn());
    expect(io.options).toEqual({ threshold: 0 });
  });

  it("once: 进入视口触发一次后自动 disconnect", () => {
    const io = stubIO();
    const el = document.createElement("div");
    const cb = vi.fn();
    const stop = onElementVisible(el, cb, { once: true });

    io.emit(io.entry(false)); // 离开视口不触发 once 断开
    expect(cb).toHaveBeenCalledTimes(1);
    expect(io.pending).toBe(true);

    io.emit(io.entry(true, 1));
    expect(cb).toHaveBeenCalledTimes(2);
    expect(io.disconnect).toHaveBeenCalled(); // 进入视口即断开
    expect(io.pending).toBe(false);

    stop(); // 重复 stop 安全，不产生额外回调
    expect(() => stop()).not.toThrow();
    expect(cb).toHaveBeenCalledTimes(2);
  });

  it("多 entry 一次回调，once 在首个进入视口的 entry 处断开且后续不再回调", () => {
    const io = stubIO();
    const el = document.createElement("div");
    const cb = vi.fn();
    onElementVisible(el, cb, { once: true });

    io.emit(io.entry(false), io.entry(true, 0.6), io.entry(false));
    expect(cb).toHaveBeenCalledTimes(2); // 第三个 entry 不再回调
    expect(io.disconnect).toHaveBeenCalled();
  });

  it("stop 幂等，重复调用不抛错", () => {
    const io = stubIO();
    const el = document.createElement("div");
    const stop = onElementVisible(el, vi.fn());
    stop();
    expect(io.disconnect).toHaveBeenCalledTimes(1);
    expect(() => stop()).not.toThrow();
  });

  it("无 IntersectionObserver 环境（SSR/旧浏览器）返回 noop", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const el = document.createElement("div");
    const stop = onElementVisible(el, vi.fn());
    expect(() => stop()).not.toThrow();
  });
});
