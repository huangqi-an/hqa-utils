/**
 * 规范化 CSS 自定义属性名：未带 `--` 前缀时自动补全。
 */
function normalizeVarName(name: string): string {
  return name.startsWith("--") ? name : `--${name}`;
}

/**
 * 读取元素生效的 CSS 自定义属性（CSS 变量）值。
 *
 * 封装 `getComputedStyle(el).getPropertyValue(name)`，处理它的三个坑：
 * - 返回值带前导空格（如 `" red"`）→ 已 trim
 * - 未定义与空串不可区分 → 未设置时返回 `null`
 * - 变量名必须以 `--` 开头 → 未带前缀时自动补全（`"color"` 即 `"--color"`）
 *
 * 注意：读取的是**计算后的生效值**（含级联与继承），不限于内联样式；
 * 而修改请用 {@link setCssVars}（写内联样式）。
 *
 * 非浏览器环境（SSR）或元素无效时返回 `null`，不抛错。
 *
 * @param el 目标元素
 * @param name 变量名，`--` 前缀可省略
 * @returns 生效值（已 trim）；未设置或环境不支持时为 `null`
 *
 * @example
 * ```ts
 * const color = getCssVar(document.documentElement, "theme-color");
 * if (color) paint(color);
 * ```
 */
export function getCssVar(el: Element, name: string): string | null {
  if (
    !el ||
    typeof window === "undefined" ||
    typeof getComputedStyle !== "function"
  ) {
    return null;
  }

  const value = getComputedStyle(el).getPropertyValue(normalizeVarName(name)).trim();
  return value === "" ? null : value;
}

/**
 * 批量写入 / 删除元素的内联 CSS 自定义属性。
 *
 * 主题切换的标准姿势——一次换一组变量（`--bg` / `--fg` / `--accent`…）：
 * - 值为 `null` 时删除该变量（与 `updateSearchParams` 的 null 删语义一致）
 * - 变量名未带 `--` 前缀时自动补全
 *
 * 非浏览器环境（SSR）或元素无效时为空操作，不抛错。
 *
 * @param el 目标元素
 * @param vars 变量表，值为 `null` 表示删除
 *
 * @example
 * ```ts
 * // 深色主题：换一组变量，顺带清掉不再使用的
 * setCssVars(document.documentElement, {
 *   "--bg": "#1a1a2e",
 *   "--fg": "#eaeaea",
 *   "--legacy-accent": null,
 * });
 * ```
 */
export function setCssVars(el: HTMLElement, vars: Record<string, string | null>): void {
  if (!el || typeof el.style?.setProperty !== "function") return;

  for (const [name, value] of Object.entries(vars)) {
    const varName = normalizeVarName(name);
    if (value === null) {
      el.style.removeProperty(varName);
    } else {
      el.style.setProperty(varName, value);
    }
  }
}
