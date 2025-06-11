import { createTaskController } from '../utils/taskController/functionalTaskController';

/**
 * 模拟异步操作
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 创建模拟任务
 */
const createMockTask = (
  name: string,
  duration: number = 1000,
  shouldFail: boolean = false,
  priority: number = 1
) => ({
  priority,
  execute: async (updateProgress: (progress: number) => void) => {
    console.log(`[${name}] 开始执行`);
    for (let i = 0; i <= 100; i += 20) {
      await sleep(duration / 5);
      updateProgress(i);
      console.log(`[${name}] 进度: ${i}%`);
    }
    if (shouldFail) {
      throw new Error(`${name} 执行失败`);
    }
    console.log(`[${name}] 执行完成`);
    return `${name} 的结果`;
  }
});

/**
 * 运行示例
 */
async function runExample() {
  console.log('=== 函数式任务控制器示例 ===\n');

  // 创建任务控制器
  const controller = createTaskController({
    maxConcurrent: 2,
    autoCleanup: true,
    cleanupInterval: 1000,
    onTaskComplete: (task) => {
      console.log(`\n[回调] 任务 ${task.id} 完成，结果: ${task.result}`);
    },
    onTaskError: (task, error) => {
      console.log(`\n[回调] 任务 ${task.id} 失败: ${error.message}`);
    },
    onTaskProgress: (task, progress) => {
      // 进度回调已在任务执行函数中处理
    }
  });

  // 场景1：基本任务执行
  console.log('\n--- 场景1：基本任务执行 ---');
  const taskA = await controller.addTask({
    ...createMockTask('任务A', 2000),
    priority: 1
  });

  const taskB = await controller.addTask({
    ...createMockTask('任务B', 1500),
    priority: 2
  });

  // 等待任务完成
  await sleep(3000);

  // 场景2：任务依赖
  console.log('\n--- 场景2：任务依赖 ---');
  const baseTask = await controller.addTask({
    ...createMockTask('基础任务', 1000),
    priority: 1
  });

  const dependentTask1 = await controller.addTask({
    ...createMockTask('依赖任务1', 800),
    priority: 2,
    dependencies: [baseTask]
  });

  const dependentTask2 = await controller.addTask({
    ...createMockTask('依赖任务2', 800),
    priority: 2,
    dependencies: [baseTask]
  });

  // 等待依赖任务完成
  await sleep(3000);

  // 场景3：任务重试
  console.log('\n--- 场景3：任务重试 ---');
  const retryTask = await controller.addTask({
    ...createMockTask('重试任务', 1000, true),
    priority: 1,
    maxRetries: 2
  });

  // 等待重试任务完成或失败
  await sleep(4000);

  // 场景4：任务暂停和恢复
  console.log('\n--- 场景4：任务暂停和恢复 ---');
  const task1 = await controller.addTask({
    ...createMockTask('暂停任务1', 2000),
    priority: 1
  });

  const task2 = await controller.addTask({
    ...createMockTask('暂停任务2', 2000),
    priority: 2
  });

  // 暂停任务调度
  console.log('\n暂停任务调度...');
  controller.pause();
  await sleep(1000);

  // 恢复任务调度
  console.log('\n恢复任务调度...');
  controller.resume();

  // 等待任务完成
  await sleep(3000);

  // 场景5：任务取消
  console.log('\n--- 场景5：任务取消 ---');
  const cancelTask1 = await controller.addTask({
    ...createMockTask('取消任务1', 2000),
    priority: 1
  });

  const cancelTask2 = await controller.addTask({
    ...createMockTask('取消任务2', 2000),
    priority: 2
  });

  // 取消一个任务
  console.log('\n取消任务1...');
  controller.cancelTask(cancelTask1);

  // 等待剩余任务完成
  await sleep(3000);

  // 清理资源
  console.log('\n清理资源...');
  controller.dispose();

  console.log('\n=== 示例运行完成 ===');
}

// 运行示例
runExample().catch(console.error); 
