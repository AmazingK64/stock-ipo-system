import type { IPOStock, Allocation, SimilarCompany } from '../types';

// 保荐人历史数据
const UNDERWRITER_HISTORY: Record<string, { successRate: number; avgReturn: number; totalCount: number }> = {
  '中信证券': { successRate: 0.85, avgReturn: 0.35, totalCount: 120 },
  '中金公司': { successRate: 0.88, avgReturn: 0.38, totalCount: 150 },
  '摩根士丹利': { successRate: 0.82, avgReturn: 0.32, totalCount: 90 },
  '高盛': { successRate: 0.80, avgReturn: 0.30, totalCount: 85 },
  '花旗银行': { successRate: 0.78, avgReturn: 0.28, totalCount: 70 },
  '瑞银': { successRate: 0.83, avgReturn: 0.33, totalCount: 95 },
  '国泰君安': { successRate: 0.75, avgReturn: 0.25, totalCount: 100 },
  '海通国际': { successRate: 0.70, avgReturn: 0.22, totalCount: 80 },
  '中信建投': { successRate: 0.72, avgReturn: 0.24, totalCount: 65 },
  '华泰国际': { successRate: 0.68, avgReturn: 0.20, totalCount: 55 },
};

// 热门赛道配置(高景气度行业)
const HOT_INDUSTRIES: Record<string, { score: number; growth: number; description: string }> = {
  '人工智能': { score: 15, growth: 0.8, description: 'AI赛道,高成长性' },
  '新能源': { score: 14, growth: 0.7, description: '新能源赛道,政策支持' },
  '半导体': { score: 14, growth: 0.65, description: '芯片半导体,国产替代' },
  '生物医药': { score: 13, growth: 0.6, description: '创新药,高壁垒' },
  '新能源车': { score: 13, growth: 0.65, description: '电动车产业链' },
  '云计算': { score: 12, growth: 0.55, description: '云计算基础设施' },
  '消费电子': { score: 11, growth: 0.45, description: '消费电子,周期性' },
  '医疗器械': { score: 12, growth: 0.5, description: '医疗器械,刚需' },
  'SaaS': { score: 12, growth: 0.6, description: '企业服务,高粘性' },
  '电动汽车': { score: 13, growth: 0.65, description: '新能源汽车' },
  '光伏': { score: 12, growth: 0.55, description: '光伏产业链' },
  '储能': { score: 12, growth: 0.6, description: '储能技术' },
};

// 传统行业配置
const TRADITIONAL_INDUSTRIES: Record<string, { score: number; growth: number }> = {
  '银行': { score: 6, growth: 0.05 },
  '保险': { score: 6, growth: 0.08 },
  '房地产': { score: 5, growth: -0.1 },
  '建筑': { score: 5, growth: 0.05 },
  '零售': { score: 7, growth: 0.1 },
  '餐饮': { score: 7, growth: 0.12 },
  '教育': { score: 6, growth: 0.08 },
  '传媒': { score: 7, growth: 0.1 },
};

// 同行业历史上市表现数据
const INDUSTRY_HISTORY: Record<string, {
  avgFirstDayReturn: number;
  avgFirstWeekReturn: number;
  avgFirstMonthReturn: number;
  successRate: number; // 首日上涨概率
  samples: SimilarCompany[];
}> = {
  '印制电路板': {
    avgFirstDayReturn: 0.28,
    avgFirstWeekReturn: 0.15,
    avgFirstMonthReturn: 0.08,
    successRate: 0.75,
    samples: [
      { stockCode: '02015', stockName: '深南电路', listingDate: '2019-12-03', industry: '印制电路板', firstDayReturn: 0.35, firstWeekReturn: 0.22, firstMonthReturn: 0.15, currentReturn: 0.45 },
      { stockCode: '02316', stockName: '沪电股份', listingDate: '2010-03-16', industry: '印制电路板', firstDayReturn: 0.18, firstWeekReturn: 0.12, firstMonthReturn: 0.05, currentReturn: 0.32 }
    ]
  },
  '集成电路 半导体': {
    avgFirstDayReturn: 0.45,
    avgFirstWeekReturn: 0.25,
    avgFirstMonthReturn: 0.12,
    successRate: 0.82,
    samples: [
      { stockCode: '01347', stockName: '华虹半导体', listingDate: '2014-10-15', industry: '集成电路', firstDayReturn: 0.52, firstWeekReturn: 0.35, firstMonthReturn: 0.18, currentReturn: 0.65 },
      { stockCode: '00981', stockName: '中芯国际', listingDate: '2004-03-18', industry: '集成电路', firstDayReturn: 0.38, firstWeekReturn: 0.15, firstMonthReturn: 0.08, currentReturn: 0.28 }
    ]
  },
  '汽车电子 新能源车': {
    avgFirstDayReturn: 0.32,
    avgFirstWeekReturn: 0.18,
    avgFirstMonthReturn: 0.10,
    successRate: 0.78,
    samples: [
      { stockCode: '02333', stockName: '长城汽车', listingDate: '2011-09-28', industry: '汽车', firstDayReturn: 0.28, firstWeekReturn: 0.15, firstMonthReturn: 0.08, currentReturn: 0.38 },
      { stockCode: '01211', stockName: '比亚迪股份', listingDate: '2002-07-31', industry: '新能源车', firstDayReturn: 0.42, firstWeekReturn: 0.25, firstMonthReturn: 0.15, currentReturn: 0.85 }
    ]
  }
};

