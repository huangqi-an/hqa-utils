// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { getCssVar, setCssVars } from "./cssVars.js";

describe("getCssVar（读取 CSS 变量）", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("读取生效值并 trim 前导空格", () => {
    document.body.innerHTML = `<div id="el"></div>`;
    const el = document.getElementById("el")!;
    vi.spyOn(window, "getComputedStyle").mockReturnValue({
      getPropertyValue: (name: string) => (name === "--color" ? " red " : ""),
    } as unknown as CSSStyleDeclaration);

    expect(getCssVar(el, "color")).toBe("red");
  });

  it("未设置 / 空串返回 null", () => {
    document.body.innerHTML = `<div id="el"></div>`;
    const el = document.getElementById("el")!;
    vi.spyOn(window, "getComputedStyle").mockReturnValue({
      getPropertyValue: () => "",
    } as unknown as CSSStyleDeclaration);

    expect(getCssVar(el, "color")).toBeNull();
  });

  it("前缀规范化：未带 -- 自动补全，带 -- 原样", () => {
    document.body.innerHTML = `<div id="el"></div>`;
    const el = document.getElementById("el")!;
    const getPropertyValue = vi.fn(() => "x");
    vi.spyOn(window, "getComputedStyle").mockReturnValue({
      getPropertyValue,
    } as unknown as CSSStyleDeclaration);

    getCssVar(el, "color");
    expect(getPropertyValue).toHaveBeenCalledWith("--color");

    getCssVar(el, "--other");
    expect(getPropertyValue).toHaveBeenCalledWith("--other");
  });

  it("读取真实内联设置的自定义属性", () => {
    document.body.innerHTML = `<div id="el"></div>`;
    const el = document.getElementById("el")!;
    el.style.setProperty("--size", "12px");
    // jsdom 的 getComputedStyle 会反映内联样式
    expect(getCssVar(el, "size")).toBe("12px");
  });

  it("元素无效或非浏览器环境返回 null", () => {
    vi.stubGlobal("window", undefined);
    expect(getCssVar(null as unknown as Element, "color")).toBeNull();
  });
});

describe("setCssVars（批量写入 CSS 变量）", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    vi.unstubAllGlobals();
  });

  it("批量设置多个变量（前缀自动补全）", () => {
    document.body.innerHTML = `<div id="el"></div>`;
    const el = document.getElementById("el")!;
    setCssVars(el, {
      "--bg": "#1a1a2e",
      fg: "#eaeaea",
    });
    expect(el.style.getPropertyValue("--bg")).toBe("#1a1a2e");
    expect(el.style.getPropertyValue("--fg")).toBe("#eaeaea");
  });

  it("值为 null 时删除变量", () => {
    document.body.innerHTML = `<div id="el"></div>`;
    const el = document.getElementById("el")!;
    el.style.setProperty("--old", "x");
    expect(el.style.getPropertyValue("--old")).toBe("x");

    setCssVars(el, { "--old": null });
    expect(el.style.getPropertyValue("--old")).toBe("");
  });

  it("覆盖已有值", () => {
    document.body.innerHTML = `<div id="el"></div>`;
    const el = document.getElementById("el")!;
    setCssVars(el, { "--bg": "black" });
    setCssVars(el, { "--bg": "white" });
    expect(el.style.getPropertyValue("--bg")).toBe("white");
  });

  it("空变量表为空操作", () => {
    document.body.innerHTML = `<div id="el"></div>`;
    const el = document.getElementById("el")!;
    expect(() => setCssVars(el, {})).not.toThrow();
  });

  it("元素无效时为空操作不抛错", () => {
    expect(() =>
      setCssVars(null as unknown as HTMLElement, { "--bg": "red" }),
    ).not.toThrow();
  });
});
