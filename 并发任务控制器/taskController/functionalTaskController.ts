/**
 * 任务状态类型
 */
type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'paused';

/**
 * 任务接口定义
 */
interface Task<T = any> {
  id: string;
  priority: number;
  execute: (updateProgress: (progress: number) => void) => Promise<T>;
  status: TaskStatus;
  result?: T;
  error?: Error;
  timeout?: number;
  retries: number;
  maxRetries: number;
  progress: number;
  dependencies: string[];
  originalPriority?: number;
  isDependencyBoosted?: boolean;
  failedAt?: number;
}

/**
 * 任务控制器状态
 */
interface TaskControllerState {
  tasks: Map<string, Task>;
  runningTasks: Set<string>;
  dependencyQueue: string[];
  reverseDependencies: Map<string, Set<string>>;
  isPaused: boolean;
  cleanupTimer?: NodeJS.Timeout;
}

/**
 * 任务控制器配置
 */
interface TaskControllerConfig {
  maxConcurrent: number;
  autoCleanup: boolean;
  cleanupInterval: number;
  dependencyPriorityBoost: number;
  enableDependencyPriorityBoost: boolean;
  onTaskComplete?: (task: Task) => void;
  onTaskError?: (task: Task, error: Error) => void;
  onTaskProgress?: (task: Task, progress: number) => void;
}

/**
 * 创建新的任务控制器状态
 */
const createInitialState = (): TaskControllerState => ({
  tasks: new Map(),
  runningTasks: new Set(),
  dependencyQueue: [],
  reverseDependencies: new Map(),
  isPaused: false
});

/**
 * 创建任务ID
 */
const createTaskId = (): string => Math.random().toString(36).substring(2, 15);

/**
 * 创建新任务
 */
const createTask = <T>(
  options: {
    priority: number;
    execute: (updateProgress: (progress: number) => void) => Promise<T>;
    timeout?: number;
    maxRetries?: number;
    dependencies?: string[];
  }
): Task<T> => ({
  id: createTaskId(),
  priority: options.priority,
  execute: options.execute,
  status: 'pending',
  retries: 0,
  maxRetries: options.maxRetries ?? 0,
  progress: 0,
  dependencies: options.dependencies ?? [],
  originalPriority: options.priority,
  isDependencyBoosted: false,
  timeout: options.timeout
});

/**
 * 更新任务状态
 */
const updateTaskStatus = (
  state: TaskControllerState,
  taskId: string,
  updates: Partial<Task>
): TaskControllerState => {
  const task = state.tasks.get(taskId);
  if (!task) return state;

  const updatedTask = { ...task, ...updates };
  const newTasks = new Map(state.tasks);
  newTasks.set(taskId, updatedTask);

  return {
    ...state,
    tasks: newTasks
  };
};

/**
 * 更新反向依赖关系
 */
const updateReverseDependencies = (
  state: TaskControllerState,
  taskId: string,
  dependencies: string[]
): TaskControllerState => {
  const newReverseDeps = new Map(state.reverseDependencies);

  // 移除旧的反向依赖
  for (const [depId, dependents] of newReverseDeps.entries()) {
    const newDependents = new Set(dependents);
    newDependents.delete(taskId);
    if (newDependents.size === 0) {
      newReverseDeps.delete(depId);
    } else {
      newReverseDeps.set(depId, newDependents);
    }
  }

  // 添加新的反向依赖
  for (const depId of dependencies) {
    const dependents = newReverseDeps.get(depId) ?? new Set();
    dependents.add(taskId);
    newReverseDeps.set(depId, dependents);
  }

  return {
    ...state,
    reverseDependencies: newReverseDeps
  };
};

/**
 * 检查任务依赖是否完成
 */
const areDependenciesCompleted = (
  state: TaskControllerState,
  task: Task
): boolean => {
  return task.dependencies.every(depId => {
    const depTask = state.tasks.get(depId);
    return depTask?.status === 'completed';
  });
};

/**
 * 提升依赖任务优先级
 */
const boostDependencyPriorities = (
  state: TaskControllerState,
  config: TaskControllerConfig,
  taskId: string
): TaskControllerState => {
  if (!config.enableDependencyPriorityBoost) return state;

  const task = state.tasks.get(taskId);
  if (!task?.dependencies.length) return state;

  let newState = { ...state };
  const newTasks = new Map(state.tasks);

  task.dependencies.forEach(depId => {
    const depTask = newTasks.get(depId);
    if (depTask?.status === 'pending' && !depTask.isDependencyBoosted) {
      newTasks.set(depId, {
        ...depTask,
        originalPriority: depTask.priority,
        priority: depTask.priority + config.dependencyPriorityBoost,
        isDependencyBoosted: true
      });
    }
  });

  return {
    ...newState,
    tasks: newTasks
  };
};

