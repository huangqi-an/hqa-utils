/**
 * 并发任务控制器 - 函数式实现
 * 
 * 特点：
 * 1. 纯函数设计：使用不可变状态和函数组合
 * 2. 类型安全：完整的 TypeScript 类型定义
 * 3. 并发控制：支持最大并发数限制
 * 4. 任务管理：支持优先级、依赖、超时、重试等特性
 * 5. 状态追踪：完整的任务生命周期管理
 * 
 * 使用示例：
 * ```typescript
 * const controller = createTaskController({
 *   maxConcurrent: 2,
 *   autoCleanup: true
 * });
 * 
 * const taskId = await controller.addTask({
 *   priority: 1,
 *   execute: async (updateProgress) => {
 *     updateProgress(50);
 *     return '结果';
 *   }
 * });
 * ```
 */

/**
 * 任务状态类型定义
 * 用于追踪任务的生命周期
 * - pending: 等待执行，任务已创建但尚未开始执行
 * - running: 正在执行，任务当前正在运行中
 * - completed: 执行完成，任务已成功完成
 * - failed: 执行失败，任务执行过程中发生错误
 * - paused: 暂停执行，任务被手动暂停
 */
type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'paused';

/**
 * 任务类型定义
 * 描述任务的所有属性和行为
 * 
 * @template T 任务执行结果的类型，默认为 any
 */
type Task<T = any> = {
  id: string;                    // 任务唯一标识，用于任务追踪和管理
  priority: number;              // 任务优先级，数字越大优先级越高，用于任务调度
  execute: (updateProgress: (progress: number) => void) => Promise<T>;  // 任务执行函数，接收进度更新回调
  status: TaskStatus;            // 当前任务状态，反映任务的生命周期阶段
  result?: T;                    // 任务执行结果，仅在任务完成时有效
  error?: Error;                 // 任务执行错误，仅在任务失败时有效
  timeout?: number;              // 任务超时时间（毫秒），超过此时间任务将被终止
  retries: number;               // 当前重试次数，用于追踪任务重试状态
  maxRetries: number;            // 最大重试次数，超过此次数任务将被标记为失败
  progress: number;              // 任务进度（0-100），反映任务完成程度
  dependencies: string[];        // 任务依赖的其他任务ID列表，确保任务按正确顺序执行
  onProgress?: (progress: number) => void;  // 进度更新回调函数，用于通知任务进度变化
};

/**
 * 任务输入类型定义
 * 用于创建新任务时的参数类型
 * 只包含创建任务时必需的属性，其他属性由控制器自动设置
 * 
 * @template T 任务执行结果的类型
 */
type TaskInput<T> = {
  priority: number;              // 任务优先级
  execute: (updateProgress: (progress: number) => void) => Promise<T>;  // 任务执行函数
  timeout?: number;              // 可选的超时时间
  maxRetries?: number;           // 可选的最大重试次数
  dependencies?: string[];       // 可选的任务依赖列表
  onProgress?: (progress: number) => void;  // 可选的进度回调函数
};

/**
 * 任务控制器状态
 * 维护控制器的内部状态，包括任务列表和运行状态
 * 使用不可变数据结构，确保状态更新的可预测性
 */
type ControllerState = {
  tasks: Map<string, Task>;      // 所有任务的映射表，key 为任务 ID
  runningTasks: Set<string>;     // 正在运行的任务 ID 集合，用于并发控制
  isPaused: boolean;             // 控制器暂停状态标志
  cleanupTimer?: NodeJS.Timeout; // 自动清理定时器，用于定期清理已完成任务
  dependencyQueue: string[];     // 依赖任务队列，存储等待依赖完成的任务ID
};

/**
 * 任务控制器配置选项
 * 定义控制器的行为和回调函数
 */
type ControllerConfig = {
  maxConcurrent: number;         // 最大并发任务数，控制同时运行的任务数量
  autoCleanup: boolean;          // 是否自动清理已完成任务，防止内存泄漏
  cleanupInterval: number;       // 清理间隔（毫秒），控制自动清理的频率
  onTaskComplete: (task: Task) => void;           // 任务完成回调，用于通知任务完成
  onTaskError: (task: Task, error: Error) => void; // 任务错误回调，用于处理任务失败
  onTaskTimeout: (task: Task) => void;            // 任务超时回调，用于处理任务超时
  onTaskProgress: (task: Task, progress: number) => void; // 任务进度回调，用于更新任务进度
};

/**
 * 生成唯一的任务ID
 * 使用随机字符串作为任务标识符
 * 
 * @returns 随机生成的唯一任务ID
 */
