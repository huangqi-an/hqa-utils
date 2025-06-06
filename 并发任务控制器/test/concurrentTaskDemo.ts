import { ConcurrentTaskController } from '../utils/concurrentTaskController';

// 模拟异步任务
const createMockTask = (id: number, delay: number, priority: number) => ({
  priority,
  execute: async () => {
    console.log(`任务 ${id} 开始执行`);
    await new Promise(resolve => setTimeout(resolve, delay));
    console.log(`任务 ${id} 执行完成`);
    return `任务 ${id} 的结果`;
  }
});

async function demo() {
  // 创建一个最大并发数为 2 的任务控制器
  const controller = new ConcurrentTaskController({
    maxConcurrent: 2,
    onTaskComplete: (task) => {
      console.log(`任务 ${task.id} 完成，结果:`, task.result);
    },
    onTaskError: (task, error) => {
      console.error(`任务 ${task.id} 失败:`, error.message);
    }
  });

  // 添加一些测试任务
  const task1 = await controller.addTask(createMockTask(1, 1000, 1));
  const task2 = await controller.addTask(createMockTask(2, 2000, 2));
  const task3 = await controller.addTask(createMockTask(3, 1500, 3));
  const task4 = await controller.addTask(createMockTask(4, 500, 1));

  console.log('所有任务状态:', controller.getAllTasks());
  console.log('运行中的任务:', controller.getRunningTasks());
  console.log('等待中的任务:', controller.getPendingTasks());

  // 等待所有任务完成
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  console.log('最终任务状态:', controller.getAllTasks());
}

// 运行演示
demo().catch(console.error); 
