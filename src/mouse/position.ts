export interface MousePosition {
  /** 相对浏览器视口左上角的 X 坐标（clientX） */
  x: number;
  /** 相对浏览器视口左上角的 Y 坐标（clientY） */
  y: number;
}

export type MousePositionListener = (position: MousePosition) => void;

let currentPosition: MousePosition | null = null;
let subscriptionCount = 0;
const listeners = new Set<MousePositionListener>();

function handleMouseMove(event: MouseEvent): void {
  currentPosition = { x: event.clientX, y: event.clientY };
  for (const listener of listeners) listener(currentPosition);
}

/** 首个订阅时激活全局监听，最后一个订阅取消时解绑并清空缓存 */
function syncListening(): void {
  if (typeof window === "undefined") return;
  if (subscriptionCount > 0) {
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
  } else {
    window.removeEventListener("mousemove", handleMouseMove);
    currentPosition = null;
  }
}

/**
 * 获取最近一次已知的鼠标位置（视口坐标）
 *
 * 仅当存在活跃订阅（onMousePositionChange）时才有值，否则返回 null。
 * @example
 * const pos = getMousePosition();
 * if (pos) console.log(pos.x, pos.y);
 */
export function getMousePosition(): MousePosition | null {
  return currentPosition;
}

/**
 * 订阅鼠标位置变化（mousemove 驱动），返回取消订阅函数
 *
 * 全局仅维护一个 mousemove 监听器：首个订阅时绑定，最后一个订阅取消时解绑。
 * 高频回调请注意自行节流。
 * @example
 * const off = onMousePositionChange(({ x, y }) => {
 *   console.log(x, y);
 * });
 * off(); // 取消订阅
 */
export function onMousePositionChange(
  listener: MousePositionListener,
): () => void {
  if (typeof window === "undefined") return () => {};
  listeners.add(listener);
  subscriptionCount++;
  syncListening();
  return () => {
    if (!listeners.delete(listener)) return;
    subscriptionCount--;
    syncListening();
  };
}