const createTaskId = (): string => Math.random().toString(36).substring(2, 15);

/**
 * 创建默认配置
 * 为未提供的配置项设置合理的默认值
 * 
 * @param config 用户提供的部分配置
 * @returns 完整的配置对象，包含所有必要的配置项
 */
const createDefaultConfig = (config: Partial<ControllerConfig>): ControllerConfig => ({
  maxConcurrent: 3,              // 默认最大并发数为3
  autoCleanup: true,             // 默认启用自动清理
  cleanupInterval: 60000,        // 默认每分钟清理一次
  onTaskComplete: () => {},      // 默认空回调函数
  onTaskError: () => {},
  onTaskTimeout: () => {},
  onTaskProgress: () => {},
  ...config                      // 合并用户提供的配置
});

/**
 * 创建初始状态
 * 初始化控制器的内部状态
 * 
 * @returns 初始化的控制器状态对象
 */
const createInitialState = (): ControllerState => ({
  tasks: new Map(),
  runningTasks: new Set(),
  isPaused: false,
  dependencyQueue: []
});

/**
 * 更新任务状态
 * 以不可变的方式更新任务属性
 * 
 * @param state 当前控制器状态
 * @param taskId 要更新的任务ID
 * @param updates 要更新的任务属性
 * @returns 更新后的控制器状态
 */
const updateTaskStatus = (state: ControllerState, taskId: string, updates: Partial<Task>): ControllerState => {
  const task = state.tasks.get(taskId);
  if (!task) return state;

  const updatedTask = { ...task, ...updates };
  const newTasks = new Map(state.tasks);
  newTasks.set(taskId, updatedTask);

  return { ...state, tasks: newTasks };
};

/**
 * 更新任务进度
 * 更新任务进度并触发进度回调
 * 
 * @param state 当前控制器状态
 * @param taskId 任务ID
 * @param progress 新的进度值（0-100）
 * @returns 更新后的控制器状态
 */
const updateTaskProgress = (state: ControllerState, taskId: string, progress: number): ControllerState => {
  const task = state.tasks.get(taskId);
  if (!task || task.status !== 'running') return state;

  const newProgress = Math.min(100, Math.max(0, progress));
  return updateTaskStatus(state, taskId, {
    progress: newProgress,
    onProgress: task.onProgress ? () => task.onProgress!(newProgress) : undefined
  });
};

/**
 * 获取下一个待执行的任务
 * 根据优先级和依赖关系选择下一个要执行的任务
 * 优先处理依赖任务队列中的任务
 * 
 * @param state 当前控制器状态
 * @returns 下一个要执行的任务，如果没有则返回undefined
 */
const getNextTask = (state: ControllerState): Task | undefined => {
  // 首先检查依赖任务队列
  for (const taskId of state.dependencyQueue) {
    const task = state.tasks.get(taskId);
    if (task && task.status === 'pending' && areDependenciesCompleted(state, task)) {
      return task;
    }
  }

  // 然后检查其他待执行任务
  return Array.from(state.tasks.values())
    .filter(task => task.status === 'pending' && !state.dependencyQueue.includes(task.id))
    .sort((a, b) => b.priority - a.priority)[0];
};

/**
 * 将任务添加到依赖队列
 * 当任务有未完成的依赖时，将其加入依赖队列
 * 
 * @param state 当前控制器状态
 * @param taskId 任务ID
 * @returns 更新后的控制器状态
 */
const addToDependencyQueue = (state: ControllerState, taskId: string): ControllerState => {
  if (!state.dependencyQueue.includes(taskId)) {
    return {
      ...state,
      dependencyQueue: [...state.dependencyQueue, taskId]
    };
  }
  return state;
};

/**
 * 从依赖队列中移除任务
 * 当任务开始执行或依赖完成时，从依赖队列中移除
 * 
 * @param state 当前控制器状态
 * @param taskId 任务ID
 * @returns 更新后的控制器状态
 */
const removeFromDependencyQueue = (state: ControllerState, taskId: string): ControllerState => {
  return {
    ...state,
    dependencyQueue: state.dependencyQueue.filter(id => id !== taskId)
  };
};

/**
 * 检查任务的所有依赖是否都已完成
 * 确保任务按正确的顺序执行
 * 
 * @param state 当前控制器状态
 * @param task 要检查的任务
 * @returns 如果所有依赖都已完成返回true，否则返回false
 */
const areDependenciesCompleted = (state: ControllerState, task: Task): boolean => {
  return task.dependencies.every(depId => {
    const depTask = state.tasks.get(depId);
    return depTask?.status === 'completed';
  });
};

