# css CSS 变量操作

CSS 自定义属性（CSS 变量）的读写。

| 导出 | 说明 |
| --- | --- |
| `getCssVar(el, name)` | 读取变量生效值（trim / 未定义 null / 前缀自动补全） |
| `setCssVars(el, vars)` | 批量写入变量（值为 null 即删除） |

## getCssVar(el, name)

读取元素生效的 CSS 自定义属性值，处理 `getComputedStyle` 的三个坑：返回值带前导空格（已 trim）、未定义与空串不可分（未设置返回 `null`）、变量名必须 `--` 开头（自动补全）。

```ts
import { getCssVar } from "@huangqi_an/hqa-utils";

const color = getCssVar(document.documentElement, "theme-color"); // "color" 即 "--color"
if (color) paint(color);
```

- 读取的是计算后的生效值（含级联与继承），不限于内联样式
- 变量名 `--` 前缀可省略
- SSR 返回 `null`

## setCssVars(el, vars)

批量写入元素的内联 CSS 自定义属性——主题切换的标准姿势：一次换一组变量，值为 `null` 表示删除。

```ts
import { setCssVars } from "@huangqi_an/hqa-utils";

// 深色主题：换一组变量，顺带清掉不再使用的
setCssVars(document.documentElement, {
  "--bg": "#1a1a2e",
  "--fg": "#eaeaea",
  "--legacy-accent": null,
});
```

- 变量名 `--` 前缀可省略
- SSR 为空操作
