// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { onFpsChange } from "./onFpsChange.js";
import type { FpsSample } from "./onFpsChange.js";

describe("onFpsChange（帧率监测）", () => {
  let frameCbs: FrameRequestCallback[];

  /** stub rAF：收集回调，emitFrame() 手动派发一帧（onRafLoop 每帧后自动重新注册） */
  function stubRaf(): void {
    frameCbs = [];
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      frameCbs.push(cb);
      return frameCbs.length;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  }

  function emitFrames(count: number): void {
    for (let i = 0; i < count; i++) {
      const cbs = frameCbs.splice(0);
      cbs.forEach((cb) => cb(0));
    }
  }

  beforeEach(() => {
    vi.useFakeTimers();
    stubRaf();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("1 秒 60 帧 → 回调 fps 60", () => {
    const cb = vi.fn();
    onFpsChange(cb);

    emitFrames(60);
    vi.advanceTimersByTime(1000);

    expect(cb).toHaveBeenCalledTimes(1);
    const sample = cb.mock.calls[0]![0] as FpsSample;
    expect(sample.fps).toBe(60);
    expect(sample.frames).toBe(60);
    expect(sample.elapsed).toBe(1000);
  });

  it("1 秒 15 帧（掉帧）→ 回调 fps 15", () => {
    const cb = vi.fn();
    onFpsChange(cb);

    emitFrames(15);
    vi.advanceTimersByTime(1000);

    const sample = cb.mock.calls[0]![0] as FpsSample;
    expect(sample.fps).toBe(15);
    expect(sample.frames).toBe(15);
  });

  it("窗口连续结算：第二窗口重新计数", () => {
    const cb = vi.fn();
    onFpsChange(cb);

    emitFrames(60);
    vi.advanceTimersByTime(1000);
    emitFrames(30);
    vi.advanceTimersByTime(1000);

    expect(cb).toHaveBeenCalledTimes(2);
    expect((cb.mock.calls[1]![0] as FpsSample).fps).toBe(30);
  });

  it("interval 自定义采样窗口", () => {
    const cb = vi.fn();
    onFpsChange(cb, { interval: 500 });

    emitFrames(30);
    vi.advanceTimersByTime(500);

    expect(cb).toHaveBeenCalledTimes(1);
    expect((cb.mock.calls[0]![0] as FpsSample).fps).toBe(60);
  });

  it("窗口内无帧（后台 rAF 暂停）跳过结算，不回调", () => {
    const cb = vi.fn();
    onFpsChange(cb);

    vi.advanceTimersByTime(3000); // 一帧都没发

    expect(cb).not.toHaveBeenCalled();
  });

  it("页面隐藏时跳过结算", () => {
    const cb = vi.fn();
    onFpsChange(cb);
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });

    emitFrames(60);
    vi.advanceTimersByTime(1000);

    expect(cb).not.toHaveBeenCalled();
  });

  it("stop 后不再结算", () => {
    const cb = vi.fn();
    const stop = onFpsChange(cb);
    emitFrames(60);
    stop();

    vi.advanceTimersByTime(1000);
    expect(cb).not.toHaveBeenCalled();
  });

  it("非浏览器环境返回 noop", () => {
    vi.stubGlobal("window", undefined);
    const stop = onFpsChange(() => {});
    expect(() => stop()).not.toThrow();
  });
});
