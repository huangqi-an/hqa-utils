# hqa-utils

个人 TypeScript 工具库。

## 模块

| 模块 | 说明 |
| --- | --- |
| `async` | 异步工具：`sleep`、`runWithLimit`、`withTimeout`、`retry`、`pLimit` |

## 用法

```ts
import { withTimeout, retry, pLimit } from "@huangqi_an/hqa-utils";
```

### withTimeout(task, ms, message?)

为任务设置超时限制，超时后 reject `TimeoutError`。

```ts
import { withTimeout, TimeoutError } from "@huangqi_an/hqa-utils";

// 传入 Promise
const data = await withTimeout(fetch(url).then((r) => r.json()), 3000);

// 传入函数，超时时自定义错误信息
const result = await withTimeout(() => queryDb(), 1000, "查询太慢了");
```

- `task` 可以是 Promise 或返回 Promise/值的函数（同步返回值也支持）
- 任务自身的错误会原样抛出，不会包装成 `TimeoutError`

### retry(task, options?)

失败后自动重试，重试次数耗尽仍失败则抛出最后一次的错误。

```ts
const data = await retry(() => fetch(url), {
  retries: 5, // 最多重试 5 次（总共执行 6 次）
  delay: 200, // 基础间隔 200ms
  backoff: "exponential", // 指数退避：200 → 400 → 800 ...
  shouldRetry: (e) => e instanceof HttpError && e.status >= 500, // 只重试服务端错误
});
```

| 选项 | 默认 | 说明 |
| --- | --- | --- |
| `retries` | `3` | 最大重试次数 |
| `delay` | `0` | 基础重试间隔（ms） |
| `backoff` | `"fixed"` | `"fixed"` 固定间隔；`"exponential"` 指数递增（`delay * 2^(n-1)`） |
| `onRetry` | - | 每次重试前的回调 `(error, attempt) => void` |
| `shouldRetry` | - | 判断错误是否需要重试，返回 `false` 时立即抛出 |

### pLimit(concurrency)

信号量式并发锁，限制同时执行的任务数量，实例可反复使用。

```ts
const limit = pLimit(2); // 同时最多 2 个任务

const pages = await Promise.all(
  urls.map((url) => limit(() => fetch(url))),
);

// 运行状态
limit.activeCount; // 正在执行的任务数
limit.pendingCount; // 排队等待的任务数
limit.clearQueue(); // 丢弃排队中的任务（不影响正在执行的）
```

## 开发

```bash
npm install        # 安装依赖
npm test           # 运行测试
npm run test:coverage  # 测试 + 覆盖率
npm run lint       # 代码检查
npm run typecheck  # 类型检查
npm run build      # 构建（ESM + CJS + d.ts）
```

## 结构

- `src/<模块>/index.ts` — 模块源码，带 TSDoc 注释
- `src/<模块>/index.test.ts` — 模块测试（vitest）
- 新模块需在 `src/index.ts` 中 re-export

## 发布

推送 `v*` tag 触发 CI 自动发布（lint → test → build → npm publish + GitHub Release）：

```bash
git tag v0.1.0
git push origin v0.1.0
```
