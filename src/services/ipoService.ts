import db from '../db/database';
import type { IPOStock, Allocation, IRawIPOData, IPOStrategy } from '../types';

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
   * 从后端API获取数据
   */
  private async fetchFromBackend(): Promise<IRawIPOData[]> {
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
        // 将API数据转换为IRawIPOData格式
        return this.transformAPIData(result.data);
      }

      return [];
    } catch (error) {
      if (error.name === 'AbortError') {
        console.warn('[IPOService] API请求超时');
      }
      throw error;
    }
  }

  /**
   * 转换API数据为IRawIPOData格式
   */
  private transformAPIData(apiData: any[]): IRawIPOData[] {
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
      profitGrowth: item.profitGrowth || 0
    }));
  }

  /**
   * 模拟数据（用于演示和开发）
   * 根据当前日期动态过滤已截止的股票
   */
  private getMockData(): IRawIPOData[] {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

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
   * 计算新股评分
   */
  calculateIPOScore(ipoData: IRawIPOData): number {
    let score = 0;

    // 行业热度评分
    const hotIndustries = ['人工智能', '新能源', '生物医药', '半导体', '集成电路', '智能物流机器人', '汽车电子'];
    const techIndustries = ['印制电路板', '网络解决方案', '智能物流机器人'];
    
    if (hotIndustries.includes(ipoData.industry)) {
      score += 25;
    } else if (techIndustries.includes(ipoData.industry)) {
      score += 22;
    } else if (ipoData.industry.includes('科技') || ipoData.industry.includes('互联网')) {
      score += 20;
    } else {
      score += 10;
    }

    // 保荐人评分
    const topUnderwriters = ['中金公司', '中信证券', '摩根士丹利', '高盛', '花旗银行', '瑞银', '国泰君安'];
    if (topUnderwriters.includes(ipoData.underwriter)) {
      score += 20;
    } else {
      score += 10;
    }

    // 基石投资者评分
    if (ipoData.cornerstone) {
      score += 15;
    }
    if (ipoData.starInvestors && ipoData.starInvestors.length > 0) {
      score += 5;
    }

    // 市值规模评分
    const marketCap = parseFloat(ipoData.marketCap.replace('亿', ''));
    if (marketCap > 200) {
      score += 15;
    } else if (marketCap > 100) {
      score += 12;
    } else if (marketCap > 50) {
      score += 10;
    } else if (marketCap > 20) {
      score += 8;
    } else {
      score += 5;
    }

    // 估值水平评分
    if (ipoData.peRatio === 0) {
      // 亏损企业,谨慎评分
      score += 5;
    } else if (ipoData.peRatio < 20) {
      score += 20;
    } else if (ipoData.peRatio < 30) {
      score += 15;
    } else if (ipoData.peRatio < 40) {
      score += 10;
    } else {
      score += 5;
    }

    return score;
  }

  /**
   * 根据评分获取等级
   */
  getGrade(score: number): string {
    if (score >= 85) return 'A+';
    if (score >= 75) return 'A';
    if (score >= 65) return 'B+';
    if (score >= 55) return 'B';
    if (score >= 45) return 'C+';
    if (score >= 35) return 'C';
    return 'D';
  }

  /**
   * 生成打新策略建议
   */
  generateStrategy(_score: number, grade: string): IPOStrategy {
    if (grade.startsWith('A')) {
      return {
        recommendation: '强烈推荐',
        action: '建议积极参与,可融资申购',
        riskLevel: '低',
        expectedReturn: '30-50%'
      };
    } else if (grade.startsWith('B')) {
      return {
        recommendation: '推荐',
        action: '建议现金申购',
        riskLevel: '中',
        expectedReturn: '15-30%'
      };
    } else if (grade.startsWith('C')) {
      return {
        recommendation: '谨慎',
        action: '少量参与或不参与',
        riskLevel: '高',
        expectedReturn: '5-15%'
      };
    } else {
      return {
        recommendation: '不推荐',
        action: '不建议参与',
        riskLevel: '极高',
        expectedReturn: '不确定'
      };
    }
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
   * 计算融资分配策略 - 按上市批次分配,资金不冲突
   */
  calculateAllocation(totalCapital: number, ipoStocks: IPOStock[]): Allocation[] {
    const allocations: Allocation[] = [];
    
    // 按上市日期分组
    const groups = this.groupIPOsByListingDate(ipoStocks);
    
    // 将分组按上市日期排序
    const sortedGroups = Array.from(groups.entries()).sort((a, b) => 
      new Date(a[0]).getTime() - new Date(b[0]).getTime()
    );
    
    // 对每个上市批次进行分配
    sortedGroups.forEach(([_listingDate, groupIPOs]) => {
      // 筛选评分B+以上的新股
      const highQualityIPOs = groupIPOs.filter(ipo => ipo.score >= 55);
      
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

        // 如果是最后一个,分配剩余所有资金
        if (index === highQualityIPOs.length - 1) {
          allocationRatio = remainingCapital / totalCapital;
        }

        const capitalAllocation = totalCapital * allocationRatio;
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
          financingMultiplier = Math.floor(actualMultiplier);
        }
        
        // 按总申购额计算可申购的手数
        const lots = Math.floor(totalSubscription / (issuePrice * sharesPerLot));
        const shares = lots * sharesPerLot;
        const actualTotalSubscription = shares * issuePrice;
        
        // 实际使用的自有资金
        const actualAllocation = actualTotalSubscription / (1 + financingMultiplier);
        const financingAmount = actualTotalSubscription - actualAllocation;
        
        // 更新剩余申购额度
        remainingSubscriptionLimit -= actualTotalSubscription;

        allocations.push({
          ipoStockId: ipo.id!,
          stockCode: ipo.stockCode,
          stockName: ipo.stockName,
          listingDate: ipo.listingDate,
          capitalAllocation: actualAllocation,
          financingAmount: financingAmount,
          financingMultiplier: financingMultiplier,
          totalSubscription: actualTotalSubscription,
          allocationRatio: allocationRatio,
          shares: shares,
          createdAt: new Date().toISOString()
        });

        remainingCapital -= actualAllocation;
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
        const score = this.calculateIPOScore(ipo);
        const grade = this.getGrade(score);
        const strategy = this.generateStrategy(score, grade);

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
      const newIPOStocks = await this.fetchNewIPOStocks();
      await db.ipoStocks.clear();
      await this.saveIPOStocks(newIPOStocks);
      return true;
    } catch (error) {
      console.error('刷新新股数据失败:', error);
      return false;
    }
  }
}

export default new IPOService();
