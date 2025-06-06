/**
 * 任务接口定义
 * @template T 任务执行结果的类型
 */
interface Task<T = any> {
  /** 任务唯一标识符 */
  id: string;
  /** 任务优先级，数字越大优先级越高 */
  priority: number;
  /** 
   * 任务执行函数
   * @param controller 任务控制器实例，用于更新任务状态和进度
   * @param taskId 当前任务的ID
   * @returns 任务执行结果
   */
  execute: (controller: ConcurrentTaskController, taskId: string) => Promise<T>;
  /** 任务当前状态 */
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  /** 任务执行结果 */
  result?: T;
  /** 任务执行错误信息 */
  error?: Error;
  /** 任务超时时间（毫秒） */
  timeout?: number;
  /** 当前重试次数 */
  retries?: number;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 任务进度（0-100） */
  progress?: number;
  /** 依赖的其他任务ID列表 */
  dependencies?: string[];
  /** 进度更新回调函数 */
  onProgress?: (progress: number) => void;
}

/**
 * 任务控制器配置选项
 */
interface TaskControllerOptions {
  /** 最大并发任务数 */
  maxConcurrent: number;
  /** 任务完成回调 */
  onTaskComplete?: (task: Task) => void;
  /** 任务失败回调 */
  onTaskError?: (task: Task, error: Error) => void;
  /** 任务超时回调 */
  onTaskTimeout?: (task: Task) => void;
  /** 任务进度更新回调 */
  onTaskProgress?: (task: Task, progress: number) => void;
  /** 是否自动清理已完成的任务 */
  autoCleanup?: boolean;
  /** 自动清理的时间间隔（毫秒） */
  cleanupInterval?: number;
}

/**
 * 并发任务控制器
 * 用于管理和控制多个异步任务的并发执行
 */
export class ConcurrentTaskController {
  /** 所有任务的映射表 */
  private tasks: Map<string, Task> = new Map();
  /** 当前正在运行的任务ID集合 */
  private runningTasks: Set<string> = new Set();
  /** 控制器配置选项 */
  private options: Required<TaskControllerOptions>;
  /** 自动清理定时器 */
  private cleanupTimer?: NodeJS.Timeout;
  /** 控制器是否处于暂停状态 */
  private isPaused: boolean = false;

  /**
   * 创建任务控制器实例
   * @param options 控制器配置选项
   */
  constructor(options: TaskControllerOptions) {
    this.options = {
      maxConcurrent: options.maxConcurrent || 3,
      onTaskComplete: options.onTaskComplete || (() => {}),
      onTaskError: options.onTaskError || (() => {}),
      onTaskTimeout: options.onTaskTimeout || (() => {}),
      onTaskProgress: options.onTaskProgress || (() => {}),
      autoCleanup: options.autoCleanup ?? true,
      cleanupInterval: options.cleanupInterval || 60000, // 默认1分钟清理一次
    };

    if (this.options.autoCleanup) {
      this.startCleanupTimer();
    }
  }

  /**
   * 启动自动清理定时器
   * 定期清理已完成或失败的任务
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupCompletedTasks();
    }, this.options.cleanupInterval);
  }

  /**
   * 清理已完成或失败的任务
   */
  private cleanupCompletedTasks(): void {
    const now = Date.now();
    for (const [id, task] of this.tasks.entries()) {
      if (task.status === 'completed' || task.status === 'failed') {
        this.tasks.delete(id);
      }
    }
  }

  /**
   * 添加新任务到控制器
   * @param task 任务配置
   * @returns 任务ID
   */
  async addTask<T>(task: Omit<Task<T>, 'status' | 'id'>): Promise<string> {
    const taskId = Math.random().toString(36).substring(2, 15);
    const newTask: Task<T> = {
      ...task,
      id: taskId,
      status: 'pending',
      retries: 0,
      maxRetries: task.maxRetries || 0,
      progress: 0,
    };
    
    this.tasks.set(taskId, newTask);
    if (!this.isPaused) {
      this.processNextTask();
    }
    return taskId;
  }

