/** IPO状态枚举 */
export type IPOStatus = 'subscribe' | 'upcoming' | 'today_listed' | 'recent_listed' | 'unknown';

// 新股信息接口
export interface IPOStock {
  id?: number;
  stockCode: string;
  stockName: string;
  listingDate: string;
  issuePrice: string;
  subscriptionStartDate: string;
  subscriptionEndDate: string;
  industry: string;
  marketCap: string; // 集资规模(IPO发售金额)
  companyValue?: string; // 公司估值(发行价 × 总股本)
  peRatio: number;
  underwriter: string;
  cornerstone: boolean;
  starInvestors: string[];
  sharesPerLot: number; // 每手股数
  totalLots?: number; // 发售总手数
  offeringShares?: number; // 发售股数
  hasGreenshoe: boolean; // 绿鞋机制(超额配售权)
  isIndustryLeader: boolean; // 是否行业龙头
  profitability: 'profitable' | 'loss' | 'breakeven'; // 盈利状况
  revenue: number; // 营收(亿元)
  netProfit: number; // 净利润(亿元)
  revenueGrowth: number; // 营收增长率
  profitGrowth: number; // 净利润增长率
  score: number;
  grade: string;
  strategy: IPOStrategy;
  llmScoringReason?: string; // LLM评分依据摘要
  dataDate?: string; // 数据日期(YYYY-MM-DD格式)
  // IPO状态
  status?: IPOStatus;
  daysToListing?: number; // 距上市天数
  ahPremium?: number; // A/H溢价率(%)
  // 历史数据
  industryHistoryReturn?: number; // 同行业历史平均涨幅
  similarCompanies?: SimilarCompany[]; // 同类公司历史数据
  createdAt: string;
  // 新增评分维度
  publicSharesRatio?: number; // 公开发售比例(%)，公开发售给散户的比例
  marginMultiple?: number; // 孖展倍数，申购热度指标
  hasCornerstoneOrStar?: boolean; // 是否有知名机构股东
  // 新增评分维度
  hasAShare?: boolean; // 是否A+H股双重上市
  aShareCode?: string; // A股代码
  aSharePrice?: number; // A股价格(元)
  ahDiscount?: number; // H股相对A股折价率(%)
  businessModel?: string; // 商业模式评价: excellent/good/fair/poor
  moatLevel?: string; // 护城河水平: wide/moderate/narrow/none
  valuationLevel?: string; // 估值水平: cheap/fair/premium/expensive
  pbRatio?: number; // 市净率
  peerPeAvg?: number; // 同行业平均PE
  peerPbAvg?: number; // 同行业平均PB
  businessModelReason?: string; // 商业模式评分理由
  moatReason?: string; // 护城河评分理由
  valuationReason?: string; // 估值评分理由
  lastRoundValuation?: string; // 最后一轮融资估值
  is18C?: boolean; // 是否为18C章公司(特专科技公司)
}

/** 实时行情数据 */
export interface RealtimeQuote {
  stockCode: string;
  stockName: string;
  currentPrice: string;    // 当前价
  change: string;          // 涨跌额
  changeRate: string;       // 涨跌幅
  issuePrice: string;      // 发行价/上市价
  openingPrice: string;    // 开市价
  highPrice: string;       // 最高价
  lowPrice: string;        // 最低价
  turnover: string;        // 成交额
  currency?: string;        // 货币
}

/** 分类IPO数据(后端API返回) */
export interface CategorizedIPOData {
  upcomingIPOs: IPOStock[];
  subscribeIPOs: IPOStock[];
  todayListed: RealtimeQuote[];
  recentListed: IPOStock[];
  updateTime: string;
  source: string;
}

// 同类公司历史数据
export interface SimilarCompany {
  stockCode: string;
  stockName: string;
  listingDate: string;
  industry: string;
  firstDayReturn: number; // 首日涨幅
  firstWeekReturn: number; // 首周涨幅
  firstMonthReturn: number; // 首月涨幅
  currentReturn: number; // 当前涨幅
}

// 打新策略接口
export interface IPOStrategy {
  recommendation: string;
  action: string;
  riskLevel: string;
  expectedReturn: string;
}

// 资金信息接口
export interface Capital {
  id?: number;
  amount: number;
  updatedAt: string;
}

// 融资分配接口
export interface Allocation {
  id?: number;
  ipoStockId: number;
  stockCode: string;
  stockName: string;
  listingDate?: string;
  subscriptionEndDate?: string; // 申购截止日期
  capitalAllocation: number;
  financingAmount: number;
  financingMultiplier: number;
  totalSubscription: number;
  allocationRatio: number;
  shares: number;
  createdAt: string;
}

// 打新历史记录接口
export interface IPOHistory {
  id?: number;
  ipoStockId: number;
  status: 'subscribed' | 'won' | 'lost';
  profit: number;
  createdAt: string;
}

// 新股原始数据接口(从API获取)
export interface IRawIPOData {
  stockCode: string;
  stockName: string;
  listingDate: string;
  issuePrice: string;
  subscriptionStartDate: string;
  subscriptionEndDate: string;
  industry: string;
  marketCap: string; // 集资规模(IPO发售金额)
  companyValue?: string; // 公司估值(发行价 × 总股本)
  peRatio: number;
  underwriter: string;
  cornerstone: boolean;
  starInvestors: string[];
  sharesPerLot: number; // 每手股数
  totalLots?: number; // 发售总手数
  offeringShares?: number; // 发售股数
  hasGreenshoe: boolean; // 绿鞋机制
  isIndustryLeader: boolean; // 行业龙头
  profitability: 'profitable' | 'loss' | 'breakeven'; // 盈利状况
  revenue: number; // 营收(亿元)
  netProfit: number; // 净利润(亿元)
  revenueGrowth: number; // 营收增长率
  profitGrowth: number; // 净利润增长率
  status?: IPOStatus; // IPO状态(从后端返回)
  daysToListing?: number; // 距上市天数
  marginMultiple?: number; // 孖展倍数(从subscribe-list接口获取)
  publicSharesRatio?: number; // 公开发售比例(%)，公开发售给散户的比例
  // 新增评分维度
  hasAShare?: boolean; // 是否A+H股双重上市
  aShareCode?: string; // A股代码
  aSharePrice?: number; // A股价格(元)
  ahDiscount?: number; // H股相对A股折价率(%)，正数表示H股便宜
  businessModel?: string; // 商业模式评价: 'excellent'(清晰可持续+宽护城河) | 'good'(较清晰) | 'fair'(一般) | 'poor'(不清晰/不可持续)
  moatLevel?: string; // 护城河水平: 'wide'(宽) | 'moderate'(中等) | 'narrow'(窄) | 'none'(无)
  valuationLevel?: string; // 估值水平: 'cheap'(便宜) | 'fair'(合理) | 'premium'(偏高) | 'expensive'(昂贵)
  pbRatio?: number; // 市净率
  peerPeAvg?: number; // 同行业平均PE
  peerPbAvg?: number; // 同行业平均PB
  businessModelReason?: string; // 商业模式评分理由(来自网络搜索)
  moatReason?: string; // 护城河评分理由(来自网络搜索)
  valuationReason?: string; // 估值评分理由(来自网络搜索)
  lastRoundValuation?: string; // 最后一轮融资估值
  score?: number; // 后端LLM评分
  grade?: string; // 后端LLM评级
  strategy?: IPOStrategy; // 后端LLM策略
  llmScoringReason?: string; // 后端LLM评分依据摘要
  is18C?: boolean; // 是否为18C章公司(特专科技公司)
}
