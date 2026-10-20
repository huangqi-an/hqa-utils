/**
 * 白屏检测结果。
 */
export interface BlankScreenResult {
  /** 是否判定为白屏 */
  blank: boolean;
  /** 白点数量（采样点中未命中任何内容的数量） */
  blankCount: number;
  /** 采样点总数 */
  total: number;
}

/**
 * isPageBlank 的配置项。
 */
export interface IsPageBlankOptions {
  /**
   * 额外的容器白名单选择器：采样点命中的元素链上，若全部元素都是
   * `html` / `body` 或命中这些选择器的"壳容器"，该点判定为白。
   *
   * SPA 挂载根节点应加入白名单（默认已含常见框架的）：
   * React `#root`、Vue `#app`、Next.js `#__next`。
   * 想把骨架屏也算作白屏，把骨架屏选择器加进来即可。
   */
  containers?: string[];
  /**
   * 白点比例阈值（0~1），白点占比超过它才判定白屏，默认 `0.9`。
   * 调低更敏感（容易误报），调高更保守（容易漏报）。
   */
  threshold?: number;
}

const DEFAULT_CONTAINERS = ["#root", "#app", "#__next"];
const GRID = 3; // 3x3 九宫格采样

function isBlankPoint(x: number, y: number, selectors: string[]): boolean {
  const chain = document.elementsFromPoint(x, y);
  // 视口外 / 无命中视为白
  if (chain.length === 0) return true;
  return chain.every((el) => {
    const tag = el.tagName;
    if (tag === "HTML" || tag === "BODY") return true;
    return selectors.some((selector) => {
      // 非法选择器不抛错，视为不匹配
      try {
        return el.matches(selector);
      } catch {
        return false;
      }
    });
  });
}

/**
 * 检测当前页面是否白屏（采样点方案）。
 *
 * 在视口 3x3 九宫格的中心取 9 个采样点，每个点用
 * `document.elementsFromPoint` 取该坐标从上到下命中的元素链——
 * 链上全部是 `html` / `body` 或容器白名单元素（SPA 挂载根的"空壳"）
 * 即为白点；白点占比超过 `threshold` 判定白屏。
 *
 * 适合 JS 报错 / 渲染失败导致整页空白的监控场景，
 * 由调用方决定检测时机（`load` 后、路由切换后、定时轮询等），
 * 需要挂机监测可直接用 {@link onBlankScreen}。
 *
 * 非浏览器环境（SSR）或环境不支持 `elementsFromPoint` 时
 * 返回 `blank: false`（无法判定，不误报），不抛错。
 *
 * 边界：
 * - 纯 CSS 背景图会被判为白（背景不是元素），有此诉求请勿依赖本检测
 * - 不穿透 iframe 与 Shadow DOM
 *
 * @param options 配置项
 * @returns 检测结果（含白点数与总数，可随监控上报）
 *
 * @example
 * ```ts
 * // 路由切换渲染完成后检测
 * const { blank, blankCount, total } = isPageBlank();
 * if (blank) report("白屏", { blankCount, total });
 * ```
 */
export function isPageBlank(options?: IsPageBlankOptions): BlankScreenResult {
  if (
    typeof document === "undefined" ||
    typeof window === "undefined" ||
    typeof document.elementsFromPoint !== "function"
  ) {
    return { blank: false, blankCount: 0, total: 0 };
  }

  const { containers = [], threshold = 0.9 } = options ?? {};
  const selectors = [...DEFAULT_CONTAINERS, ...containers];

  let blankCount = 0;
  const total = GRID * GRID;
  for (let col = 0; col < GRID; col++) {
    for (let row = 0; row < GRID; row++) {
      const x = (window.innerWidth * (col + 0.5)) / GRID;
      const y = (window.innerHeight * (row + 0.5)) / GRID;
      if (isBlankPoint(x, y, selectors)) blankCount++;
    }
  }

  return { blank: blankCount / total > threshold, blankCount, total };
}
