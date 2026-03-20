/**
 * IPO评分服务
 * 包含评分计算、等级评定、策略建议等核心逻辑
 */
import type { IRawIPOData, IPOStrategy } from '../types';

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
  industryTier2: ['新能源', '电动汽车', '新能源汽车', '云计算', '云服务', '智能汽车', '自动驾驶', '网络安全', '网络解决方案'],
  industryTier3: ['印制电路板', '智能物流机器人', '消费电子', '科技', '互联网'],
  industryTier4: ['医药', '制药', '生物科技', '医疗服务'],
  industryTier5: ['家电', '空调', '白色家电', '厨卫电器', '照明', '卫浴', '银行', '保险', '房地产', '建筑', '零售', '餐饮', '教育', '传媒'],
  industryScores: [35, 28, 24, 20, 10],

  // 保荐人分类
  underwriterTier1: ['中金公司', '摩根士丹利', '高盛'],
  underwriterTier2: ['中信证券', '华泰国际', '招银国际', '美银证券', '瑞银', '花旗', '国泰君安', '海通国际', '中银国际'],
  underwriterTier3: ['建银国际', '工银国际', '交银国际', '光大证券', '兴业证券', '银河证券'],
  underwriterScores: [30, 25, 18],

  // 知名机构
  topInvestors: ['腾讯', '阿里', '百度', '京东', '美团', '字节', '红杉', '高瓴', 'IDG', '经纬', '启明', '礼来', '高盛', '摩根', '贝莱德', '先锋', '富达', 'CPE', '景林', '霸菱', 'UBS'],

  // 等级门槛（满分100分）
  gradeThresholds: {
    A_plus: 92,
    A: 87,
    A_minus: 82,
    B_plus: 77,
    B: 62,
    B_minus: 52,
    C_plus: 42,
    C: 32
  }
};

class IPOScoringService {
  private config: IScoreConfig = defaultScoreConfig;

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
   * 计算新股评分 (满分100分)
   */
  calculateScore(ipoData: IRawIPOData): number {
    let score = 0;

    // ========== 行业热度评分 ==========
    const industryScore = this.calculateIndustryScore(ipoData);
    score += industryScore;

    // ========== 保荐人评分 ==========
    const underwriterScore = this.calculateUnderwriterScore(ipoData);
    score += underwriterScore;

    // ========== 基石/明星投资者评分 ==========
    const investorScore = this.calculateInvestorScore(ipoData);
    score += investorScore;

    // ========== 绿鞋机制 ==========
    if (ipoData.hasGreenshoe) {
      score += 5;
    }

    return score;
  }

  /**
   * 计算行业热度评分 (最高35分)
   */
  private calculateIndustryScore(ipoData: IRawIPOData): number {
    if (!ipoData.industry) return 14;

    const { industryTier1, industryTier2, industryTier3, industryTier4, industryTier5, industryScores } = this.config;
    const industry = ipoData.industry;

    if (industryTier1.some(kw => industry.includes(kw))) {
      return industryScores[0]; // 35分
    } else if (industryTier2.some(kw => industry.includes(kw))) {
      return industryScores[1]; // 28分
    } else if (industryTier3.some(kw => industry.includes(kw))) {
      return industryScores[2]; // 24分
    } else if (industryTier4.some(kw => industry.includes(kw))) {
      return industryScores[3]; // 20分
    } else if (industryTier5.some(kw => industry.includes(kw))) {
      return industryScores[4]; // 10分
    }
    return 14; // 其他行业默认中等
  }

  /**
   * 计算保荐人评分 (最高30分)
   */
  private calculateUnderwriterScore(ipoData: IRawIPOData): number {
    if (!ipoData.underwriter) return 12;

    const { underwriterTier1, underwriterTier2, underwriterTier3, underwriterScores } = this.config;
    const underwriter = ipoData.underwriter;

    if (underwriterTier1.includes(underwriter)) {
      return underwriterScores[0]; // 30分
    } else if (underwriterTier2.includes(underwriter)) {
      return underwriterScores[1]; // 25分
    } else if (underwriterTier3.includes(underwriter)) {
      return underwriterScores[2]; // 18分
    }
    return 12; // 其他保荐人
  }

  /**
   * 计算投资者评分 (最高30分)
   */
  private calculateInvestorScore(ipoData: IRawIPOData): number {
    const { topInvestors } = this.config;
    const starInvestors = ipoData.starInvestors || [];
    const starInvestorCount = starInvestors.length;
    const topInvestorCount = starInvestors.filter((inv: string) =>
      topInvestors.some(ti => inv.includes(ti))
    ).length;

    if (ipoData.cornerstone) {
      // 有基石投资者的情况
      if (topInvestorCount >= 3) {
        return 30; // 基石 + 知名机构(3家及以上)
      } else if (topInvestorCount >= 1) {
        return 25; // 基石 + 知名机构(1-2家)
      }
      return 15; // 基石 + 无知名机构
    } else if (starInvestorCount > 0) {
      // 无基石投资者，有明星投资者
      if (starInvestorCount >= 3) {
        return 12; // 明星投资者3家及以上
      } else if (starInvestorCount >= 1) {
        return 8; // 明星投资者1-2家
      }
    }
    return 0; // 无基石无明星投资者
  }

