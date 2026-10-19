// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { getMousePosition, onMousePositionChange } from "./position.js";

function moveMouse(x: number, y: number): void {
  window.dispatchEvent(
    new MouseEvent("mousemove", { clientX: x, clientY: y }),
  );
}

describe("position（鼠标位置跟踪）", () => {
  /** 收集所有订阅的取消函数，测试结束后统一清理模块级单例状态 */
  const offs: Array<() => void> = [];
  const track = (listener: Parameters<typeof onMousePositionChange>[0]) => {
    const off = onMousePositionChange(listener);
    offs.push(off);
    return off;
  };

  afterEach(() => {
    while (offs.length) offs.pop()!();
  });

  it("无订阅时返回 null，mousemove 也不产生缓存", () => {
    expect(getMousePosition()).toBeNull();
    moveMouse(10, 20);
    expect(getMousePosition()).toBeNull();
  });

  it("订阅后 mousemove 更新位置并触发回调", () => {
    const listener = vi.fn();
    track(listener);
    moveMouse(10, 20);
    expect(listener).toHaveBeenCalledWith({ x: 10, y: 20 });
    expect(getMousePosition()).toEqual({ x: 10, y: 20 });
  });

  it("多个订阅都收到回调", () => {
    const a = vi.fn();
    const b = vi.fn();
    track(a);
    track(b);
    moveMouse(5, 6);
    expect(a).toHaveBeenCalledWith({ x: 5, y: 6 });
    expect(b).toHaveBeenCalledWith({ x: 5, y: 6 });
  });

  it("取消部分订阅后其余订阅仍正常", () => {
    const a = vi.fn();
    const b = vi.fn();
    const offA = track(a);
    track(b);
    offA();
    moveMouse(1, 2);
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledWith({ x: 1, y: 2 });
    expect(getMousePosition()).toEqual({ x: 1, y: 2 });
  });

  it("最后一个订阅取消后停止监听并清空缓存", () => {
    const listener = vi.fn();
    const off = track(listener);
    moveMouse(1, 2);
    expect(getMousePosition()).toEqual({ x: 1, y: 2 });
    off();
    moveMouse(3, 4);
    expect(getMousePosition()).toBeNull();
  });

  it("取消函数幂等，重复调用不产生副作用", () => {
    const listener = vi.fn();
    const off = track(listener);
    off();
    expect(() => off()).not.toThrow();
    // 新订阅保持活跃；若幂等失效（重复减计数），此订阅会被错误解绑
    track(vi.fn());
    moveMouse(7, 8);
    expect(getMousePosition()).toEqual({ x: 7, y: 8 });
  });

  it("SSR（无 window）下订阅返回 noop，位置始终为 null", () => {
    vi.stubGlobal("window", undefined);
    const off = onMousePositionChange(vi.fn());
    expect(getMousePosition()).toBeNull();
    off();
    vi.unstubAllGlobals();
  });
});