  /**
   * 处理下一个待执行的任务
   * 根据优先级和依赖关系选择并执行任务
   */
  private async processNextTask(): Promise<void> {
    if (this.isPaused || this.runningTasks.size >= this.options.maxConcurrent) {
      return;
    }

    const nextTask = this.getNextTask();
    if (!nextTask) {
      return;
    }

    // 检查依赖任务是否完成
    if (nextTask.dependencies?.length) {
      const dependenciesCompleted = nextTask.dependencies.every(depId => {
        const depTask = this.tasks.get(depId);
        return depTask?.status === 'completed';
      });

      if (!dependenciesCompleted) {
        return;
      }
    }

    this.runningTasks.add(nextTask.id);
    nextTask.status = 'running';

    try {
      // 设置任务超时
      const timeoutPromise = nextTask.timeout 
        ? new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Task timeout')), nextTask.timeout)
          )
        : null;

      // 执行任务，支持超时控制
      const result = await Promise.race([
        nextTask.execute(this, nextTask.id),
        ...(timeoutPromise ? [timeoutPromise] : [])
      ]);

      nextTask.status = 'completed';
      nextTask.result = result;
      this.options.onTaskComplete(nextTask);
    } catch (error) {
      // 处理任务失败，支持重试
      if (nextTask.retries! < nextTask.maxRetries!) {
        nextTask.retries!++;
        nextTask.status = 'pending';
        this.runningTasks.delete(nextTask.id);
        this.processNextTask();
        return;
      }

      nextTask.status = 'failed';
      nextTask.error = error as Error;
      if (error instanceof Error && error.message === 'Task timeout') {
        this.options.onTaskTimeout(nextTask);
      } else {
        this.options.onTaskError(nextTask, error as Error);
      }
    } finally {
      this.runningTasks.delete(nextTask.id);
      if (!this.isPaused) {
        this.processNextTask();
      }
    }
  }

  /**
   * 获取下一个要执行的任务
   * 根据优先级排序，返回优先级最高的待执行任务
   */
  private getNextTask(): Task | undefined {
    return Array.from(this.tasks.values())
      .filter(task => task.status === 'pending')
      .sort((a, b) => b.priority - a.priority)[0];
  }

  /**
   * 更新任务进度
   * @param taskId 任务ID
   * @param progress 进度值（0-100）
   */
  updateTaskProgress(taskId: string, progress: number): void {
    const task = this.tasks.get(taskId);
    if (task && task.status === 'running') {
      task.progress = Math.min(100, Math.max(0, progress));
      task.onProgress?.(task.progress);
      this.options.onTaskProgress(task, task.progress);
    }
  }

  /**
   * 暂停所有任务
   */
  pause(): void {
    this.isPaused = true;
  }

  /**
   * 恢复所有任务
   */
  resume(): void {
    this.isPaused = false;
    this.processNextTask();
  }

  /**
   * 暂停指定任务
   * @param taskId 任务ID
   * @returns 是否成功暂停
   */
  pauseTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (task && task.status === 'running') {
      task.status = 'paused';
      this.runningTasks.delete(taskId);
      this.processNextTask();
      return true;
    }
    return false;
  }

  /**
   * 恢复指定任务
   * @param taskId 任务ID
   * @returns 是否成功恢复
   */
  resumeTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (task && task.status === 'paused') {
      task.status = 'pending';
      this.processNextTask();
      return true;
    }
    return false;
  }

  /**
   * 获取任务状态
   * @param taskId 任务ID
   */
  getTaskStatus(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * 获取所有任务
   */
  getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  /**
   * 获取正在运行的任务
   */
  getRunningTasks(): Task[] {
    return Array.from(this.runningTasks).map(id => this.tasks.get(id)!);
  }

  /**
   * 获取等待中的任务
   */
  getPendingTasks(): Task[] {
    return Array.from(this.tasks.values()).filter(task => task.status === 'pending');
  }

  /**
   * 取消指定任务
   * @param taskId 任务ID
   * @returns 是否成功取消
   */
  cancelTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== 'pending') {
      return false;
    }
    this.tasks.delete(taskId);
    return true;
  }

  /**
   * 清空所有任务
   */
  clear(): void {
    this.tasks.clear();
    this.runningTasks.clear();
  }

  /**
   * 释放控制器资源
   * 清理定时器并清空任务
   */
  dispose(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.clear();
  }
} 
