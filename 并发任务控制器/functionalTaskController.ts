/**
 * 并发任务控制器 - 函数式实现
 * 提供任务队列管理、并发控制、优先级调度等功能
 */

/**
 * 任务状态类型定义
 * - pending: 等待执行
 * - running: 正在执行
 * - completed: 执行完成
 * - failed: 执行失败
 * - paused: 暂停执行
 */
type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'paused';

/**
 * 任务类型定义
 * @template T 任务执行结果的类型
 */
type Task<T = any> = {
  id: string;                    // 任务唯一标识
  priority: number;              // 任务优先级，数字越大优先级越高
  execute: (updateProgress: (progress: number) => void) => Promise<T>;  // 任务执行函数
  status: TaskStatus;            // 当前任务状态
  result?: T;                    // 任务执行结果
  error?: Error;                 // 任务执行错误
  timeout?: number;              // 任务超时时间（毫秒）
  retries: number;               // 当前重试次数
  maxRetries: number;            // 最大重试次数
  progress: number;              // 任务进度（0-100）
  dependencies: string[];        // 任务依赖的其他任务ID列表
  onProgress?: (progress: number) => void;  // 进度更新回调函数
};

/**
 * 任务控制器状态
 * 维护所有任务和运行状态
 */
type ControllerState = {
  tasks: Map<string, Task>;      // 所有任务映射表
  runningTasks: Set<string>;     // 正在运行的任务ID集合
  isPaused: boolean;             // 控制器是否暂停
  cleanupTimer?: NodeJS.Timeout; // 自动清理定时器
};

/**
 * 任务控制器配置选项
 */
type ControllerConfig = {
  maxConcurrent: number;         // 最大并发任务数
  autoCleanup: boolean;          // 是否自动清理已完成任务
  cleanupInterval: number;       // 清理间隔（毫秒）
  onTaskComplete: (task: Task) => void;           // 任务完成回调
  onTaskError: (task: Task, error: Error) => void; // 任务错误回调
  onTaskTimeout: (task: Task) => void;            // 任务超时回调
  onTaskProgress: (task: Task, progress: number) => void; // 任务进度回调
};

/**
 * 任务输入类型定义
 */
type TaskInput<T> = {
  priority: number;
  execute: (updateProgress: (progress: number) => void) => Promise<T>;
  timeout?: number;
  maxRetries?: number;
  dependencies?: string[];
  onProgress?: (progress: number) => void;
};

/**
 * 生成唯一的任务ID
 * @returns 随机生成的唯一任务ID
 */
const createTaskId = (): string => Math.random().toString(36).substring(2, 15);

/**
 * 创建默认配置
 * @param config 用户提供的部分配置
 * @returns 完整的配置对象
 */
const createDefaultConfig = (config: Partial<ControllerConfig>): ControllerConfig => ({
  maxConcurrent: 3,              // 默认最大并发数
  autoCleanup: true,             // 默认启用自动清理
  cleanupInterval: 60000,        // 默认清理间隔1分钟
  onTaskComplete: () => {},      // 默认空回调
  onTaskError: () => {},
  onTaskTimeout: () => {},
  onTaskProgress: () => {},
  ...config                      // 合并用户配置
});

/**
 * 创建控制器初始状态
 * @returns 初始化的控制器状态
 */
const createInitialState = (): ControllerState => ({
  tasks: new Map(),
  runningTasks: new Set(),
  isPaused: false
});

/**
 * 更新任务状态
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
 * 根据优先级排序，返回优先级最高的待执行任务
 * @param state 当前控制器状态
 * @returns 下一个要执行的任务，如果没有则返回undefined
 */
const getNextTask = (state: ControllerState): Task | undefined => {
  return Array.from(state.tasks.values())
    .filter(task => task.status === 'pending')
    .sort((a, b) => b.priority - a.priority)[0];
};

/**
 * 检查任务的所有依赖是否都已完成
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
 * 创建任务执行器
 * 处理任务的执行、超时、重试等逻辑
 * @param config 控制器配置
 * @returns 任务执行函数
 */
const createTaskExecutor = (config: ControllerConfig) => {
  return async (state: ControllerState, task: Task): Promise<ControllerState> => {
    // 创建进度更新函数
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

      // 任务成功完成
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
 * @param config 控制器配置选项
 * @returns 任务控制器实例
 */
export const createTaskController = (config: Partial<ControllerConfig>) => {
  // 初始化配置和状态
  const finalConfig = createDefaultConfig(config);
  let state = createInitialState();
  const executeTask = createTaskExecutor(finalConfig);

  /**
   * 处理下一个待执行的任务
   * 如果当前运行任务数未达到最大并发数，则启动新任务
   */
  const processNextTask = async (): Promise<void> => {
    if (state.isPaused || state.runningTasks.size >= finalConfig.maxConcurrent) {
      return;
    }

    const nextTask = getNextTask(state);
    if (!nextTask || !areDependenciesCompleted(state, nextTask)) {
      return;
    }

    // 更新任务状态并执行
    state = updateTaskStatus(state, nextTask.id, { status: 'running' });
    state.runningTasks.add(nextTask.id);

    try {
      state = await executeTask(state, nextTask);
      finalConfig.onTaskComplete(nextTask);
    } finally {
      state.runningTasks.delete(nextTask.id);
      if (!state.isPaused) {
        processNextTask();
      }
    }
  };

  /**
   * 启动自动清理机制
   * 定期清理已完成和失败的任务
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
     * @param task 任务配置
     * @returns 任务ID
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

      if (!state.isPaused) {
        processNextTask();
      }

      return taskId;
    },

    /**
     * 暂停所有任务
     */
    pause: () => {
      state = { ...state, isPaused: true };
    },

    /**
     * 恢复所有任务
     */
    resume: () => {
      state = { ...state, isPaused: false };
      processNextTask();
    },

    /**
     * 暂停指定任务
     * @param taskId 任务ID
     * @returns 是否成功暂停
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
     * @param taskId 任务ID
     * @returns 是否成功恢复
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
     * @param taskId 任务ID
     * @returns 任务状态信息
     */
    getTaskStatus: (taskId: string): Task | undefined => {
      return state.tasks.get(taskId);
    },

    /**
     * 获取所有任务
     * @returns 所有任务列表
     */
    getAllTasks: (): Task[] => {
      return Array.from(state.tasks.values());
    },

    /**
     * 获取正在运行的任务
     * @returns 运行中的任务列表
     */
    getRunningTasks: (): Task[] => {
      return Array.from(state.runningTasks)
        .map(id => state.tasks.get(id)!)
        .filter(Boolean);
    },

    /**
     * 获取等待中的任务
     * @returns 等待中的任务列表
     */
    getPendingTasks: (): Task[] => {
      return Array.from(state.tasks.values())
        .filter(task => task.status === 'pending');
    },

    /**
     * 取消任务
     * @param taskId 任务ID
     * @returns 是否成功取消
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
     */
    clear: () => {
      state = createInitialState();
    },

    /**
     * 释放控制器资源
     * 清理定时器并重置状态
     */
    dispose: () => {
      if (state.cleanupTimer) {
        clearInterval(state.cleanupTimer);
      }
      state = createInitialState();
    }
  };
}; 
