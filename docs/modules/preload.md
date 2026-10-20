# preload 资源预加载

`<link rel="preload">` / `preconnect` / `prefetch` 的封装，带去重与 Promise 化。

| 导出 | 说明 |
| --- | --- |
| `preloadResource(url, options?)` | 预加载资源（按扩展名推断类型） |
| `preconnectTo(url)` | 连接预热（DNS+TCP+TLS） |
| `dnsPrefetch(url)` | 仅 DNS 预热 |
| `preloadImage(url)` | 预加载图片，resolve 固有尺寸 |
| `prefetchWhenIdle(urls, options?)` | 空闲时批量预取 |

## preloadResource(url, options?)

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

## preconnectTo(url) / dnsPrefetch(url)

连接预热：提前与目标源站建立连接（preconnect 为 DNS+TCP+TLS，dnsPrefetch 仅 DNS），后续请求该域名可省去握手时间。同一 origin 只插入一次，SSR 下返回 `false`。

```ts
import { preconnectTo, dnsPrefetch } from "@huangqi_an/hqa-utils";

// 应用启动时预热第三方字体站 / 统计域名
preconnectTo("https://fonts.gstatic.com");
dnsPrefetch("https://analytics.example.com");
```

## preloadImage(url)

预加载图片，成功时 resolve 固有尺寸（可用于占位布局），失败 reject。相同 URL 复用同一 Promise；SSR 下 resolve `{ width: 0, height: 0 }`。

```ts
import { preloadImage } from "@huangqi_an/hqa-utils";

// 轮播图切换前预加载，拿到尺寸先渲染占位
const { width, height } = await preloadImage(next.src);
setPlaceholder(width / height);
```

## prefetchWhenIdle(urls, options?)

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
