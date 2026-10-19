// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { onRafLoop } from "./onRafLoop.js";

describe("onRafLoop（动画循环）", () => {
  interface PendingFrame {
    id: number;
    cb: (time: number) => void;
  }

  let frames: PendingFrame[] = [];
  let nextId = 1;

  function stubRaf(): void {
    nextId = 1;
    frames = [];
    vi.stubGlobal("requestAnimationFrame", (cb: (time: number) => void) => {
      const id = nextId++;
      frames.push({ id, cb });
      return id;
    });
    vi.stubGlobal("cancelAnimationFrame", (id: number) => {
      frames = frames.filter((f) => f.id !== id);
    });
  }

  function triggerFrame(time: number): void {
    const pending = frames;
    frames = [];
    for (const { cb } of pending) cb(time);
  }

  afterEach(() => {
    frames = [];
    vi.unstubAllGlobals();
  });

  it("每帧调用回调，time 与 delta 正确，首帧 delta 为 0", () => {
    stubRaf();
    const cb = vi.fn();
    onRafLoop(cb);
    triggerFrame(1000);
    triggerFrame(1016);
    triggerFrame(1048);
    expect(cb).toHaveBeenCalledTimes(3);
    expect(cb).toHaveBeenNthCalledWith(1, 1000, 0);
    expect(cb).toHaveBeenNthCalledWith(2, 1016, 16);
    expect(cb).toHaveBeenNthCalledWith(3, 1048, 32);
  });

  it("stop() 后不再触发后续帧", () => {
    stubRaf();
    const cb = vi.fn();
    const stop = onRafLoop(cb);
    triggerFrame(1000);
    stop();
    triggerFrame(1016);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("stop() 通过 cancelAnimationFrame 撤销已注册的下一帧", () => {
    stubRaf();
    const stop = onRafLoop(vi.fn());
    triggerFrame(1000);
    // 第一帧执行后已注册第二帧
    expect(frames).toHaveLength(1);
    stop();
    expect(frames).toHaveLength(0);
  });

  it("回调抛错会终止循环", () => {
    stubRaf();
    let calls = 0;
    onRafLoop(() => {
      calls++;
      if (calls === 2) throw new Error("boom");
    });
    triggerFrame(1000);
    expect(() => triggerFrame(1016)).toThrow("boom");
    triggerFrame(1032);
    expect(calls).toBe(2);
  });

  it("stop 可重复调用（幂等）", () => {
    stubRaf();
    const stop = onRafLoop(vi.fn());
    stop();
    expect(() => stop()).not.toThrow();
  });

  it("SSR（无 rAF）返回 noop 不启动循环", () => {
    vi.stubGlobal("requestAnimationFrame", undefined);
    const cb = vi.fn();
    const stop = onRafLoop(cb);
    stop();
    expect(cb).not.toHaveBeenCalled();
  });
});
