// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { dnsPrefetch, preconnectTo } from "./preconnect.js";

afterEach(() => {
  document.head.innerHTML = "";
});

describe("preconnectTo", () => {
  it("插入 link[rel=preconnect]，href 归一为 origin 并带 crossOrigin=anonymous", () => {
    const ok = preconnectTo("https://fonts.example.com/css?family=x");
    expect(ok).toBe(true);
    const link = document.head.querySelector<HTMLLinkElement>("link[rel=preconnect]");
    expect(link).not.toBeNull();
    expect(link!.getAttribute("href")).toBe("https://fonts.example.com");
    expect(link!.crossOrigin).toBe("anonymous");
  });

  it("同一 origin 重复调用跳过，返回 false", () => {
    expect(preconnectTo("https://a.example.com/x.js")).toBe(true);
    expect(preconnectTo("https://a.example.com/y.css")).toBe(false);
    expect(document.head.querySelectorAll("link[rel=preconnect]").length).toBe(1);
  });

  it("非法 URL 返回 false 且不插入", () => {
    expect(preconnectTo("not a url")).toBe(false);
    expect(document.head.querySelector("link")).toBeNull();
  });

  it("SSR（无 document）返回 false", () => {
    vi.stubGlobal("document", undefined);
    expect(preconnectTo("https://a.example.com")).toBe(false);
    vi.unstubAllGlobals();
  });
});

describe("dnsPrefetch", () => {
  it("插入 link[rel=dns-prefetch]，无 crossOrigin", () => {
    const ok = dnsPrefetch("https://api.example.com/v1/data");
    expect(ok).toBe(true);
    const link = document.head.querySelector<HTMLLinkElement>("link[rel=dns-prefetch]");
    expect(link).not.toBeNull();
    expect(link!.getAttribute("href")).toBe("https://api.example.com");
    expect(link!.crossOrigin).toBeNull();
  });

  it("同一 origin 去重，且与 preconnect 互不干扰", () => {
    expect(dnsPrefetch("https://b.example.com")).toBe(true);
    expect(dnsPrefetch("https://b.example.com/x")).toBe(false);
    expect(preconnectTo("https://b.example.com")).toBe(true);
    expect(document.head.querySelectorAll("link").length).toBe(2);
  });
});
