# 并发任务控制器 (Concurrent Task Controller)

一个功能强大的 TypeScript 并发任务控制器，用于管理和控制多个异步任务的并发执行。支持任务优先级、依赖关系、超时控制、重试机制、进度追踪等功能。

## 特性

- 🚀 **并发控制**：限制最大并发任务数
- ⭐ **优先级管理**：支持任务优先级排序
- 🔗 **依赖管理**：支持任务之间的依赖关系
- ⏱️ **超时控制**：支持任务超时设置和回调
- 🔄 **重试机制**：支持任务失败自动重试
- 📊 **进度追踪**：支持任务进度实时更新
- ⏯️ **任务控制**：支持暂停/恢复单个任务或所有任务
- 🧹 **自动清理**：支持自动清理已完成的任务
- 🛡️ **类型安全**：完整的 TypeScript 类型支持

<!-- ## 安装

```bash
npm install concurrent-task-controller
# 或
yarn add concurrent-task-controller
# 或
pnpm add concurrent-task-controller
``` -->

## 快速开始

```typescript
import { ConcurrentTaskController } from 'concurrent-task-controller';

// 创建任务控制器
const controller = new ConcurrentTaskController({
  maxConcurrent: 2,  // 最大并发数
  autoCleanup: true, // 启用自动清理
});

// 添加任务
const taskId = await controller.addTask({
  priority: 1,
  timeout: 5000,     // 5秒超时
  maxRetries: 2,     // 最多重试2次
  execute: async (controller, taskId) => {
    // 执行任务逻辑
    return '任务结果';
  }
});
```

## 详细用法

### 1. 基本配置

```typescript
const controller = new ConcurrentTaskController({
  maxConcurrent: 3,           // 最大并发数
  autoCleanup: true,          // 自动清理
  cleanupInterval: 60000,     // 清理间隔（毫秒）
  onTaskComplete: (task) => { /* 任务完成回调 */ },
  onTaskError: (task, error) => { /* 任务失败回调 */ },
  onTaskTimeout: (task) => { /* 任务超时回调 */ },
  onTaskProgress: (task, progress) => { /* 进度更新回调 */ }
});
```

### 2. 任务配置

```typescript
const task = {
  priority: 1,                // 优先级（数字越大优先级越高）
  timeout: 10000,            // 超时时间（毫秒）
  maxRetries: 2,             // 最大重试次数
  dependencies: ['task1'],   // 依赖的任务ID列表
  onProgress: (progress) => { /* 进度回调 */ },
  execute: async (controller, taskId) => {
    // 更新任务进度
    controller.updateTaskProgress(taskId, 50);
    return '任务结果';
  }
};
```

### 3. 任务控制

```typescript
// 暂停所有任务
controller.pause();

// 恢复所有任务
controller.resume();

// 暂停单个任务
controller.pauseTask(taskId);

// 恢复单个任务
controller.resumeTask(taskId);

// 取消任务
controller.cancelTask(taskId);

// 清空所有任务
controller.clear();
```

### 4. 状态查询

```typescript
// 获取任务状态
const taskStatus = controller.getTaskStatus(taskId);

// 获取所有任务
const allTasks = controller.getAllTasks();

// 获取运行中的任务
const runningTasks = controller.getRunningTasks();

// 获取等待中的任务
const pendingTasks = controller.getPendingTasks();
```

## 完整示例

查看 `test/concurrentTaskDemoAdvanced.ts` 文件，了解完整的使用示例，包括：
- 任务优先级管理
- 任务依赖关系
- 超时处理
- 重试机制
- 进度追踪
- 暂停/恢复功能

## API 文档

### ConcurrentTaskController

#### 构造函数

```typescript
constructor(options: TaskControllerOptions)
```

#### 配置选项

```typescript
interface TaskControllerOptions {
  maxConcurrent: number;      // 最大并发数
  onTaskComplete?: (task: Task) => void;
  onTaskError?: (task: Task, error: Error) => void;
  onTaskTimeout?: (task: Task) => void;
  onTaskProgress?: (task: Task, progress: number) => void;
  autoCleanup?: boolean;      // 是否自动清理
  cleanupInterval?: number;   // 清理间隔（毫秒）
}
```

#### 主要方法

- `addTask<T>(task: Omit<Task<T>, 'status' | 'id'>): Promise<string>`
- `pause(): void`
- `resume(): void`
- `pauseTask(taskId: string): boolean`
- `resumeTask(taskId: string): boolean`
- `cancelTask(taskId: string): boolean`
- `updateTaskProgress(taskId: string, progress: number): void`
- `getTaskStatus(taskId: string): Task | undefined`
- `getAllTasks(): Task[]`
- `getRunningTasks(): Task[]`
- `getPendingTasks(): Task[]`
- `clear(): void`
- `dispose(): void`

## 最佳实践

1. **资源管理**
   - 使用 `dispose()` 方法在不需要控制器时清理资源
   - 启用 `autoCleanup` 自动清理已完成的任务

2. **错误处理**
   - 设置合适的 `maxRetries` 处理临时性错误
   - 使用 `onTaskError` 回调处理任务失败
   - 设置合理的 `timeout` 避免任务卡死

3. **性能优化**
   - 根据系统资源设置合适的 `maxConcurrent`
   - 使用任务优先级确保重要任务优先执行
   - 合理设置 `cleanupInterval` 平衡内存使用

4. **任务设计**
   - 将大任务拆分为小任务
   - 使用依赖关系管理任务顺序
   - 实现进度回调提供更好的用户体验

<!-- ## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT  -->
