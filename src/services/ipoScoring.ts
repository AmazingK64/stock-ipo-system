/**
 * IPO评分服务
 * 包含评分计算、等级评定、策略建议等核心逻辑
 * 支持两种评分策略: 通用评分和港股专用评分
 *
 * 通用评分体系 (满分100分，8个维度):
 * 1. 行业热度 (35分) - AI/半导体等风口行业最高
 * 2. 保荐人 (20分) - 中金/摩根等第一梯队最高
 * 3. 投资者背景 (16分) - 基石+知名机构最高
 * 4. 商业模式 (10分) - 清晰可持续+宽护城河最高（含小红书讨论加成）
 * 5. 估值合理性 (10分) - 便宜(vs同行)最高
 * 6. 绿鞋机制 (5分) - 有则+5
 * 7. AH折价 (2分) - 非A+H=1分，A+H折价≥50%=2分
 * 8. 盈利能力 (2分) - 亏损=0，盈利=1，高增长=2
 *
 * 港股专用评分体系 (优化精细版・总分100):
 * 1. 赛道与细分行业 (20分)
 * 2. 公司规模 (市值 / 营收) (15分)
 * 3. 业绩与成长性 (18分)
 * 4. 估值与定价 (15分)
 * 5. 发行中介与结构 (22分)
 * 6. 合规与风险 (10分)
 */
import type { IRawIPOData, IPOStrategy } from '../types';
import HKIPOScoringService from './hkIPOScoring';

/**
 * IPO评分配置
 */
export interface IScoreConfig {
  industryTier1: string[];    // 第一梯队行业
  industryTier2: string[];    // 第二梯队行业
  industryTier3: string[];    // 第三梯队行业
  industryTier4: string[];    // 第四梯队行业
  industryTier5: string[];    // 第五梯队行业
  industryScores: number[];    // 各梯队分值

  underwriterTier1: string[]; // 保荐人第一梯队
  underwriterTier2: string[]; // 保荐人第二梯队
  underwriterTier3: string[]; // 保荐人第三梯队
  underwriterScores: number[];// 各梯队分值

  topInvestors: string[];      // 知名机构列表

  gradeThresholds: {          // 等级门槛
    A_plus: number;
    A: number;
    A_minus: number;
    B_plus: number;
    B: number;
    B_minus: number;
    C_plus: number;
    C: number;
  };
}

/**
 * 默认评分配置
 */
export const defaultScoreConfig: IScoreConfig = {
  // 行业分类
  industryTier1: ['人工智能', '机器人', '新能源', '半导体', '集成电路', '生物医药', '医疗器械'],
  industryTier2: ['新能源汽车', '电动汽车', '云计算', '云服务', '智能汽车', '自动驾驶', '网络安全', '网络解决方案'],
  industryTier3: ['印制电路板', '智能物流机器人', '消费电子', '科技', '互联网'],
  industryTier4: ['医药', '制药', '生物科技', '医疗服务', '医疗健康'],
  industryTier5: ['家电', '空调', '白色家电', '厨卫电器', '照明', '卫浴', '银行', '保险', '房地产', '建筑', '零售', '餐饮', '教育', '传媒'],
  industryScores: [35, 28, 22, 15, 8],

  // 保荐人分类
  underwriterTier1: ['中金公司', '摩根士丹利', '高盛'],
  underwriterTier2: ['中信证券', '华泰国际', '华泰金融控股', '招银国际', '美银证券', '瑞银', '花旗', '国泰君安', '海通国际', '中银国际'],
  underwriterTier3: ['建银国际', '工银国际', '交银国际', '光大证券', '兴业证券', '银河证券'],
  underwriterScores: [20, 16, 10],

  // 知名机构
  topInvestors: ['腾讯', '阿里', '百度', '京东', '美团', '字节', '红杉', '高瓴', 'IDG', '经纬', '启明', '礼来', '高盛', '摩根', '贝莱德', '先锋', '富达', 'CPE', '景林', '霸菱', 'UBS'],

  // 等级门槛（满分100分） - 按新要求调整
  gradeThresholds: {
    A_plus: 75,   // 原80 -> 75
    A: 70,        // 原72 -> 70
    A_minus: 65,  // 保持不变
    B_plus: 58,
    B: 48,
    B_minus: 38,
    C_plus: 28,
    C: 18
  }
};

