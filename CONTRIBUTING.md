# 贡献指南

感谢关注 hqa-utils！本文档说明如何搭建环境、参与开发与提交代码。

## 环境准备

- Node.js 22+（推荐用 nvm 管理）
- npm 11+
- 克隆仓库并安装依赖：

```bash
git clone git@github.com:huangqi-an/hqa-utils.git
cd hqa-utils
npm install
```

## npm scripts

| 命令 | 说明 |
| --- | --- |
| `npm test` | 运行全部测试（vitest） |
| `npm run test:coverage` | 测试 + 覆盖率报告 |
| `npm run lint` | ESLint 检查 |
| `npm run typecheck` | TypeScript 类型检查 |
| `npm run build` | 构建 ESM + CJS + d.ts（tsup） |

## 开发约定

### 目录结构

- `src/<模块>/<功能>.ts` — 一个功能一个文件，带中文 TSDoc 注释（含 `@example`）
- `src/<模块>/<功能>.test.ts` — 对应功能的 vitest 测试
- `src/<模块>/index.ts` — re-export 本模块全部功能
- 新增模块需在 `src/index.ts` 中 re-export

### 代码原则

- **零 runtime 依赖**：不引入任何 dependencies，能力全部手写
- **框架无关**：不依赖特定 UI 框架，纯函数 / 事件订阅风格
- **SSR / Node 安全**：浏览器 API 在环境缺失时返回 `false` / `null` 或自动降级，不抛错
- **新功能必须带测试**：依赖 DOM 的测试文件用 `// @vitest-environment jsdom` 按需启用，其余跑 node 环境

### 验证门禁

每个功能提交前四件套必须全绿：

```bash
npm run test && npm run lint && npm run typecheck && npm run build
```

## 提交规范

遵循 Conventional Commits，**一个功能一个提交**：

| 前缀 | 用途 |
| --- | --- |
| `feat` | 新功能 |
| `fix` | 缺陷修复 |
| `docs` | 文档变更 |
| `test` | 测试补充 / 调整 |
| `refactor` | 重构（不改行为） |
| `chore` | 构建、依赖、工程配置 |

示例：`feat(mouse): 新增长按检测 onLongPress（Pointer Events，支持 once/自定义 delay）`

## PR 流程

1. Fork 仓库或从 `main` 拉功能分支（如 `feat/idle-queue`）
2. 开发并保证四件套全绿
3. 提交 Pull Request，描述清楚动机与改动点
4. CI 会自动跑 lint + typecheck + test + build，必须全绿
5. Review 通过后合并

## 问题反馈

- **Bug**：请附最小复现代码与环境信息（可贴 `getClientInfo()` 的输出）
- **Feature**：建议先开 issue 讨论必要性与 API 设计，避免无效工作

## 发布（maintainer）

1. `npm version <version>` 更新版本号（同步 package.json 与 lock）
2. `git push origin main`
3. 打 `v*` tag 并推送，CI 自动执行 lint → test → build → npm publish → GitHub Release
