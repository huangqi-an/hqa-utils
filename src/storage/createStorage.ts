/**
 * 创建命名空间化的安全存储实例，封装 localStorage / sessionStorage。
 *
 * - 值自动 JSON 序列化 / 反序列化，支持对象、数组等结构化数据
 * - 写入失败（循环引用、超配额、隐私模式）返回 `false`，不抛错；
 *   读取遇坏数据返回 `null` 并自动清除
 * - 支持 TTL 过期：过期数据在读取时自动清除并返回 `null`
 * - 支持数据结构版本迁移：版本不符时按 `migrate` 转换并回写，或直接丢弃
 * - SSR / Node 环境下安全降级：`get → null`、`set → false`、`keys → []`，不抛错
 *
 * @param options 配置项
 * @returns 存储实例
 *
 * @example
 * ```ts
 * const store = createStorage({ area: "local", prefix: "app:" });
 *
 * store.set("user", { id: 1, name: "hqa" }); // true
 * store.set("token", "abc", { ttl: 2 * 60 * 1000 }); // 2 分钟后过期
 *
 * store.get<{ id: number; name: string }>("user");
 * store.keys(); // ["user", "token"]（不含前缀）
 * store.clear(); // 只清 "app:" 前缀的数据
 * ```
 */
export type StorageArea = "local" | "session";

export interface CreateStorageOptions {
  /** 存储区：`"local"`（localStorage，持久）或 `"session"`（sessionStorage，会话级），默认 `"local"` */
  area?: StorageArea;
  /** key 前缀（命名空间），如 `"app:"`；`keys()` / `clear()` 只作用于本命名空间，默认空 */
  prefix?: string;
  /** 默认过期时长（毫秒），`set` 未指定 `ttl` 时使用；默认永不过期 */
  defaultTTL?: number;
  /** 数据结构版本号，版本不符时按 `migrate` 迁移或丢弃，默认 `1` */
  version?: number;
  /**
   * 版本迁移函数：把 `oldVersion` 版本的旧值转换为新版本值。
   * 抛错或不提供时，版本不符的旧数据会被丢弃（读取返回 `null`）。
   */
  migrate?: (oldValue: unknown, oldVersion: number) => unknown;
}

export interface StorageSetOptions {
  /** 过期时长（毫秒），必须为正数；不传用实例 `defaultTTL`，都没有则永不过期 */
  ttl?: number;
}

export interface StorageInstance {
  /**
   * 读取数据。不存在、已过期、版本不符或数据损坏返回 `null`；
   * 过期与坏数据会自动从存储中清除。
   */
  get<T = unknown>(key: string): T | null;
  /**
   * 写入数据。成功返回 `true`；
   * 值为 `undefined`、序列化失败（如循环引用）、超配额或隐私模式返回 `false`，不抛错。
   */
  set(key: string, value: unknown, options?: StorageSetOptions): boolean;
  /** 删除指定 key（自动加前缀），key 不存在时静默 */
  remove(key: string): void;
  /** 判断 key 是否存在且未过期、版本可用 */
  has(key: string): boolean;
  /** 本命名空间下所有 key（不含前缀） */
  keys(): string[];
  /** 清空本命名空间的所有数据，不影响其他命名空间；`prefix` 为空时会清空整个存储区 */
  clear(): void;
}

/** 底层存储的信封结构：版本号 + 过期时间 + 值 */
interface StoredEnvelope {
  version?: unknown;
  expiresAt?: unknown;
  value: unknown;
}

const isValidTTL = (ttl: number): boolean => {
  return typeof ttl === "number" && Number.isFinite(ttl) && ttl > 0;
};