class IPOScoringService {
  private config: IScoreConfig = defaultScoreConfig;
  private useHKStrategy: boolean = true;
  private readonly strategyStorageKey = 'ipo_scoring_use_hk_strategy';

  constructor() {
    if (typeof window === 'undefined') {
      return;
    }

    const savedStrategy = window.localStorage.getItem(this.strategyStorageKey);
    if (savedStrategy === 'true') {
      this.useHKStrategy = true;
    } else if (savedStrategy === 'false') {
      this.useHKStrategy = false;
    }
  }

  /**
   * 更新评分配置
   */
  updateConfig(newConfig: Partial<IScoreConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * 获取当前配置
   */
  getConfig(): IScoreConfig {
    return { ...this.config };
  }

  /**
   * 切换评分策略
   */
  setStrategy(useHKStrategy: boolean): void {
    this.useHKStrategy = useHKStrategy;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(this.strategyStorageKey, String(useHKStrategy));
    }
  }

  /**
   * 获取当前评分策略
   */
  getCurrentStrategy(): string {
    return this.useHKStrategy ? '港股专用评分策略' : '通用评分策略';
  }

  /**
   * 计算新股评分 (满分100分)
   * 根据策略选择使用通用评分或港股专用评分
   */
  calculateScore(ipoData: IRawIPOData): number {
    if (this.useHKStrategy) {
      return HKIPOScoringService.calculateScore(ipoData);
    }

    // 通用评分策略
    let score = 0;

    // ========== 1. 行业热度评分 (最高30分) ==========
    score += this.calculateIndustryScore(ipoData);

    // ========== 2. 保荐人评分 (最高18分) ==========
    score += this.calculateUnderwriterScore(ipoData);

    // ========== 3. 投资者背景评分 (最高16分) ==========
    score += this.calculateInvestorScore(ipoData);

    // ========== 4. 商业模式评分 (最高17分) ==========
    score += this.calculateBusinessModelScore(ipoData);

    // ========== 5. 估值合理性评分 (最高10分) ==========
    score += this.calculateValuationScore(ipoData);

    // ========== 6. 绿鞋机制 (最高5分) ==========
    score += ipoData.hasGreenshoe ? 5 : 0;

    // ========== 7. AH折价评分 (最高2分) ==========
    score += this.calculateAHDiscountScore(ipoData);

    // ========== 8. 盈利能力评分 (最高2分) ==========
    score += this.calculateProfitabilityScore(ipoData);

    return Math.min(score, 100); // 确保不超过100
  }

  /**
   * 计算行业热度评分 (最高30分)
   */
  private calculateIndustryScore(ipoData: IRawIPOData): number {
    if (!ipoData.industry) return 12;

    const { industryTier1, industryTier2, industryTier3, industryTier4, industryTier5, industryScores } = this.config;
    const industry = ipoData.industry;

    if (industryTier1.some(kw => industry.includes(kw))) return industryScores[0]; // 30分
    if (industryTier2.some(kw => industry.includes(kw))) return industryScores[1]; // 24分
    if (industryTier3.some(kw => industry.includes(kw))) return industryScores[2]; // 20分
    if (industryTier4.some(kw => industry.includes(kw))) return industryScores[3]; // 15分
    if (industryTier5.some(kw => industry.includes(kw))) return industryScores[4]; // 8分
    return 12; // 其他行业默认中等
  }