/**
 * 处理依赖任务完成后的调度
 * 当依赖任务完成时，检查是否有等待的任务可以开始执行
 * 
 * @param state 当前控制器状态
 * @param completedTaskId 刚完成的任务ID
 * @returns 更新后的控制器状态
 */
const handleDependencyCompletion = (state: ControllerState, completedTaskId: string): ControllerState => {
  // 检查依赖队列中是否有任务可以开始执行
  const readyTasks = state.dependencyQueue.filter(taskId => {
    const task = state.tasks.get(taskId);
    return task && task.status === 'pending' && areDependenciesCompleted(state, task);
  });

  // 从依赖队列中移除可以执行的任务
  let newState = state;
  for (const taskId of readyTasks) {
    newState = removeFromDependencyQueue(newState, taskId);
  }

  return newState;
};

/**
 * 创建任务执行器
 * 处理任务的执行、超时、重试等逻辑
 * 
 * @param config 控制器配置
 * @returns 任务执行函数
 */
const createTaskExecutor = (config: ControllerConfig) => {
  return async (state: ControllerState, task: Task): Promise<ControllerState> => {
    // 创建进度更新函数，用于任务执行过程中更新进度
    const updateProgress = (progress: number) => {
      const newState = updateTaskProgress(state, task.id, progress);
      config.onTaskProgress(task, progress);
      return newState;
    };

    try {
      // 处理任务超时
      const timeoutPromise = task.timeout
        ? new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Task timeout')), task.timeout)
          )
        : null;

      // 执行任务，与超时竞争
      const result = await Promise.race([
        task.execute(updateProgress),
        ...(timeoutPromise ? [timeoutPromise] : [])
      ]);

      // 任务成功完成，更新状态
      return updateTaskStatus(state, task.id, {
        status: 'completed',
        result,
        progress: 100
      });
    } catch (error) {
      // 处理任务失败
      if (task.retries < task.maxRetries) {
        // 如果未超过最大重试次数，重新加入队列
        return updateTaskStatus(state, task.id, {
          status: 'pending',
          retries: task.retries + 1
        });
      }

      // 超过重试次数，标记为失败
      const isTimeout = error instanceof Error && error.message === 'Task timeout';
      const newState = updateTaskStatus(state, task.id, {
        status: 'failed',
        error: error as Error
      });

      // 触发相应的回调
      if (isTimeout) {
        config.onTaskTimeout(task);
      } else {
        config.onTaskError(task, error as Error);
      }

      return newState;
    }
  };
};

/**
 * 创建并发任务控制器
 * 返回一个包含任务管理方法的控制器对象
 * 
 * @param config 控制器配置选项
 * @returns 任务控制器实例，提供任务管理接口
 */