/**
 * 获取下一个要执行的任务
 */
const getNextTask = (state: TaskControllerState): Task | undefined => {
  // 首先检查依赖队列
  for (const taskId of state.dependencyQueue) {
    const task = state.tasks.get(taskId);
    if (task?.status === 'pending' && areDependenciesCompleted(state, task)) {
      return task;
    }
  }

  // 然后检查其他待执行任务
  const pendingTasks = Array.from(state.tasks.values())
    .filter(task => 
      task.status === 'pending' && 
      !state.dependencyQueue.includes(task.id)
    )
    .sort((a, b) => {
      if (a.retries > 0 && b.retries === 0) return -1;
      if (a.retries === 0 && b.retries > 0) return 1;
      return b.priority - a.priority;
    });

  return pendingTasks[0];
};

/**
 * 处理任务完成
 */
const handleTaskCompletion = (
  state: TaskControllerState,
  config: TaskControllerConfig,
  taskId: string,
  result: any
): TaskControllerState => {
  let newState = updateTaskStatus(state, taskId, {
    status: 'completed',
    result
  });

  // 恢复任务优先级
  const task = newState.tasks.get(taskId);
  if (task?.isDependencyBoosted && task.originalPriority !== undefined) {
    newState = updateTaskStatus(newState, taskId, {
      priority: task.originalPriority,
      isDependencyBoosted: false,
      originalPriority: undefined
    });
  }

  // 检查依赖队列
  const readyTasks = newState.dependencyQueue.filter(id => {
    const task = newState.tasks.get(id);
    return task?.status === 'pending' && areDependenciesCompleted(newState, task);
  });

  // 更新依赖队列
  newState = {
    ...newState,
    dependencyQueue: newState.dependencyQueue.filter(id => !readyTasks.includes(id))
  };

  config.onTaskComplete?.(newState.tasks.get(taskId)!);
  return newState;
};

/**
 * 处理任务失败
 */
const handleTaskFailure = (
  state: TaskControllerState,
  config: TaskControllerConfig,
  taskId: string,
  error: Error
): TaskControllerState => {
  const task = state.tasks.get(taskId);
  if (!task) return state;

  if (task.retries < task.maxRetries) {
    return updateTaskStatus(state, taskId, {
      status: 'pending',
      retries: task.retries + 1,
      error,
      priority: task.priority + config.dependencyPriorityBoost
    });
  }

  const newState = updateTaskStatus(state, taskId, {
    status: 'failed',
    error,
    failedAt: Date.now()
  });

  config.onTaskError?.(newState.tasks.get(taskId)!, error);
  return newState;
};

/**
 * 更新任务进度
 */
const updateTaskProgress = (
  state: TaskControllerState,
  config: TaskControllerConfig,
  taskId: string,
  progress: number
): TaskControllerState => {
  const task = state.tasks.get(taskId);
  if (!task || task.status !== 'running') return state;

  const newProgress = Math.min(100, Math.max(0, progress));
  const newState = updateTaskStatus(state, taskId, { progress: newProgress });
  config.onTaskProgress?.(newState.tasks.get(taskId)!, newProgress);
  return newState;
};

/**
 * 创建任务控制器
 */
