/**
 * 实时IPO数据服务
 * 从多个数据源获取最新的IPO信息、孖展倍数等
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
}

// 孖展数据源
interface MarginDataSource {
  broker: string; // 券商名称
  marginAmount: number; // 孖展金额(亿)
  updateTime: string; // 更新时间
}

class RealTimeDataService {
  
  /**
   * 获取实时IPO数据(模拟真实数据结构)
   * 实际项目中应该调用后端API,后端再去爬取这些网站
   */
  async fetchRealTimeIPOData(): Promise<RealTimeIPOData[]> {
    try {
      // 模拟从多个数据源获取实时数据
      // 实际应该:
      // 1. 后端爬取 https://aipo.myiqdii.com/margin/index 获取孖展数据
      // 2. 后端爬取 http://stocks.etnet.hk/www/sc/stocks/ci_ipo.php 获取IPO列表
      // 3. 后端爬取 https://www.aastocks.com/sc/stocks/market/ipo/mainpage.aspx 获取申购信息
      
      const now = new Date();
      
      const realTimeData: RealTimeIPOData[] = [
        {
          stockCode: '01989',
          stockName: '广合科技',
          listingDate: '2026-03-20',
          issuePrice: '71.88',
          subscriptionStartDate: '2026-03-12',
          subscriptionEndDate: '2026-03-17',
          industry: '印制电路板',
          marketCap: '33.06亿',
          peRatio: 21.2,
          underwriter: '中信证券',
          cornerstone: true,
          starInvestors: ['CPE源峰', '景林资产', '惠理', '霸菱', 'UBS AM', 'Eastspring'],
          sharesPerLot: 100,
          hasGreenshoe: true,
          isIndustryLeader: true,
          profitability: 'profitable',
          revenue: 28.5,
          netProfit: 3.2,
          revenueGrowth: 0.35,
          profitGrowth: 0.42,
          
          // 实时孖展数据(模拟) - 动态更新
          marginMultiple: 125.8 + (Math.random() - 0.5) * 5, // 孖展倍数有小幅波动
          marginAmount: 41.5 + (Math.random() - 0.5) * 0.5, // 孖展金额(亿)
          publicSubscriptionMultiple: 138.5 + (Math.random() - 0.5) * 3, // 公开发售认购倍数
          oneHandWinRate: 0.08, // 一手中签率8%
          subscriptionCount: 285000 + Math.floor(Math.random() * 1000), // 申购人数动态变化
          latestUpdate: now.toISOString()
        },
        
        {
          stockCode: '03355',
          stockName: '飞速创新',
          listingDate: '2026-03-23',
          issuePrice: '41.60',
          subscriptionStartDate: '2026-03-13',
          subscriptionEndDate: '2026-03-18T09:00:00', // 3月18日早上9点截止
          industry: '网络解决方案 云计算',
          marketCap: '16.64亿',
          peRatio: 18.5,
          underwriter: '中金公司',
          cornerstone: true,
          starInvestors: ['Hao Fund', 'Great Holding', 'WT Asset Management', 'Caitong SEIII', '聚鸣', '凯丰'],
          sharesPerLot: 100,
          hasGreenshoe: true,
          isIndustryLeader: false,
          profitability: 'profitable',
          revenue: 12.3,
          netProfit: 1.8,
          revenueGrowth: 0.65,
          profitGrowth: 0.58,
          
          // 实时孖展数据 - 动态更新
          marginMultiple: 68.3 + (Math.random() - 0.5) * 3,
          marginAmount: 11.4 + (Math.random() - 0.5) * 0.3,
          publicSubscriptionMultiple: 72.1 + (Math.random() - 0.5) * 2,
          oneHandWinRate: 0.15,
          subscriptionCount: 125000 + Math.floor(Math.random() * 500),
          latestUpdate: now.toISOString()
        },
        
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
          marginMultiple: 185.6 + (Math.random() - 0.5) * 8, // 超热门
          marginAmount: 19.0 + (Math.random() - 0.5) * 0.8,
          publicSubscriptionMultiple: 215.3 + (Math.random() - 0.5) * 5,
          oneHandWinRate: 0.03, // 一手中签率只有3%
          subscriptionCount: 320000 + Math.floor(Math.random() * 2000),
          latestUpdate: now.toISOString()
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
          oneHandWinRate: 0.85, // 冷门股,高中签率
          subscriptionCount: 8500 + Math.floor(Math.random() * 100),
          latestUpdate: now.toISOString()
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
          latestUpdate: now.toISOString()
        }
      ];
      
      return realTimeData;
    } catch (error) {
      console.error('获取实时IPO数据失败:', error);
      return [];
    }
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
      '01989': {
        totalMargin: 41.5,
        marginMultiple: 125.8,
        brokers: [
          { broker: '辉立证券', marginAmount: 12.3, updateTime: '2026-03-17 16:00' },
          { broker: '耀才证券', marginAmount: 8.5, updateTime: '2026-03-17 16:05' },
          { broker: '富途证券', marginAmount: 7.8, updateTime: '2026-03-17 16:10' },
          { broker: '华泰国际', marginAmount: 6.2, updateTime: '2026-03-17 16:08' },
          { broker: '中信证券', marginAmount: 6.7, updateTime: '2026-03-17 16:12' }
        ]
      },
      '02701': {
        totalMargin: 19.0,
        marginMultiple: 185.6,
        brokers: [
          { broker: '辉立证券', marginAmount: 5.8, updateTime: '2026-03-17 16:00' },
          { broker: '耀才证券', marginAmount: 4.2, updateTime: '2026-03-17 16:05' },
          { broker: '富途证券', marginAmount: 5.1, updateTime: '2026-03-17 16:10' },
          { broker: '华泰国际', marginAmount: 3.9, updateTime: '2026-03-17 16:08' }
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
