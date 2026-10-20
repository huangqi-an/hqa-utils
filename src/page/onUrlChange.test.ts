// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { onUrlChange } from "./onUrlChange.js";

describe("onUrlChange（URL 变化监听）", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("订阅时立即回调当前 URL", () => {
    const urls: string[] = [];
    const stop = onUrlChange((url) => urls.push(url));
    expect(urls).toEqual([location.href]);
    stop();
  });

  it("pushState 触发回调新 URL", () => {
    const urls: string[] = [];
    const stop = onUrlChange((url) => urls.push(url));
    history.pushState(null, "", "/list");
    expect(urls.length).toBe(2);
    expect(urls.at(-1)).toBe(new URL("/list", location.href).href);
    stop();
  });

  it("replaceState 触发回调新 URL", () => {
    const urls: string[] = [];
    const stop = onUrlChange((url) => urls.push(url));
    history.replaceState(null, "", "/profile");
    expect(urls.length).toBe(2);
    expect(urls.at(-1)).toBe(new URL("/profile", location.href).href);
    stop();
  });

  it("URL 实际未变化时不重复回调", () => {
    const urls: string[] = [];
    const stop = onUrlChange((url) => urls.push(url));
    history.pushState(null, "", "/"); // 与当前 URL 相同
    expect(urls.length).toBe(1);
    stop();
  });

  it("popstate（前进/后退）触发回调", () => {
    const urls: string[] = [];
    const stop = onUrlChange((url) => urls.push(url));
    // 绕过实例 hook 模拟"URL 已变但监听还没收到通知"（等价于浏览器真实后退）
    History.prototype.pushState.call(history, null, "", "/hidden");
    expect(urls.length).toBe(1); // pushState 被 hook 不到，未触发
    window.dispatchEvent(new Event("popstate"));
    expect(urls.length).toBe(2);
    expect(urls.at(-1)).toBe(new URL("/hidden", location.href).href);
    stop();
  });

  it("多个订阅者都能收到回调", () => {
    const urlsA: string[] = [];
    const urlsB: string[] = [];
    const stopA = onUrlChange((url) => urlsA.push(url));
    const stopB = onUrlChange((url) => urlsB.push(url));
    history.pushState(null, "", "/shared");
    expect(urlsA.length).toBe(2);
    expect(urlsB.length).toBe(2);
    stopA();
    stopB();
  });

  it("取消订阅后不再回调，最后一个取消时还原被包装的方法", () => {
    const urls: string[] = [];
    const stop = onUrlChange((url) => urls.push(url));
    stop();
    history.pushState(null, "", "/after");
    expect(urls.length).toBe(1); // 只有订阅时的初始回调
    expect(history.pushState).toBe(History.prototype.pushState); // 已还原
  });

  it("非浏览器环境返回 noop", () => {
    vi.stubGlobal("window", undefined);
    const stop = onUrlChange(() => {});
    expect(typeof stop).toBe("function");
    expect(() => stop()).not.toThrow();
  });
});
