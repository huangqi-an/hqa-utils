// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prefetchWhenIdle } from "./prefetchWhenIdle.js";

type RicDeadline = { timeRemaining: () => number; didTimeout: boolean };

let ricCb: ((d: RicDeadline) => void) | null = null;

function runIdle(remaining: number, didTimeout = false): void {
  const cb = ricCb;
  ricCb = null;
  cb?.({ timeRemaining: () => remaining, didTimeout });
}

function prefetchedHrefs(): string[] {
  return Array.from(document.head.querySelectorAll("link[rel=prefetch]")).map(
    (l) => l.getAttribute("href") ?? "",
  );
}

beforeEach(() => {
  vi.stubGlobal("requestIdleCallback", (cb: (d: RicDeadline) => void) => {
    ricCb = cb;
    return 1;
  });
  vi.stubGlobal("cancelIdleCallback", () => {});
});

afterEach(() => {
  document.head.innerHTML = "";
  vi.unstubAllGlobals();
});

describe("prefetchWhenIdle", () => {
  it("空闲时按顺序批量插入 prefetch link", () => {
    prefetchWhenIdle(["https://p.a/1.css", "https://p.a/2.css", "https://p.a/3.css"]);
    runIdle(50);
    expect(prefetchedHrefs()).toEqual([
      "https://p.a/1.css",
      "https://p.a/2.css",
      "https://p.a/3.css",
    ]);
  });

  it("空闲切片用尽时分帧插入（每批至少推进一个）", () => {
    prefetchWhenIdle(["https://p.b/1.css", "https://p.b/2.css", "https://p.b/3.css"]);
    runIdle(0);
    expect(prefetchedHrefs()).toEqual(["https://p.b/1.css"]);
    runIdle(0);
    expect(prefetchedHrefs()).toEqual(["https://p.b/1.css", "https://p.b/2.css"]);
    runIdle(5);
    expect(prefetchedHrefs()).toHaveLength(3);
  });

  it("stop 后未执行的 URL 不再插入", () => {
    const stop = prefetchWhenIdle(["https://p.c/1.css", "https://p.c/2.css"]);
    runIdle(0);
    expect(prefetchedHrefs()).toEqual(["https://p.c/1.css"]);
    stop();
    runIdle(50);
    expect(prefetchedHrefs()).toEqual(["https://p.c/1.css"]);
  });

  it("数组内重复 URL 与跨调用重复 URL 均去重", () => {
    prefetchWhenIdle(["https://p.d/x.css", "https://p.d/x.css"]);
    runIdle(50);
    expect(prefetchedHrefs()).toEqual(["https://p.d/x.css"]);
    prefetchWhenIdle(["https://p.d/x.css", "https://p.d/y.css"]);
    runIdle(50);
    expect(prefetchedHrefs()).toEqual(["https://p.d/x.css", "https://p.d/y.css"]);
  });

  it("timeout 选项被接受，队列兜底推进", () => {
    prefetchWhenIdle(["https://p.e/1.css"], { timeout: 1000 });
    runIdle(0, true);
    expect(prefetchedHrefs()).toEqual(["https://p.e/1.css"]);
  });

  it("SSR（无 document）返回空操作 stop", () => {
    vi.stubGlobal("document", undefined);
    const stop = prefetchWhenIdle(["https://p.f/1.css"]);
    expect(typeof stop).toBe("function");
    expect(() => stop()).not.toThrow();
    vi.unstubAllGlobals();
  });
});
