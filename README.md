# hqa-utils

个人 TypeScript 工具库。

## 模块

| 模块 | 说明 |
| --- | --- |
| `async` | 异步工具：`sleep`、`runWithLimit`（后续迁移 taskController） |

## 开发

```bash
npm install        # 安装依赖
npm test           # 运行测试
npm run test:coverage  # 测试 + 覆盖率
npm run lint       # 代码检查
npm run typecheck  # 类型检查
npm run build      # 构建（ESM + CJS + d.ts）
```

## 结构

- `src/<模块>/index.ts` — 模块源码，带 TSDoc 注释
- `src/<模块>/index.test.ts` — 模块测试（vitest）
- 新模块需在 `src/index.ts` 中 re-export
