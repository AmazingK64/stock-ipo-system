import db from '../db/database';
import type { IPOStock, Allocation, IRawIPOData, IPOStrategy, CategorizedIPOData, RealtimeQuote } from '../types';
import ipoScoringService from './ipoScoring';

// 港股新股信息获取服务
class IPOService {
  private apiBaseURL = 'http://localhost:3001/api';

  /**
   * 获取新股信息
   * 优先从后端API获取真实数据，降级到模拟数据
   */
  async fetchNewIPOStocks(): Promise<IRawIPOData[]> {
    try {
      // 尝试从后端API获取真实数据
      const realData = await this.fetchFromBackend();
      if (realData.length > 0) {
        console.log('[IPOService] 使用后端API获取真实数据，共', realData.length, '条');
        return realData;
      }
    } catch (error) {
      console.warn('[IPOService] 后端API不可用，使用模拟数据:', error);
    }

    // 降级到模拟数据
    console.log('[IPOService] 使用模拟数据（请启动后端服务以获取真实数据）');
    return this.getMockData();
  }

  /**
   * 获取分类IPO数据 (新接口)
   * 返回: 申购中、即将上市、今日上市、近期上市
   */
  async fetchCategorizedIPOData(): Promise<CategorizedIPOData | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时

      const response = await fetch(`${this.apiBaseURL}/ipo-all`, {
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

      if (result.success) {
        console.log('[IPOService] 获取分类IPO数据成功');
        return result as CategorizedIPOData;
      }

      return null;
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn('[IPOService] 分类IPO数据请求超时');
      }
      console.warn('[IPOService] 获取分类IPO数据失败:', error);
      return null;
    }
  }

  /**
   * 获取今日上市实时行情
   */
  async fetchTodayListedQuotes(): Promise<RealtimeQuote[]> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${this.apiBaseURL}/today-listed`, {
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

      if (result.success && result.data) {
        return result.data as RealtimeQuote[];
      }

      return [];
    } catch (error) {
      console.warn('[IPOService] 获取今日上市行情失败:', error);
      return [];
    }
  }

  /**
   * 从后端API获取数据
   */
  private async fetchFromBackend(): Promise<IRawIPOData[]> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60秒超时（LLM评分需要较长时间）

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
        // 将API数据转换为IRawIPOData格式
        return this.transformAPIData(result.data);
      }

      return [];
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn('[IPOService] API请求超时');
      }
      throw error;
    }
  }

  /**
   * 转换API数据为IRawIPOData格式
   */
  private transformAPIData(apiData: any[]): IRawIPOData[] {
    console.log('[IPOService] transformAPIData 输入:', apiData.length, '条');
    console.log('[IPOService] transformAPIData 示例:', apiData.slice(0, 2).map((item: any) => ({ code: item.stockCode, score: item.score, grade: item.grade, reason: item.llmScoringReason?.substring(0, 30) })));
    return apiData.map(item => ({
      stockCode: item.stockCode || '',
      stockName: item.stockName || '',
      listingDate: item.listingDate || '',
      issuePrice: item.issuePrice?.toString() || '0',
      subscriptionStartDate: item.subscriptionStartDate || '',
      subscriptionEndDate: item.subscriptionEndDate || '',
      industry: item.industry || '',
      marketCap: item.marketCap || '',
      companyValue: item.companyValue || '',
      totalLots: item.totalLots || 0,
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
      status: item.status, // 保留后端返回的状态
      daysToListing: item.daysToListing, // 保留距上市天数
      marginMultiple: item.marginMultiple, // 孖展倍数
      publicSharesRatio: item.publicSharesRatio, // 公开发售比例
      // 新增评分维度字段
      hasAShare: item.hasAShare,
      aShareCode: item.aShareCode,
      aSharePrice: item.aSharePrice,
      ahDiscount: item.ahDiscount,
      businessModel: item.businessModel,
      moatLevel: item.moatLevel,
      valuationLevel: item.valuationLevel,
      pbRatio: item.pbRatio,
      peerPeAvg: item.peerPeAvg,
      peerPbAvg: item.peerPbAvg,
      businessModelReason: item.businessModelReason,
      moatReason: item.moatReason,
      valuationReason: item.valuationReason,
      lastRoundValuation: item.lastRoundValuation,
      is18C: item.is18C,
      score: item.score,
      grade: item.grade,
      strategy: item.strategy,
      llmScoringReason: item.llmScoringReason
    }));
  }

  /**
   * 模拟数据（用于演示和开发）
   * 根据当前日期动态过滤已截止的股票
   */
  private getMockData(): IRawIPOData[] {
    // 模拟数据会根据当前日期动态生成
    const mockData: IRawIPOData[] = [
      // 第一批次: 3月20日上市 - 已截止
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
        profitGrowth: 0.42
      },

      // 第二批次: 3月23日上市 - 已截止（3月18日早上9点）
      {
        stockCode: '03355',
        stockName: '飞速创新',
        listingDate: '2026-03-23',
        issuePrice: '41.60',
        subscriptionStartDate: '2026-03-13',
        subscriptionEndDate: '2026-03-18T09:00:00',
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
        profitGrowth: 0.58
      },
      // 国民技术 - 今天截止
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
        profitGrowth: 0
      },

      // 第三批次: 3月24日上市 - 明天截止
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
        profitGrowth: 0
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
        profitGrowth: 0
      }
    ];

    return mockData;
  }

  /**
   * 计算新股评分（委托给评分服务）
   */
  calculateIPOScore(ipoData: IRawIPOData): number {
    return ipoScoringService.calculateScore(ipoData);
  }

  /**
   * 根据评分获取等级（委托给评分服务）
   */
  getGrade(score: number): string {
    return ipoScoringService.getGrade(score);
  }

  /**
   * 生成打新策略建议（委托给评分服务）
   */
  generateStrategy(_score: number, grade: string): IPOStrategy {
    return ipoScoringService.generateStrategy(_score, grade);
  }

  /**
   * 按上市日期分组新股
   */
  groupIPOsByListingDate(ipoStocks: IPOStock[]): Map<string, IPOStock[]> {
    const groups = new Map<string, IPOStock[]>();
    
    ipoStocks.forEach(ipo => {
      const listingDate = ipo.listingDate;
      if (!groups.has(listingDate)) {
        groups.set(listingDate, []);
      }
      groups.get(listingDate)!.push(ipo);
    });
    
    // 每个分组内按评分排序
    groups.forEach(group => {
      group.sort((a, b) => b.score - a.score);
    });
    
    return groups;
  }

  /**
   * 按申购截止日期分组新股
   */
  groupIPOsBySubscriptionEndDate(ipoStocks: IPOStock[]): Map<string, IPOStock[]> {
    const groups = new Map<string, IPOStock[]>();
    
    ipoStocks.forEach(ipo => {
      // 使用申购截止日期作为分组依据
      const subscriptionEndDate = ipo.subscriptionEndDate || '未知';
      if (!groups.has(subscriptionEndDate)) {
        groups.set(subscriptionEndDate, []);
      }
      groups.get(subscriptionEndDate)!.push(ipo);
    });
    
    // 每个分组内按评分排序
    groups.forEach(group => {
      group.sort((a, b) => b.score - a.score);
    });
    
    return groups;
  }

  /**
   * 计算融资分配策略 - 按申购截止日期批次分配,资金不冲突
   */
  calculateAllocation(totalCapital: number, ipoStocks: IPOStock[]): Allocation[] {
    const allocations: Allocation[] = [];
    
    // 按申购截止日期分组
    const groups = this.groupIPOsBySubscriptionEndDate(ipoStocks);
    
    // 将分组按申购截止日期排序
    const sortedGroups = Array.from(groups.entries()).sort((a, b) => {
      const dateA = a[0] === '未知' ? new Date('9999-12-31') : new Date(a[0]);
      const dateB = b[0] === '未知' ? new Date('9999-12-31') : new Date(b[0]);
      return dateA.getTime() - dateB.getTime();
    });
    
    // 对每个申购批次进行分配
    sortedGroups.forEach(([_subscriptionEndDate, groupIPOs]) => {
      // 筛选评分B+以上的新股（分数>=80）
      const highQualityIPOs = groupIPOs.filter(ipo => ipo.score >= 80);
      
      if (highQualityIPOs.length === 0) {
        return;
      }

      // 为这一批次分配资金
      let remainingCapital = totalCapital;
      
      // 最大申购总额限制: 资金 * 10
      const maxTotalSubscription = totalCapital * 10;
      let remainingSubscriptionLimit = maxTotalSubscription;

      highQualityIPOs.forEach((ipo, index) => {
        let allocationRatio = 0;
        
        if (ipo.grade === 'A+') {
          allocationRatio = 0.50;
        } else if (ipo.grade === 'A') {
          allocationRatio = 0.35;
        } else if (ipo.grade === 'B+') {
          allocationRatio = 0.30;
        } else {
          allocationRatio = 0.25;
        }

        // 如果是最后一个且剩余资金充足,分配剩余所有资金
        if (index === highQualityIPOs.length - 1 && remainingCapital > 0) {
          allocationRatio = remainingCapital / totalCapital;
        }

        // 确保不会分配超过剩余资金
        const capitalAllocation = Math.min(totalCapital * allocationRatio, remainingCapital);
        
        // 如果剩余资金不足以分配,跳过该股票
        if (capitalAllocation <= 0) {
          return;
        }
        
        const issuePrice = parseFloat(ipo.issuePrice);
        const sharesPerLot = ipo.sharesPerLot; // 每手股数
        
        // 融资倍数建议 - 最高10倍
        let financingMultiplier = 1;
        if (ipo.grade === 'A+') {
          financingMultiplier = 10; // 10倍融资(最高)
        } else if (ipo.grade === 'A') {
          financingMultiplier = 7; // 7倍融资
        } else if (ipo.grade === 'B+') {
          financingMultiplier = 4; // 4倍融资
        } else {
          financingMultiplier = 1; // 现金申购
        }

        // 计算融资后的总申购额
        let totalSubscription = capitalAllocation * (1 + financingMultiplier);
        
        // 检查是否超过最大申购总额限制
        if (totalSubscription > remainingSubscriptionLimit) {
          totalSubscription = Math.min(totalSubscription, remainingSubscriptionLimit);
          // 重新计算实际融资倍数
          const actualMultiplier = (totalSubscription / capitalAllocation) - 1;
          financingMultiplier = Math.max(0, Math.floor(actualMultiplier));
        }
        
        // 按总申购额计算可申购的手数
        const lots = Math.floor(totalSubscription / (issuePrice * sharesPerLot));
        const shares = lots * sharesPerLot;
        const actualTotalSubscription = shares * issuePrice;
        
        // 实际使用的自有资金
        const actualAllocation = actualTotalSubscription / (1 + financingMultiplier);
        const financingAmount = actualTotalSubscription - actualAllocation;
        
        // 更新剩余资金和申购额度
        remainingCapital -= actualAllocation;
        remainingSubscriptionLimit -= actualTotalSubscription;

        allocations.push({
          ipoStockId: ipo.id!,
          stockCode: ipo.stockCode,
          stockName: ipo.stockName,
          listingDate: ipo.listingDate,
          subscriptionEndDate: ipo.subscriptionEndDate, // 添加申购截止日期
          capitalAllocation: actualAllocation,
          financingAmount: financingAmount,
          financingMultiplier: financingMultiplier,
          totalSubscription: actualTotalSubscription,
          allocationRatio: allocationRatio,
          shares: shares,
          createdAt: new Date().toISOString()
        });
      });
    });

    return allocations;
  }

  /**
   * 保存新股信息到数据库 - 先清空再保存,避免重复
   */
  async saveIPOStocks(ipoList: IRawIPOData[]): Promise<boolean> {
    try {
      // 先清空所有旧数据
      await db.ipoStocks.clear();
      
      // 获取当前日期
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      
      // 再保存新数据
      for (const ipo of ipoList) {
        const score = typeof ipo.score === 'number' ? ipo.score : this.calculateIPOScore(ipo);
        const grade = ipo.grade || this.getGrade(score);
        const strategy = ipo.strategy || this.generateStrategy(score, grade);

        await db.ipoStocks.add({
          ...ipo,
          score,
          grade,
          strategy,
          dataDate: today, // 添加数据日期
          createdAt: new Date().toISOString()
        });
      }
      return true;
    } catch (error) {
      console.error('保存新股信息失败:', error);
      return false;
    }
  }

  /**
   * 更新资金总量
   */
  async updateCapital(amount: number): Promise<boolean> {
    try {
      const count = await db.capital.count();
      if (count === 0) {
        await db.capital.add({
          amount,
          updatedAt: new Date().toISOString()
        });
      } else {
        const existing = await db.capital.toCollection().first();
        if (existing && existing.id) {
          await db.capital.update(existing.id, {
            amount,
            updatedAt: new Date().toISOString()
          });
        }
      }
      return true;
    } catch (error) {
      console.error('更新资金失败:', error);
      return false;
    }
  }

  /**
   * 获取资金总量
   */
  async getCapital(): Promise<number> {
    try {
      const capital = await db.capital.toCollection().first();
      return capital ? capital.amount : 0;
    } catch (error) {
      console.error('获取资金失败:', error);
      return 0;
    }
  }

  /**
   * 获取所有新股信息
   */
  async getAllIPOStocks(): Promise<IPOStock[]> {
    try {
      const ipoStocks = await db.ipoStocks.toArray();
      return ipoStocks;
    } catch (error) {
      console.error('获取新股信息失败:', error);
      return [];
    }
  }

  /**
   * 刷新新股数据
   */
  async refreshIPOData(): Promise<boolean> {
    try {
      console.log('[IPOService] 开始刷新数据...');
      const newIPOStocks = await this.fetchNewIPOStocks();
      console.log('[IPOService] 获取到新数据:', newIPOStocks.length, '条');
      console.log('[IPOService] 数据示例:', newIPOStocks.slice(0, 2).map(s => ({ code: s.stockCode, name: s.stockName, score: s.score, grade: s.grade, reason: s.llmScoringReason?.substring(0, 30) })));
      // saveIPOStocks 内部会先清空数据库，不需要重复调用
      await this.saveIPOStocks(newIPOStocks);
      console.log('[IPOService] 数据保存完成');
      return true;
    } catch (error) {
      console.error('刷新新股数据失败:', error);
      return false;
    }
  }
}

export default new IPOService();