  /**
   * 计算保荐人评分 (最高18分)
   */
  private calculateUnderwriterScore(ipoData: IRawIPOData): number {
    if (!ipoData.underwriter) return 6;

    const { underwriterTier1, underwriterTier2, underwriterTier3, underwriterScores } = this.config;
    const underwriter = ipoData.underwriter;

    if (underwriterTier1.some(kw => underwriter.includes(kw))) return underwriterScores[0]; // 18分
    if (underwriterTier2.some(kw => underwriter.includes(kw))) return underwriterScores[1]; // 14分
    if (underwriterTier3.some(kw => underwriter.includes(kw))) return underwriterScores[2]; // 9分
    return 6; // 其他保荐人
  }

  /**
   * 计算投资者评分 (最高16分)
   */
  private calculateInvestorScore(ipoData: IRawIPOData): number {
    const { topInvestors } = this.config;
    const starInvestors = ipoData.starInvestors || [];
    const topInvestorCount = starInvestors.filter((inv: string) =>
      topInvestors.some(ti => inv.includes(ti))
    ).length;

    if (ipoData.cornerstone) {
      if (topInvestorCount >= 3) return 16; // 基石 + 知名机构(3家及以上)
      if (topInvestorCount >= 1) return 13; // 基石 + 知名机构(1-2家)
      return 9; // 基石 + 无知名机构
    } else if (starInvestors.length > 0) {
      if (starInvestors.length >= 3) return 6; // 明星投资者3家及以上
      if (starInvestors.length >= 1) return 4; // 明星投资者1-2家
    }
    return 0; // 无基石无明星投资者
  }

  /**
   * 计算商业模式评分 (最高10分)
   * 评估维度: 商业模式清晰度、可持续性、护城河宽度
   * 小红书讨论正面信号可额外加分
   *
   * excellent + wide: 10分 - 商业模式清晰可持续，护城河宽
   * excellent + moderate: 8分
   * good + wide: 7分
   * good + moderate: 5分 - 商业模式较清晰，有一定护城河
   * fair + narrow: 3分 - 商业模式一般
   * poor + none: 1分 - 商业模式不清晰
   */
  private calculateBusinessModelScore(ipoData: IRawIPOData): number {
    const model = ipoData.businessModel;
    const moat = ipoData.moatLevel;

    if (!model) return 3; // 无数据默认3分

    let score = 0;

    // 基于商业模式评分 (0-6分)
    switch (model) {
      case 'excellent': score = 6; break;
      case 'good': score = 4; break;
      case 'fair': score = 2; break;
      case 'poor': score = 1; break;
      default: score = 2;
    }

    // 基于护城河调整 (+0-4分)
    switch (moat) {
      case 'wide': score += 4; break;
      case 'moderate': score += 2; break;
      case 'narrow': score += 1; break;
      case 'none': score += 0; break;
      default: break;
    }

    return Math.min(score, 10); // 最高10分
  }

