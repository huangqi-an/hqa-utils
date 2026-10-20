// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { onNetworkChange } from "./onNetworkChange.js";

describe("onNetworkChange（网络状态订阅）", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(navigator, "onLine");
  });

  it("订阅时立即同步回调当前状态", () => {
    const states: boolean[] = [];
    const unsubscribe = onNetworkChange((online) => states.push(online));
    expect(states).toEqual([true]);
    unsubscribe();
  });

  it("online / offline 事件触发对应回调", () => {
    const states: boolean[] = [];
    const unsubscribe = onNetworkChange((online) => states.push(online));
    // jsdom 不联动 navigator.onLine，手动切换模拟真实浏览器的伴随行为
    Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
    window.dispatchEvent(new Event("offline"));
    Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
    window.dispatchEvent(new Event("online"));
    expect(states).toEqual([true, false, true]);
    unsubscribe();
  });

  it("取消订阅后不再回调", () => {
    const states: boolean[] = [];
    const unsubscribe = onNetworkChange((online) => states.push(online));
    unsubscribe();
    window.dispatchEvent(new Event("offline"));
    expect(states).toEqual([true]);
  });

  it("非浏览器环境返回空操作且不抛错", () => {
    vi.stubGlobal("window", undefined);
    const states: boolean[] = [];
    const unsubscribe = onNetworkChange((online) => states.push(online));
    expect(states).toEqual([]);
    expect(() => unsubscribe()).not.toThrow();
  });
});
