// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { smoothScrollTo } from "./smoothScrollTo.js";

function stubViewport(scrollHeight: number, innerHeight: number): void {
  Object.defineProperty(document.documentElement, "scrollHeight", {
    value: scrollHeight,
    configurable: true,
  });
  Object.defineProperty(window, "innerHeight", { value: innerHeight, configurable: true });
}

describe("smoothScrollTo（平滑滚动）", () => {
  let scrollToMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    scrollToMock = vi.fn();
    vi.stubGlobal("scrollTo", scrollToMock);
    // 窗口可滚动范围：3000 - 800 = 2200
    stubViewport(3000, 800);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("数字目标：滚动到绝对像素位置", () => {
    smoothScrollTo(500);
    expect(scrollToMock).toHaveBeenCalledWith({ top: 500, behavior: "smooth" });
  });

  it("目标越界收敛到 [0, max]", () => {
    smoothScrollTo(-100);
    expect(scrollToMock).toHaveBeenLastCalledWith({ top: 0, behavior: "smooth" });
    smoothScrollTo(99999);
    expect(scrollToMock).toHaveBeenLastCalledWith({ top: 2200, behavior: "smooth" });
  });

  it('"top" / "bottom" 目标', () => {
    smoothScrollTo("top");
    expect(scrollToMock).toHaveBeenLastCalledWith({ top: 0, behavior: "smooth" });
    smoothScrollTo("bottom");
    expect(scrollToMock).toHaveBeenLastCalledWith({ top: 2200, behavior: "smooth" });
  });

  it("offset 附加偏移", () => {
    smoothScrollTo(500, { offset: -80 });
    expect(scrollToMock).toHaveBeenCalledWith({ top: 420, behavior: "smooth" });
  });

  it("behavior 选项透传", () => {
    smoothScrollTo(500, { behavior: "auto" });
    expect(scrollToMock).toHaveBeenCalledWith({ top: 500, behavior: "auto" });
  });

  it("用户偏好减少动画时改为瞬时滚动", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    smoothScrollTo(500);
    expect(scrollToMock).toHaveBeenCalledWith({ top: 500, behavior: "auto" });
  });

  it("元素目标（窗口容器）：按元素位置计算", () => {
    Object.defineProperty(window, "scrollY", { value: 200, configurable: true });
    const el = document.createElement("div");
    el.getBoundingClientRect = () => ({ top: 1200 }) as DOMRect;
    smoothScrollTo(el);
    expect(scrollToMock).toHaveBeenCalledWith({ top: 1400, behavior: "smooth" });
  });

  it("指定容器时滚动容器而非窗口", () => {
    const container = document.createElement("div");
    Object.defineProperty(container, "scrollHeight", { value: 2000, configurable: true });
    Object.defineProperty(container, "clientHeight", { value: 500, configurable: true });
    Object.defineProperty(container, "scrollTop", { value: 50, configurable: true });
    const containerScrollTo = vi.fn();
    Object.defineProperty(container, "scrollTo", {
      value: containerScrollTo,
      configurable: true,
    });

    const el = document.createElement("div");
    el.getBoundingClientRect = () => ({ top: 300 }) as DOMRect;
    container.getBoundingClientRect = () => ({ top: 100 }) as DOMRect;

    smoothScrollTo(el, { container });
    expect(containerScrollTo).toHaveBeenCalledWith({ top: 250, behavior: "smooth" });
    expect(scrollToMock).not.toHaveBeenCalled();
  });

  it("非浏览器环境直接返回", () => {
    vi.stubGlobal("window", undefined);
    expect(() => smoothScrollTo(500)).not.toThrow();
  });
});