  /**
   * 计算估值合理性评分 (最高10分)
   * 评估维度: PE、PB与同行业对比，最后一轮融资估值参考
   *
   * cheap(便宜): 10分 - 估值显著低于同行
   * fair(合理): 6分 - 估值与同行相当
   * premium(偏高): 3分 - 估值高于同行
   * expensive(昂贵): 0分 - 估值显著高于同行
   *
   * 亏损企业: 根据行业给予差异化处理，不因亏损而惩罚
   */
  private calculateValuationScore(ipoData: IRawIPOData): number {
    const level = ipoData.valuationLevel;
    const pe = ipoData.peRatio;
    const peerPe = ipoData.peerPeAvg;
    const pb = ipoData.pbRatio;
    const peerPb = ipoData.peerPbAvg;

    // 如果有明确的估值水平标签，直接使用
    if (level) {
      switch (level) {
        case 'cheap': return 10;
        case 'fair': return 6;
        case 'premium': return 3;
        case 'expensive': return 0;
        default: break;
      }
    }

    // 如果有PE/PB数据，与同行对比
    if (ipoData.profitability === 'loss') {
      // 亏损企业用PB对比，不因亏损扣分
      if (pb > 0 && peerPb > 0) {
        const ratio = pb / peerPb;
        if (ratio <= 0.5) return 8; // PB不到同行一半，便宜
        if (ratio <= 0.8) return 6;
        if (ratio <= 1.2) return 4;
        if (ratio <= 2.0) return 1;
        return 0; // PB远高于同行
      }
      return 4; // 亏损且无数据，给中等分
    }

    // 盈利企业用PE对比
    if (pe > 0 && peerPe > 0) {
      const ratio = pe / peerPe;
      if (ratio <= 0.5) return 10; // PE不到同行一半，很便宜
      if (ratio <= 0.8) return 8;
      if (ratio <= 1.0) return 6; // 与同行相当
      if (ratio <= 1.5) return 3;
      if (ratio <= 2.0) return 1;
      return 0; // PE远高于同行
    }

    // PB对比
    if (pb > 0 && peerPb > 0) {
      const ratio = pb / peerPb;
      if (ratio <= 0.5) return 9;
      if (ratio <= 0.8) return 6;
      if (ratio <= 1.2) return 4;
      return 1;
    }

    return 4; // 无数据默认
  }

  /**
   * 计算AH折价评分 (最高2分)
   * 逻辑:
   * - 非A+H股: 1分 (没有A+H不代表不好，给基础分)
   * - A+H折价<50%: 1分 (有一定折价但不够显著)
   * - A+H折价≥50%: 2分 (折价显著，安全边际高)
   */
  private calculateAHDiscountScore(ipoData: IRawIPOData): number {
    if (!ipoData.hasAShare) return 1; // 非A+H，给基础分1分

    if (ipoData.ahDiscount === undefined || ipoData.ahDiscount === null) {
      return 1; // A+H但无折价数据，给基础分
    }

    const discount = ipoData.ahDiscount;
    if (discount >= 50) return 2; // 折价≥50%，显著折价
    return 1; // 折价<50%，不够显著
  }

  /**
   * 计算盈利能力评分 (最高2分)
   * 逻辑:
   * - 亏损: 0分 (亏损不代表不好，但不得分)
   * - 盈利但无增长/下降: 1分
   * - 盈利且有增长: 2分
   * - 盈亏平衡: 1分
   */
  private calculateProfitabilityScore(ipoData: IRawIPOData): number {
    if (!ipoData.profitability) return 1; // 无数据默认1分

    if (ipoData.profitability === 'profitable') {
      if (ipoData.profitGrowth > 0) return 2; // 盈利且有增长
      return 1; // 盈利但增长一般或下降
    }

    if (ipoData.profitability === 'breakeven') return 1; // 盈亏平衡

    return 0; // 亏损
  }

