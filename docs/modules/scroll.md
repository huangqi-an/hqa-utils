# scroll 滚动小件

滚动进度、平滑滚动、无限加载、方向与停止监听。

| 导出 | 说明 |
| --- | --- |
| `getScrollPercent(target?)` | 滚动进度百分比（0~100） |
| `smoothScrollTo(target, options?)` | 平滑滚动（尊重减少动画偏好） |
| `onScrollNearBottom(target, callback, options?)` | 接近底部监听（无限加载） |
| `onScrollDirection(target, callback, options?)` | 滚动方向监听 |
| `onScrollStop(target, callback, options?)` | 滚动停止监听 |

## getScrollPercent(target?)

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

## smoothScrollTo(target, options?)

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

## onScrollNearBottom(target, callback, options?)

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

## onScrollDirection(target, callback, options?)

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

## onScrollStop(target, callback, options?)

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
