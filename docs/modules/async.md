# async 异步工具

异步任务的超时、重试、并发控制与轮询。

| 导出 | 说明 |
| --- | --- |
| `sleep(ms)` | 延时指定毫秒数 |
| `withTimeout(task, ms, message?)` | 为任务设置超时限制 |
| `retry(task, options?)` | 失败后自动重试 |
| `pLimit(concurrency)` | 信号量式并发锁 |
| `runWithLimit(tasks, concurrency?)` | 带并发上限地执行任务列表，结果保持输入顺序 |
| `pollUntil(task, isDone?, options?)` | 条件轮询 |
| `TimeoutError` / `PollAttemptsExhaustedError` / `QueueClearedError` | 语义化错误类 |

## sleep(ms)

延时指定毫秒数。

```ts
import { sleep } from "@huangqi_an/hqa-utils";

await sleep(1000); // 暂停 1 秒
```

## withTimeout(task, ms, message?)

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

## retry(task, options?)

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

## pLimit(concurrency)

信号量式并发锁，限制同时执行的任务数量，实例可反复使用。

```ts
const limit = pLimit(2); // 同时最多 2 个任务

const pages = await Promise.all(
  urls.map((url) => limit(() => fetch(url))),
);

// 运行状态
limit.activeCount; // 正在执行的任务数
limit.pendingCount; // 排队等待的任务数
limit.clearQueue(); // 清空排队任务（正在执行的不受影响），被丢弃的 Promise 以 QueueClearedError reject
```

## runWithLimit(tasks, concurrency?)

带并发上限地执行异步任务列表，返回所有结果并**保持输入顺序**。适合"一批任务 + 并发上限 + 顺序结果"的一次性执行；需要长期复用的并发锁请用 [`pLimit`](#plimit-concurrency)。

```ts
import { runWithLimit } from "@huangqi_an/hqa-utils";

// 最多同时 4 个请求，结果顺序与 urls 一致
const pages = await runWithLimit(
  urls.map((url) => () => fetch(url).then((r) => r.json())),
  4,
);
```

- `concurrency` 需为正整数或 `Infinity`（默认），否则抛 `RangeError`

## pollUntil(task, isDone?, options?)

轮询：反复执行 `task`，直到 `isDone(result)` 为 `true` 时以最后一次结果 resolve。串行节拍（间隔从 task 完成后起算，不重叠请求），首次调用立即执行；超时抛 `TimeoutError`、次数用尽抛 `PollAttemptsExhaustedError`（错误均带尝试上下文）。

```ts
import { pollUntil } from "@huangqi_an/hqa-utils";

// 轮询导出任务状态：每 2s 查一次，最多等 60s
const result = await pollUntil(
  () => fetch(`/api/tasks/${id}`).then((r) => r.json()),
  (data) => data.status === "done",
  { interval: 2000, timeout: 60_000 },
);

// 弱网下容忍偶发请求失败，间隔指数退避（1s → 2s → 4s，上限 8s）
const config = await pollUntil(
  () => fetchConfig(),
  (data) => data !== null,
  { interval: 1000, backoff: 2, maxInterval: 8000, tolerateErrors: true },
);
```

| 选项 | 默认 | 说明 |
| --- | --- | --- |
| `interval` | `1000` | 轮询间隔毫秒数（指数退避的初始间隔） |
| `timeout` | - | 总超时毫秒数，超时抛 `TimeoutError` |
| `maxAttempts` | - | 最大尝试次数（含首次），用尽抛 `PollAttemptsExhaustedError` |
| `backoff` | `1` | 指数退避倍率 |
| `maxInterval` | - | 退避间隔上限毫秒数 |
| `tolerateErrors` | `false` | task 抛错时是否忽略并继续轮询 |