// 策略方案接口
export interface StrategyPlan {
  rank: string; // '最优方案' | '次优方案' | '第三优方案'
  combinations: IPOStock[]; // 股票组合
  totalCapital: number; // 总资金使用
  totalFinancing: number; // 总融资额
  totalSubscription: number; // 总申购额
  expectedReturn: number; // 预期收益
  costs: {
    opportunityCost: number; // 机会成本(利息损失)
    financingFee: number; // 融资费用
    tradingFee: number; // 交易费用
    totalCost: number; // 总成本
  };
  winProbability: {
    overallWinRate: number; // 总体中签概率
    details: {
      stockCode: string;
      stockName: string;
      subscriptionAmount: number;
      subscriptionLots: number; // 申购手数
      estimatedWinRate: number; // 估算中签率
      expectedLots: number; // 预期中签手数
      expectedShares: number; // 预期中签股数
      oneHandWinRate: number; // 一手中签率
      oneHandPartyRate: number; // 一手党中签率
      groupType: '甲组' | '乙组'; // 甲组/乙组
      financingMultiplier: number; // 融资倍数
      hasGreenshoe: boolean; // 是否有绿鞋
      industryScore: number; // 行业评分
      isLeader: boolean; // 是否龙头
    }[];
  };
  netReturn: number; // 净收益
  returnRate: number; // 收益率
  riskLevel: string; // 风险等级
  allocations: Allocation[]; // 分配详情
}

class StrategyService {
  /**
   * 估算认购倍数(基于历史数据和市场热度)
   */
  estimateSubscriptionMultiple(ipo: IPOStock): number {
    // 基础认购倍数
    let baseMultiple = 5;
    
    // 根据评分调整
    if (ipo.grade === 'A+') {
      baseMultiple = 150; // 超热门
    } else if (ipo.grade === 'A') {
      baseMultiple = 80; // 热门
    } else if (ipo.grade === 'B+') {
      baseMultiple = 30; // 较热门
    } else {
      baseMultiple = 10; // 一般
    }
    
    // 根据保荐人历史调整
    const underwriterHistory = UNDERWRITER_HISTORY[ipo.underwriter];
    if (underwriterHistory) {
      // 保荐人成功率高,认购倍数也会相应提高
      baseMultiple *= (1 + underwriterHistory.successRate * 0.3);
    }
    
    // 根据基石投资者调整
    if (ipo.cornerstone) {
      baseMultiple *= 1.3;
    }
    
    // 根据明星投资者调整
    if (ipo.starInvestors && ipo.starInvestors.length > 0) {
      baseMultiple *= (1 + ipo.starInvestors.length * 0.05);
    }
    
    return Math.round(baseMultiple);
  }

  /**
   * 判断申购属于甲组还是乙组
   */
  getGroupType(subscriptionAmount: number): '甲组' | '乙组' {
    return subscriptionAmount <= 5000000 ? '甲组' : '乙组';
  }

  /**
   * 计算回拨比例(基于认购倍数)
   */
  getClawbackRatio(subscriptionMultiple: number): number {
    if (subscriptionMultiple < 15) {
      return 0.10; // 10%
    } else if (subscriptionMultiple < 50) {
      return 0.30; // 30%
    } else if (subscriptionMultiple < 100) {
      return 0.40; // 40%
    } else {
      return 0.50; // 50%
    }
  }

