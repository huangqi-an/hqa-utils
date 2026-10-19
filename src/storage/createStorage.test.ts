// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createStorage } from "./createStorage.js";

describe("createStorage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  describe("核心读写", () => {
    it("set/get 支持 JSON 结构化数据", () => {
      const store = createStorage();
      expect(store.set("obj", { id: 1, tags: ["a", "b"] })).toBe(true);
      expect(store.set("arr", [1, 2, 3])).toBe(true);
      expect(store.set("str", "hello")).toBe(true);
      expect(store.set("num", 42)).toBe(true);
      expect(store.set("bool", false)).toBe(true);
      expect(store.get("obj")).toEqual({ id: 1, tags: ["a", "b"] });
      expect(store.get<number[]>("arr")).toEqual([1, 2, 3]);
      expect(store.get<string>("str")).toBe("hello");
      expect(store.get<number>("num")).toBe(42);
      expect(store.get<boolean>("bool")).toBe(false);
    });

    it("get 不存在的 key 返回 null，remove 后同样返回 null", () => {
      const store = createStorage();
      expect(store.get("missing")).toBeNull();
      store.set("k", "v");
      store.remove("k");
      expect(store.get("k")).toBeNull();
      store.remove("k"); // 重复删除静默
    });

    it("has 判断存在性；值为 null 时 has 为 true 而 get 为 null", () => {
      const store = createStorage();
      expect(store.has("k")).toBe(false);
      store.set("k", null);
      expect(store.has("k")).toBe(true);
      expect(store.get("k")).toBeNull();
    });

    it("set(undefined) 返回 false，不写入", () => {
      const store = createStorage();
      expect(store.set("k", undefined)).toBe(false);
      expect(store.has("k")).toBe(false);
    });

    it("area: session 写入 sessionStorage，与 local 隔离", () => {
      const session = createStorage({ area: "session", prefix: "s:" });
      session.set("k", "v");
      expect(window.sessionStorage.getItem("s:k")).not.toBeNull();
      expect(window.localStorage.getItem("s:k")).toBeNull();
    });
  });

  describe("命名空间", () => {
    it("底层 key 带前缀，不同前缀实例互不干扰", () => {
      const a = createStorage({ prefix: "a:" });
      const b = createStorage({ prefix: "b:" });
      a.set("k", 1);
      b.set("k", 2);
      expect(a.get("k")).toBe(1);
      expect(b.get("k")).toBe(2);
      expect(JSON.parse(window.localStorage.getItem("a:k") ?? "{}")).toMatchObject({ value: 1 });
    });

    it("keys() 返回去前缀的 key，不含其他命名空间与外来数据", () => {
      window.localStorage.setItem("other:x", "1"); // 外来数据
      const store = createStorage({ prefix: "app:" });
      store.set("user", 1);
      store.set("token", 2);
      expect(store.keys()).toEqual(["user", "token"]);
    });

    it("clear() 只清本命名空间，其他前缀数据保留", () => {
      window.localStorage.setItem("keep:x", "1");
      const a = createStorage({ prefix: "a:" });
      const b = createStorage({ prefix: "b:" });
      a.set("k", 1);
      b.set("k", 2);
      a.clear();
      expect(a.get("k")).toBeNull();
      expect(b.get("k")).toBe(2);
      expect(window.localStorage.getItem("keep:x")).toBe("1");
    });
  });

  describe("TTL 过期", () => {
    it("set 指定 ttl，过期后返回 null 且数据被清除", () => {
      vi.useFakeTimers();
      vi.setSystemTime(1_000_000);
      const store = createStorage({ prefix: "t:" });
      store.set("k", "v", { ttl: 1000 });
      expect(store.get("k")).toBe("v");
      expect(store.has("k")).toBe(true);
      vi.advanceTimersByTime(1001);
      expect(store.get("k")).toBeNull();
      expect(store.has("k")).toBe(false);
      expect(window.localStorage.getItem("t:k")).toBeNull(); // 已自动清除
    });

    it("实例 defaultTTL 生效，set 可按 key 覆盖", () => {
      vi.useFakeTimers();
      vi.setSystemTime(0);
      const store = createStorage({ prefix: "d:", defaultTTL: 500 });
      store.set("a", 1);
      store.set("b", 2, { ttl: 5000 });
      vi.advanceTimersByTime(600);
      expect(store.get("a")).toBeNull();
      expect(store.get("b")).toBe(2);
    });

    it("ttl 非法值抛 RangeError（0 / 负数 / Infinity）", () => {
      const store = createStorage();
      expect(() => store.set("k", 1, { ttl: 0 })).toThrow(RangeError);
      expect(() => store.set("k", 1, { ttl: -100 })).toThrow(RangeError);
      expect(() => store.set("k", 1, { ttl: Number.POSITIVE_INFINITY })).toThrow(RangeError);
    });

    it("defaultTTL 非法值在创建时抛 RangeError", () => {
      expect(() => createStorage({ defaultTTL: -1 })).toThrow(RangeError);
    });
  });

  describe("序列化容错", () => {
    it("循环引用 set 返回 false，不抛错", () => {
      const store = createStorage();
      const circular: Record<string, unknown> = {};
      circular.self = circular;
      expect(store.set("c", circular)).toBe(false);
      expect(store.has("c")).toBe(false);
    });

    it("setItem 抛错（超配额/隐私模式）时 set 返回 false", () => {
      vi.stubGlobal("localStorage", {
        length: 0,
        key: () => null,
        getItem: () => null,
        setItem: () => {
          throw new Error("QuotaExceededError");
        },
        removeItem: () => {},
        clear: () => {},
      });
      const store = createStorage();
      expect(store.set("k", "v")).toBe(false);
      expect(store.get("k")).toBeNull();
    });

    it("存储方法全部抛错（隐私模式）时读写删安全不抛错", () => {
      const denied = () => {
        throw new Error("SecurityError");
      };
      vi.stubGlobal("localStorage", {
        length: 0,
        key: denied,
        getItem: denied,
        setItem: denied,
        removeItem: denied,
        clear: denied,
      });
      const store = createStorage({ prefix: "p:" });
      expect(store.set("k", "v")).toBe(false);
      expect(store.get("k")).toBeNull();
      expect(store.has("k")).toBe(false);
      expect(store.keys()).toEqual([]);
      expect(() => store.remove("k")).not.toThrow();
      expect(() => store.clear()).not.toThrow();
    });

    it("手工写入的坏数据，get 返回 null 并自动清除", () => {
      const store = createStorage({ prefix: "x:" });
      window.localStorage.setItem("x:broken", "{not-json");
      window.localStorage.setItem("x:notenvelope", JSON.stringify({ foo: 1 }));
      expect(store.get("broken")).toBeNull();
      expect(store.get("notenvelope")).toBeNull();
      expect(window.localStorage.getItem("x:broken")).toBeNull();
      expect(window.localStorage.getItem("x:notenvelope")).toBeNull();
    });
  });

  describe("版本迁移", () => {
    it("版本不符时走 migrate 转换并回写新版本", () => {
      const v1 = createStorage({ prefix: "m:", version: 1 });
      v1.set("user", { name: "hqa" });

      const v2 = createStorage({
        prefix: "m:",
        version: 2,
        migrate: (old) => ({ ...(old as { name: string }), level: 2 }),
      });
      expect(v2.get("user")).toEqual({ name: "hqa", level: 2 });

      // 懒回写：底层信封已是新版本
      const envelope = JSON.parse(window.localStorage.getItem("m:user") ?? "{}");
      expect(envelope.version).toBe(2);
    });

    it("无 migrate 时版本不符的数据被丢弃", () => {
      const v1 = createStorage({ prefix: "n:", version: 1 });
      v1.set("k", "old");
      const v2 = createStorage({ prefix: "n:", version: 2 });
      expect(v2.get("k")).toBeNull();
      expect(window.localStorage.getItem("n:k")).toBeNull();
    });

    it("migrate 抛错时丢弃旧数据返回 null", () => {
      const v1 = createStorage({ prefix: "e:", version: 1 });
      v1.set("k", "old");
      const v2 = createStorage({
        prefix: "e:",
        version: 2,
        migrate: () => {
          throw new Error("migrate failed");
        },
      });
      expect(v2.get("k")).toBeNull();
      expect(window.localStorage.getItem("e:k")).toBeNull();
    });

    it("存储版本更高（降级场景）时丢弃", () => {
      const v3 = createStorage({ prefix: "g:", version: 3 });
      v3.set("k", "new");
      const v1 = createStorage({
        prefix: "g:",
        version: 1,
        migrate: (old) => old, // 即使有 migrate 也不能降级迁移
      });
      expect(v1.get("k")).toBeNull();
    });

    it("迁移保留原 TTL 状态", () => {
      vi.useFakeTimers();
      vi.setSystemTime(0);
      const v1 = createStorage({ prefix: "mt:", version: 1 });
      v1.set("k", "old", { ttl: 1000 });
      vi.advanceTimersByTime(500);

      const v2 = createStorage({ prefix: "mt:", version: 2, migrate: (old) => old });
      expect(v2.get("k")).toBe("old"); // 剩余 500ms 内可读
      vi.advanceTimersByTime(501);
      expect(v2.get("k")).toBeNull();
    });
  });

  describe("SSR / Node 降级", () => {
    it("无 localStorage / sessionStorage 时全部安全", () => {
      vi.stubGlobal("localStorage", undefined);
      vi.stubGlobal("sessionStorage", undefined);
      const store = createStorage({ prefix: "ssr:" });
      expect(store.get("k")).toBeNull();
      expect(store.set("k", "v")).toBe(false);
      expect(store.has("k")).toBe(false);
      expect(store.keys()).toEqual([]);
      expect(() => store.remove("k")).not.toThrow();
      expect(() => store.clear()).not.toThrow();
    });
  });
});
