// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { replaceQueryState } from "./replaceQueryState.js";

describe("replaceQueryState（当前页 URL 参数更新）", () => {
  afterEach(() => {
    // 先恢复 stub 的全局对象，再还原初始路径，避免用例间相互影响
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    window.history.replaceState(null, "", "/");
  });

  it("默认用 replaceState 更新参数", () => {
    window.history.replaceState(null, "", "/list?tab=all&page=1");
    const replaceSpy = vi.spyOn(window.history, "replaceState");
    const pushSpy = vi.spyOn(window.history, "pushState");

    replaceQueryState({ page: 2 });

    expect(window.location.search).toBe("?tab=all&page=2");
    expect(replaceSpy).toHaveBeenCalledTimes(1);
    expect(pushSpy).not.toHaveBeenCalled();
  });

  it("值为 null 时删除参数", () => {
    window.history.replaceState(null, "", "/list?tab=all&page=1");
    replaceQueryState({ page: null });
    expect(window.location.search).toBe("?tab=all");
  });

  it("method: push 时走 pushState", () => {
    window.history.replaceState(null, "", "/list?tab=all");
    const replaceSpy = vi.spyOn(window.history, "replaceState");
    const pushSpy = vi.spyOn(window.history, "pushState");

    replaceQueryState({ sort: "price" }, { method: "push" });

    expect(window.location.search).toBe("?tab=all&sort=price");
    expect(pushSpy).toHaveBeenCalledTimes(1);
    expect(replaceSpy).not.toHaveBeenCalled();
  });

  it("hash 保持不变", () => {
    window.history.replaceState(null, "", "/p?a=1#top");
    replaceQueryState({ a: null, b: "2" });
    expect(window.location.search).toBe("?b=2");
    expect(window.location.hash).toBe("#top");
  });

  it("非浏览器环境为空操作且不抛错", () => {
    vi.stubGlobal("window", undefined);
    expect(() => replaceQueryState({ a: "1" })).not.toThrow();
  });
});
