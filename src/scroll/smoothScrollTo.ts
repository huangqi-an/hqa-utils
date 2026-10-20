import { prefersReducedMotion } from "../device/prefersReducedMotion.js";

/** 滚动目标：像素位置 / 元素 / 顶部 / 底部 */
export type SmoothScrollTarget = number | HTMLElement | "top" | "bottom";

export interface SmoothScrollToOptions {
  /** 滚动容器元素，缺省时滚动整个窗口 */
  container?: HTMLElement;
  /** 附加偏移量（像素），例如存在固定头部时传负值扣除其高度 */
  offset?: number;
  /** 强制指定滚动行为；缺省时自动判断——用户偏好减少动画时瞬时滚动，否则平滑滚动 */
  behavior?: ScrollBehavior;
}

/**
 * 平滑滚动窗口或指定容器到目标位置。
 *
 * 支持四种目标：像素位置、元素、`"top"`、`"bottom"`；最终位置会收敛在可滚动范围内。
 * 默认尊重系统"减少动画"偏好（prefers-reduced-motion）：命中时改为瞬时滚动，
 * 需要覆盖该行为时显式传 `behavior`。
 * @param target 滚动目标
 * @param options 可选项：容器、偏移、滚动行为
 * @example
 * smoothScrollTo("top"); // 回到顶部
 * smoothScrollTo(sectionEl, { offset: -80 }); // 滚到元素并扣除固定头部
 * smoothScrollTo(600, { behavior: "auto" }); // 瞬时滚到 600px
 */
export function smoothScrollTo(
  target: SmoothScrollTarget,
  options: SmoothScrollToOptions = {},
): void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }
  const { container, offset = 0, behavior } = options;
  const max = container
    ? container.scrollHeight - container.clientHeight
    : document.documentElement.scrollHeight - window.innerHeight;

  let top: number;
  if (target === "top") {
    top = 0;
  } else if (target === "bottom") {
    top = max;
  } else if (typeof target === "number") {
    top = target;
  } else if (container) {
    top =
      target.getBoundingClientRect().top -
      container.getBoundingClientRect().top +
      container.scrollTop;
  } else {
    top = target.getBoundingClientRect().top + window.scrollY;
  }

  top = Math.min(Math.max(top + offset, 0), Math.max(max, 0));
  const resolved = behavior ?? (prefersReducedMotion() ? "auto" : "smooth");
  if (container) {
    container.scrollTo({ top, behavior: resolved });
  } else {
    window.scrollTo({ top, behavior: resolved });
  }
}