  /**
   * 估算中签率(参考富富证券的方法,加入孖展倍数影响、一手党、红鞋机制)
   */
  estimateWinRate(
    ipo: IPOStock,
    subscriptionAmount: number,
    financingMultiplier: number = 1
  ): { 
    winRate: number; 
    expectedShares: number; 
    expectedLots: number; 
    groupType: '甲组' | '乙组';
    oneHandWinRate: number;
    oneHandPartyRate: number; // 一手党中签率
    greenshoeBonus: number; // 绿鞋加成
  } {
    // 估算认购倍数
    const baseSubscriptionMultiple = this.estimateSubscriptionMultiple(ipo);
    
    // 孖展倍数越高,竞争越激烈,调整认购倍数
    const financingImpact = 1 + (financingMultiplier - 1) * 0.15;
    const subscriptionMultiple = Math.round(baseSubscriptionMultiple * financingImpact);
    
    // 判断甲组乙组
    const groupType = this.getGroupType(subscriptionAmount);
    
    // 计算回拨比例
    const clawbackRatio = this.getClawbackRatio(subscriptionMultiple);
    
    // 估算公开发售总额
    const marketCapValue = parseFloat(ipo.marketCap.replace('亿', '')) * 100000000;
    const publicOfferAmount = marketCapValue * 0.1 * clawbackRatio;
    
    // 估算总认购金额
    const totalSubscriptionAmount = publicOfferAmount * subscriptionMultiple;
    
    const issuePrice = parseFloat(ipo.issuePrice);
    const oneHandValue = issuePrice * ipo.sharesPerLot;
    
    // 绿鞋机制加成(有绿鞋的股票,上市后稳定性好,中签价值更高)
    const greenshoeBonus = ipo.hasGreenshoe ? 1.05 : 1.0;
    
    let winRate = 0;
    let expectedLots = 0;
    let oneHandWinRate = 0;
    let oneHandPartyRate = 0; // 一手党中签率(申购1手的成功率)
    
    if (groupType === '甲组') {
      // === 甲组逻辑 ===
      
      // 估算甲组总认购人数
      const avgSubscriptionPerPerson = 100000;
      const estimatedApplicants = totalSubscriptionAmount / avgSubscriptionPerPerson;
      
      // 甲组分配总额(通常是公开发售的一半,港股红鞋机制倾向散户)
      // 红鞋机制: 甲组至少分配公开发售的50%,热门股甚至更多
      let groupAAmount = publicOfferAmount * 0.5;
      
      // 如果认购倍数高,回拨后甲组比例可能更高
      if (subscriptionMultiple > 100) {
        groupAAmount = publicOfferAmount * 0.6; // 超热门股甲组倾斜
      }
      
      // 可以分配的手数
      const totalLots = Math.floor(groupAAmount / oneHandValue);
      
      // === 一手党中签率计算 ===
      // 一手党: 只申购1手的散户
      // 港股机制: 甲组优先保证一手党至少中一定比例
      // 公式: 一手党中签率 = 总手数 / 申请人数,但有保底机制
      
      // 估算一手党人数(假设60%的人只打1手)
      const oneHandApplicants = estimatedApplicants * 0.6;
      
      // 一手党实际中签率(港交所的红鞋机制保证)
      // 计算公式: 一手党保底中签率 = min(100%, 总手数 / 一手党申请人数)
      oneHandPartyRate = Math.min(1, totalLots * 0.7 / oneHandApplicants);
      
      // 热门股一手党中签率通常很低
      if (subscriptionMultiple > 50) {
        oneHandPartyRate = Math.min(oneHandPartyRate, 0.15); // 超热门股,一手党中签率不超过15%
      }
      
      // === 一手中签率(申购1手的中签概率) ===
      oneHandWinRate = oneHandPartyRate;
      
      // === 根据申购手数计算综合中签率 ===
      const subscriptionHands = Math.floor(subscriptionAmount / oneHandValue);
      
      // 边际递减效应: 申购越多,中签率提升越慢
      // 使用对数函数模拟
      const multiplierPenalty = 1 / (1 + Math.log(financingMultiplier) * 0.3);
      
      // 综合中签率 = 一手中签率 × log(申购手数 + 1) / log(2) × 孖展惩罚
      winRate = oneHandWinRate * Math.log(subscriptionHands + 1) / Math.log(2) * multiplierPenalty;
      winRate = Math.min(winRate, 0.95);
      
      // === 预期中签手数计算 ===
      if (oneHandWinRate >= 0.1) {
        // 一手中签率较高(10%+),使用保底+概率模型
        const atLeastOneHandRate = 1 - Math.pow(1 - oneHandWinRate, subscriptionHands);
        const expectedLotsFromRate = subscriptionHands * winRate;
        expectedLots = Math.floor(expectedLotsFromRate * 0.7 + (atLeastOneHandRate > 0.5 ? 1 : 0));
      } else if (oneHandWinRate >= 0.01) {
        // 一手中签率中等(1%-10%)
        // 可能为0,但也可能中1-2手
        const atLeastOneHandRate = 1 - Math.pow(1 - oneHandWinRate, subscriptionHands);
        expectedLots = atLeastOneHandRate > 0.3 ? 1 : 0;
      } else {
        // 一手中签率很低(<1%),超热门股
        // 打再多手也可能不中
        const atLeastOneHandRate = 1 - Math.pow(1 - oneHandWinRate, subscriptionHands);
        if (subscriptionHands >= 100 && atLeastOneHandRate > 0.2) {
          expectedLots = 1; // 打100手以上,有20%概率中1手
        } else if (subscriptionHands >= 500 && atLeastOneHandRate > 0.1) {
          expectedLots = 1;
        } else {
          expectedLots = 0; // 可能完全不中
        }
      }
      
    } else {
      // === 乙组逻辑 ===
      // 乙组: 按比例分配,没有一手党保护机制
      
      const groupBAmount = publicOfferAmount * 0.5;
      const avgSubscriptionGroupB = 10000000;
      const estimatedGroupBApplicants = totalSubscriptionAmount * 0.3 / avgSubscriptionGroupB;
      const totalGroupBSubscription = estimatedGroupBApplicants * avgSubscriptionGroupB;
      
      // 竞争系数
      const competitionFactor = 1 / (1 + Math.log(financingMultiplier) * 0.2);
      winRate = Math.min(groupBAmount / totalGroupBSubscription * competitionFactor, 0.8);
      
      // 乙组一手中签率(参考值)
      oneHandWinRate = winRate;
      oneHandPartyRate = winRate; // 乙组没有一手党优势
      
      // 预期中签手数
      const subscriptionHands = Math.floor(subscriptionAmount / oneHandValue);
      expectedLots = Math.floor(subscriptionHands * winRate);
    }
    
    // 计算预期中签股数(考虑绿鞋加成)
    const expectedShares = Math.floor(expectedLots * ipo.sharesPerLot * greenshoeBonus);
    
    return {
      winRate,
      expectedShares,
      expectedLots,
      groupType,
      oneHandWinRate,
      oneHandPartyRate,
      greenshoeBonus
    };
  }

