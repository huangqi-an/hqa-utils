import { ConcurrentTaskController } from '../utils/taskController/concurrentTaskController';

async function runComplexExample() {
  console.log('=== 复杂场景测试开始 ===\n');

  // 创建任务控制器，设置最大并发数为2
  const controller = new ConcurrentTaskController({
    maxConcurrent: 2,
    autoCleanup: true,
    cleanupInterval: 5000,
    onTaskComplete: (task) => {
      console.log(`[任务完成] ${task.id} 完成，结果: ${task.result}`);
    },
    onTaskError: (task, error) => {
      console.log(`[任务失败] ${task.id} 失败，错误: ${error.message}`);
      console.log(`失败时间: ${new Date(task.failedAt!).toLocaleString()}`);
    },
    onTaskProgress: (task, progress) => {
      console.log(`[任务进度] ${task.id} 进度: ${progress}%`);
    }
  });

  // 模拟任务执行函数
  const createTask = (name: string, duration: number = 1000, shouldFail: boolean = false) => {
    return async (controller: ConcurrentTaskController, taskId: string) => {
      console.log(`[${name}] 开始执行`);
      for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setTimeout(resolve, duration / 10));
        controller.updateTaskProgress(taskId, (i + 1) * 10);
      }
      if (shouldFail) {
        throw new Error(`${name} 执行失败`);
      }
      return `${name} 执行完成`;
    };
  };

  // 场景1: 多个任务依赖同一个任务
  console.log('\n=== 场景1: 多个任务依赖同一个任务 ===');
  const baseTaskId = await controller.addTask({
    priority: 1,
    execute: createTask('基础任务'),
  });

  // 添加三个依赖基础任务的任务
  const dependentTask1Id = await controller.addTask({
    priority: 2,
    execute: createTask('依赖任务1'),
    dependencies: [baseTaskId],
  });

  const dependentTask2Id = await controller.addTask({
    priority: 3,
    execute: createTask('依赖任务2'),
    dependencies: [baseTaskId],
  });

  const dependentTask3Id = await controller.addTask({
    priority: 4,
    execute: createTask('依赖任务3'),
    dependencies: [baseTaskId],
  });

  // 等待基础任务完成
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 场景2: 依赖链（A依赖B，B依赖C）
  console.log('\n=== 场景2: 依赖链测试 ===');
  const chainTaskCId = await controller.addTask({
    priority: 1,
    execute: createTask('链式任务C'),
  });

  const chainTaskBId = await controller.addTask({
    priority: 2,
    execute: createTask('链式任务B'),
    dependencies: [chainTaskCId],
  });

  const chainTaskAId = await controller.addTask({
    priority: 3,
    execute: createTask('链式任务A'),
    dependencies: [chainTaskBId],
  });

  // 等待依赖链任务完成
  await new Promise(resolve => setTimeout(resolve, 4000));

  // 场景3: 并发限制下的任务调度
  console.log('\n=== 场景3: 并发限制测试 ===');
  // 添加5个高优先级任务，测试并发限制
  const concurrentTasks = await Promise.all(
    Array.from({ length: 5 }, (_, i) => 
      controller.addTask({
        priority: 10 - i, // 优先级从10到6
        execute: createTask(`并发任务${i + 1}`),
      })
    )
  );

  // 等待并发任务完成
  await new Promise(resolve => setTimeout(resolve, 3000));

  // 场景4: 任务优先级变化
  console.log('\n=== 场景4: 优先级变化测试 ===');
  const lowPriorityTaskId = await controller.addTask({
    priority: 1,
    execute: createTask('低优先级任务'),
  });

  // 添加一个会失败的任务，测试重试时的优先级提升
  const retryTaskId = await controller.addTask({
    priority: 2,
    execute: createTask('重试任务', 1000, true),
    maxRetries: 2,
  });

  // 添加一个高优先级任务
  const highPriorityTaskId = await controller.addTask({
    priority: 5,
    execute: createTask('高优先级任务'),
  });

  // 等待所有任务完成
  await new Promise(resolve => setTimeout(resolve, 5000));

  // 打印最终状态
  console.log('\n=== 最终任务状态 ===');
  console.log('运行中:', controller.getRunningTasks().map(t => `${t.id}(${t.status})`).join(', '));
  console.log('等待中:', controller.getPendingTasks().map(t => `${t.id}(${t.status})`).join(', '));
  console.log('失败任务:', controller.getFailedTasks().map(t => `${t.id}(${t.error?.message})`).join(', '));

  // 清理资源
  console.log('\n清理资源...');
  controller.dispose();
}

// 运行测试
runComplexExample().catch(console.error); 
