# hqa-utils

[![CI](https://github.com/huangqi-an/hqa-utils/actions/workflows/ci.yml/badge.svg)](https://github.com/huangqi-an/hqa-utils/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@huangqi_an/hqa-utils)](https://www.npmjs.com/package/@huangqi_an/hqa-utils)
[![downloads](https://img.shields.io/npm/dm/@huangqi_an/hqa-utils)](https://www.npmjs.com/package/@huangqi_an/hqa-utils)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![codecov](https://codecov.io/gh/huangqi-an/hqa-utils/graph/badge.svg)](https://codecov.io/gh/huangqi-an/hqa-utils)

📖 **[在线文档](https://huangqi-an.github.io/hqa-utils/)** —— 12 个模块的完整 API 用法与示例

个人 TypeScript 工具库。

参与贡献请先阅读 [CONTRIBUTING.md](./CONTRIBUTING.md)。

## 模块

| 模块 | 说明 |
| --- | --- |
| `async` | 异步工具：`sleep`、`runWithLimit`、`withTimeout`、`retry`、`pLimit`、`pollUntil` |
| `client` | 客户端信息：`isBrowser`、`getUserAgent`、`parseUserAgent`、平台检测、`getClientInfo` |
| `device` | 设备感知：`onNetworkChange`、`getConnectionInfo`、`onMediaQueryChange`、`prefersDarkScheme`、`prefersReducedMotion` |
| `dom` | DOM 小件：`copyText`、`onElementVisible`、`onElementResize`、`onDelegate`、`downloadFile` |
| `mouse` | 鼠标工具：`getMousePosition`、`onLongPress`、`onMouseIdle`、`isMouseSupported` |
| `preload` | 资源预加载：`preloadResource`、`preconnectTo`、`dnsPrefetch`、`preloadImage`、`prefetchWhenIdle` |
| `schedule` | 调度工具：`raf`、`waitFrames`、`rafThrottle`、`onRafLoop`、`whenIdle`、`createIdleQueue` |
| `storage` | 存储封装：`createStorage`（TTL 过期 / 命名空间 / 版本迁移 / SSR 安全） |
| `timing` | 定时控制：`debounce`、`throttle`（leading/trailing/cancel/flush） |
| `url` | 查询参数操作：`parseQuery`、`buildUrl`、`updateSearchParams`、`replaceQueryState` |
| `page` | 页面可见性与 URL：`onVisibilityChange` 订阅、`whenDocumentVisible` 等待可见、`onUrlChange` 监听 URL 变化（SSR 安全） |
| `scroll` | 滚动小件：`getScrollPercent` 进度查询、`smoothScrollTo` 平滑滚动、`onScrollNearBottom` 无限加载、`onScrollDirection` 方向监听、`onScrollStop` 停止监听 |

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

### pollUntil(task, isDone?, options?)

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

### onDelegate(root, type, selector, listener, options?)

在根元素上进行事件委托：事件冒泡到 `root` 后按 `closest(selector)` 匹配实际目标。动态列表只绑定一次，子元素随便增删，新增项自动生效。

```ts
import { onDelegate } from "@huangqi_an/hqa-utils";

const stop = onDelegate(document, "click", ".item", (event, item) => {
  console.log("点击了", (item as HTMLElement).dataset.id);
});

stop(); // 组件卸载时取消
```

- 回调第二参数 `matched` 直接给出匹配到的元素（可能是 target 自身或其祖先），省去回调内再 `closest` 一次
- `capture` 选项透传给原生监听，`focus` / `blur` 等不冒泡事件需传 `true`
- 不穿透 Shadow DOM（冒泡出 shadow root 后 target 已被重定向），需要时请基于 `composedPath()` 自行实现
- SSR 或 `root` 无效时返回 noop

### downloadFile(data, filename, mime?)

触发浏览器下载：接收 Blob 或文本内容（导出 CSV / JSON 报表），内部 objectURL + `a[download]` 实现，1 秒后自动释放 objectURL。

```ts
import { downloadFile } from "@huangqi_an/hqa-utils";

downloadFile(JSON.stringify(data), "report.json", "application/json");
downloadFile(csvText, "订单列表.csv", "text/csv");
```

- SSR 返回 `false`；下载远程 URL 直接用 `a[href][download]` 即可，无需本函数

### preloadResource(url, options?)

动态插入 `<link rel="preload">` 预加载资源，加载成功 resolve、失败 reject。按 URL 扩展名自动推断 `as` 类型，相同资源的重复调用复用同一 Promise，不重复插入标签。

```ts
import { preloadResource } from "@huangqi_an/hqa-utils";

// 首屏大图提前加载，用户看到时已在缓存
await preloadResource("/hero.jpg");

// 推断不出的类型需显式指定（否则抛 RangeError）
await preloadResource("https://api.example.com/data", { as: "fetch" });

// 配合 async 模块做超时兜底
await withTimeout(preloadResource("/font.woff2"), 3000).catch(() => {});
```

| 选项 | 默认 | 说明 |
| --- | --- | --- |
| `as` | 按扩展名推断 | 资源类型（`script` / `style` / `font` / `image` / `fetch` 等） |
| `crossOrigin` | `font` 时 `"anonymous"` | 跨域模式；字体必须 CORS 模式预加载，否则会二次下载 |

- 推断不出 `as` 且未显式传入时抛 `RangeError`
- 预加载失败不缓存：再次调用会重新发起；成功的预加载去重复用
- SSR / Node 下静默 resolve（无操作）

### preconnectTo(url) / dnsPrefetch(url)

连接预热：提前与目标源站建立连接（preconnect 为 DNS+TCP+TLS，dnsPrefetch 仅 DNS），后续请求该域名可省去握手时间。同一 origin 只插入一次，SSR 下返回 `false`。

```ts
import { preconnectTo, dnsPrefetch } from "@huangqi_an/hqa-utils";

// 应用启动时预热第三方字体站 / 统计域名
preconnectTo("https://fonts.gstatic.com");
dnsPrefetch("https://analytics.example.com");
```

### preloadImage(url)

预加载图片，成功时 resolve 固有尺寸（可用于占位布局），失败 reject。相同 URL 复用同一 Promise；SSR 下 resolve `{ width: 0, height: 0 }`。

```ts
import { preloadImage } from "@huangqi_an/hqa-utils";

// 轮播图切换前预加载，拿到尺寸先渲染占位
const { width, height } = await preloadImage(next.src);
setPlaceholder(width / height);
```

### prefetchWhenIdle(urls, options?)

浏览器空闲时批量预取资源（`<link rel="prefetch">`），底层复用 `createIdleQueue`：URL 逐个入队、按空闲切片分帧插入，避免一次性抢占网络。返回 `stop` 取消未开始的预取。

```ts
import { prefetchWhenIdle } from "@huangqi_an/hqa-utils";

// 列表页空闲时预取详情页资源，组件卸载时取消
const stop = prefetchWhenIdle(detailPages.map((d) => d.cover), { timeout: 5000 });
onUnmounted(stop);
```

| 选项 | 默认 | 说明 |
| --- | --- | --- |
| `timeout` | - | 传给空闲队列的超时毫秒数，页面长期繁忙时强制执行（防饥饿） |

### debounce(fn, wait, options?)

防抖：将高频调用合并为"停止触发 `wait` 毫秒后"的一次执行（取最后一次参数）。每次调用都重置等待计时，适合搜索联想、resize 结束后重算布局等"等停下来再执行"的场景。返回函数附带 `cancel()` 取消挂起调用、`flush()` 立即执行挂起调用；`this` 与参数透传。

```ts
import { debounce } from "@huangqi_an/hqa-utils";

const onSearch = debounce((keyword: string) => {
  fetchSuggestions(keyword);
}, 300);

input.addEventListener("input", (e) => onSearch(e.target.value));
// 组件卸载时
onSearch.cancel();
```

| 选项 | 默认 | 说明 |
| --- | --- | --- |
| `leading` | `false` | 防抖周期内首次调用是否立即执行 |
| `trailing` | `true` | 静默期结束后是否以最后一次参数补执行 |

### throttle(fn, wait, options?)

节流：将高频调用限制为每 `wait` 毫秒最多执行一次，持续触发期间保持固定节拍（不重置计时），默认周期首立即执行、周期末补执行最新参数。与 `rafThrottle` 的区别：以时间窗口为基准，适合与渲染节奏无关的频率限制（网络请求、埋点上报）。

```ts
import { throttle } from "@huangqi_an/hqa-utils";

const onScroll = throttle(() => {
  updateHeaderShadow(window.scrollY);
}, 100);

window.addEventListener("scroll", onScroll);
// 组件卸载时
onScroll.cancel();
```

| 选项 | 默认 | 说明 |
| --- | --- | --- |
| `leading` | `true` | 周期开始时是否立即执行 |
| `trailing` | `true` | 周期结束时是否以最后一次参数补执行 |

### onNetworkChange(cb)

订阅网络在线/离线状态变化，监听 window 的 `online` / `offline` 事件；订阅时立即同步回调一次当前状态。返回取消订阅函数；非浏览器环境返回空操作（SSR 安全）。

```ts
import { onNetworkChange } from "@huangqi_an/hqa-utils";

const unsubscribe = onNetworkChange((online) => {
  offlineTip.hidden = online;
});
// 组件卸载时
unsubscribe();
```

### getConnectionInfo()

获取网络质量信息（Network Information API）：`effectiveType` / `downlink` / `rtt` / `saveData` 估算值，适合弱网降级。仅 Chromium 系支持，Safari / Firefox 及非浏览器环境返回 `null`。

```ts
import { getConnectionInfo } from "@huangqi_an/hqa-utils";

const conn = getConnectionInfo();
if (conn?.saveData || conn?.effectiveType === "2g") {
  loadThumbnailInstead();
}
```

### onMediaQueryChange(query, cb)

订阅媒体查询匹配状态变化（`matchMedia` + change 事件），订阅时立即同步回调一次当前匹配状态；兼容旧版 Safari 的 `addListener`。非浏览器环境返回空操作（SSR 安全）。

```ts
import { onMediaQueryChange } from "@huangqi_an/hqa-utils";

const unsubscribe = onMediaQueryChange("(prefers-color-scheme: dark)", (dark) => {
  document.documentElement.dataset.theme = dark ? "dark" : "light";
});
// 组件卸载时
unsubscribe();
```

### prefersDarkScheme() / prefersReducedMotion()

系统偏好的一次性查询：是否偏好深色配色（`(prefers-color-scheme: dark)`）、是否要求减少动画（`(prefers-reduced-motion: reduce)`）。适合作为初始值判断；需要响应系统实时切换时配合 `onMediaQueryChange` 使用。非浏览器环境返回 `false`。

```ts
import { prefersDarkScheme, prefersReducedMotion } from "@huangqi_an/hqa-utils";

const theme = prefersDarkScheme() ? "dark" : "light";
const duration = prefersReducedMotion() ? 0 : 300;
```

### parseQuery(input)

宽松解析查询字符串为对象。输入兼容裸 query、带 `?` 前缀与完整 URL（自动截取）；无值 key 解析为空字符串，重复 key 合并为数组，非法百分号编码不抛错保留原样。

```ts
import { parseQuery } from "@huangqi_an/hqa-utils";

parseQuery("?a=1&b=hello+world");    // { a: "1", b: "hello world" }
parseQuery("a=1&a=2&flag");          // { a: ["1", "2"], flag: "" }
parseQuery("https://x.com/p?a=1#h"); // { a: "1" }
```

### buildUrl(path, params?)

构建带查询参数的 URL：参数值统一 `String()` 后编码，`null` / `undefined` 的条目忽略；path 已带 query 时用 `&` 追加。

```ts
import { buildUrl } from "@huangqi_an/hqa-utils";

buildUrl("/search", { q: "hello world", page: 2 }); // "/search?q=hello+world&page=2"
buildUrl("/list?tab=all", { page: 1 });             // "/list?tab=all&page=1"
```

### updateSearchParams(url, patch)

对 URL 查询参数增删改查，返回新 URL 字符串：patch 值为 `null` / `undefined` 删除该参数（同名多个值一并删），其余覆盖设置。路径与 `#hash` 保持不变，相对 / 绝对 URL 均可。

```ts
import { updateSearchParams } from "@huangqi_an/hqa-utils";

updateSearchParams("/list?tab=all&page=1", { page: 2 });    // "/list?tab=all&page=2"
updateSearchParams("/list?tab=all&page=1", { page: null }); // "/list?tab=all"
```

### replaceQueryState(patch, options?)

直接更新当前页面 URL 的查询参数并写入 history（默认 `replaceState` 不产生新历史条目；`method: "push"` 新增一条可后退）。页面不重新加载；非浏览器环境为空操作。

```ts
import { replaceQueryState } from "@huangqi_an/hqa-utils";

// 当前 /list?tab=all&page=1
replaceQueryState({ page: 2 });    // → /list?tab=all&page=2
replaceQueryState({ page: null }); // → /list?tab=all
```

## page 页面可见性

### onVisibilityChange(callback)

订阅页面可见性变化（`visibilitychange`），**订阅时立即同步回调当前状态**（与 `onNetworkChange` 语义一致）。非浏览器环境返回 noop。

```ts
import { onVisibilityChange } from "@huangqi_an/hqa-utils";

// 页面切走时暂停轮询，回来后恢复
const stop = onVisibilityChange((visible) => {
  if (visible) resumePolling();
  else pausePolling();
});
stop(); // 取消订阅
```

### whenDocumentVisible()

等待页面变为可见，返回 Promise：已可见时立即 resolve；隐藏时挂起到变为可见；非浏览器环境立即 resolve（避免服务端挂起）。

```ts
import { whenDocumentVisible } from "@huangqi_an/hqa-utils";

// 把重活推迟到用户真正看向页面时
await whenDocumentVisible();
refreshData();
```

### onUrlChange(callback)

订阅 URL 变化，**SPA 路由跳转（`pushState` / `replaceState`）与浏览器前进后退（`popstate`）都能监听到**。订阅时立即回调当前 URL；URL 实际未变化时不重复回调。内部对 history 方法做引用计数式包装，最后一个订阅者取消时还原。

```ts
import { onUrlChange } from "@huangqi_an/hqa-utils";

// SPA 里同步更新页面标题 / 埋点上报
const stop = onUrlChange((url) => {
  document.title = titles[url] ?? "默认标题";
  trackPageView(url);
});
stop(); // 取消订阅
```

## scroll 滚动小件

### getScrollPercent(target?)

获取滚动进度百分比（0 ~ 100）。不传参数计算整页滚动，传元素计算其内部滚动。内容不超出可滚动区域时返回 100，非浏览器环境返回 0；越界值（iOS 回弹）已收敛。

```ts
import { getScrollPercent } from "@huangqi_an/hqa-utils";

window.addEventListener(
  "scroll",
  () => {
    bar.style.width = `${getScrollPercent()}%`;
  },
  { passive: true },
);
```

### smoothScrollTo(target, options?)

平滑滚动窗口或指定容器到目标位置。目标支持像素位置、元素、`"top"`、`"bottom"`；最终位置收敛在可滚动范围内。默认尊重系统"减少动画"偏好（命中 `prefers-reduced-motion` 时改为瞬时滚动），可用 `behavior` 覆盖。

| 选项 | 默认 | 说明 |
| --- | --- | --- |
| `container` | - | 滚动容器元素，缺省时滚动整个窗口 |
| `offset` | `0` | 附加偏移量（像素），固定头部时传负值扣除其高度 |
| `behavior` | 自动 | 强制指定 `"smooth"` / `"auto"`，缺省时按减少动画偏好判断 |

```ts
import { smoothScrollTo } from "@huangqi_an/hqa-utils";

smoothScrollTo("top");                      // 回到顶部
smoothScrollTo(sectionEl, { offset: -80 }); // 滚到元素并扣除固定头部
smoothScrollTo(600, { behavior: "auto" });  // 瞬时滚到 600px
smoothScrollTo(bottomEl, { container: listEl }); // 在容器内滚动
```

### onScrollNearBottom(target, callback, options?)

监听滚动接近底部，用于无限加载 / "加载更多"。**订阅时立即检查一次**（内容不满屏时开箱即用），之后每次滚动事件中距底部 ≤ `threshold` 就触发。同一停留期间可能多次触发（如异步加载期间继续滚动），请自行加加载锁防重。

| 选项 | 默认 | 说明 |
| --- | --- | --- |
| `threshold` | `100` | 距底部多少像素内触发 |

```ts
import { onScrollNearBottom } from "@huangqi_an/hqa-utils";

// 无限加载（自带加载锁防重复触发）
let loading = false;
const stop = onScrollNearBottom(
  window, // 也可传容器元素做内部滚动
  async () => {
    if (loading) return;
    loading = true;
    await loadNextPage();
    loading = false;
  },
  { threshold: 200 },
);
stop();
```

### onScrollDirection(target, callback, options?)

监听滚动方向变化，方向反转时触发（`"down"` / `"up"`）。只检测垂直方向；订阅后的第一次滚动即按实际方向触发；纯水平滚动、iOS 顶/底回弹不触发。适合"向下滚隐藏、向上滚显示"的悬浮头部交互。

| 选项 | 默认 | 说明 |
| --- | --- | --- |
| `tolerance` | `0` | 容忍带（像素），带内滚动不触发，用于过滤触摸/惯性抖动 |

```ts
import { onScrollDirection } from "@huangqi_an/hqa-utils";

onScrollDirection(
  window,
  (dir) => {
    header.classList.toggle("hidden", dir === "down");
  },
  { tolerance: 8 },
);
```

### onScrollStop(target, callback, options?)

监听滚动停止：滚动事件静默 `delay` 毫秒后触发一次回调。适合"滚动停下后再做计算"：懒加载图片、显示回到顶部按钮、惯性滚动结束后做对齐。

| 选项 | 默认 | 说明 |
| --- | --- | --- |
| `delay` | `150` | 判定停止的静默时长（毫秒） |

```ts
import { onScrollStop } from "@huangqi_an/hqa-utils";

// 惯性滚动结束后显示悬浮操作按钮
const stop = onScrollStop(window, () => showFab(), { delay: 200 });
stop(); // 取消订阅（会同时清掉挂起未触发的回调）
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
