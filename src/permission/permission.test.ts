// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { queryPermission } from "./queryPermission.js";
import { onPermissionChange } from "./onPermissionChange.js";

/** 构造一个可变 state 的假 PermissionStatus（EventTarget 支持 change 监听） */
function makeStatus(state: string): EventTarget & { state: string } {
  const target = new EventTarget() as EventTarget & { state: string };
  Object.defineProperty(target, "state", { value: state, configurable: true });
  return target;
}

/** stub navigator.permissions，query 结果由测试逐个指定（参数与原生一致：{ name } 对象） */
function stubPermissions(
  queryImpl: (options: { name: string }) => Promise<PermissionStatus>,
): void {
  Object.defineProperty(navigator, "permissions", {
    value: { query: vi.fn(queryImpl) },
    configurable: true,
  });
}

function removePermissionsStub(): void {
  if (typeof navigator === "undefined" || !navigator) return;
  delete (navigator as unknown as Record<string, unknown>).permissions;
}

/** 等微任务链（stub query 是 async，then 链需要多轮）走完 */
function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe("queryPermission（权限状态查询）", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    removePermissionsStub();
  });

  it("返回当前状态", async () => {
    stubPermissions(async ({ name }) => {
      expect(name).toBe("geolocation");
      return makeStatus("granted") as PermissionStatus;
    });
    await expect(queryPermission("geolocation")).resolves.toBe("granted");
  });

  it("未知权限名原生抛 TypeError 时返回 null 不抛错", async () => {
    stubPermissions(async () => {
      throw new TypeError("'camera' is not a valid value for enumeration PermissionName.");
    });
    await expect(queryPermission("camera")).resolves.toBeNull();
  });

  it("浏览器不支持 Permissions API 时返回 null", async () => {
    removePermissionsStub();
    await expect(queryPermission("geolocation")).resolves.toBeNull();
  });

  it("非浏览器环境返回 null", async () => {
    vi.stubGlobal("navigator", undefined);
    await expect(queryPermission("geolocation")).resolves.toBeNull();
  });
});

describe("onPermissionChange（权限变化监听）", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    removePermissionsStub();
  });

  it("订阅时立即回调当前状态，change 时回调新状态", async () => {
    const status = makeStatus("prompt");
    stubPermissions(async () => status as PermissionStatus);
    const cb = vi.fn();
    const stop = onPermissionChange("geolocation", cb);

    await flushMicrotasks();
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith("prompt");

    // 用户在设置里改了权限
    Object.defineProperty(status, "state", { value: "granted", configurable: true });
    status.dispatchEvent(new Event("change"));
    expect(cb).toHaveBeenCalledTimes(2);
    expect(cb).toHaveBeenLastCalledWith("granted");

    stop();
  });

  it("取消订阅后不再回调，query 未返回前取消也不挂监听", async () => {
    const status = makeStatus("denied");
    stubPermissions(async () => status as PermissionStatus);
    const cb = vi.fn();
    const stop = onPermissionChange("geolocation", cb);

    stop(); // query 尚未 resolve 就取消
    await flushMicrotasks();
    Object.defineProperty(status, "state", { value: "granted", configurable: true });
    status.dispatchEvent(new Event("change"));
    expect(cb).not.toHaveBeenCalled();
  });

  it("未知权限名：不回调不抛错，返回可用的取消函数", async () => {
    stubPermissions(async () => {
      throw new TypeError("invalid permission name");
    });
    const cb = vi.fn();
    const stop = onPermissionChange("camera", cb);
    await flushMicrotasks();
    expect(cb).not.toHaveBeenCalled();
    expect(() => stop()).not.toThrow();
  });

  it("非浏览器环境返回 noop", () => {
    vi.stubGlobal("navigator", undefined);
    const stop = onPermissionChange("geolocation", () => {});
    expect(() => stop()).not.toThrow();
  });
});