  /**
   * 计算资金锁定的机会成本
   */
  calculateOpportunityCost(capital: number, lockDays: number): number {
    // 假设年化收益率4%(货币基金或理财产品)
    const annualRate = 0.04;
    const dailyRate = annualRate / 365;
    return capital * dailyRate * lockDays;
  }

  /**
   * 计算融资费用
   */
  calculateFinancingFee(financingAmount: number): number {
    // 固定费用99港币/笔,不论融资金额
    return financingAmount > 0 ? 99 : 0;
  }

  /**
   * 计算交易费用(卖出时的费用)
   */
  calculateTradingFee(sellAmount: number): number {
    // 佣金: 0.03% (最低3港币)
    // 印花税: 0.1% (卖方支付)
    // 交易费: 0.005%
    // 交易征费: 0.0027%
    // 联交所交易费: 0.00005%
    const commission = Math.max(sellAmount * 0.0003, 3);
    const stampDuty = sellAmount * 0.001;
    const tradingFee = sellAmount * 0.00005;
    const tradingLevy = sellAmount * 0.000027;
    const exchangeFee = sellAmount * 0.0000005;
    
    return commission + stampDuty + tradingFee + tradingLevy + exchangeFee;
  }

  /**
   * 获取行业赛道评分
   */
  getIndustryScore(industry: string): { score: number; growth: number; description: string } {
    // 检查热门赛道
    for (const [key, value] of Object.entries(HOT_INDUSTRIES)) {
      if (industry.includes(key)) {
        return { score: value.score, growth: value.growth, description: value.description };
      }
    }
    
    // 检查传统行业
    for (const [key, value] of Object.entries(TRADITIONAL_INDUSTRIES)) {
      if (industry.includes(key)) {
        return { score: value.score, growth: value.growth, description: '传统行业' };
      }
    }
    
    // 默认中等评分
    return { score: 8, growth: 0.2, description: '一般行业' };
  }

