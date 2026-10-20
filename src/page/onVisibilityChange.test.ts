// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { onVisibilityChange } from "./onVisibilityChange.js";

function setVisibility(state: "visible" | "hidden"): void {
  // SSR 用例会把 document stub 掉，此时无需恢复
  if (typeof document === "undefined") return;
  Object.defineProperty(document, "visibilityState", {
    value: state,
    configurable: true,
  });
}

describe("onVisibilityChange（页面可见性订阅）", () => {
  afterEach(() => {
    setVisibility("visible");
    vi.unstubAllGlobals();
  });

  it("订阅时立即同步回调当前状态", () => {
    const states: boolean[] = [];
    const unsubscribe = onVisibilityChange((visible) => states.push(visible));
    expect(states).toEqual([true]);
    unsubscribe();
  });

  it("visibilitychange 事件触发对应回调", () => {
    const states: boolean[] = [];
    const unsubscribe = onVisibilityChange((visible) => states.push(visible));
    setVisibility("hidden");
    document.dispatchEvent(new Event("visibilitychange"));
    setVisibility("visible");
    document.dispatchEvent(new Event("visibilitychange"));
    expect(states).toEqual([true, false, true]);
    unsubscribe();
  });

  it("取消订阅后不再回调", () => {
    const states: boolean[] = [];
    const unsubscribe = onVisibilityChange((visible) => states.push(visible));
    unsubscribe();
    setVisibility("hidden");
    document.dispatchEvent(new Event("visibilitychange"));
    expect(states).toEqual([true]);
  });

  it("非浏览器环境返回 noop 不抛错", () => {
    vi.stubGlobal("document", undefined);
    const unsubscribe = onVisibilityChange(() => {});
    expect(typeof unsubscribe).toBe("function");
    expect(() => unsubscribe()).not.toThrow();
  });
});
