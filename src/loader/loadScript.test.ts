// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadScript } from "./loadScript.js";
import { TimeoutError } from "../async/withTimeout.js";

function headScripts(): HTMLScriptElement[] {
  return Array.from(document.head.querySelectorAll("script"));
}

function settleAll(kind: "load" | "error"): void {
  for (const el of headScripts()) el.dispatchEvent(new Event(kind));
}

describe("loadScript（动态加载脚本）", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("创建 script 标签插入 head，load 后 resolve", async () => {
    const promise = loadScript("/a.js");
    const scripts = headScripts();
    expect(scripts).toHaveLength(1);
    expect(scripts[0]?.src).toContain("/a.js");

    settleAll("load");
    await expect(promise).resolves.toBeUndefined();
  });

  it("并发同 URL 只插入一个标签，共享同一次加载", async () => {
    const a = loadScript("/b.js");
    const b = loadScript("/b.js");
    expect(headScripts()).toHaveLength(1);

    settleAll("load");
    await Promise.all([a, b]);
  });

  it("成功后再次调用直接走缓存，不新增标签", async () => {
    const first = loadScript("/c.js");
    settleAll("load");
    await first;
    expect(headScripts()).toHaveLength(1);

    await loadScript("/c.js"); // 立即 resolve，无需手动派发事件
    expect(headScripts()).toHaveLength(1);
  });

  it("加载失败 reject，清缓存后可重新加载", async () => {
    const first = loadScript("/d.js");
    settleAll("error");
    await expect(first).rejects.toThrow("Failed to load script: /d.js");

    // 缓存已清：再次调用插入新标签
    const second = loadScript("/d.js");
    expect(headScripts()).toHaveLength(2);
    settleAll("load");
    await expect(second).resolves.toBeUndefined();
  });

  it("timeout 超时以 TimeoutError reject", async () => {
    vi.useFakeTimers();
    try {
      const promise = loadScript("/slow.js", { timeout: 50 });
      const assertion = expect(promise).rejects.toBeInstanceOf(TimeoutError);
      await vi.advanceTimersByTimeAsync(50);
      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });

  it("attrs 透传到标签属性", () => {
    void loadScript("/e.js", {
      attrs: { integrity: "sha384-abc", crossOrigin: "anonymous" },
    });
    const el = headScripts()[0]!;
    expect(el.getAttribute("integrity")).toBe("sha384-abc");
    expect(el.getAttribute("crossorigin")).toBe("anonymous");
  });

  it("attrs 不覆盖 URL 相关属性", () => {
    void loadScript("/f.js", { attrs: { src: "/evil.js" } });
    expect(headScripts()[0]?.src).toContain("/f.js");
  });

  it("非浏览器环境 resolve 空操作", async () => {
    vi.stubGlobal("document", undefined);
    await expect(loadScript("/g.js")).resolves.toBeUndefined();
  });
});
