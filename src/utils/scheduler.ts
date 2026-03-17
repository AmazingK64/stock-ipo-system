import ipoService from '../services/ipoService';

/**
 * 定时任务调度器
 * 用于定期刷新新股数据
 */
class Scheduler {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private readonly refreshInterval: number = 24 * 60 * 60 * 1000; // 24小时刷新一次

  /**
   * 启动定时任务
   */
  start(): void {
    console.log('定时任务启动: 每24小时刷新一次新股数据');
    
    // 立即执行一次
    this.refreshData();
    
    // 设置定时任务
    this.intervalId = setInterval(() => {
      this.refreshData();
    }, this.refreshInterval);
  }

  /**
   * 停止定时任务
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('定时任务已停止');
    }
  }

  /**
   * 刷新数据
   */
  private async refreshData(): Promise<void> {
    try {
      console.log('开始刷新新股数据:', new Date().toLocaleString());
      const success = await ipoService.refreshIPOData();
      if (success) {
        console.log('新股数据刷新成功');
      } else {
        console.error('新股数据刷新失败');
      }
    } catch (error) {
      console.error('刷新数据时出错:', error);
    }
  }

  /**
   * 获取下次刷新时间
   */
  getNextRefreshTime(): Date {
    const now = new Date();
    return new Date(now.getTime() + this.refreshInterval);
  }
}

export default new Scheduler();