export const createTaskController = (config: Partial<TaskControllerConfig>) => {
  const fullConfig: TaskControllerConfig = {
    maxConcurrent: config.maxConcurrent ?? 1,
    autoCleanup: config.autoCleanup ?? false,
    cleanupInterval: config.cleanupInterval ?? 5000,
    dependencyPriorityBoost: config.dependencyPriorityBoost ?? 10,
    enableDependencyPriorityBoost: config.enableDependencyPriorityBoost ?? true,
    onTaskComplete: config.onTaskComplete,
    onTaskError: config.onTaskError,
    onTaskProgress: config.onTaskProgress
  };

  let state = createInitialState();

  // 启动清理定时器
  if (fullConfig.autoCleanup) {
    state.cleanupTimer = setInterval(() => {
      state = cleanupCompletedTasks(state);
    }, fullConfig.cleanupInterval);
  }

  /**
   * 清理已完成的任务
   */
  const cleanupCompletedTasks = (currentState: TaskControllerState): TaskControllerState => {
    const newTasks = new Map(currentState.tasks);
    const newReverseDeps = new Map(currentState.reverseDependencies);

    for (const [id, task] of currentState.tasks.entries()) {
      if ((task.status === 'completed' || task.status === 'failed') && 
          canCleanupTask(currentState, id)) {
        newTasks.delete(id);
        newReverseDeps.delete(id);
      }
    }

    return {
      ...currentState,
      tasks: newTasks,
      reverseDependencies: newReverseDeps
    };
  };

  /**
   * 检查任务是否可以清理
   */
  const canCleanupTask = (currentState: TaskControllerState, taskId: string): boolean => {
    const task = currentState.tasks.get(taskId);
    if (!task) return true;

    if (task.status === 'running' || task.status === 'pending') {
      return false;
    }

    const dependents = currentState.reverseDependencies.get(taskId);
    if (!dependents) return true;

    for (const dependentId of dependents) {
      const dependent = currentState.tasks.get(dependentId);
      if (dependent && 
          (dependent.status === 'running' || 
           dependent.status === 'pending' || 
           (dependent.status === 'failed' && dependent.retries < dependent.maxRetries))) {
        return false;
      }
    }

    return true;
  };

  /**
   * 处理下一个任务
   */
  const processNextTask = async (): Promise<void> => {
    if (state.isPaused || state.runningTasks.size >= fullConfig.maxConcurrent) {
      return;
    }

    const nextTask = getNextTask(state);
    if (!nextTask) return;

    if (nextTask.dependencies.length && !areDependenciesCompleted(state, nextTask)) {
      state = {
        ...state,
        dependencyQueue: [...state.dependencyQueue, nextTask.id]
      };
      state = boostDependencyPriorities(state, fullConfig, nextTask.id);
      return;
    }

    // 更新任务状态为运行中
    state = updateTaskStatus(state, nextTask.id, { status: 'running' });
    state.runningTasks.add(nextTask.id);

    try {
      const updateProgress = (progress: number) => {
        state = updateTaskProgress(state, fullConfig, nextTask.id, progress);
      };

      const timeoutPromise = nextTask.timeout 
        ? new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Task timeout')), nextTask.timeout)
          )
        : null;

      const result = await Promise.race([
        nextTask.execute(updateProgress),
        ...(timeoutPromise ? [timeoutPromise] : [])
      ]);

      state = handleTaskCompletion(state, fullConfig, nextTask.id, result);
    } catch (error) {
      state = handleTaskFailure(state, fullConfig, nextTask.id, error as Error);
    } finally {
      state.runningTasks.delete(nextTask.id);
      if (!state.isPaused) {
        setTimeout(processNextTask, 0);
      }
    }
  };

  return {
    /**
     * 添加新任务
     */
    addTask: async <T>(options: {
      priority: number;
      execute: (updateProgress: (progress: number) => void) => Promise<T>;
      timeout?: number;
      maxRetries?: number;
      dependencies?: string[];
    }): Promise<string> => {
      const task = createTask(options);
      state = {
        ...state,
        tasks: new Map(state.tasks).set(task.id, task)
      };
      state = updateReverseDependencies(state, task.id, task.dependencies);

      if (task.dependencies.length && !areDependenciesCompleted(state, task)) {
        state = {
          ...state,
          dependencyQueue: [...state.dependencyQueue, task.id]
        };
        state = boostDependencyPriorities(state, fullConfig, task.id);
      }

      if (!state.isPaused) {
        processNextTask();
      }

      return task.id;
    },

    /**
     * 暂停任务调度
     */
    pause: () => {
      state = { ...state, isPaused: true };
    },

    /**
     * 恢复任务调度
     */
    resume: () => {
      state = { ...state, isPaused: false };
      processNextTask();
    },

    /**
     * 获取任务状态
     */
    getTaskStatus: (taskId: string) => state.tasks.get(taskId),

    /**
     * 获取所有任务
     */
    getAllTasks: () => Array.from(state.tasks.values()),

    /**
     * 获取运行中的任务
     */
    getRunningTasks: () => Array.from(state.runningTasks).map(id => state.tasks.get(id)!),

    /**
     * 获取等待中的任务
     */
    getPendingTasks: () => Array.from(state.tasks.values())
      .filter(task => task.status === 'pending'),

    /**
     * 获取失败的任务
     */
    getFailedTasks: () => Array.from(state.tasks.values())
      .filter(task => task.status === 'failed'),

    /**
     * 取消任务
     */
    cancelTask: (taskId: string): boolean => {
      const task = state.tasks.get(taskId);
      if (!task || task.status !== 'pending') return false;

      state = {
        ...state,
        tasks: new Map(state.tasks),
        reverseDependencies: new Map(state.reverseDependencies)
      };
      state.tasks.delete(taskId);
      state.reverseDependencies.delete(taskId);
      return true;
    },

    /**
     * 清空所有任务
     */
    clear: () => {
      state = createInitialState();
    },

    /**
     * 销毁控制器
     */
    dispose: () => {
      if (state.cleanupTimer) {
        clearInterval(state.cleanupTimer);
      }
      state = createInitialState();
    }
  };
};

// 导出类型
export type { Task, TaskStatus, TaskControllerConfig }; 