  /**
   * 计算盈利能力评分
   */
  getProfitabilityScore(ipo: IPOStock): number {
    let score = 0;
    
    // 盈利状况
    if (ipo.profitability === 'profitable') {
      score += 10;
      
      // 净利润规模
      if (ipo.netProfit >= 10) {
        score += 5; // 净利润超10亿
      } else if (ipo.netProfit >= 5) {
        score += 3;
      } else if (ipo.netProfit >= 1) {
        score += 1;
      }
      
      // 利润增长率
      if (ipo.profitGrowth > 0.5) {
        score += 5; // 利润增长超50%
      } else if (ipo.profitGrowth > 0.3) {
        score += 3;
      } else if (ipo.profitGrowth > 0.1) {
        score += 1;
      }
      
      // PE合理性(对比行业平均)
      if (ipo.peRatio > 0 && ipo.peRatio < 20) {
        score += 3; // PE合理
      } else if (ipo.peRatio >= 20 && ipo.peRatio < 40) {
        score += 1;
      }
      
    } else if (ipo.profitability === 'breakeven') {
      score += 5; // 盈亏平衡
    } else {
      // 亏损,但看营收增长
      if (ipo.revenueGrowth > 1) {
        score += 5; // 营收翻倍,高增长亏损股也有价值
      } else if (ipo.revenueGrowth > 0.5) {
        score += 3;
      }
    }
    
    return Math.min(score, 20);
  }

  /**
   * 计算龙头地位加分
   */
  getLeaderScore(ipo: IPOStock): number {
    if (!ipo.isIndustryLeader) return 0;
    
    // 行业龙头加分
    const industryInfo = this.getIndustryScore(ipo.industry);
    
    // 龙头在热门赛道加分更多
    if (industryInfo.score >= 12) {
      return 8; // 热门赛道龙头
    } else if (industryInfo.score >= 10) {
      return 5;
    } else {
      return 3; // 传统行业龙头
    }
  }

  /**
   * 绿鞋机制影响
   */
  getGreenshoeImpact(hasGreenshoe: boolean): { stabilityScore: number; description: string } {
    if (hasGreenshoe) {
      return {
        stabilityScore: 5,
        description: '有绿鞋,上市后30天内价格稳定性较好,破发风险低'
      };
    }
    return {
      stabilityScore: 0,
      description: '无绿鞋机制,需关注上市后价格波动风险'
    };
  }

  /**
   * 获取保荐人评分
   */
  getUnderwriterScore(underwriter: string): number {
    const history = UNDERWRITER_HISTORY[underwriter];
    if (!history) {
      return 10; // 默认分数
    }
    
    // 成功率权重40%,平均收益权重40%,保荐数量权重20%
    const successScore = history.successRate * 50;
    const returnScore = history.avgReturn * 50;
    const countScore = Math.min(history.totalCount / 10, 10);
    
    return successScore * 0.4 + returnScore * 0.4 + countScore * 0.2;
  }

  /**
   * 重新计算IPO评分(加入行业赛道、盈利能力、龙头地位、绿鞋机制)
   */
  recalculateScoreWithUnderwriter(ipo: IPOStock): number {
    const baseScore = ipo.score;
    const underwriterScore = this.getUnderwriterScore(ipo.underwriter);
    
    // 行业赛道评分
    const industryScore = this.getIndustryScore(ipo.industry);
    
    // 盈利能力评分
    const profitabilityScore = this.getProfitabilityScore(ipo);
    
    // 龙头地位评分
    const leaderScore = this.getLeaderScore(ipo);
    
    // 绿鞋机制
    const greenshoeImpact = this.getGreenshoeImpact(ipo.hasGreenshoe);
    
    // 综合评分(权重调整)
    const totalScore = 
      baseScore * 0.3 +          // 基础分 30%
      underwriterScore * 0.2 +    // 保荐人 20%
      industryScore.score * 0.2 + // 行业赛道 20%
      profitabilityScore * 0.2 +  // 盈利能力 20%
      leaderScore * 0.05 +        // 龙头地位 5%
      greenshoeImpact.stabilityScore * 0.05; // 绿鞋机制 5%
    
    return Math.min(Math.round(totalScore), 100);
  }

