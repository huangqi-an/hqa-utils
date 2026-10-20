// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { onCspViolation } from "./onCspViolation.js";

function fireViolation(): Event {
  const event = new Event("securitypolicyviolation");
  document.dispatchEvent(event);
  return event;
}

describe("onCspViolation（CSP 违规监听）", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("dispatch 违规事件时触发回调，参数为事件对象", () => {
    const cb = vi.fn();
    onCspViolation(cb);
    const event = fireViolation();
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb.mock.calls[0]![0]).toBe(event);
  });

  it("其他事件不触发", () => {
    const cb = vi.fn();
    onCspViolation(cb);
    document.dispatchEvent(new Event("click"));
    document.dispatchEvent(new Event("securitypolicychange"));
    expect(cb).not.toHaveBeenCalled();
  });

  it("取消监听后不再触发", () => {
    const cb = vi.fn();
    const stop = onCspViolation(cb);
    stop();
    fireViolation();
    expect(cb).not.toHaveBeenCalled();
  });

  it("多个监听器互不影响，各自可独立取消", () => {
    const cbA = vi.fn();
    const cbB = vi.fn();
    const stopA = onCspViolation(cbA);
    onCspViolation(cbB);

    fireViolation();
    expect(cbA).toHaveBeenCalledTimes(1);
    expect(cbB).toHaveBeenCalledTimes(1);

    stopA();
    fireViolation();
    expect(cbA).toHaveBeenCalledTimes(1);
    expect(cbB).toHaveBeenCalledTimes(2);
  });

  it("非浏览器环境返回 noop", () => {
    vi.stubGlobal("document", undefined);
    const stop = onCspViolation(() => {});
    expect(() => stop()).not.toThrow();
  });
});
