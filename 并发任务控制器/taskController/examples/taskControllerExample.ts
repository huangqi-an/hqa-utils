import { ConcurrentTaskController } from '../utils/taskController/concurrentTaskController';

/**
 * 模拟异步任务函数
 * @param name 任务名称（可选）
 * @param duration 任务持续时间（毫秒）
 * @param shouldFail 是否模拟失败
 * @returns 任务执行函数
 */
const createMockTask = (name?: string, duration: number = 2000, shouldFail: boolean = false) => {
  return async (controller: ConcurrentTaskController, taskId: string) => {
    const taskName = name || `任务 ${taskId}`;
    console.log(`[${taskName}] 开始执行`);
    
    return new Promise((resolve, reject) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        controller.updateTaskProgress(taskId, progress);
        
        if (progress >= 100) {
          clearInterval(interval);
          if (shouldFail) {
            reject(new Error(`${taskName} 执行失败`));
          } else {
            resolve(`${taskName} 执行完成`);
          }
        }
      }, duration / 10);
    });
  };
};

async function main() {
  // 创建任务控制器实例
  const controller = new ConcurrentTaskController({
    maxConcurrent: 2,  // 最大并发数为2
    onTaskComplete: (task) => {
      console.log(`[任务完成] ${task.id} 完成，结果:`, task.result);
    },
    onTaskError: (task, error) => {
      console.log(`[任务失败] ${task.id} 失败，错误:`, error.message);
      console.log(`失败时间: ${new Date(task.failedAt!).toLocaleString()}`);
    },
    onTaskProgress: (task, progress) => {
      console.log(`[任务进度] ${task.id} 进度: ${progress}%`);
    },
    autoCleanup: true,
    cleanupInterval: 5000,  // 5秒清理一次
    enableDependencyPriorityBoost: true,
    dependencyPriorityBoost: 5
  });

  // 添加一些任务
  const taskA = await controller.addTask({
    priority: 1,
    execute: createMockTask('任务A', 2000),
    maxRetries: 2
  });

  const taskB = await controller.addTask({
    priority: 2,
    execute: createMockTask('任务B', 3000, true),  // 这个任务会失败
    maxRetries: 2,
    dependencies: [taskA]  // 依赖任务A
  });

  const taskC = await controller.addTask({
    priority: 3,
    execute: createMockTask('任务C', 1500),
    maxRetries: 1
  });

  // 演示暂停和恢复任务
  setTimeout(async () => {
    console.log('\n[演示暂停任务]');
    const success = controller.pauseTask(taskC);
    console.log(`暂停任务 ${taskC}: ${success ? '成功' : '失败'}`);
    
    // 2秒后恢复任务
    setTimeout(() => {
      console.log('\n[演示恢复任务]');
      const resumed = controller.resumeTask(taskC);
      console.log(`恢复任务 ${taskC}: ${resumed ? '成功' : '失败'}`);
    }, 2000);
  }, 1000);

  // 状态监控
  const statusInterval = setInterval(() => {
    const runningTasks = controller.getRunningTasks();
    const pendingTasks = controller.getPendingTasks();
    const failedTasks = controller.getFailedTasks();
    
    console.log('\n当前任务状态:');
    console.log('运行中:', runningTasks.map(t => `${t.id}(${t.status})`).join(', '));
    console.log('等待中:', pendingTasks.map(t => `${t.id}(${t.status})`).join(', '));
    console.log('失败任务:', failedTasks.map(t => `${t.id}(${t.error?.message})`).join(', '));
    
    // 如果所有任务都完成了，清理资源
    if (runningTasks.length === 0 && pendingTasks.length === 0) {
      console.log('\n所有任务已完成，清理资源...');
      clearInterval(statusInterval);
      
      // 演示清理失败任务
      console.log('\n[演示清理失败任务]');
      const failedTasks = controller.getFailedTasks();
      if (failedTasks.length > 0) {
        console.log('清理前的失败任务:', failedTasks.map(t => t.id).join(', '));
        controller.cleanupFailedTask();
        console.log('清理后的失败任务:', controller.getFailedTasks().map(t => t.id).join(', '));
      }
      
      controller.dispose();
    }
  }, 1000);
}

// 运行示例
main().catch(console.error); 
