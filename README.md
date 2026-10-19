# hqa-utils

[![CI](https://github.com/huangqi-an/hqa-utils/actions/workflows/ci.yml/badge.svg)](https://github.com/huangqi-an/hqa-utils/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@huangqi_an/hqa-utils)](https://www.npmjs.com/package/@huangqi_an/hqa-utils)
[![downloads](https://img.shields.io/npm/dm/@huangqi_an/hqa-utils)](https://www.npmjs.com/package/@huangqi_an/hqa-utils)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![codecov](https://codecov.io/gh/huangqi-an/hqa-utils/graph/badge.svg)](https://codecov.io/gh/huangqi-an/hqa-utils)

个人 TypeScript 工具库。

参与贡献请先阅读 [CONTRIBUTING.md](./CONTRIBUTING.md)。

## 模块

| 模块 | 说明 |
| --- | --- |
| `async` | 异步工具：`sleep`、`runWithLimit`、`withTimeout`、`retry`、`pLimit` |
| `client` | 客户端信息：`isBrowser`、`getUserAgent`、`parseUserAgent`、平台检测、`getClientInfo` |
| `dom` | DOM 小件：`copyText`、`onElementVisible`、`onElementResize`、`downloadFile` |
| `mouse` | 鼠标工具：`getMousePosition`、`onLongPress`、`onMouseIdle`、`isMouseSupported` |
| `schedule` | 调度工具：`raf`、`waitFrames`、`rafThrottle`、`onRafLoop`、`whenIdle`、`createIdleQueue` |
| `storage` | 存储封装：`createStorage`（TTL 过期 / 命名空间 / 版本迁移 / SSR 安全） |

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

### getMousePosition() / onMousePositionChange(cb)

鼠标位置跟踪：获取最近位置 + 订阅变化（mousemove 驱动，视口坐标）。

```ts
import { getMousePosition, onMousePositionChange } from "@huangqi_an/hqa-utils";

const off = onMousePositionChange(({ x, y }) => {
  console.log(x, y);
});

off(); // 取消订阅

// 仅当存在活跃订阅时才有值，否则为 null
const pos = getMousePosition();
```

- 全局仅维护一个 mousemove 监听器：首个订阅时绑定，最后一个订阅取消时解绑
- mousemove 是高频事件，回调内请自行节流

### onLongPress(el, callback, options?)

长按检测，基于 Pointer Events（鼠标长按与触屏长按均可触发）。

```ts
import { onLongPress } from "@huangqi_an/hqa-utils";

const stop = onLongPress(
  el,
  (event) => console.log("长按触发", event.clientX),
  { delay: 800, once: true },
);

stop(); // 停止监听
```

| 选项 | 默认 | 说明 |
| --- | --- | --- |
| `delay` | `600` | 触发长按的等待时长（ms） |
| `once` | `false` | 触发一次后是否自动停止监听 |

- 按下期间松开（pointerup / pointercancel）或指针移出元素（pointerleave）会取消本次计时
- 触屏长按可能同时触发浏览器原生行为（如菜单），如需屏蔽请在业务侧处理

### onMouseIdle(callback, ms, options?)

鼠标空闲检测：无 mousemove / mousedown 达到阈值后触发一次回调。

```ts
import { onMouseIdle } from "@huangqi_an/hqa-utils";

// 用户 30 秒无操作后暂停自动轮播
const stop = onMouseIdle(() => carousel.pause(), 30_000);
```

- 任何活动都会重置计时；触发后自动停止监听（一次性语义），循环检测请在回调内重新调用
- `options.target` 可指定监听目标（默认 `window`）

### isMouseSupported()

检测设备是否拥有鼠标类精确指针，基于 `(pointer: fine)` 媒体查询。

```ts
import { isMouseSupported } from "@huangqi_an/hqa-utils";

if (isMouseSupported()) {
  // 显示 hover 提示、右键菜单等仅鼠标可用的交互
}
```

- 主输入设备为触屏（手机 / 平板）时返回 `false`；不支持 matchMedia 的旧浏览器返回 `false`

### raf(fn?) / waitFrames(n)

Promise 化的帧等待，基于 requestAnimationFrame。

```ts
import { raf, waitFrames } from "@huangqi_an/hqa-utils";

// 等一帧后再测量
container.appendChild(el);
await raf();
const height = el.getBoundingClientRect().height;

// 等两帧触发 CSS 过渡
await waitFrames(2);
el.style.opacity = "1";
```

- `raf(fn)` 在下一帧执行 `fn` 并以返回值 resolve；无参调用 resolve 帧时间戳
- 无 rAF 的环境（Node / SSR）降级为 `setTimeout 16ms`

### rafThrottle(fn)

帧节流：一帧内的多次调用只按最后一次参数执行一次，以渲染节奏为基准。

```ts
import { rafThrottle } from "@huangqi_an/hqa-utils";

const render = rafThrottle((x: number) => {
  el.style.transform = `translateX(${x}px)`;
});

window.addEventListener("mousemove", (e) => render(e.clientX));
render.cancel(); // 取消未执行的调用
```

- 适合 scroll / mousemove / resize 等高频事件驱动渲染的场景
- 回调异常直接抛出到全局（不吞错），节流状态不受影响

### onRafLoop(cb)

持续动画循环，每帧调用回调直到停止。

```ts
import { onRafLoop } from "@huangqi_an/hqa-utils";

const stop = onRafLoop((time, delta) => {
  x += speed * (delta / 1000); // 帧率无关的位移
  el.style.transform = `translateX(${x}px)`;
});

stop(); // 组件卸载时停止
```

- `delta` 为与上一帧的间隔毫秒数，首帧为 `0`
- 回调抛错会终止循环（避免错误每帧刷屏）；无 rAF 的环境返回 noop

### whenIdle(fn?, options?)

Promise 化的 requestIdleCallback，空闲时执行低优先级任务。

```ts
import { whenIdle } from "@huangqi_an/hqa-utils";

// 空闲时预加载
await whenIdle(() => prefetchNextPage());

// 按 deadline 分片处理，2 秒内等不到空闲则强制执行
await whenIdle((deadline) => {
  while (deadline.timeRemaining() > 0 && tasks.length) {
    tasks.pop()();
  }
}, { timeout: 2000 });
```

- 无 rIC 的环境降级为 `setTimeout 1ms` + 模拟 deadline（`didTimeout: true`），API 形状不变
- `timeout` 透传给原生 rIC，始终等不到空闲时强制执行，避免任务饥饿

### createIdleQueue(options?)

空闲任务队列：把多个低优先级任务（预取、日志上报、索引构建等）批量推迟到浏览器空闲时段，按 FIFO 顺序分帧执行，不阻塞渲染。

```ts
import { createIdleQueue } from "@huangqi_an/hqa-utils";

const queue = createIdleQueue({ timeout: 2000 });

// 入队（FIFO），可 await 任务结果
queue.push(() => prefetch("/users")).then(() => console.log("users ready"));
const report = await queue.push(() => buildReport());

queue.size; // 待执行任务数
queue.clear(); // 清空挂起任务，其 Promise 以 IdleQueueCancelledError reject
queue.pause(); // 暂停派发（如视频播放期间停止预取）
queue.resume(); // 恢复派发
queue.destroy(); // 销毁：清空任务、撤销调度，之后 push 直接 reject
```

| 选项 | 默认 | 说明 |
| --- | --- | --- |
| `timeout` | - | 传给 rIC 的超时毫秒数，页面长期繁忙时任务仍会被执行（防饥饿） |
| `timeSlice` | `12` | 无 rIC 环境下每批任务的时间预算（ms） |

- 每个空闲切片内按 `deadline.timeRemaining()` 决定是否继续执行，剩余任务自动等下一个空闲切片（分帧）
- 无 rIC 的环境（旧浏览器 / Node / SSR）降级为 `setTimeout`，按 `timeSlice` 预算分批
- 任务抛错、或被 `clear` / `destroy` 取消时，对应 `push` 返回的 Promise reject；fire-and-forget 场景请自行附加 `catch`

### createStorage(options?)

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

### copyText(text)

复制文本到剪贴板：优先 `navigator.clipboard`（要求 https 或 localhost），不可用或被拒时降级 `execCommand`，SSR 返回 `false`。

```ts
import { copyText } from "@huangqi_an/hqa-utils";

const ok = await copyText("https://example.com/invite/abc");
ok ? showToast("已复制") : showToast("复制失败，请手动复制");
```

### onElementVisible(el, callback, options?)

元素进入 / 离开视口时触发，基于 IntersectionObserver，适合曝光埋点、懒加载、入场动画。

```ts
import { onElementVisible } from "@huangqi_an/hqa-utils";

const stop = onElementVisible(card, (entry) => {
  if (entry.isIntersecting) report("曝光", { id: card.dataset.id });
}, { threshold: 0.5, once: true });

stop(); // 取消观察
```

- `threshold`：交叉比例阈值 0~1（默认 `0`，任意可见即触发）
- `once`：进入视口触发一次后自动停止（默认 `false`）
- 回调参数为原生 `IntersectionObserverEntry`

### onElementResize(el, callback)

元素自身尺寸变化时触发，基于 ResizeObserver。`window.resize` 只响应窗口变化，元素因内容 / 布局变化导致的尺寸变化只有它能捕获。

```ts
import { onElementResize } from "@huangqi_an/hqa-utils";

const stop = onElementResize(chartContainer, ({ width, height }) => {
  chart.resize({ width, height });
});
```

- 回调参数为内容区尺寸（不含 padding / border）
- 不支持 ResizeObserver 的环境返回 noop

### downloadFile(data, filename, mime?)

触发浏览器下载：接收 Blob 或文本内容（导出 CSV / JSON 报表），内部 objectURL + `a[download]` 实现，1 秒后自动释放 objectURL。

```ts
import { downloadFile } from "@huangqi_an/hqa-utils";

downloadFile(JSON.stringify(data), "report.json", "application/json");
downloadFile(csvText, "订单列表.csv", "text/csv");
```

- SSR 返回 `false`；下载远程 URL 直接用 `a[href][download]` 即可，无需本函数

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