  /**
   * 获取评分详情
   */
  getScoreDetails(ipoData: IRawIPOData): {
    items: Array<{ 
      label: string; 
      value: number; 
      maxScore: number; 
      description: string;
      reason?: string;  // 新增：详细打分原因
    }>;
    total: number;
  } {
    if (this.useHKStrategy) {
      return HKIPOScoringService.getScoreDetails(ipoData);
    }

    // 通用评分策略详情
    const items: Array<{ 
      label: string; 
      value: number; 
      maxScore: number; 
      description: string;
      reason?: string;
    }> = [];
    let total = 0;

    // ========== 1. 行业热度 (35分) ==========
    const industryScore = this.calculateIndustryScore(ipoData);
    let industryDesc = '未披露';
    let industryReason = '行业信息未披露，按默认中等分数计算';
    if (ipoData.industry) {
      const { industryTier1, industryTier2, industryTier3, industryTier4, industryTier5 } = this.config;
      if (industryTier1.some(kw => ipoData.industry!.includes(kw))) {
        industryDesc = '风口行业 (AI/机器人/新能源/半导体)';
        industryReason = `${ipoData.industry}属于第一梯队风口行业，享有最高35分评分，代表未来高成长性和市场关注度`;
      } else if (industryTier2.some(kw => ipoData.industry!.includes(kw))) {
        industryDesc = '热门赛道 (新能源汽车/云计算/智能驾驶)';
        industryReason = `${ipoData.industry}属于第二梯队热门赛道，获得28分评分，市场热度较高，成长性良好`;
      } else if (industryTier3.some(kw => ipoData.industry!.includes(kw))) {
        industryDesc = '科技行业';
        industryReason = `${ipoData.industry}属于第三梯队科技行业，获得22分评分，具备技术含量但竞争相对激烈`;
      } else if (industryTier4.some(kw => ipoData.industry!.includes(kw))) {
        industryDesc = '医药/医疗健康';
        industryReason = `${ipoData.industry}属于第四梯队医药医疗行业，获得15分评分，防御性较强但成长性一般`;
      } else if (industryTier5.some(kw => ipoData.industry!.includes(kw))) {
        industryDesc = '传统行业';
        industryReason = `${ipoData.industry}属于第五梯队传统行业，获得8分评分，成长性有限，市场关注度低`;
      } else {
        industryDesc = '其他行业';
        industryReason = `${ipoData.industry}不属于预设行业梯队，按中等水平获得12分评分`;
      }
    }
    items.push({ label: '行业热度', value: industryScore, maxScore: 35, description: industryDesc, reason: industryReason });
    total += industryScore;

    // ========== 2. 保荐人 (20分) ==========
    const underwriterScore = this.calculateUnderwriterScore(ipoData);
    let underwriterDesc = '未披露';
    let underwriterReason = '保荐人信息未披露，按最低分数6分计算';
    if (ipoData.underwriter) {
      const { underwriterTier1, underwriterTier2, underwriterTier3 } = this.config;
      if (underwriterTier1.some(kw => ipoData.underwriter!.includes(kw))) {
        underwriterDesc = `第一梯队 (${ipoData.underwriter})`;
        underwriterReason = `${ipoData.underwriter}属于第一梯队保荐人（中金/摩根/高盛），获得最高20分评分，代表强大的发行能力和定价话语权`;
      } else if (underwriterTier2.some(kw => ipoData.underwriter!.includes(kw))) {
        underwriterDesc = `第二梯队 (${ipoData.underwriter})`;
        underwriterReason = `${ipoData.underwriter}属于第二梯队保荐人（中信/华泰/招银国际等），获得16分评分，具备较强的发行经验和资源`;
      } else if (underwriterTier3.some(kw => ipoData.underwriter!.includes(kw))) {
        underwriterDesc = `第三梯队 (${ipoData.underwriter})`;
        underwriterReason = `${ipoData.underwriter}属于第三梯队保荐人（建银/工银/交银等），获得10分评分，发行能力一般`;
      } else {
        underwriterDesc = `其他 (${ipoData.underwriter})`;
        underwriterReason = `${ipoData.underwriter}不属于预设梯队，按最低6分评分`;
      }
    }
    items.push({ label: '保荐人', value: underwriterScore, maxScore: 20, description: underwriterDesc, reason: underwriterReason });
    total += underwriterScore;

    // ========== 3. 投资者背景 (16分) ==========
    const investorScore = this.calculateInvestorScore(ipoData);
    let investorDesc = '无特殊投资者';
    let investorReason = '无基石投资者且无知名机构参与，获得0分评分';
    const starInvestors = ipoData.starInvestors || [];
    const { topInvestors } = this.config;
    const topInvestorCount = starInvestors.filter((inv: string) =>
      topInvestors.some(ti => inv.includes(ti))
    ).length;
    if (ipoData.cornerstone) {
      if (topInvestorCount >= 3) {
        investorDesc = `基石+知名机构(${topInvestorCount}家)`;
        investorReason = `有基石投资者且包含${topInvestorCount}家知名机构（${starInvestors.slice(0, 3).join('、')}），获得最高16分评分`;
      } else if (topInvestorCount >= 1) {
        investorDesc = `基石+知名机构(${topInvestorCount}家)`;
        investorReason = `有基石投资者且包含${topInvestorCount}家知名机构，获得13分评分`;
      } else {
        investorDesc = '基石投资者';
        investorReason = '有基石投资者但无知名机构参与，获得9分评分';
      }
    } else if (starInvestors.length > 0) {
      if (starInvestors.length >= 3) {
        investorDesc = `明星投资者(${starInvestors.length}家)`;
        investorReason = `无基石投资者但有${starInvestors.length}家明星机构参与，获得6分评分`;
      } else if (starInvestors.length >= 1) {
        investorDesc = `明星投资者(${starInvestors.length}家)`;
        investorReason = `无基石投资者但有${starInvestors.length}家明星机构参与，获得4分评分`;
      }
    }
    items.push({ label: '投资者背景', value: investorScore, maxScore: 16, description: investorDesc, reason: investorReason });
    total += investorScore;

    // ========== 4. 商业模式 (17分) ==========
    const bmScore = this.calculateBusinessModelScore(ipoData);
    let bmDesc = '未披露';
    if (ipoData.businessModel) {
      const modelMap: Record<string, string> = {
        excellent: '清晰可持续',
        good: '较清晰',
        fair: '一般',
        poor: '不清晰/不可持续'
      };
      const moatMap: Record<string, string> = {
        wide: '护城河宽',
        moderate: '护城河中等',
        narrow: '护城河窄',
        none: '无护城河'
      };
      const modelText = modelMap[ipoData.businessModel] || ipoData.businessModel;
      const moatText = ipoData.moatLevel ? `, ${moatMap[ipoData.moatLevel] || ''}` : '';
      bmDesc = `${modelText}${moatText}`;
    }
    items.push({ label: '商业模式', value: bmScore, maxScore: 10, description: bmDesc });
    total += bmScore;

    // ========== 5. 估值合理性 (10分) ==========
    const valScore = this.calculateValuationScore(ipoData);
    let valDesc = '未披露';
    if (ipoData.valuationLevel) {
      const valMap: Record<string, string> = {
        cheap: '估值便宜 (低于同行)',
        fair: '估值合理 (与同行相当)',
        premium: '估值偏高 (高于同行)',
        expensive: '估值昂贵 (显著高于同行)'
      };
      valDesc = valMap[ipoData.valuationLevel] || ipoData.valuationLevel;

      // 补充具体数据
      if (ipoData.peRatio > 0 && ipoData.peerPeAvg > 0) {
        valDesc += ` (PE ${ipoData.peRatio} vs 同行${ipoData.peerPeAvg})`;
      }
      if (ipoData.pbRatio > 0 && ipoData.peerPbAvg > 0) {
        valDesc += ` (PB ${ipoData.pbRatio} vs 同行${ipoData.peerPbAvg})`;
      }
    } else if (ipoData.profitability === 'loss') {
      valDesc = '亏损企业，PB对比';
      if (ipoData.pbRatio > 0 && ipoData.peerPbAvg > 0) {
        valDesc += ` (${ipoData.pbRatio} vs 同行${ipoData.peerPbAvg})`;
      }
    }
    items.push({ label: '估值合理性', value: valScore, maxScore: 10, description: valDesc });
    total += valScore;

    // ========== 6. 绿鞋机制 (5分) ==========
    const greenshoeScore = ipoData.hasGreenshoe ? 5 : 0;
    items.push({
      label: '绿鞋机制',
      value: greenshoeScore,
      maxScore: 5,
      description: ipoData.hasGreenshoe ? '有绿鞋(超额配售权)' : '无绿鞋'
    });
    total += greenshoeScore;

    // ========== 7. AH折价 (2分) ==========
    const ahScore = this.calculateAHDiscountScore(ipoData);
    let ahDesc = '非A+H股，基础分';
    if (ipoData.hasAShare) {
      if (ipoData.ahDiscount !== undefined && ipoData.ahDiscount !== null) {
        const discount = ipoData.ahDiscount;
        if (discount >= 50) {
          ahDesc = `A+H股 H折价${discount}% - 折价显著，安全边际高`;
        } else {
          ahDesc = `A+H股 H折价${discount}% - 折价有限`;
        }
      } else {
        ahDesc = 'A+H股 (折价数据缺失)';
      }
    }
    items.push({ label: 'AH折价', value: ahScore, maxScore: 2, description: ahDesc });
    total += ahScore;

    // ========== 8. 盈利能力 (2分) ==========
    const profitScore = this.calculateProfitabilityScore(ipoData);
    let profitDesc = '未披露';
    if (ipoData.profitability === 'profitable') {
      if (ipoData.profitGrowth > 0) profitDesc = `盈利, 净利润增长${ipoData.profitGrowth}%`;
      else profitDesc = '盈利, 但利润下降';
    } else if (ipoData.profitability === 'breakeven') {
      profitDesc = '盈亏平衡';
    } else if (ipoData.profitability === 'loss') {
      profitDesc = '亏损中';
    }
    items.push({ label: '盈利能力', value: profitScore, maxScore: 2, description: profitDesc });
    total += profitScore;

    return { items, total };
  }

