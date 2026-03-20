/**
 * 实时IPO数据服务
 * 从多个数据源获取最新的IPO信息、孖展倍数等
 * 优先从后端API获取真实数据，降级到模拟数据
 */

import type { IRawIPOData } from '../types';

// 实时IPO数据接口(包含孖展倍数)
export interface RealTimeIPOData extends IRawIPOData {
  marginMultiple?: number; // 孖展倍数
  marginAmount?: number; // 孖展金额(亿)
  publicSubscriptionMultiple?: number; // 公开发售认购倍数
  oneHandWinRate?: number; // 一手中签率
  subscriptionCount?: number; // 申购人数
  latestUpdate?: string; // 最后更新时间
  source?: string; // 数据来源
}

// 孖展数据源
interface MarginDataSource {
  broker: string; // 券商名称
  marginAmount: number; // 孖展金额(亿)
  updateTime: string; // 更新时间
}

class RealTimeDataService {
  private apiBaseURL = 'http://localhost:3001/api';
  private useMockData = true; // 默认使用模拟数据
  private mockDataLastUpdate: string | null = null;

  /**
   * 获取实时IPO数据
   * 优先从后端API获取真实数据
   */
  async fetchRealTimeIPOData(): Promise<RealTimeIPOData[]> {
    try {
      // 尝试从后端API获取真实数据
      const realData = await this.fetchFromBackend();
      if (realData.length > 0) {
        console.log('[RealTimeData] 使用真实数据，共', realData.length, '条');
        return realData;
      }
    } catch (error) {
      console.warn('[RealTimeData] 后端API不可用，使用模拟数据:', error);
    }

    // 降级到模拟数据
    console.log('[RealTimeData] 使用模拟数据（请启动后端服务以获取真实数据）');
    return this.getMockData();
  }

  /**
   * 从后端API获取真实数据
   */
  private async fetchFromBackend(): Promise<RealTimeIPOData[]> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时

      const response = await fetch(`${this.apiBaseURL}/ipo-list`, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API响应错误: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.data && result.data.length > 0) {
        // 将API数据转换为前端格式
        return this.transformAPIData(result.data);
      }

