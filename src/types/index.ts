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
  marketCap: string;
  peRatio: number;
  underwriter: string;
  cornerstone: boolean;
  starInvestors: string[];
  sharesPerLot: number; // 每手股数
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
  dataDate?: string; // 数据日期(YYYY-MM-DD格式)
  // A+H股相关
  hasAShare?: boolean; // 是否有A股
  aShareCode?: string; // A股代码
  aSharePrice?: number; // A股价格
  ahPremium?: number; // A/H溢价率(%)
  // 历史数据
  industryHistoryReturn?: number; // 同行业历史平均涨幅
  similarCompanies?: SimilarCompany[]; // 同类公司历史数据
  createdAt: string;
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
  marketCap: string;
  peRatio: number;
  underwriter: string;
  cornerstone: boolean;
  starInvestors: string[];
  sharesPerLot: number; // 每手股数
  hasGreenshoe: boolean; // 绿鞋机制
  isIndustryLeader: boolean; // 行业龙头
  profitability: 'profitable' | 'loss' | 'breakeven'; // 盈利状况
  revenue: number; // 营收(亿元)
  netProfit: number; // 净利润(亿元)
  revenueGrowth: number; // 营收增长率
  profitGrowth: number; // 净利润增长率
}