export const createTaskController = (config: Partial<ControllerConfig>) => {
  // 初始化配置和状态
  const finalConfig = createDefaultConfig(config);
  let state = createInitialState();
  const executeTask = createTaskExecutor(finalConfig);

  /**
   * 处理下一个待执行的任务
   * 如果当前运行任务数未达到最大并发数，则启动新任务
   * 优先处理依赖任务队列中的任务
   */
  const processNextTask = async (): Promise<void> => {
    if (state.isPaused || state.runningTasks.size >= finalConfig.maxConcurrent) {
      return;
    }

    const nextTask = getNextTask(state);
    if (!nextTask) {
      return;
    }

    // 检查依赖任务是否完成
    if (nextTask.dependencies.length && !areDependenciesCompleted(state, nextTask)) {
      // 如果依赖未完成，将任务加入依赖队列
      state = addToDependencyQueue(state, nextTask.id);
      return;
    }

    // 从依赖队列中移除任务（如果存在）
    state = removeFromDependencyQueue(state, nextTask.id);

    // 更新任务状态并执行
    state = updateTaskStatus(state, nextTask.id, { status: 'running' });
    state.runningTasks.add(nextTask.id);

    try {
      state = await executeTask(state, nextTask);
      finalConfig.onTaskComplete(nextTask);
      
      // 处理依赖完成后的调度
      state = handleDependencyCompletion(state, nextTask.id);
    } finally {
      state.runningTasks.delete(nextTask.id);
      if (!state.isPaused) {
        processNextTask();
      }
    }
  };

  /**
   * 启动自动清理机制
   * 定期清理已完成和失败的任务，防止内存泄漏
   */
  const startCleanup = () => {
    if (finalConfig.autoCleanup) {
      state.cleanupTimer = setInterval(() => {
        state = {
          ...state,
          tasks: new Map(
            Array.from(state.tasks.entries())
              .filter(([_, task]) => 
                task.status !== 'completed' && task.status !== 'failed'
              )
          )
        };
      }, finalConfig.cleanupInterval);
    }
  };

  // 启动自动清理
  startCleanup();

  // 返回控制器接口
  return {
    /**
     * 添加新任务
     * 创建并启动一个新任务
     * 
     * @param task 任务配置
     * @returns 任务ID，用于后续任务管理
     * 
     * @example
     * ```typescript
     * const taskId = await controller.addTask({
     *   priority: 1,
     *   execute: async (updateProgress) => {
     *     // 执行任务逻辑
     *     updateProgress(50);
     *     return '结果';
     *   }
     * });
     * ```
     */
    addTask: async <T>(task: TaskInput<T>): Promise<string> => {
      const taskId = createTaskId();
      const newTask: Task<T> = {
        ...task,
        id: taskId,
        status: 'pending',
        retries: 0,
        maxRetries: task.maxRetries ?? 0,
        progress: 0,
        dependencies: task.dependencies ?? []
      };

      state = {
        ...state,
        tasks: new Map(state.tasks).set(taskId, newTask)
      };

      // 检查任务是否可以立即执行
      if (newTask.dependencies.length && !areDependenciesCompleted(state, newTask)) {
        // 如果有未完成的依赖，加入依赖队列
        state = addToDependencyQueue(state, taskId);
      }

      if (!state.isPaused) {
        processNextTask();
      }

      return taskId;
    },

    /**
     * 暂停所有任务
     * 将控制器设置为暂停状态，停止处理新任务
     */
    pause: () => {
      state = { ...state, isPaused: true };
    },

    /**
     * 恢复所有任务
     * 将控制器从暂停状态恢复，继续处理任务
     */
    resume: () => {
      state = { ...state, isPaused: false };
      processNextTask();
    },

    /**
     * 暂停指定任务
     * 暂停单个任务的执行
     * 
     * @param taskId 任务ID
     * @returns 是否成功暂停任务
     */
    pauseTask: (taskId: string): boolean => {
      const task = state.tasks.get(taskId);
      if (task?.status === 'running') {
        state = updateTaskStatus(state, taskId, { status: 'paused' });
        state.runningTasks.delete(taskId);
        processNextTask();
        return true;
      }
      return false;
    },

    /**
     * 恢复指定任务
     * 恢复单个暂停的任务
     * 
     * @param taskId 任务ID
     * @returns 是否成功恢复任务
     */
    resumeTask: (taskId: string): boolean => {
      const task = state.tasks.get(taskId);
      if (task?.status === 'paused') {
        state = updateTaskStatus(state, taskId, { status: 'pending' });
        processNextTask();
        return true;
      }
      return false;
    },

    /**
     * 获取任务状态
     * 查询指定任务的当前状态
     * 
     * @param taskId 任务ID
     * @returns 任务状态信息，如果任务不存在则返回undefined
     */
    getTaskStatus: (taskId: string): Task | undefined => {
      return state.tasks.get(taskId);
    },

    /**
     * 获取所有任务
     * 返回所有任务的列表
     * 
     * @returns 所有任务的数组
     */
    getAllTasks: (): Task[] => {
      return Array.from(state.tasks.values());
    },

    /**
     * 获取正在运行的任务
     * 返回当前正在执行的任务列表
     * 
     * @returns 运行中任务的数组
     */
    getRunningTasks: (): Task[] => {
      return Array.from(state.runningTasks)
        .map(id => state.tasks.get(id)!)
        .filter(Boolean);
    },

    /**
     * 获取等待中的任务
     * 返回所有等待执行的任务列表
     * 
     * @returns 等待中任务的数组
     */
    getPendingTasks: (): Task[] => {
      return Array.from(state.tasks.values())
        .filter(task => task.status === 'pending');
    },

    /**
     * 取消任务
     * 取消一个等待中的任务
     * 
     * @param taskId 任务ID
     * @returns 是否成功取消任务
     */
    cancelTask: (taskId: string): boolean => {
      const task = state.tasks.get(taskId);
      if (task?.status === 'pending') {
        const newTasks = new Map(state.tasks);
        newTasks.delete(taskId);
        state = { ...state, tasks: newTasks };
        return true;
      }
      return false;
    },

    /**
     * 清空所有任务
     * 移除所有任务，重置控制器状态
     */
    clear: () => {
      state = createInitialState();
    },

    /**
     * 释放控制器资源
     * 清理定时器并重置状态
     * 在不再需要控制器时调用此方法
     */
    dispose: () => {
      if (state.cleanupTimer) {
        clearInterval(state.cleanupTimer);
      }
      state = createInitialState();
    }
  };
}; 
