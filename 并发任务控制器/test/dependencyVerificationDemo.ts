/**
 * 多依赖任务验证演示
 * 验证当任务依赖多个其他任务时，是否所有依赖都完成后才开始执行
 */

import { createTaskController } from '../utils/functionalTaskController';

/**
 * 创建模拟任务
 */
const createMockTask = (id: string, duration: number, priority: number) => ({
  priority,
  timeout: 10000,
  maxRetries: 2,
  dependencies: [] as string[],
  onProgress: (progress: number) => {
    console.log(`任务 ${id} 进度: ${progress}%`);
  },
  execute: async (updateProgress: (progress: number) => void) => {
    console.log(`🚀 任务 ${id} 开始执行`);
    for (let i = 1; i <= 10; i++) {
      await new Promise(resolve => setTimeout(resolve, duration / 10));
      const progress = (i / 10) * 100;
      updateProgress(progress);
    }
    console.log(`✅ 任务 ${id} 执行完成`);
    return `任务 ${id} 的结果`;
  }
});

/**
 * 验证多依赖任务执行顺序
 */
async function demo() {
  console.log('=== 多依赖任务验证演示 ===\n');

  // 创建任务控制器，最大并发数为3
  const controller = createTaskController({
    maxConcurrent: 3,
    autoCleanup: true,
    onTaskComplete: (task) => {
      console.log(`🎉 任务 ${task.id} 完成: ${task.result}`);
    },
    onTaskError: (task, error) => {
      console.error(`❌ 任务 ${task.id} 失败: ${error.message}`);
    }
  });

  try {
    // 创建基础任务 B 和 C
    console.log('1. 创建基础任务 B 和 C...');
    const taskB = await controller.addTask(createMockTask('B', 2000, 1));
    const taskC = await controller.addTask(createMockTask('C', 3000, 1));
    
    console.log(`   任务B ID: ${taskB}`);
    console.log(`   任务C ID: ${taskC}`);
    console.log('   基础任务开始执行...\n');

    // 等待一段时间，让基础任务开始执行
    await new Promise(resolve => setTimeout(resolve, 500));

    // 创建依赖任务 A（依赖 B 和 C）
    console.log('2. 创建依赖任务 A（依赖 B 和 C）...');
    const taskA = await controller.addTask({
      ...createMockTask('A', 1500, 2),
      dependencies: [taskB, taskC]  // 依赖任务 B 和 C
    });
    
    console.log(`   任务A ID: ${taskA}`);
    console.log(`   任务A 依赖: [${taskB}, ${taskC}]`);
    console.log('   任务A 等待 B 和 C 都完成...\n');

    // 创建更多独立任务，占用并发槽位
    console.log('3. 创建更多独立任务，占用并发槽位...');
    const taskD = await controller.addTask(createMockTask('D', 2500, 1));
    const taskE = await controller.addTask(createMockTask('E', 1800, 1));
    const taskF = await controller.addTask(createMockTask('F', 1200, 1));
    
    console.log(`   任务D ID: ${taskD}`);
    console.log(`   任务E ID: ${taskE}`);
    console.log(`   任务F ID: ${taskF}`);
    console.log('   这些任务会占用并发槽位，测试依赖任务的优先级...\n');

    // 监控任务状态和依赖关系
    console.log('4. 监控任务状态和依赖关系...');
    const monitorInterval = setInterval(() => {
      const allTasks = controller.getAllTasks();
      const runningTasks = controller.getRunningTasks();
      const pendingTasks = controller.getPendingTasks();
      
      console.log(`\n📊 状态监控 (${new Date().toLocaleTimeString()}):`);
      console.log(`   运行中: ${runningTasks.length} 个任务`);
      console.log(`   等待中: ${pendingTasks.length} 个任务`);
      console.log(`   总任务: ${allTasks.length} 个任务`);
      
      if (runningTasks.length > 0) {
        console.log(`   当前运行: ${runningTasks.map(t => t.id).join(', ')}`);
      }
      
      // 检查任务 A 的依赖状态
      const taskAStatus = controller.getTaskStatus(taskA);
      if (taskAStatus) {
        console.log(`\n🔍 任务 A 依赖状态:`);
        taskAStatus.dependencies.forEach(depId => {
          const depTask = controller.getTaskStatus(depId);
          const status = depTask?.status || 'unknown';
          const icon = status === 'completed' ? '✅' : 
                      status === 'running' ? '🔄' : 
                      status === 'pending' ? '⏸️' : '❌';
          console.log(`   ${icon} 依赖 ${depId}: ${status}`);
        });
        
        const allDepsCompleted = taskAStatus.dependencies.every(depId => {
          const depTask = controller.getTaskStatus(depId);
          return depTask?.status === 'completed';
        });
        
        console.log(`   所有依赖完成: ${allDepsCompleted ? '✅ 是' : '❌ 否'}`);
        console.log(`   任务 A 状态: ${taskAStatus.status}`);
      }
      
      console.log('   ---');
    }, 1000);

    // 等待所有任务完成
    await new Promise(resolve => setTimeout(resolve, 20000));
    
    clearInterval(monitorInterval);

    // 显示最终状态和验证结果
    console.log('\n5. 最终验证结果:');
    const finalTasks = controller.getAllTasks();
    
    // 按执行顺序排序（通过完成时间或状态）
    const taskOrder = ['B', 'C', 'A', 'D', 'E', 'F'];
    console.log('\n📋 任务执行顺序验证:');
    
    taskOrder.forEach(taskId => {
      const task = finalTasks.find(t => t.id === taskId);
      if (task) {
        const status = task.status === 'completed' ? '✅' : 
                      task.status === 'failed' ? '❌' : 
                      task.status === 'running' ? '🔄' : '⏸️';
        console.log(`   ${status} 任务 ${taskId}: ${task.status}`);
        
        if (taskId === 'A' && task.dependencies) {
          console.log(`     依赖: [${task.dependencies.join(', ')}]`);
        }
      }
    });

    // 验证依赖关系是否正确
    console.log('\n🔍 依赖关系验证:');
    const finalTaskA = finalTasks.find(t => t.id === 'A');
    const finalTaskB = finalTasks.find(t => t.id === 'B');
    const finalTaskC = finalTasks.find(t => t.id === 'C');
    
    if (finalTaskA && finalTaskB && finalTaskC) {
      const bCompleted = finalTaskB.status === 'completed';
      const cCompleted = finalTaskC.status === 'completed';
      const aCompleted = finalTaskA.status === 'completed';
      
      console.log(`   任务 B 完成: ${bCompleted ? '✅' : '❌'}`);
      console.log(`   任务 C 完成: ${cCompleted ? '✅' : '❌'}`);
      console.log(`   任务 A 完成: ${aCompleted ? '✅' : '❌'}`);
      
      if (bCompleted && cCompleted && aCompleted) {
        console.log('   ✅ 验证通过：A 任务在所有依赖完成后才执行');
      } else if (!bCompleted || !cCompleted) {
        console.log('   ⚠️  部分依赖未完成，A 任务可能未执行');
      } else {
        console.log('   ❌ 验证失败：A 任务在依赖未完成时就执行了');
      }
    }

  } finally {
    controller.dispose();
  }
}

// 运行演示
demo().catch(console.error); 