  /**
   * 过滤A-等级以上的新股(排除已截止申购的)
   */
  filterAGradeOrAbove(ipoStocks: IPOStock[]): IPOStock[] {
    const now = new Date();

    return ipoStocks.filter(ipo => {
      const adjustedScore = this.recalculateScoreWithUnderwriter(ipo);
      // A-及以上等级(评分>=85)
      const isAGrade = adjustedScore >= 85 || ipo.grade === 'A+' || ipo.grade === 'A' || ipo.grade === 'A-';

      // 检查申购是否已截止（支持精确到小时的时间判断）
      const subscriptionEnd = new Date(ipo.subscriptionEndDate);
      const isStillSubscribing = subscriptionEnd > now;

      return isAGrade && isStillSubscribing;
    });
  }

  /**
   * 计算A+H股折价/溢价
   */
  calculateAHPremium(ipo: IPOStock): {
    premium: number;
    description: string;
    impact: 'positive' | 'negative' | 'neutral';
  } {
    if (!ipo.hasAShare || !ipo.aSharePrice || !ipo.issuePrice) {
      return {
        premium: 0,
        description: '无A股对标',
        impact: 'neutral'
      };
    }
    
    const issuePriceNum = parseFloat(ipo.issuePrice);
    // A/H溢价率 = (A股价格 - H股发行价) / H股发行价
    // 正值表示A股更贵,H股折价发行(利好)
    // 负值表示A股更便宜,H股溢价发行(利空)
    const premium = ((ipo.aSharePrice - issuePriceNum) / issuePriceNum) * 100;
    
    if (premium > 20) {
      return {
        premium,
        description: `H股较A股折价${premium.toFixed(1)}%,有估值优势`,
        impact: 'positive'
      };
    } else if (premium > 0) {
      return {
        premium,
        description: `H股较A股折价${premium.toFixed(1)}%,有一定优势`,
        impact: 'positive'
      };
    } else if (premium > -10) {
      return {
        premium,
        description: `H股较A股溢价${Math.abs(premium).toFixed(1)}%,估值合理`,
        impact: 'neutral'
      };
    } else {
      return {
        premium,
        description: `H股较A股溢价${Math.abs(premium).toFixed(1)}%,估值偏高`,
        impact: 'negative'
      };
    }
  }

  /**
   * 获取同行业历史表现
   */
  getIndustryHistory(industry: string): {
    avgFirstDayReturn: number;
    avgFirstWeekReturn: number;
    avgFirstMonthReturn: number;
    successRate: number;
    samples: SimilarCompany[];
  } {
    // 精确匹配
    if (INDUSTRY_HISTORY[industry]) {
      return INDUSTRY_HISTORY[industry];
    }
    
    // 模糊匹配
    for (const [key, value] of Object.entries(INDUSTRY_HISTORY)) {
      if (industry.includes(key) || key.includes(industry)) {
        return value;
      }
    }
    
    // 默认值
    return {
      avgFirstDayReturn: 0.15,
      avgFirstWeekReturn: 0.08,
      avgFirstMonthReturn: 0.05,
      successRate: 0.60,
      samples: []
    };
  }

  /**
   * 生成股票组合
   */
  generateCombinations(ipoStocks: IPOStock[], _capital: number): IPOStock[][] {
    const combinations: IPOStock[][] = [];
    
    // 按上市日期分组
    const groups = this.groupIPOsByListingDate(ipoStocks);
    
    // 对每个上市批次生成组合
    groups.forEach(groupIPOs => {
      if (groupIPOs.length === 0) return;
      
      // 单只股票
      groupIPOs.forEach(ipo => {
        combinations.push([ipo]);
      });
      
      // 两只股票组合
      for (let i = 0; i < groupIPOs.length; i++) {
        for (let j = i + 1; j < groupIPOs.length; j++) {
          combinations.push([groupIPOs[i], groupIPOs[j]]);
        }
      }
      
      // 三只股票组合
      if (groupIPOs.length >= 3) {
        for (let i = 0; i < groupIPOs.length; i++) {
          for (let j = i + 1; j < groupIPOs.length; j++) {
            for (let k = j + 1; k < groupIPOs.length; k++) {
              combinations.push([groupIPOs[i], groupIPOs[j], groupIPOs[k]]);
            }
          }
        }
      }
    });
    
    // 跨批次组合(资金可以循环使用)
    const sortedGroups = Array.from(groups.values()).sort((a, b) => 
      new Date(a[0].listingDate).getTime() - new Date(b[0].listingDate).getTime()
    );
    
    if (sortedGroups.length >= 2) {
      // 第一批 + 第二批
      const firstBatch = sortedGroups[0];
      const secondBatch = sortedGroups[1];
      
      firstBatch.forEach(ipo1 => {
        secondBatch.forEach(ipo2 => {
          combinations.push([ipo1, ipo2]);
        });
      });
    }
    
    return combinations;
  }

