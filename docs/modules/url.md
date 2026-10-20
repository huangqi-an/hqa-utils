# url 查询参数操作

查询字符串的宽松解析、参数化构建与增删改查。

| 导出 | 说明 |
| --- | --- |
| `parseQuery(input)` | 宽松解析查询字符串 |
| `buildUrl(path, params?)` | 构建带查询参数的 URL |
| `updateSearchParams(url, patch)` | 对 URL 查询参数增删改查 |
| `replaceQueryState(patch, options?)` | 更新当前页 URL 并写入 history |

## parseQuery(input)

宽松解析查询字符串为对象。输入兼容裸 query、带 `?` 前缀与完整 URL（自动截取）；无值 key 解析为空字符串，重复 key 合并为数组，非法百分号编码不抛错保留原样。

```ts
import { parseQuery } from "@huangqi_an/hqa-utils";

parseQuery("?a=1&b=hello+world");    // { a: "1", b: "hello world" }
parseQuery("a=1&a=2&flag");          // { a: ["1", "2"], flag: "" }
parseQuery("https://x.com/p?a=1#h"); // { a: "1" }
```

## buildUrl(path, params?)

构建带查询参数的 URL：参数值统一 `String()` 后编码，`null` / `undefined` 的条目忽略；path 已带 query 时用 `&` 追加。

```ts
import { buildUrl } from "@huangqi_an/hqa-utils";

buildUrl("/search", { q: "hello world", page: 2 }); // "/search?q=hello+world&page=2"
buildUrl("/list?tab=all", { page: 1 });             // "/list?tab=all&page=1"
```

## updateSearchParams(url, patch)

对 URL 查询参数增删改查，返回新 URL 字符串：patch 值为 `null` / `undefined` 删除该参数（同名多个值一并删），其余覆盖设置。路径与 `#hash` 保持不变，相对 / 绝对 URL 均可。

```ts
import { updateSearchParams } from "@huangqi_an/hqa-utils";

updateSearchParams("/list?tab=all&page=1", { page: 2 });    // "/list?tab=all&page=2"
updateSearchParams("/list?tab=all&page=1", { page: null }); // "/list?tab=all"
```

## replaceQueryState(patch, options?)

直接更新当前页面 URL 的查询参数并写入 history（默认 `replaceState` 不产生新历史条目；`method: "push"` 新增一条可后退）。页面不重新加载；非浏览器环境为空操作。

```ts
import { replaceQueryState } from "@huangqi_an/hqa-utils";

// 当前 /list?tab=all&page=1
replaceQueryState({ page: 2 });    // → /list?tab=all&page=2
replaceQueryState({ page: null }); // → /list?tab=all
```
