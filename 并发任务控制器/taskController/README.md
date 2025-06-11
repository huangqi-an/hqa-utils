# 并发任务控制器 (ConcurrentTaskController)

一个强大的并发任务调度系统，支持任务依赖管理、优先级调度、失败重试和进度跟踪等功能。

## 特性

- 🚀 **并发控制**：精确控制同时运行的任务数量
- 📊 **优先级调度**：基于优先级的任务调度，支持动态优先级调整
- 🔗 **依赖管理**：支持任务间的依赖关系，确保任务按正确顺序执行
- 🔄 **失败重试**：自动重试失败的任务，支持自定义重试次数
- 📈 **进度跟踪**：实时监控任务执行进度
- 🧹 **资源管理**：自动清理已完成的任务，防止内存泄漏
- 🎯 **状态管理**：完整的任务生命周期管理
- 🔍 **调试支持**：详细的调试日志，方便问题排查

## 安装

```bash
npm install @your-scope/concurrent-task-controller
```

## 快速开始

```typescript
import { ConcurrentTaskController } from '@your-scope/concurrent-task-controller';

// 创建控制器实例
const controller = new ConcurrentTaskController({
  maxConcurrent: 2,  // 最大并发数
  autoCleanup: true, // 自动清理已完成任务
  onTaskComplete: (task) => {
    console.log(`任务 ${task.id} 完成`);
  }
});

// 添加任务
const taskId = await controller.addTask({
  priority: 1,
  execute: async () => {
    // 任务执行逻辑
    return '任务结果';
  }
});
```

## API 文档

### 构造函数

```typescript
new ConcurrentTaskController(options: {
  maxConcurrent?: number;      // 最大并发数，默认 1
  autoCleanup?: boolean;       // 是否自动清理已完成任务，默认 false
  cleanupInterval?: number;    // 清理间隔（毫秒），默认 5000
  onTaskComplete?: (task: Task) => void;    // 任务完成回调
  onTaskError?: (task: Task, error: Error) => void;  // 任务失败回调
  onTaskProgress?: (task: Task, progress: number) => void;  // 进度更新回调
})
```

### 任务管理方法

#### 添加任务
```typescript
addTask(options: {
  priority: number;           // 任务优先级（数字越大优先级越高）
  execute: TaskExecutor;      // 任务执行函数
  dependencies?: string[];    // 依赖的任务ID列表
  maxRetries?: number;        // 最大重试次数
  retryDelay?: number;        // 重试延迟（毫秒）
}): Promise<string>  // 返回任务ID
```

#### 任务状态查询
```typescript
getTaskStatus(taskId: string): TaskStatus | undefined
getAllTasks(): Task[]
getRunningTasks(): Task[]
getPendingTasks(): Task[]
getFailedTasks(): Task[]
```

#### 任务控制
```typescript
pause(): void                 // 暂停任务调度
resume(): void                // 恢复任务调度
cancelTask(taskId: string): void  // 取消指定任务
clear(): void                 // 清空所有任务
dispose(): void               // 销毁控制器
```

#### 任务进度更新
```typescript
updateTaskProgress(taskId: string, progress: number): void
```

### 任务状态

任务可能处于以下状态之一：
- `pending`: 等待执行
- `running`: 正在执行
- `completed`: 执行完成
- `failed`: 执行失败
- `cancelled`: 已取消

## 使用示例

### 1. 基本任务执行
```typescript
const controller = new ConcurrentTaskController({
  maxConcurrent: 2
});

const taskId = await controller.addTask({
  priority: 1,
  execute: async () => {
    // 执行耗时操作
    await someAsyncOperation();
    return '任务完成';
  }
});
```

### 2. 带依赖的任务
```typescript
// 添加基础任务
const baseTaskId = await controller.addTask({
  priority: 1,
  execute: async () => {
    // 基础任务逻辑
  }
});

// 添加依赖任务
const dependentTaskId = await controller.addTask({
  priority: 2,
  dependencies: [baseTaskId],
  execute: async () => {
    // 依赖任务逻辑
  }
});
```

### 3. 带重试的任务
```typescript
const taskId = await controller.addTask({
  priority: 1,
  maxRetries: 2,
  retryDelay: 1000,
  execute: async () => {
    // 可能失败的任务逻辑
    if (Math.random() > 0.5) {
      throw new Error('任务失败');
    }
    return '任务成功';
  }
});
```

### 4. 带进度跟踪的任务
```typescript
const controller = new ConcurrentTaskController({
  onTaskProgress: (task, progress) => {
    console.log(`任务 ${task.id} 进度: ${progress}%`);
  }
});

const taskId = await controller.addTask({
  priority: 1,
  execute: async (controller, taskId) => {
    for (let i = 0; i < 10; i++) {
      await someAsyncOperation();
      controller.updateTaskProgress(taskId, (i + 1) * 10);
    }
  }
});
```

## 最佳实践

### 1. 并发数设置
- 根据系统资源和任务特性设置合适的并发数
- 对于IO密集型任务，可以设置较高的并发数
- 对于CPU密集型任务，建议将并发数设置为CPU核心数

### 2. 优先级管理
- 使用合理的优先级范围（如1-10）
- 为重要任务设置较高优先级
- 考虑使用动态优先级调整

### 3. 依赖管理
- 避免循环依赖
- 合理组织任务依赖关系
- 注意依赖任务的清理时机

### 4. 错误处理
- 实现适当的错误处理回调
- 设置合理的重试次数和延迟
- 记录详细的错误信息

### 5. 资源管理
- 启用自动清理功能
- 定期检查任务状态
- 及时清理不需要的任务

## 性能考虑

1. **内存使用**
   - 启用自动清理功能
   - 及时清理已完成的任务
   - 避免创建过多任务

2. **CPU使用**
   - 合理设置并发数
   - 避免任务执行时间过长
   - 使用异步操作避免阻塞

3. **任务调度**
   - 优化优先级计算
   - 减少不必要的状态检查
   - 合理设置清理间隔

## 调试

控制器提供了详细的调试日志，可以通过以下方式启用：

```typescript
const controller = new ConcurrentTaskController({
  debug: true,  // 启用调试日志
  // ... 其他配置
});
```

调试日志包括：
- 任务状态变化
- 依赖检查结果
- 调度决策过程
- 资源清理信息
