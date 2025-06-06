import { ConcurrentTaskController } from '../utils/concurrentTaskController';

/**
 * 创建带进度的模拟任务
 * @param id 任务ID
 * @param totalSteps 总步骤数
 * @param delay 总延迟时间（毫秒）
 * @param priority 任务优先级
 * @returns 任务配置对象
 */
const createProgressTask = (id: number, totalSteps: number, delay: number, priority: number) => ({
  priority,
  timeout: 10000, // 设置10秒超时
  maxRetries: 2,  // 最多重试2次
  dependencies: [] as string[], // 任务依赖列表
  onProgress: (progress: number) => {
    console.log(`任务 ${id} 进度: ${progress}%`);
  },
  /**
   * 任务执行函数
   * 模拟一个分步骤执行的任务，每步都会更新进度
   */
  execute: async (controller: ConcurrentTaskController, taskId: string) => {
    for (let i = 1; i <= totalSteps; i++) {
      // 模拟每个步骤的执行时间
      await new Promise(resolve => setTimeout(resolve, delay / totalSteps));
      // 计算并更新进度
      const progress = (i / totalSteps) * 100;
      controller.updateTaskProgress(taskId, progress);
    }
    return `任务 ${id} 的结果`;
  }
});

/**
 * 演示函数
 * 展示并发任务控制器的各种功能
 */
async function demo() {
  // 创建任务控制器实例，配置最大并发数和各种回调
  const controller = new ConcurrentTaskController({
    maxConcurrent: 2,  // 最多同时运行2个任务
    autoCleanup: true, // 启用自动清理
    cleanupInterval: 5000, // 每5秒清理一次已完成的任务
    // 任务完成回调
    onTaskComplete: (task) => {
      console.log(`任务 ${task.id} 完成，结果:`, task.result);
    },
    // 任务失败回调
    onTaskError: (task, error) => {
      console.error(`任务 ${task.id} 失败:`, error.message);
    },
    // 任务超时回调
    onTaskTimeout: (task) => {
      console.error(`任务 ${task.id} 超时`);
    },
    // 任务进度更新回调
    onTaskProgress: (task, progress) => {
      console.log(`任务 ${task.id} 进度更新: ${progress}%`);
    }
  });

  try {
    // 创建基础任务：5个步骤，总耗时2秒，优先级1
    const task1 = await controller.addTask({
      ...createProgressTask(1, 5, 2000, 1),
      execute: async (controller, taskId) => {
        return createProgressTask(1, 5, 2000, 1).execute(controller, taskId);
      }
    });

    // 创建依赖任务：依赖于task1，3个步骤，总耗时1.5秒，优先级2
    const task2 = await controller.addTask({
      ...createProgressTask(2, 3, 1500, 2),
      dependencies: [task1], // 设置依赖关系：必须等task1完成才能执行
      execute: async (controller, taskId) => {
        return createProgressTask(2, 3, 1500, 2).execute(controller, taskId);
      }
    });

    // 创建超时任务：10个步骤，总耗时12秒，会触发超时（因为设置了10秒超时）
    const task3 = await controller.addTask({
      ...createProgressTask(3, 10, 12000, 3),
      execute: async (controller, taskId) => {
        return createProgressTask(3, 10, 12000, 3).execute(controller, taskId);
      }
    });

    // 创建失败任务：模拟任务执行失败的情况
    const task4 = await controller.addTask({
      ...createProgressTask(4, 3, 1000, 1),
      execute: async () => {
        throw new Error('模拟任务失败');
      }
    });

    // 打印初始任务状态
    console.log('初始任务状态:', controller.getAllTasks());

    // 演示暂停功能：3秒后暂停所有任务
    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log('\n暂停所有任务...');
    controller.pause();

    // 演示恢复功能：2秒后恢复所有任务
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('\n恢复所有任务...');
    controller.resume();

    // 等待所有任务完成（包括重试和超时）
    await new Promise(resolve => setTimeout(resolve, 15000));
    
    // 打印最终任务状态
    console.log('\n最终任务状态:', controller.getAllTasks());
  } finally {
    // 清理资源：停止定时器并清空任务
    controller.dispose();
  }
}

// 运行演示程序
demo().catch(console.error); 
