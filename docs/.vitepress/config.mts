import { defineConfig } from "vitepress";

const modules = [
  { text: "async 异步", link: "/modules/async" },
  { text: "client 客户端信息", link: "/modules/client" },
  { text: "css CSS 变量", link: "/modules/css" },
  { text: "device 设备感知", link: "/modules/device" },
  { text: "dom DOM 小件", link: "/modules/dom" },
  { text: "loader 资源加载", link: "/modules/loader" },
  { text: "monitor 白屏检测", link: "/modules/monitor" },
  { text: "mouse 鼠标", link: "/modules/mouse" },
  { text: "page 页面可见性与 URL", link: "/modules/page" },
  { text: "preload 资源预加载", link: "/modules/preload" },
  { text: "schedule 调度", link: "/modules/schedule" },
  { text: "scroll 滚动小件", link: "/modules/scroll" },
  { text: "security 安全小件", link: "/modules/security" },
  { text: "storage 存储", link: "/modules/storage" },
  { text: "timing 定时控制", link: "/modules/timing" },
  { text: "url 查询参数", link: "/modules/url" },
];

export default defineConfig({
  lang: "zh-CN",
  title: "hqa-utils",
  description: "零依赖、框架无关、SSR 安全的 TypeScript 工具库",
  base: "/hqa-utils/",
  lastUpdated: true,
  head: [["link", { rel: "icon", href: "/hqa-utils/favicon.svg", type: "image/svg+xml" }]],
  themeConfig: {
    nav: [
      { text: "指南", link: "/guide/getting-started" },
      { text: "API", link: "/modules/async" },
      { text: "GitHub", link: "https://github.com/huangqi-an/hqa-utils" },
    ],
    sidebar: {
      "/guide/": [
        {
          text: "指南",
          items: [{ text: "快速开始", link: "/guide/getting-started" }],
        },
      ],
      "/modules/": [
        {
          text: "API 模块",
          items: modules,
        },
      ],
    },
    socialLinks: [{ icon: "github", link: "https://github.com/huangqi-an/hqa-utils" }],
    search: {
      provider: "local",
      options: {
        translations: {
          button: { buttonText: "搜索文档", buttonAriaLabel: "搜索文档" },
          modal: {
            noResultsText: "没有找到结果",
            resetButtonTitle: "清除查询条件",
            displayDetails: "显示详细列表",
            footer: { selectText: "选择", navigateText: "切换", closeText: "关闭" },
          },
        },
      },
    },
    outline: [2, 3],
    docFooter: { prev: "上一页", next: "下一页" },
    lastUpdated: { text: "最后更新" },
    returnToTop: true,
    footer: {
      message: "基于 MIT 许可发布",
      copyright: "Copyright © 2025-present huangqi-an",
    },
  },
});