export function createStorage(options?: CreateStorageOptions): StorageInstance {
  const { area = "local", prefix = "", defaultTTL, version = 1, migrate } = options ?? {};

  if (defaultTTL !== undefined && !isValidTTL(defaultTTL)) {
    throw new RangeError(`defaultTTL 必须为正数，收到: ${String(defaultTTL)}`);
  }

  const prefixedKey = (key: string): string => prefix + key;

  /** 解析存储区；隐私模式下访问本身可能抛 SecurityError，一并兜住 */
  const resolveArea = (): Storage | null => {
    try {
      const candidate = area === "session" ? globalThis.sessionStorage : globalThis.localStorage;
      return candidate && typeof candidate.getItem === "function" ? candidate : null;
    } catch {
      return null;
    }
  };

  const tryRemove = (storage: Storage, key: string): void => {
    try {
      storage.removeItem(prefixedKey(key));
    } catch {
      /* 删除失败静默 */
    }
  };

  const writeEnvelope = (storage: Storage, key: string, envelope: StoredEnvelope): boolean => {
    try {
      storage.setItem(prefixedKey(key), JSON.stringify(envelope));
      return true;
    } catch {
      return false;
    }
  };

  /** 读取管线：坏数据清除 → 过期清除 → 版本迁移或丢弃，任何失败都不抛错 */
  const read = (key: string): StoredEnvelope | null => {
    const storage = resolveArea();
    if (!storage) return null;

    let raw: string | null;
    try {
      raw = storage.getItem(prefixedKey(key));
    } catch {
      return null;
    }
    if (raw === null) return null;

    let envelope: StoredEnvelope;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed !== "object" || parsed === null || !("value" in parsed)) {
        throw new Error("bad envelope");
      }
      envelope = parsed as StoredEnvelope;
    } catch {
      tryRemove(storage, key);
      return null;
    }

    if (typeof envelope.expiresAt === "number" && Date.now() > envelope.expiresAt) {
      tryRemove(storage, key);
      return null;
    }

    if (envelope.version !== version) {
      const oldVersion = envelope.version;
      const migratable =
        migrate !== undefined &&
        typeof oldVersion === "number" &&
        Number.isFinite(oldVersion) &&
        oldVersion < version;
      if (migratable) {
        try {
          const migrated: StoredEnvelope = {
            version,
            expiresAt: envelope.expiresAt,
            value: migrate!(envelope.value, oldVersion as number),
          };
          writeEnvelope(storage, key, migrated); // 回写失败不影响本次读取
          return migrated;
        } catch {
          tryRemove(storage, key);
          return null;
        }
      }
      tryRemove(storage, key);
      return null;
    }

    return envelope;
  };

  const get = <T>(key: string): T | null => {
    const envelope = read(key);
    return envelope === null ? null : (envelope.value as T);
  };

  const set = (key: string, value: unknown, setOptions?: StorageSetOptions): boolean => {
    if (value === undefined) return false;
    const ttl = setOptions?.ttl ?? defaultTTL;
    if (ttl !== undefined && !isValidTTL(ttl)) {
      throw new RangeError(`ttl 必须为正数，收到: ${String(ttl)}`);
    }
    const storage = resolveArea();
    if (!storage) return false;
    const expiresAt = ttl === undefined ? null : Date.now() + ttl;
    return writeEnvelope(storage, key, { version, expiresAt, value });
  };

  const remove = (key: string): void => {
    const storage = resolveArea();
    if (!storage) return;
    tryRemove(storage, key);
  };

  const has = (key: string): boolean => read(key) !== null;

  const keys = (): string[] => {
    const storage = resolveArea();
    if (!storage) return [];
    const result: string[] = [];
    try {
      for (let i = 0; i < storage.length; i += 1) {
        const fullKey = storage.key(i);
        if (fullKey !== null && fullKey.startsWith(prefix)) {
          result.push(fullKey.slice(prefix.length));
        }
      }
    } catch {
      return [];
    }
    return result;
  };

  const clear = (): void => {
    const storage = resolveArea();
    if (!storage) return;
    const doomed: string[] = [];
    try {
      for (let i = 0; i < storage.length; i += 1) {
        const fullKey = storage.key(i);
        if (fullKey !== null && fullKey.startsWith(prefix)) {
          doomed.push(fullKey);
        }
      }
    } catch {
      return;
    }
    for (const fullKey of doomed) {
      try {
        storage.removeItem(fullKey);
      } catch {
        /* 删除失败静默 */
      }
    }
  };

  return { get, set, remove, has, keys, clear };
}