  /**
   * 根据评分获取等级 (满分100分)
   * 阈值: S(≥80), A+(75-79), A(70-74), A-(65-69), B+(58-64), B(48-57), B-(38-47), C+(28-37), C(18-27), D(10-17), F(<10)
   */
  getGrade(score: number): string {
    if (this.useHKStrategy) {
      return HKIPOScoringService.getGrade(score);
    }
    
    // 新等级标准
    if (score >= 80) return 'S';
    if (score >= 75) return 'A+';
    if (score >= 70) return 'A';
    if (score >= 65) return 'A-';
    if (score >= 58) return 'B+';
    if (score >= 48) return 'B';
    if (score >= 38) return 'B-';
    if (score >= 28) return 'C+';
    if (score >= 18) return 'C';
    if (score >= 10) return 'D';
    return 'F';
  }

  /**
   * 生成打新策略建议
   */
  generateStrategy(score: number, grade: string): IPOStrategy {
    if (this.useHKStrategy) {
      const hkStrategy = HKIPOScoringService.generateStrategy(score, grade);
      return {
        recommendation: hkStrategy.recommendation,
        action: hkStrategy.action,
        riskLevel: hkStrategy.riskLevel,
        expectedReturn: hkStrategy.expectedReturn,
        allocation: hkStrategy.allocation
      };
    }

    // 通用评分策略建议
    if (grade.startsWith('A')) {
      return {
        recommendation: '强烈推荐',
        action: '建议积极参与,可融资申购',
        riskLevel: '低',
        expectedReturn: '30-50%',
        allocation: '中等仓位'
      };
    } else if (grade.startsWith('B')) {
      return {
        recommendation: '推荐',
        action: '建议现金申购',
        riskLevel: '中',
        expectedReturn: '15-30%',
        allocation: '轻仓位'
      };
    } else if (grade.startsWith('C')) {
      return {
        recommendation: '谨慎',
        action: '少量参与或不参与',
        riskLevel: '高',
        expectedReturn: '5-15%',
        allocation: '极轻仓位'
      };
    } else {
      return {
        recommendation: '不推荐',
        action: '不建议参与',
        riskLevel: '极高',
        expectedReturn: '不确定',
        allocation: '不参与'
      };
    }
  }
}

export default new IPOScoringService();
