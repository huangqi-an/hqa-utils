// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadStyle } from "./loadStyle.js";

function headLinks(): HTMLLinkElement[] {
  return Array.from(document.head.querySelectorAll("link"));
}

describe("loadStyle（动态加载样式表）", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
  });

  it("创建 link[rel=stylesheet] 插入 head，load 后 resolve", async () => {
    const promise = loadStyle("/theme.css");
    const links = headLinks();
    expect(links).toHaveLength(1);
    expect(links[0]?.rel).toBe("stylesheet");
    expect(links[0]?.href).toContain("/theme.css");

    links[0]!.dispatchEvent(new Event("load"));
    await expect(promise).resolves.toBeUndefined();
  });

  it("并发同 URL 去重，成功后走缓存", async () => {
    const a = loadStyle("/a.css");
    const b = loadStyle("/a.css");
    expect(headLinks()).toHaveLength(1);

    headLinks()[0]!.dispatchEvent(new Event("load"));
    await Promise.all([a, b]);

    await loadStyle("/a.css"); // 缓存：立即 resolve
    expect(headLinks()).toHaveLength(1);
  });

  it("加载失败 reject，清缓存后可重试", async () => {
    const first = loadStyle("/b.css");
    headLinks()[0]!.dispatchEvent(new Event("error"));
    await expect(first).rejects.toThrow("Failed to load style: /b.css");

    const second = loadStyle("/b.css");
    expect(headLinks()).toHaveLength(2);
    headLinks()[1]!.dispatchEvent(new Event("load"));
    await expect(second).resolves.toBeUndefined();
  });

  it("timeout 超时以 TimeoutError reject", async () => {
    vi.useFakeTimers();
    try {
      const promise = loadStyle("/slow.css", { timeout: 50 });
      const assertion = expect(promise).rejects.toThrow("timed out");
      await vi.advanceTimersByTimeAsync(50);
      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });

  it("attrs 透传与 parent 自定义", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    void loadStyle("/c.css", {
      attrs: { media: "(prefers-color-scheme: dark)" },
      parent: container,
    });
    expect(headLinks()).toHaveLength(0);
    const link = container.querySelector("link");
    expect(link?.getAttribute("media")).toBe("(prefers-color-scheme: dark)");
  });

  it("非浏览器环境 resolve 空操作", async () => {
    vi.stubGlobal("document", undefined);
    await expect(loadStyle("/d.css")).resolves.toBeUndefined();
  });
});
