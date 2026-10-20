# storage 存储封装

命名空间化的 localStorage / sessionStorage 安全封装。

| 导出 | 说明 |
| --- | --- |
| `createStorage(options?)` | 创建存储实例（TTL / 命名空间 / 版本迁移 / SSR 安全） |

## createStorage(options?)

命名空间化的安全存储封装：JSON 序列化、TTL 过期、版本迁移，SSR / 隐私模式下安全降级不抛错。

```ts
import { createStorage } from "@huangqi_an/hqa-utils";

const store = createStorage({ area: "local", prefix: "app:", defaultTTL: 7 * 24 * 3600 * 1000 });

store.set("user", { id: 1, name: "hqa" }); // true
store.set("token", "abc", { ttl: 2 * 60 * 1000 }); // 2 分钟后过期

store.get<{ id: number; name: string }>("user"); // 自动 JSON 反序列化
store.has("token"); // 是否存在且未过期
store.keys(); // ["user", "token"]（不含前缀）
store.remove("token");
store.clear(); // 只清 "app:" 前缀的数据
```

版本迁移：数据结构升级时，旧版本数据读取时自动转换并回写（懒迁移）。

```ts
const store = createStorage({
  prefix: "app:",
  version: 2,
  migrate: (old, fromVersion) => (fromVersion === 1 ? { ...old, newField: 0 } : old),
});
```

| 选项 | 默认 | 说明 |
| --- | --- | --- |
| `area` | `"local"` | `"local"` 持久存储 / `"session"` 会话级存储 |
| `prefix` | `""` | key 前缀（命名空间）；`keys()` / `clear()` 只作用于本命名空间 |
| `defaultTTL` | - | 默认过期毫秒数，`set` 未指定 `ttl` 时使用 |
| `version` | `1` | 数据结构版本号，版本不符时按 `migrate` 迁移或丢弃 |
| `migrate` | - | 版本迁移函数，抛错或不提供时旧版本数据直接丢弃 |

- `set` 失败（`undefined` 值、循环引用、超配额、隐私模式）返回 `false` 不抛错；`ttl` 传非正数抛 `RangeError`
- `get` 遇坏数据返回 `null` 并自动清除；过期数据读取时自动清除
- SSR / Node 下安全降级：`get → null`、`set → false`、`keys → []`
- 值为 `null` 时 `has` 为 `true` 但 `get` 返回 `null`；`prefix` 为空时 `clear()` 会清空整个存储区，注意使用
