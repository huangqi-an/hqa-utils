// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { raf, waitFrames } from "./raf.js";

type RafCallback = (time: number) => void;

describe("raf / waitFrames（帧等待）", () => {
  let callbacks: RafCallback[] = [];

  function stubRaf(): void {
    vi.stubGlobal("requestAnimationFrame", (cb: RafCallback) => {
      callbacks.push(cb);
      return callbacks.length;
    });
  }

  /** 手动触发所有已注册的帧回调（模拟浏览器绘制一帧） */
  function triggerFrame(time: number): void {
    const pending = callbacks;
    callbacks = [];
    for (const cb of pending) cb(time);
  }

  afterEach(() => {
    callbacks = [];
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("无参调用 resolve 帧时间戳", async () => {
    stubRaf();
    const p = raf();
    triggerFrame(1000);
    await expect(p).resolves.toBe(1000);
  });

  it("带 fn 时在下一帧执行并 resolve 返回值", async () => {
    stubRaf();
    const fn = vi.fn((time: number) => time * 2);
    const p = raf(fn);
    triggerFrame(500);
    await expect(p).resolves.toBe(1000);
    expect(fn).toHaveBeenCalledWith(500);
  });

  it("帧未触发前保持 pending", async () => {
    stubRaf();
    const results: number[] = [];
    raf().then((t) => results.push(t));
    expect(results).toHaveLength(0);
    triggerFrame(100);
    await vi.waitFor(() => expect(results).toHaveLength(1));
  });

  it("fn 抛错时 Promise 拒绝（rAF 回调异常不会自动 reject）", async () => {
    stubRaf();
    const error = new Error("boom");
    const p = raf(() => {
      throw error;
    });
    triggerFrame(100);
    await expect(p).rejects.toBe(error);
  });

  it("无 rAF 环境降级为 setTimeout 16ms", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("requestAnimationFrame", undefined);
    const results: number[] = [];
    raf().then((t) => results.push(t));
    await vi.advanceTimersByTimeAsync(15);
    expect(results).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(results).toHaveLength(1);
    expect(results[0]).toBeGreaterThan(0);
  });

  describe("waitFrames", () => {
    it("等待 1 帧", async () => {
      stubRaf();
      const p = waitFrames(1);
      triggerFrame(100);
      await expect(p).resolves.toBe(100);
    });

    it("等待 3 帧时逐帧推进，未满帧数不 resolve", async () => {
      stubRaf();
      const p = waitFrames(3);
      const times: number[] = [];
      p.then((t) => times.push(t));
      // 每帧之间需排空微任务，waitFrames 才会注册下一帧回调
      const flush = async () => {
        for (let i = 0; i < 5; i++) await Promise.resolve();
      };
      triggerFrame(100);
      await flush();
      triggerFrame(200);
      await flush();
      expect(times).toHaveLength(0);
      triggerFrame(300);
      await p;
      expect(times).toEqual([300]);
    });

    it.each([0, -1, 1.5])("n 为 %p 时 Promise 拒绝 RangeError", async (n) => {
      await expect(waitFrames(n)).rejects.toThrow(RangeError);
    });
  });
});
