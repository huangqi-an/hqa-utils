// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { onMediaQueryChange } from "./onMediaQueryChange.js";

describe("onMediaQueryChange（媒体查询订阅）", () => {
  type Listener = (event: { matches: boolean }) => void;
  let listeners: Listener[] = [];
  let mql: { matches: boolean; addEventListener: (type: string, cb: Listener) => void; removeEventListener: (type: string, cb: Listener) => void };

  function stubMatchMedia(matches: boolean): void {
    listeners = [];
    mql = {
      matches,
      addEventListener: (_type, cb) => {
        listeners.push(cb);
      },
      removeEventListener: (_type, cb) => {
        listeners = listeners.filter((l) => l !== cb);
      },
    };
    vi.stubGlobal("matchMedia", vi.fn(() => mql));
  }

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("订阅时立即同步回调当前匹配状态", () => {
    stubMatchMedia(true);
    const states: boolean[] = [];
    const unsubscribe = onMediaQueryChange("(min-width: 768px)", (m) => states.push(m));
    expect(states).toEqual([true]);
    unsubscribe();
  });

  it("change 事件触发回调并传递最新 matches", () => {
    stubMatchMedia(false);
    const states: boolean[] = [];
    const unsubscribe = onMediaQueryChange("(min-width: 768px)", (m) => states.push(m));
    for (const l of [...listeners]) l({ matches: true });
    expect(states).toEqual([false, true]);
    unsubscribe();
  });

  it("取消订阅后不再回调", () => {
    stubMatchMedia(false);
    const states: boolean[] = [];
    const unsubscribe = onMediaQueryChange("(min-width: 768px)", (m) => states.push(m));
    unsubscribe();
    for (const l of [...listeners]) l({ matches: true });
    expect(states).toEqual([false]);
  });

  it("非浏览器环境返回空操作且不抛错", () => {
    vi.stubGlobal("window", undefined);
    const states: boolean[] = [];
    const unsubscribe = onMediaQueryChange("(min-width: 768px)", (m) => states.push(m));
    expect(states).toEqual([]);
    expect(() => unsubscribe()).not.toThrow();
  });
});
