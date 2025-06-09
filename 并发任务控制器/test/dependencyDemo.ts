/**
 * 依赖任务队列演示
 * 展示如何解决依赖任务在没有空闲位置时的调度问题
 */

import { createTaskController } from '../utils/functionalTaskController';

/**
 * 创建模拟任务
 */
const createMockTask = (id: number, duration: number, priority: number) => ({
  priority,
  timeout: 10000,
  maxRetries: 2,
  dependencies: [] as string[],
  onProgress: (progress: number) => {
    console.log(`任务 ${id} 进度: ${progress}%`);
  },
  execute: async (updateProgress: (progress: number) => void) => {
    for (let i = 1; i <= 10; i++) {
      await new Promise(resolve => setTimeout(resolve, duration / 10));
      const progress = (i / 10) * 100;
      updateProgress(progress);
    }
    return `任务 ${id} 完成`;
  }
});

/**
 * 演示依赖任务队列功能
 */
async function demo() {
  console.log('=== 依赖任务队列演示 ===\n');

  // 创建任务控制器，最大并发数为2
  const controller = createTaskController({
    maxConcurrent: 2,
    autoCleanup: true,
    onTaskComplete: (task) => {
      console.log(`✅ 任务 ${task.id} 完成: ${task.result}`);
    },
    onTaskError: (task, error) => {
      console.error(`❌ 任务 ${task.id} 失败: ${error.message}`);
    }
  });

  try {
    // 创建基础任务
    console.log('1. 创建基础任务...');
    const task1 = await controller.addTask(createMockTask(1, 3000, 1));
    const task2 = await controller.addTask(createMockTask(2, 2000, 2));
    
    console.log(`   任务1 ID: ${task1}`);
    console.log(`   任务2 ID: ${task2}`);
    console.log('   基础任务开始执行...\n');

    // 等待一段时间，让基础任务开始执行
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 创建依赖任务（依赖任务1和2）
    console.log('2. 创建依赖任务...');
    const task3 = await controller.addTask({
      ...createMockTask(3, 1500, 3),
      dependencies: [task1, task2]  // 依赖任务1和2
    });
    
    console.log(`   任务3 ID: ${task3}`);
    console.log(`   任务3 依赖: [${task1}, ${task2}]`);
    console.log('   任务3 等待依赖完成...\n');

    // 创建更多独立任务，占用并发槽位
    console.log('3. 创建更多独立任务...');
    const task4 = await controller.addTask(createMockTask(4, 2500, 1));
    const task5 = await controller.addTask(createMockTask(5, 1800, 2));
    
    console.log(`   任务4 ID: ${task4}`);
    console.log(`   任务5 ID: ${task5}`);
    console.log('   这些任务会占用并发槽位...\n');

    // 创建另一个依赖任务
    console.log('4. 创建另一个依赖任务...');
    const task6 = await controller.addTask({
      ...createMockTask(6, 1200, 4),
      dependencies: [task3]  // 依赖任务3
    });
    
    console.log(`   任务6 ID: ${task6}`);
    console.log(`   任务6 依赖: [${task3}]`);
    console.log('   任务6 等待任务3完成...\n');

    // 监控任务状态
    console.log('5. 监控任务状态...');
    const monitorInterval = setInterval(() => {
      const allTasks = controller.getAllTasks();
      const runningTasks = controller.getRunningTasks();
      const pendingTasks = controller.getPendingTasks();
      
      console.log(`   运行中: ${runningTasks.length} 个任务`);
      console.log(`   等待中: ${pendingTasks.length} 个任务`);
      console.log(`   总任务: ${allTasks.length} 个任务`);
      
      if (runningTasks.length > 0) {
        console.log(`   当前运行: ${runningTasks.map(t => t.id).join(', ')}`);
      }
      
      console.log('   ---');
    }, 1000);

    // 等待所有任务完成
    await new Promise(resolve => setTimeout(resolve, 15000));
    
    clearInterval(monitorInterval);

    // 显示最终状态
    console.log('\n6. 最终任务状态:');
    const finalTasks = controller.getAllTasks();
    finalTasks.forEach(task => {
      const status = task.status === 'completed' ? '✅' : 
                    task.status === 'failed' ? '❌' : 
                    task.status === 'running' ? '🔄' : '⏸️';
      console.log(`   ${status} 任务 ${task.id}: ${task.status}`);
    });

  } finally {
    controller.dispose();
  }
}

// 运行演示
demo().catch(console.error); 
