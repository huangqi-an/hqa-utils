// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { onDelegate } from "./onDelegate.js";

function setup() {
  document.body.innerHTML = `
    <div id="list">
      <button class="item" id="a" data-id="a"><span id="a-inner">A</span></button>
      <button id="other">B</button>
    </div>`;
  return {
    root: document.getElementById("list")!,
    itemA: document.getElementById("a")!,
    inner: document.getElementById("a-inner")!,
    other: document.getElementById("other")!,
  };
}

function click(el: Element): void {
  el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
}

describe("onDelegate（事件委托）", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("点击匹配元素本身时触发，matched 为该元素", () => {
    const { root, itemA } = setup();
    const cb = vi.fn();
    onDelegate(root, "click", ".item", cb);
    click(itemA);
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb.mock.calls[0]?.[1]).toBe(itemA);
  });

  it("点击匹配元素的子元素时沿祖先匹配，matched 为祖先", () => {
    const { root, inner, itemA } = setup();
    const cb = vi.fn();
    onDelegate(root, "click", ".item", cb);
    click(inner);
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb.mock.calls[0]?.[1]).toBe(itemA);
  });

  it("点击不匹配的元素不触发", () => {
    const { root, other } = setup();
    const cb = vi.fn();
    onDelegate(root, "click", ".item", cb);
    click(other);
    expect(cb).not.toHaveBeenCalled();
  });

  it("委托后动态添加的元素无需重新绑定即可触发", () => {
    const { root } = setup();
    const cb = vi.fn();
    onDelegate(root, "click", ".item", cb);

    const added = document.createElement("button");
    added.className = "item";
    root.appendChild(added);
    click(added);

    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb.mock.calls[0]?.[1]).toBe(added);
  });

  it("取消监听后不再触发", () => {
    const { root, itemA } = setup();
    const cb = vi.fn();
    const stop = onDelegate(root, "click", ".item", cb);
    stop();
    click(itemA);
    expect(cb).not.toHaveBeenCalled();
  });

  it("不同选择器的委托互不干扰", () => {
    const { root, itemA } = setup();
    const onItem = vi.fn();
    const onOther = vi.fn();
    onDelegate(root, "click", ".item", onItem);
    onDelegate(root, "click", "#other", onOther);
    click(itemA);
    expect(onItem).toHaveBeenCalledTimes(1);
    expect(onOther).not.toHaveBeenCalled();
  });

  it("target 为非元素节点（document）时不抛错", () => {
    const cb = vi.fn();
    const stop = onDelegate(document, "click", ".item", cb);
    // 直接在 document 上派发，target 即 document 本身，无 closest
    expect(() =>
      document.dispatchEvent(new MouseEvent("click", { bubbles: true })),
    ).not.toThrow();
    expect(cb).not.toHaveBeenCalled();
    stop();
  });

  it("capture: true 可监听不冒泡事件（focus）", () => {
    document.body.innerHTML = `<div id="box"><input id="input" /></div>`;
    const box = document.getElementById("box")!;
    const input = document.getElementById("input")!;
    const cb = vi.fn();
    onDelegate(box, "focus", "input", cb, { capture: true });
    input.dispatchEvent(new Event("focus"));
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb.mock.calls[0]?.[1]).toBe(input);
  });

  it("root 无效时返回 noop，不抛错", () => {
    expect(() => onDelegate(null as unknown as Document, "click", ".item", () => {})).not.toThrow();
    const stop = onDelegate(null as unknown as Document, "click", ".item", () => {});
    expect(() => stop()).not.toThrow();
  });
});