  /**
   * 获取评分详情
   */
  getScoreDetails(ipoData: IRawIPOData): {
    items: Array<{ label: string; value: number; description: string }>;
    total: number;
  } {
    const items: Array<{ label: string; value: number; description: string }> = [];
    let total = 0;

    // ========== 行业热度评分 ==========
    const industryScore = this.calculateIndustryScore(ipoData);
    let industryDesc = '未披露';
    if (ipoData.industry) {
      const { industryTier1, industryTier2, industryTier3, industryTier4, industryTier5 } = this.config;
      const industry = ipoData.industry;
      if (industryTier1.some(kw => industry.includes(kw))) {
        industryDesc = '🔥 风口行业 (AI/机器人/新能源/半导体)';
      } else if (industryTier2.some(kw => industry.includes(kw))) {
        industryDesc = '热门赛道 (新能源汽车/云计算/智能驾驶)';
      } else if (industryTier3.some(kw => industry.includes(kw))) {
        industryDesc = '科技行业';
      } else if (industryTier4.some(kw => industry.includes(kw))) {
        industryDesc = '医药/生物科技行业';
      } else if (industryTier5.some(kw => industry.includes(kw))) {
        industryDesc = '传统行业';
      } else {
        industryDesc = '其他行业';
      }
    }
    items.push({ label: '行业热度', value: industryScore, description: industryDesc });
    total += industryScore;

    // ========== 保荐人评分 ==========
    const underwriterScore = this.calculateUnderwriterScore(ipoData);
    let underwriterDesc = '未披露';
    if (ipoData.underwriter) {
      const { underwriterTier1, underwriterTier2, underwriterTier3 } = this.config;
      if (underwriterTier1.includes(ipoData.underwriter)) {
        underwriterDesc = `第一梯队保荐人 (${ipoData.underwriter})`;
      } else if (underwriterTier2.includes(ipoData.underwriter)) {
        underwriterDesc = `第二梯队保荐人 (${ipoData.underwriter})`;
      } else if (underwriterTier3.includes(ipoData.underwriter)) {
        underwriterDesc = `第三梯队保荐人 (${ipoData.underwriter})`;
      } else {
        underwriterDesc = `其他保荐人 (${ipoData.underwriter})`;
      }
    }
    items.push({ label: '保荐人', value: underwriterScore, description: underwriterDesc });
    total += underwriterScore;

    // ========== 投资者评分 ==========
    const investorScore = this.calculateInvestorScore(ipoData);
    let investorDesc = '无特殊投资者';
    const starInvestors = ipoData.starInvestors || [];
    const { topInvestors } = this.config;
    const topInvestorCount = starInvestors.filter((inv: string) =>
      topInvestors.some(ti => inv.includes(ti))
    ).length;

    if (ipoData.cornerstone) {
      if (topInvestorCount >= 3) {
        investorDesc = `基石+知名机构(${topInvestorCount}家)`;
      } else if (topInvestorCount >= 1) {
        investorDesc = `基石+知名机构(${topInvestorCount}家)`;
      } else {
        investorDesc = '基石投资者';
      }
    } else if (starInvestors.length > 0) {
      if (starInvestors.length >= 3) {
        investorDesc = `明星投资者(${starInvestors.length}家)`;
      } else if (starInvestors.length >= 1) {
        investorDesc = `明星投资者(${starInvestors.length}家)`;
      }
    }
    items.push({ label: '投资者背景', value: investorScore, description: investorDesc });
    total += investorScore;

    // ========== 绿鞋机制 ==========
    const greenshoeScore = ipoData.hasGreenshoe ? 5 : 0;
    const greenshoeDesc = ipoData.hasGreenshoe ? '有绿鞋机制' : '无绿鞋机制';
    items.push({ label: '绿鞋机制', value: greenshoeScore, description: greenshoeDesc });
    total += greenshoeScore;

    return { items, total };
  }

  /**
   * 根据评分获取等级 (满分100分)
   */
  getGrade(score: number): string {
    const thresholds = this.config.gradeThresholds;
    if (score >= thresholds.A_plus) return 'A+';
    if (score >= thresholds.A) return 'A';
    if (score >= thresholds.A_minus) return 'A-';
    if (score >= thresholds.B_plus) return 'B+';
    if (score >= thresholds.B) return 'B';
    if (score >= thresholds.B_minus) return 'B-';
    if (score >= thresholds.C_plus) return 'C+';
    if (score >= thresholds.C) return 'C';
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
}

export default new IPOScoringService();