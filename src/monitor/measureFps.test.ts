// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { measureFps } from "./measureFps.js";

describe("measureFps（一次性帧率测量）", () => {
  let frameCbs: FrameRequestCallback[];

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

  it("采样 duration 毫秒后 resolve 平均帧率", async () => {
    const promise = measureFps({ duration: 1000 });

    emitFrames(60);
    await vi.advanceTimersByTimeAsync(1000);

    expect(await promise).toMatchObject({ fps: 60, frames: 60, elapsed: 1000 });
  });

  it("duration 自定义", async () => {
    const promise = measureFps({ duration: 500 });

    emitFrames(15);
    await vi.advanceTimersByTimeAsync(500);

    expect(await promise).toMatchObject({ fps: 30, frames: 15, elapsed: 500 });
  });

  it("采样窗口内无帧时继续等待，有帧后才 resolve", async () => {
    const promise = measureFps({ duration: 1000 });

    await vi.advanceTimersByTimeAsync(1000);
    // 窗口无帧被跳过，promise 尚未 resolve
    let resolved: unknown = "pending";
    void promise.then((v) => (resolved = v));
    await Promise.resolve();
    expect(resolved).toBe("pending");

    emitFrames(60);
    await vi.advanceTimersByTimeAsync(1000);
    expect(await promise).toMatchObject({ fps: 60 });
  });

  it("非浏览器环境 resolve null", async () => {
    vi.stubGlobal("window", undefined);
    expect(await measureFps()).toBeNull();
  });
});
