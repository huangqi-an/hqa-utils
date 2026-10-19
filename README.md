# hqa-utils

个人 TypeScript 工具库。

## 模块

| 模块 | 说明 |
| --- | --- |
| `async` | 异步工具：`sleep`、`runWithLimit`、`withTimeout`、`retry`、`pLimit` |
| `client` | 客户端信息：`isBrowser`、`getUserAgent`、`parseUserAgent`、平台检测、`getClientInfo` |

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
limit.clearQueue(); // 清空排队任务（正在执行的不受影响），被丢弃的 Promise 以 QueueClearedError reject
```

### isBrowser() / getUserAgent()

环境守卫：判断是否浏览器环境、安全获取 User-Agent。

```ts
import { isBrowser, getUserAgent } from "@huangqi_an/hqa-utils";

if (isBrowser()) {
  document.title = "hello";
}

const ua = getUserAgent(); // 浏览器: "Mozilla/5.0 ..."；Node / SSR: null
```

### parseUserAgent(ua)

解析 User-Agent 字符串，提取浏览器 / 操作系统 / 设备类型，零依赖轻量实现。

```ts
import { parseUserAgent } from "@huangqi_an/hqa-utils";

const info = parseUserAgent(navigator.userAgent);
// {
//   browser: "Chrome", browserVersion: "131.0.0.0",
//   os: "Windows", osVersion: "10",
//   deviceType: "desktop" // "mobile" | "tablet" | "desktop" | "unknown"
// }
```

已知局限：

- Windows 11 的 UA 与 Windows 10 相同（NT 10.0），统一识别为 `"10"`
- iPadOS 13+ 桌面模式伪装成 macOS Safari UA，会识别为 macOS desktop
- iOS 上所有第三方浏览器内核均为 WKWebView，仅名称 / 版本可能准确

### 平台检测：isIOS / isAndroid / isMac / isWindows / isLinux / isMobile / isTablet / isDesktop / isWeChat

全部基于当前 UA 判断，无 UA（Node / SSR）时一律返回 `false`。

```ts
import { isIOS, isWeChat } from "@huangqi_an/hqa-utils";

if (isIOS()) {
  // iOS 特有逻辑，如处理安全区
}
if (isWeChat()) {
  // 微信内置浏览器，接入 JS-SDK
}
```

- `isIOS()` 兼容 iPadOS 13+ 桌面模式（Mac UA + 多点触控特征）
- `isMac()` 在 iPadOS 13+ 桌面模式下会与 `isIOS()` 同时返回 true（UA 无法区分），需区分时以 `isIOS()` 为准
- Android 平板 / 手机的区分依据 UA 中的 `Mobile` 标识

### getClientInfo()

一次性收集客户端环境信息快照，非浏览器环境返回全 `null` 字段对象，不抛错。

```ts
import { getClientInfo, parseUserAgent } from "@huangqi_an/hqa-utils";

const info = getClientInfo();
// {
//   userAgent, language: "zh-CN", languages: ["zh-CN", "en"], timezone: "Asia/Shanghai",
//   screenWidth: 2560, screenHeight: 1440, viewportWidth: 1920, viewportHeight: 1080,
//   devicePixelRatio: 2, colorDepth: 24, touchPoints: 5, networkType: "4g"
// }

// 组合 UA 解析获得完整画像
const ua = info.userAgent ? parseUserAgent(info.userAgent) : null;
```

- `networkType` 依赖 Network Information API（Chrome 系支持），不支持的浏览器为 `null`
- 各字段相互独立，单个字段取不到时仅该字段为 `null`

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

- `src/<模块>/<功能>.ts` — 一个功能一个文件，带 TSDoc 注释
- `src/<模块>/<功能>.test.ts` — 对应功能的测试（vitest）
- `src/<模块>/index.ts` — 汇总 re-export 本模块全部功能
- 新模块需在 `src/index.ts` 中 re-export

## 发布

推送 `v*` tag 触发 CI 自动发布（lint → test → build → npm publish + GitHub Release）：

```bash
git tag v0.1.0
git push origin v0.1.0
```
