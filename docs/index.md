---
layout: home

hero:
  name: "hqa-utils"
  text: "零依赖 TypeScript 工具库"
  tagline: "框架无关 · SSR 安全 · ESM + CJS 双格式 · 379 个测试 · 覆盖率 96%"
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/getting-started
    - theme: alt
      text: 浏览 API
      link: /modules/async
    - theme: alt
      text: GitHub
      link: https://github.com/huangqi-an/hqa-utils

features:
  - icon: 🧩
    title: 12 个模块
    details: 异步控制、客户端信息、设备感知、DOM、鼠标、页面可见性与 URL、资源预加载、渲染调度、滚动、存储、定时、查询参数——覆盖前端高频工具场景
  - icon: 🪶
    title: 零依赖
    details: 不引入任何第三方运行时依赖，gzip 后约 9 KB，一个功能一个文件，tree-shaking 友好
  - icon: 🌐
    title: SSR 安全
    details: 所有浏览器 API 均有环境守卫，非浏览器环境返回降级值（null / false / noop），绝不抛错
  - icon: ✅
    title: 测试完备
    details: 379 个 vitest 测试，覆盖率 96%，订阅类 API 统一返回取消函数，CI 全绿后才发布
---