  /**
   * 按上市日期分组
   */
  private groupIPOsByListingDate(ipoStocks: IPOStock[]): Map<string, IPOStock[]> {
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
      group.sort((a, b) => {
        const scoreA = this.recalculateScoreWithUnderwriter(a);
        const scoreB = this.recalculateScoreWithUnderwriter(b);
        return scoreB - scoreA;
      });
    });
    
    return groups;
  }

  /**
   * 计算单个组合的策略方案
   */
  calculateCombinationPlan(
    combination: IPOStock[],
    capital: number
  ): StrategyPlan | null {
    const allocations: Allocation[] = [];
    let usedCapital = 0;
    
    // 最大申购总额限制: 资金 * 10
    const maxTotalSubscription = capital * 10;
    let remainingSubscriptionLimit = maxTotalSubscription;
    
    // 为组合中的每只股票分配资金
    combination.forEach((ipo) => {
      // 平均分配资金,或者根据评分权重分配
      const weight = 1 / combination.length;
      const allocatedCapital = capital * weight;
      
      const issuePrice = parseFloat(ipo.issuePrice);
      const sharesPerLot = ipo.sharesPerLot;
      
      // 融资倍数
      let financingMultiplier = 1;
      if (ipo.grade === 'A+') {
        financingMultiplier = 10;
      } else if (ipo.grade === 'A') {
        financingMultiplier = 7;
      } else {
        financingMultiplier = 1;
      }
      
      // 计算融资后的总申购额(自有资金 + 融资)
      let totalSubscription = allocatedCapital * (1 + financingMultiplier);
      
      // 检查是否超过最大申购总额限制
      if (totalSubscription > remainingSubscriptionLimit) {
        totalSubscription = Math.min(totalSubscription, remainingSubscriptionLimit);
        // 重新计算实际融资倍数
        const actualMultiplier = (totalSubscription / allocatedCapital) - 1;
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
        financingMultiplier: Math.floor(financingMultiplier), // 向下取整
        totalSubscription: actualTotalSubscription,
        allocationRatio: weight,
        shares: shares,
        createdAt: new Date().toISOString()
      });
      
      usedCapital += actualAllocation;
    });
    
    if (allocations.length === 0) return null;
    
    const totalCapital = allocations.reduce((sum, a) => sum + a.capitalAllocation, 0);
    const totalFinancing = allocations.reduce((sum, a) => sum + a.financingAmount, 0);
    const totalSubscription = allocations.reduce((sum, a) => sum + a.totalSubscription, 0);
    
    // 计算预期收益和中签概率(使用新的估算方法)
    let expectedReturn = 0;
    const winProbabilityDetails: StrategyPlan['winProbability']['details'] = [];
    
    allocations.forEach((allocation, index) => {
      const ipo = combination[index];
      
      // 使用新的中签率估算方法(传入融资倍数)
      const winRateInfo = this.estimateWinRate(ipo, allocation.totalSubscription, allocation.financingMultiplier);
      
      // 计算申购手数
      const issuePrice = parseFloat(ipo.issuePrice);
      const subscriptionLots = Math.floor(allocation.totalSubscription / (issuePrice * ipo.sharesPerLot));
      
      // 行业评分
      const industryInfo = this.getIndustryScore(ipo.industry);
      
      winProbabilityDetails.push({
        stockCode: ipo.stockCode,
        stockName: ipo.stockName,
        subscriptionAmount: allocation.totalSubscription,
        subscriptionLots: subscriptionLots,
        estimatedWinRate: winRateInfo.winRate,
        expectedLots: winRateInfo.expectedLots,
        expectedShares: winRateInfo.expectedShares,
        oneHandWinRate: winRateInfo.oneHandWinRate,
        oneHandPartyRate: winRateInfo.oneHandPartyRate,
        groupType: winRateInfo.groupType,
        financingMultiplier: allocation.financingMultiplier,
        hasGreenshoe: ipo.hasGreenshoe,
        industryScore: industryInfo.score,
        isLeader: ipo.isIndustryLeader
      });
      
      // 估算上市涨幅(基于评分、保荐人历史、行业热度)
      const underwriterHistory = UNDERWRITER_HISTORY[ipo.underwriter];
      let avgReturn = underwriterHistory ? underwriterHistory.avgReturn : 0.25;
      
      // 行业热度加成
      avgReturn *= (1 + industryInfo.growth * 0.3);
      
      // 龙头加成
      if (ipo.isIndustryLeader) {
        avgReturn *= 1.15;
      }
      
      // 绿鞋加成(稳定性好,实际收益可能更高)
      if (ipo.hasGreenshoe) {
        avgReturn *= 1.05;
      }
      
      // 预期收益 = 中签股数 × 发行价 × 涨幅
      expectedReturn += winRateInfo.expectedShares * issuePrice * avgReturn;
    });
    
    // 计算总体中签概率
    const overallWinRate = winProbabilityDetails.reduce((sum, d) => sum + d.estimatedWinRate, 0) / winProbabilityDetails.length;
    
    // 计算成本
    // 假设资金锁定3天(包含可能的周末)
    const lockDays = 3;
    const opportunityCost = this.calculateOpportunityCost(totalCapital, lockDays);
    
    // 融资费用(每笔99港币)
    const financingFee = allocations.filter(a => a.financingAmount > 0).length * 99;
    
    // 交易费用(假设中签后卖出)
    const tradingFee = this.calculateTradingFee(expectedReturn);
    
    const totalCost = opportunityCost + financingFee + tradingFee;
    
    // 净收益
    const netReturn = expectedReturn - totalCost;
    
    // 收益率
    const returnRate = netReturn / totalCapital;
    
    // 风险等级
    const avgScore = combination.reduce((sum, ipo) => 
      sum + ipo.score, 0
    ) / combination.length;
    
    let riskLevel = '中';
    if (avgScore >= 85) riskLevel = '低';
    else if (avgScore >= 75) riskLevel = '中低';
    else if (avgScore < 65) riskLevel = '高';
    
    return {
      rank: '',
      combinations: combination,
      totalCapital,
      totalFinancing,
      totalSubscription,
      expectedReturn,
      costs: {
        opportunityCost,
        financingFee,
        tradingFee,
        totalCost
      },
      winProbability: {
        overallWinRate,
        details: winProbabilityDetails
      },
      netReturn,
      returnRate,
      riskLevel,
      allocations
    };
  }

  /**
   * 生成最优策略方案(前3名)
   */
  generateTopStrategies(ipoStocks: IPOStock[], capital: number): StrategyPlan[] {
    // 1. 过滤A等级以上的新股
    const filteredIPOs = this.filterAGradeOrAbove(ipoStocks);
    
    if (filteredIPOs.length === 0) {
      return [];
    }
    
    // 2. 生成所有可能的组合
    const combinations = this.generateCombinations(filteredIPOs, capital);
    
    // 3. 计算每个组合的策略方案
    const plans: StrategyPlan[] = [];
    
    combinations.forEach(combination => {
      const plan = this.calculateCombinationPlan(combination, capital);
      // 验证条件: 
      // 1. 自有资金使用量不超过资金总量的110%
      // 2. 申购总额不超过资金总量的10倍
      if (plan && 
          plan.totalCapital <= capital * 1.1 && 
          plan.totalSubscription <= capital * 10) {
        plans.push(plan);
      }
    });
    
    // 4. 按净收益率排序
    plans.sort((a, b) => b.returnRate - a.returnRate);
    
    // 5. 取前3名
    const topPlans = plans.slice(0, 3);
    
    // 6. 标记排名
    const ranks = ['最优方案', '次优方案', '第三优方案'];
    topPlans.forEach((plan, index) => {
      plan.rank = ranks[index];
    });
    
    return topPlans;
  }

  /**
   * 格式化金额显示
   */
  formatMoney(amount: number): string {
    return `HK$${amount.toFixed(2)}`;
  }

  /**
   * 格式化百分比显示
   */
  formatPercent(rate: number): string {
    return `${(rate * 100).toFixed(2)}%`;
  }
}

export default new StrategyService();
