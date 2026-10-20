# schedule 调度工具

渲染帧与空闲时段的任务调度。

| 导出 | 说明 |
| --- | --- |
| `raf(fn?)` | Promise 化的下一帧等待 |
| `waitFrames(n)` | 等待 n 帧 |
| `rafThrottle(fn)` | 帧节流 |
| `onRafLoop(cb)` | 持续动画循环 |
| `whenIdle(fn?, options?)` | 空闲时执行低优先级任务 |
| `createIdleQueue(options?)` | 空闲任务队列 |

## raf(fn?) / waitFrames(n)

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

## rafThrottle(fn)

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
- 与 [`timing.throttle`](/modules/timing#throttle-fn-wait-options) 的区别：以渲染帧为基准而非时间窗口

## onRafLoop(cb)

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

## whenIdle(fn?, options?)

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

## createIdleQueue(options?)

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
