// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { preloadResource } from "./preloadResource.js";

/** 在 head 中找到指定 href 的 link 标签 */
function findLink(href: string): HTMLLinkElement | null {
  return document.head.querySelector(`link[href="${href}"]`);
}

/** 触发指定 link 的 load / error 事件 */
function fire(link: HTMLLinkElement, type: "load" | "error"): void {
  link.dispatchEvent(new Event(type));
}

afterEach(() => {
  document.head.innerHTML = "";
});

describe("preloadResource", () => {
  it("创建 link[rel=preload] 并在 load 时 resolve", async () => {
    const url = "https://cdn.example.com/app.js";
    const p = preloadResource(url);
    const link = findLink(url);
    expect(link).not.toBeNull();
    expect(link!.rel).toBe("preload");
    expect(link!.as).toBe("script");
    fire(link!, "load");
    await expect(p).resolves.toBeUndefined();
  });

  it("按扩展名推断 as 类型", () => {
    const cases: Array<[string, string]> = [
      ["a.css", "style"],
      ["f.woff2", "font"],
      ["i.webp", "image"],
      ["s.mp4", "video"],
      ["s.mp3", "audio"],
      ["s.vtt", "track"],
      ["d.json", "fetch"],
      ["r.wasm", "fetch"],
      ["m.mjs", "script"],
    ];
    for (const [file, expected] of cases) {
      const url = `https://cdn.example.com/${file}`;
      preloadResource(url).catch(() => {});
      expect(findLink(url)!.as).toBe(expected);
    }
  });

  it("URL 带 query/hash 也能推断", () => {
    const url = "https://cdn.example.com/logo.png?v=2#x";
    preloadResource(url).catch(() => {});
    expect(findLink(url)!.as).toBe("image");
  });

  it("推断不出 as 时抛 RangeError", () => {
    expect(() => preloadResource("https://cdn.example.com/file.unknownext")).toThrow(
      RangeError,
    );
    expect(() => preloadResource("https://cdn.example.com/noext")).toThrow(RangeError);
  });

  it("显式 as 覆盖扩展名推断", () => {
    const url = "https://cdn.example.com/data.bin";
    preloadResource(url, { as: "fetch" }).catch(() => {});
    expect(findLink(url)!.as).toBe("fetch");
  });

  it("font 默认 crossOrigin=anonymous，其他类型不设置", () => {
    const fontUrl = "https://cdn.example.com/only-font.woff2";
    const jsUrl = "https://cdn.example.com/only-js.js";
    preloadResource(fontUrl).catch(() => {});
    preloadResource(jsUrl).catch(() => {});
    expect(findLink(fontUrl)!.crossOrigin).toBe("anonymous");
    expect(findLink(jsUrl)!.crossOrigin).toBeNull();
  });

  it("error 时 reject 并移除 link，重试可重新发起", async () => {
    const url = "https://cdn.example.com/bad.js";
    const first = preloadResource(url);
    const link = findLink(url)!;
    fire(link, "error");
    await expect(first).rejects.toThrow("预加载失败");
    expect(findLink(url)).toBeNull();

    // 失败不缓存：再次调用重新创建 link
    const second = preloadResource(url);
    expect(findLink(url)).not.toBeNull();
    fire(findLink(url)!, "load");
    await expect(second).resolves.toBeUndefined();
  });

  it("相同 as:url 去重复用同一 Promise", async () => {
    const url = "https://cdn.example.com/dup.css";
    const a = preloadResource(url);
    const b = preloadResource(url);
    const link = findLink(url)!;
    expect(document.head.querySelectorAll("link[href]").length).toBe(1);
    fire(link, "load");
    await Promise.all([a, b]);
  });

  it("同 URL 不同 as 视为不同资源", async () => {
    const url = "https://cdn.example.com/both.json";
    const fetchP = preloadResource(url, { as: "fetch" });
    // json 推断也是 fetch，换一个类型强制不同
    const styleP = preloadResource(url.replace("both.json", "x.css"), { as: "style" });
    const link = findLink(url)!;
    fire(link, "load");
    fire(findLink(url.replace("both.json", "x.css"))!, "load");
    await Promise.all([fetchP, styleP]);
  });

  it("SSR（无 document）静默 resolve", async () => {
    vi.stubGlobal("document", undefined);
    await expect(preloadResource("https://cdn.example.com/ssr.js")).resolves.toBeUndefined();
    vi.unstubAllGlobals();
  });
});
