/**
 * 函数式并发任务控制器示例
 * 演示如何使用函数式任务控制器创建和管理并发任务
 */

import { createTaskController } from '../utils/functionalTaskController';

/**
 * 创建模拟任务
 * 用于演示任务控制器的各种功能
 * 
 * @param id 任务ID（用于日志显示）
 * @param totalSteps 任务总步骤数
 * @param delay 任务总延迟时间（毫秒）
 * @param priority 任务优先级
 * @returns 任务配置对象
 */
const createMockTask = (id: number, totalSteps: number, delay: number, priority: number) => ({
  priority,                    // 任务优先级
  timeout: 10000,              // 任务超时时间（10秒）
  maxRetries: 2,               // 最大重试次数
  dependencies: [] as string[], // 任务依赖列表
  onProgress: (progress: number) => {
    // 进度更新回调
    console.log(`任务 ${id} 进度: ${progress}%`);
  },
  execute: async (updateProgress: (progress: number) => void) => {
    // 模拟任务执行过程
    for (let i = 1; i <= totalSteps; i++) {
      // 模拟每个步骤的执行时间
      await new Promise(resolve => setTimeout(resolve, delay / totalSteps));
      // 计算并更新进度
      const progress = (i / totalSteps) * 100;
      updateProgress(progress);
    }
    return `任务 ${id} 的结果`;
  }
});

/**
 * 演示函数
 * 展示任务控制器的各种功能：
 * 1. 基本任务执行
 * 2. 任务依赖
 * 3. 任务超时
 * 4. 任务失败和重试
 * 5. 任务暂停和恢复
 */
async function demo() {
  // 创建任务控制器实例
  const controller = createTaskController({
    maxConcurrent: 2,          // 最大并发任务数
    autoCleanup: true,         // 启用自动清理
    cleanupInterval: 5000,     // 清理间隔（5秒）
    // 任务完成回调
    onTaskComplete: (task) => {
      console.log(`任务 ${task.id} 完成，结果:`, task.result);
    },
    // 任务错误回调
    onTaskError: (task, error) => {
      console.error(`任务 ${task.id} 失败:`, error.message);
    },
    // 任务超时回调
    onTaskTimeout: (task) => {
      console.error(`任务 ${task.id} 超时`);
    },
    // 任务进度回调
    onTaskProgress: (task, progress) => {
      console.log(`任务 ${task.id} 进度更新: ${progress}%`);
    }
  });

  try {
    // 创建基础任务
    // 5个步骤，总耗时2秒，优先级1
    const task1 = await controller.addTask(createMockTask(1, 5, 2000, 1));

    // 创建依赖任务
    // 依赖于task1，3个步骤，总耗时1.5秒，优先级2
    const task2 = await controller.addTask({
      ...createMockTask(2, 3, 1500, 2),
      dependencies: [task1]  // 设置依赖关系
    });

    // 创建超时任务
    // 10个步骤，总耗时12秒，会触发超时（超时时间10秒）
    const task3 = await controller.addTask({
      ...createMockTask(3, 10, 12000, 3)
    });

    // 创建失败任务
    // 模拟任务执行失败的情况
    const task4 = await controller.addTask({
      ...createMockTask(4, 3, 1000, 1),
      execute: async () => {
        throw new Error('模拟任务失败');
      }
    });

    // 打印初始任务状态
    console.log('初始任务状态:', controller.getAllTasks());

    // 演示暂停功能
    // 等待3秒后暂停所有任务
    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log('\n暂停所有任务...');
    controller.pause();

    // 演示恢复功能
    // 等待2秒后恢复所有任务
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('\n恢复所有任务...');
    controller.resume();

    // 等待所有任务完成
    // 给予足够的时间让所有任务（包括超时任务）都能完成
    await new Promise(resolve => setTimeout(resolve, 15000));
    
    // 打印最终任务状态
    console.log('\n最终任务状态:', controller.getAllTasks());
  } finally {
    // 清理资源
    controller.dispose();
  }
}

// 运行演示程序
demo().catch(console.error); 