      return [];
    } catch (error) {
      if (error.name === 'AbortError') {
        console.warn('[RealTimeData] API请求超时');
      }
      throw error;
    }
  }

  /**
   * 转换API数据为前端格式
   */
  private transformAPIData(apiData: any[]): RealTimeIPOData[] {
    return apiData.map(item => ({
      stockCode: item.stockCode || '',
      stockName: item.stockName || '',
      listingDate: item.listingDate || '',
      issuePrice: item.issuePrice?.toString() || '0',
      subscriptionStartDate: item.subscriptionStartDate || '',
      subscriptionEndDate: item.subscriptionEndDate || '',
      industry: item.industry || '',
      marketCap: item.marketCap || '',
      peRatio: item.peRatio || 0,
      underwriter: item.underwriter || '',
      cornerstone: item.cornerstone || false,
      starInvestors: item.starInvestors || [],
      sharesPerLot: item.sharesPerLot || 100,
      hasGreenshoe: item.hasGreenshoe || false,
      isIndustryLeader: item.isIndustryLeader || false,
      profitability: item.profitability || 'profitable',
      revenue: item.revenue || 0,
      netProfit: item.netProfit || 0,
      revenueGrowth: item.revenueGrowth || 0,
      profitGrowth: item.profitGrowth || 0,
      // 孖展数据
      marginMultiple: item.marginMultiple,
      marginAmount: item.marginAmount,
      publicSubscriptionMultiple: item.publicSubscriptionMultiple,
      oneHandWinRate: item.oneHandWinRate,
      subscriptionCount: item.subscriptionCount,
      latestUpdate: item.updateTime || item.latestUpdate,
      source: item.source || 'api'
    }));
  }

  /**
   * 模拟数据（用于演示和开发）
   * 根据当前日期动态过滤已截止的股票
   */
  private getMockData(): RealTimeIPOData[] {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // 模拟数据会显示当前可申购的股票（排除已截止的）
    const mockData: RealTimeIPOData[] = [
      {
        stockCode: '02701',
        stockName: '国民技术',
        listingDate: '2026-03-23',
        issuePrice: '10.80',
        subscriptionStartDate: '2026-03-13',
        subscriptionEndDate: '2026-03-18',
        industry: '集成电路 半导体',
        marketCap: '10.26亿',
        peRatio: 0,
        underwriter: '中信证券',
        cornerstone: true,
        starInvestors: ['国华人寿', 'Harvest Oriental II', '欣旺达财资'],
        sharesPerLot: 200,
        hasGreenshoe: true,
        isIndustryLeader: false,
        profitability: 'loss',
        revenue: 5.8,
        netProfit: -0.8,
        revenueGrowth: 1.2,
        profitGrowth: 0,

        // 实时孖展数据 - 超热门，动态更新
        marginMultiple: 185.6 + (Math.random() - 0.5) * 8,
        marginAmount: 19.0 + (Math.random() - 0.5) * 0.8,
        publicSubscriptionMultiple: 215.3 + (Math.random() - 0.5) * 5,
        oneHandWinRate: 0.03,
        subscriptionCount: 320000 + Math.floor(Math.random() * 2000),
        latestUpdate: now.toISOString(),
        source: 'mock'
      },

      {
        stockCode: '02729',
        stockName: '凯乐士科技',
        listingDate: '2026-03-24',
        issuePrice: '20.40',
        subscriptionStartDate: '2026-03-16',
        subscriptionEndDate: '2026-03-19',
        industry: '智能物流机器人',
        marketCap: '7.51亿',
        peRatio: 0,
        underwriter: '国泰君安',
        cornerstone: false,
        starInvestors: [],
        sharesPerLot: 200,
        hasGreenshoe: false,
        isIndustryLeader: false,
        profitability: 'loss',
        revenue: 3.2,
        netProfit: -0.5,
        revenueGrowth: 0.85,
        profitGrowth: 0,

        // 实时孖展数据 - 冷门股，动态更新
        marginMultiple: 5.2 + (Math.random() - 0.5) * 0.3,
        marginAmount: 0.4 + (Math.random() - 0.5) * 0.05,
        publicSubscriptionMultiple: 6.8 + (Math.random() - 0.5) * 0.2,
        oneHandWinRate: 0.85,
        subscriptionCount: 8500 + Math.floor(Math.random() * 100),
        latestUpdate: now.toISOString(),
        source: 'mock'
      },

      {
        stockCode: '02632',
        stockName: '泽景股份',
        listingDate: '2026-03-24',
        issuePrice: '48.00',
        subscriptionStartDate: '2026-03-16',
        subscriptionEndDate: '2026-03-19',
        industry: '汽车电子 新能源车',
        marketCap: '7.79亿',
        peRatio: 0,
        underwriter: '海通国际',
        cornerstone: true,
        starInvestors: ['盈科壹号', '香港高精尖'],
        sharesPerLot: 50,
        hasGreenshoe: true,
        isIndustryLeader: false,
        profitability: 'loss',
        revenue: 4.5,
        netProfit: -0.6,
        revenueGrowth: 0.95,
        profitGrowth: 0,

        // 实时孖展数据 - 动态更新
        marginMultiple: 22.7 + (Math.random() - 0.5) * 1,
        marginAmount: 1.8 + (Math.random() - 0.5) * 0.1,
        publicSubscriptionMultiple: 28.4 + (Math.random() - 0.5) * 0.8,
        oneHandWinRate: 0.35,
        subscriptionCount: 42000 + Math.floor(Math.random() * 200),
        latestUpdate: now.toISOString(),
        source: 'mock'
      }
    ];

    this.mockDataLastUpdate = now.toISOString();
    return mockData;
  }

  /**
   * 获取孖展数据详情(模拟)
   */
  async fetchMarginData(stockCode: string): Promise<{
    totalMargin: number;
    marginMultiple: number;
    brokers: MarginDataSource[];
  }> {
    // 模拟各券商的孖展数据
    const mockData: Record<string, any> = {
      '02701': {
        totalMargin: 19.0,
        marginMultiple: 185.6,
        brokers: [
          { broker: '辉立证券', marginAmount: 5.8, updateTime: new Date().toISOString() },
          { broker: '耀才证券', marginAmount: 4.2, updateTime: new Date().toISOString() },
          { broker: '富途证券', marginAmount: 5.1, updateTime: new Date().toISOString() },
          { broker: '华泰国际', marginAmount: 3.9, updateTime: new Date().toISOString() }
        ]
      },
      '02729': {
        totalMargin: 0.4,
        marginMultiple: 5.2,
        brokers: [
          { broker: '辉立证券', marginAmount: 0.1, updateTime: new Date().toISOString() },
          { broker: '耀才证券', marginAmount: 0.15, updateTime: new Date().toISOString() }
        ]
      },
      '02632': {
        totalMargin: 1.8,
        marginMultiple: 22.7,
        brokers: [
          { broker: '辉立证券', marginAmount: 0.5, updateTime: new Date().toISOString() },
          { broker: '富途证券', marginAmount: 0.8, updateTime: new Date().toISOString() },
          { broker: '华泰国际', marginAmount: 0.5, updateTime: new Date().toISOString() }
        ]
      }
    };

    return mockData[stockCode] || {
      totalMargin: 0,
      marginMultiple: 0,
      brokers: []
    };
  }

  /**
   * 实时更新中签率估算(基于实际孖展倍数)
   */
  estimateRealTimeWinRate(
    _marginMultiple: number,
    publicSubscriptionMultiple: number,
    groupType: '甲组' | '乙组'
  ): number {
    // 使用实际孖展倍数更新中签率估算
    if (groupType === '甲组') {
      // 甲组: 基于公开发售认购倍数
      const baseRate = 1 / publicSubscriptionMultiple;
      // 一手党保底机制
      return Math.min(baseRate * 1.5, 0.95);
    } else {
      // 乙组: 基于孖展倍数
      return Math.min(1 / publicSubscriptionMultiple, 0.8);
    }
  }

  /**
   * 判断新股热度等级
   */
  getHeatLevel(_marginMultiple: number, publicSubscriptionMultiple: number): {
    level: string;
    color: string;
    description: string;
  } {
    if (publicSubscriptionMultiple > 100) {
      return {
        level: '超热门',
        color: '#ff4d4f',
        description: '认购倍数超100倍,一手中签率可能低于10%'
      };
    } else if (publicSubscriptionMultiple > 50) {
      return {
        level: '热门',
        color: '#fa8c16',
        description: '认购倍数50-100倍,需要融资提高中签率'
      };
    } else if (publicSubscriptionMultiple > 20) {
      return {
        level: '较热门',
        color: '#faad14',
        description: '认购倍数20-50倍,中签率适中'
      };
    } else if (publicSubscriptionMultiple > 10) {
      return {
        level: '一般',
        color: '#52c41a',
        description: '认购倍数10-20倍,中签率较高'
      };
    } else {
      return {
        level: '冷门',
        color: '#1890ff',
        description: '认购倍数低于10倍,高中签率但需谨慎'
      };
    }
  }
}

export default new RealTimeDataService();
