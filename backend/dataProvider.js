/**
 * IPO数据提供器
 * 统一管理多个数据源，提供完整的新股数据
 *
 * 数据源优先级:
 * 1. 静态JSON文件 (完整数据，包含所有字段)
 * 2. 爬虫数据 (实时行情、孖展数据)
 * 3. 第三方API (如需扩展)
 */

const fs = require('fs');
const path = require('path');

// 静态数据文件路径
const STATIC_DATA_FILE = path.join(__dirname, 'data', 'ipo-data-20260320.json');

// 缓存
let cachedData = null;
let lastLoadTime = null;

class DataProvider {
  constructor() {
    this.staticData = null;
  }

  /**
   * 加载静态数据文件
   */
  loadStaticData() {
    try {
      if (fs.existsSync(STATIC_DATA_FILE)) {
        const content = fs.readFileSync(STATIC_DATA_FILE, 'utf-8');
        this.staticData = JSON.parse(content);
        console.log('[DataProvider] 静态数据加载成功');
        return true;
      } else {
        console.warn('[DataProvider] 静态数据文件不存在:', STATIC_DATA_FILE);
        return false;
      }
    } catch (error) {
      console.error('[DataProvider] 静态数据加载失败:', error.message);
      return false;
    }
  }

  /**
   * 获取完整IPO数据（整合多个数据源）
   */
  async getAllData() {
    // 1. 首先尝试加载静态数据
    if (!this.staticData) {
      this.loadStaticData();
    }

    // 2. 如果有静态数据，直接返回
    if (this.staticData) {
      return this.staticData;
    }

    // 3. 降级：返回空数据
    return {
      subscribeIPOs: [],
      upcomingIPOs: [],
      todayListed: [],
      recentListed: [],
      updateTime: new Date().toISOString(),
      source: 'no-data'
    };
  }

  /**
   * 获取申购中的新股
   */
  async getSubscribeIPOs() {
    const data = await this.getAllData();
    return data.subscribeIPOs || [];
  }

  /**
   * 获取即将上市的新股
   */
  async getUpcomingIPOs() {
    const data = await this.getAllData();
    return data.upcomingIPOs || [];
  }

  /**
   * 获取今日上市的股票（实时行情）
   */
  async getTodayListed() {
    const data = await this.getAllData();
    return data.todayListed || [];
  }

  /**
   * 获取近期上市的股票
   */
  async getRecentListed() {
    const data = await this.getAllData();
    return data.recentListed || [];
  }

  /**
   * 获取用于打新的新股（仅申购中）
   * 用于后端API /api/ipo-list
   */
  async getAllUnlistedIPOs() {
    const data = await this.getAllData();
    return (data.subscribeIPOs || []).map(ipo => ({
      ...ipo,
      status: 'subscribe',
      starInvestors: ipo.starInvestors || [],
      cornerstoneInvestors: ipo.cornerstoneInvestors || []
    }));
  }

  /**
   * 根据股票代码获取详情
   */
  async getIPOByCode(stockCode) {
    const data = await this.getAllData();

    const allIPOs = [
      ...(data.subscribeIPOs || []),
      ...(data.upcomingIPOs || []),
      ...(data.recentListed || [])
    ];

    return allIPOs.find(ipo => ipo.stockCode === stockCode);
  }

  /**
   * 更新静态数据文件
   */
  updateStaticData(newData) {
    try {
      this.staticData = newData;
      fs.writeFileSync(STATIC_DATA_FILE, JSON.stringify(newData, null, 2), 'utf-8');
      console.log('[DataProvider] 静态数据更新成功');
      return true;
    } catch (error) {
      console.error('[DataProvider] 静态数据更新失败:', error.message);
      return false;
    }
  }

  /**
   * 刷新数据（从文件重新加载）
   */
  refresh() {
    this.staticData = null;
    return this.loadStaticData();
  }
}

module.exports = new DataProvider();
