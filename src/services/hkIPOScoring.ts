/**
 * 港股IPO专用评分服务
 * 港股 IPO 打新评分策略（优化精细版・总分 100）
 * 
 * 一、整体框架 (总分 100)
 * 1. 赛道与细分行业 (20 分)
 * 2. 公司规模 (市值 / 营收) (15 分)
 * 3. 业绩与成长性 (18 分)
 * 4. 估值与定价 (15 分)
 * 5. 发行中介与结构 (22 分)
 * 6. 合规与风险 (10 分)
 */

import type { IRawIPOData } from '../types';

/**
 * 港股IPO评分配置
 */
export interface HKScoreConfig {
  // 赛道细分行业评分规则
  industryCategories: {
    [category: string]: {
      name: string;
      subIndustries: {
        [subIndustry: string]: { minScore: number; maxScore: number; description: string };
      };
    };
  };

  // 公司规模评分规则
  marketCapRanges: Array<{ min: number; max: number | null; minScore: number; maxScore: number }>;
  revenueRanges: Array<{ min: number; max: number | null; minScore: number; maxScore: number }>;

  // 业绩成长性评分规则
  profitabilityRules: {
    [key: string]: { minScore: number; maxScore: number; description: string };
  };
  growthRanges: Array<{ min: number; max: number | null; minScore: number; maxScore: number }>;
  marginRanges: Array<{ min: number; max: number | null; minScore: number; maxScore: number }>;

  // 估值评分规则
  valuationRules: {
    discountLevels: Array<{ min: number; max: number | null; minScore: number; maxScore: number }>;
  };

  // 发行中介评分规则
  underwriterTiers: {
    [tier: string]: { minScore: number; maxScore: number; underwriters: string[] };
  };
  lawFirmTiers: {
    [tier: string]: { minScore: number; maxScore: number; firms: string[] };
  };
  auditorTiers: {
    [tier: string]: { minScore: number; maxScore: number; firms: string[] };
  };
  cornerstoneRules: {
    [key: string]: { minScore: number; maxScore: number; description: string };
  };

  // 合规风险评分规则
  complianceRules: {
    [key: string]: { score: number; description: string };
  };
}

/**
 * 默认港股评分配置
 */
export const defaultHKScoreConfig: HKScoreConfig = {
  // ========== 1. 赛道与细分行业 (20 分) ==========
  industryCategories: {
    technology: {
      name: '科技 / 硬科技',
      subIndustries: {
        'ai_model': { minScore: 17, maxScore: 20, description: '人工智能大模型、AI 应用' },
        'robot_auto': { minScore: 17, maxScore: 20, description: '机器人、自动驾驶' },
        'chip_packaging': { minScore: 17, maxScore: 20, description: '算力芯片 / 先进封装' },
        'cooling_server': { minScore: 15, maxScore: 18, description: '液冷服务器' },
        'optical_module': { minScore: 15, maxScore: 18, description: '光模块、算力租赁' },
        'semiconductor': { minScore: 15, maxScore: 18, description: '半导体设备' },
        'pcb_components': { minScore: 10, maxScore: 14, description: 'PCB、覆铜板、被动元件' },
        'electronics': { minScore: 10, maxScore: 14, description: '普通电子制造' },
        'software': { minScore: 6, maxScore: 9, description: '传统软件、系统集成' },
        'hardware': { minScore: 6, maxScore: 9, description: '低端硬件' }
      }
    },
    healthcare: {
      name: '医药医疗',
      subIndustries: {
        'innovative_drug': { minScore: 16, maxScore: 20, description: '创新药 (Biotech / 商业化药企)' },
        'medical_device': { minScore: 13, maxScore: 17, description: '医疗器械、IVD、医疗设备、耗材' },
        'cxo_cdmo': { minScore: 14, maxScore: 18, description: 'CXO/CDMO（药明系类）' },
        'aesthetic_hospital': { minScore: 9, maxScore: 13, description: '医美、民营医院、医养机构' },
        'chinese_medicine': { minScore: 5, maxScore: 8, description: '中药、流通、仿制药大宗' }
      }
    },
    energy: {
      name: '新能源 / 制造',
      subIndustries: {
        'energy_storage': { minScore: 14, maxScore: 18, description: '储能、光伏逆变器' },
        'battery_material': { minScore: 14, maxScore: 18, description: '锂电材料、氢能' },
        'auto_vehicle': { minScore: 9, maxScore: 13, description: '整车、零部件、传统装备' }
      }
    },
    consumer: {
      name: '消费与服务',
      subIndustries: {
        'brand_food': { minScore: 10, maxScore: 14, description: '品牌餐饮、潮牌、新零售' },
        'education_local': { minScore: 7, maxScore: 11, description: '教育、本地生活、物业' }
      }
    },
    traditional: {
      name: '周期 / 传统',
      subIndustries: {
        'real_estate': { minScore: 3, maxScore: 8, description: '地产、建筑、建材、纺织、造纸、煤炭、钢铁' }
      }
    },
    finance: {
      name: '金融',
      subIndustries: {
        'fintech': { minScore: 10, maxScore: 15, description: '优质金融科技、支付' },
        'loan_guarantee': { minScore: 4, maxScore: 8, description: '小贷、担保、传统金控' }
      }
    }
  },

  // ========== 2. 公司规模 (15 分) ==========
  marketCapRanges: [
    { min: 100, max: null, minScore: 7, maxScore: 7.5 },  // ≥100亿港元: 7-7.5
    { min: 50, max: 100, minScore: 5, maxScore: 6.9 },    // 50-100亿: 5-6.9
    { min: 20, max: 50, minScore: 3, maxScore: 4.9 },     // 20-50亿: 3-4.9
    { min: 0, max: 20, minScore: 0, maxScore: 2.9 }       // <20亿: 0-2.9
  ],
  revenueRanges: [
    { min: 20, max: null, minScore: 7, maxScore: 7.5 },   // ≥20亿港元: 7-7.5
    { min: 10, max: 20, minScore: 5, maxScore: 6.9 },     // 10-20亿: 5-6.9
    { min: 3, max: 10, minScore: 3, maxScore: 4.9 },      // 3-10亿: 3-4.9
    { min: 0, max: 3, minScore: 0, maxScore: 2.9 }        // <3亿: 0-2.9
  ],

  // ========== 3. 业绩与成长性 (18 分) ==========
  profitabilityRules: {
    'profitable_growing': { minScore: 7, maxScore: 8, description: '连续盈利、净利润逐年上涨' },
    'profitable_fluctuating': { minScore: 4, maxScore: 6, description: '盈利但波动' },
    'loss_narrowing': { minScore: 2, maxScore: 3, description: '亏损但收窄、营收高增' },
    'loss_expanding': { minScore: 0, maxScore: 1, description: '持续大幅亏损、无商业化' }
  },
  growthRanges: [
    { min: 30, max: null, minScore: 5, maxScore: 6 },     // 增速 ≥30%: 5-6
    { min: 15, max: 30, minScore: 3, maxScore: 4 },       // 增速 15%–30%: 3-4
    { min: 0, max: 15, minScore: 1, maxScore: 2 },        // 增速 0–15%: 1-2
    { min: -9999, max: 0, minScore: 0, maxScore: 0 }      // 负增长: 0
  ],
  marginRanges: [
    { min: 40, max: null, minScore: 4, maxScore: 4 },     // 毛利率 ≥40% 且稳定 / 提升: 4
    { min: 25, max: 40, minScore: 2, maxScore: 3 },       // 毛利率 25%–40%: 2-3
    { min: 0, max: 25, minScore: 0, maxScore: 1 }         // 毛利率 <25% 且下滑: 0-1
  ],

  // ========== 4. 估值与定价 (15 分) ==========
  valuationRules: {
    discountLevels: [
      { min: -15, max: null, minScore: 13, maxScore: 15 }, // 较行业折价 ≥15% 或 定价在下限: 13-15
      { min: -10, max: -15, minScore: 11, maxScore: 12 },  // 较行业折价 10-15%
      { min: 0, max: -10, minScore: 9, maxScore: 12 },     // 与行业持平、定价中位: 9-12
      { min: 10, max: 30, minScore: 5, maxScore: 8 },      // 较行业溢价 10%–30%: 5-8
      { min: 30, max: null, minScore: 0, maxScore: 4 }     // 大幅溢价＞30%、定价上限: 0-4
    ]
  },

  // ========== 5. 发行中介 & 结构 (22 分) ==========
  underwriterTiers: {
    tier1: {
      minScore: 6,
      maxScore: 7,
      underwriters: ['高盛', '摩根士丹利', '美银', '摩根大通', '中金', '中信', '海通国际']
    },
    tier2: {
      minScore: 3,
      maxScore: 5,
      underwriters: ['华泰国际', '招银国际', '瑞银', '花旗', '国泰君安', '中银国际', '建银国际', '工银国际']
    },
    tier3: {
      minScore: 0,
      maxScore: 2,
      underwriters: [] // 其他小投行
    }
  },
  lawFirmTiers: {
    tier1: {
      minScore: 3,
      maxScore: 3,
      firms: ['方达', '达维', '富而德', '贝克·麦坚时', '高伟绅', '安理国际']
    },
    tier2: {
      minScore: 1,
      maxScore: 2,
      firms: [] // 其他普通香港律所
    },
    tier3: {
      minScore: 0,
      maxScore: 0,
      firms: [] // 不知名小律所
    }
  },
  auditorTiers: {
    tier1: {
      minScore: 3,
      maxScore: 3,
      firms: ['普华永道', '德勤', '安永', '毕马威'] // 四大会计师事务所
    },
    tier2: {
      minScore: 0,
      maxScore: 2,
      firms: [] // 其他会计师事务所
    }
  },
  cornerstoneRules: {
    'strong_cornerstone': { minScore: 4, maxScore: 5, description: '知名机构/产业资本，占比15%-40%，锁定期6个月以上' },
    'normal_cornerstone': { minScore: 2, maxScore: 3, description: '一般基石，占比适中' },
    'no_cornerstone': { minScore: 0, maxScore: 1, description: '无基石投资者' }
  },

  // ========== 6. 合规与风险 (10 分) ==========
  complianceRules: {
    'normal_allocation': { score: 4, description: '认购适中、正常回拨（公开发售合理分配）' },
    'high_oversubscription': { score: 5, description: '正常回拨比例' },
    'low_public_allocation': { score: 2, description: '公开发售比例低' },
    'complex_structure': { score: 1, description: '发行结构复杂、老股东大量套现' },
    'good_fund_usage': { score: 3, description: '募资用于研发、扩产、偿债、补充营运' },
    'shareholder_cashout': { score: 0, description: '主要用于股东套现、用途模糊' },
    'no_risk': { score: 2, description: '无诉讼、无监管处罚、不依赖单一客户' },
    'has_risk': { score: 0, description: '有重大诉讼、合规瑕疵、依赖单一客户' }
  }
};

class HKIPOScoringService {
  private config: HKScoreConfig = defaultHKScoreConfig;

  /**
   * 更新评分配置
   */
  updateConfig(newConfig: Partial<HKScoreConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * 获取当前配置
   */
  getConfig(): HKScoreConfig {
    return { ...this.config };
  }

  /**
   * 计算港股IPO总分 (满分100分)
   */
  calculateScore(ipoData: IRawIPOData): number {
    let totalScore = 0;

    // 1. 赛道与细分行业 (20分)
    totalScore += this.calculateIndustryScore(ipoData);

    // 2. 公司规模 (15分)
    totalScore += this.calculateSizeScore(ipoData);

    // 3. 业绩与成长性 (18分)
    totalScore += this.calculatePerformanceScore(ipoData);

    // 4. 估值与定价 (15分)
    totalScore += this.calculateValuationScore(ipoData);

    // 5. 发行中介与结构 (22分)
    totalScore += this.calculateStructureScore(ipoData);

    // 6. 合规与风险 (10分)
    totalScore += this.calculateComplianceScore(ipoData);

    return Math.min(totalScore, 100); // 确保不超过100分
  }

  /**
   * 计算赛道与细分行业得分 (20分)
   */
  private calculateIndustryScore(ipoData: IRawIPOData): number {
    const industry = ipoData.industry || '';
    if (!industry) return 10; // 默认中等分

    // 遍历所有行业分类寻找匹配
    for (const category of Object.values(this.config.industryCategories)) {
      for (const [subIndustry, rule] of Object.entries(category.subIndustries)) {
        // 简化的匹配逻辑：检查行业关键词
        const keywords = rule.description.split(/[、,，]/);
        const found = keywords.some(keyword => 
          industry.toLowerCase().includes(keyword.toLowerCase())
        );
        
        if (found) {
          // 返回分数范围的中位数
          return Math.round((rule.minScore + rule.maxScore) / 2);
        }
      }
    }

    return 10; // 未匹配到特定细分行业
  }

  /**
   * 计算公司规模得分 (15分)
   */
  private calculateSizeScore(ipoData: IRawIPOData): number {
    let marketCapScore = 0;
    let revenueScore = 0;

    // 1. 市值评分 (7.5分)
    const marketCap = this.extractMarketCap(ipoData.marketCap);
    if (marketCap !== null) {
      for (const range of this.config.marketCapRanges) {
        if (marketCap >= range.min && (range.max === null || marketCap < range.max)) {
          marketCapScore = (range.minScore + range.maxScore) / 2;
          break;
        }
      }
    } else {
      marketCapScore = 3.75; // 无数据默认中等分
    }

    // 2. 营收评分 (7.5分)
    const revenue = this.extractRevenue(ipoData);
    if (revenue !== null) {
      for (const range of this.config.revenueRanges) {
        if (revenue >= range.min && (range.max === null || revenue < range.max)) {
          revenueScore = (range.minScore + range.maxScore) / 2;
          break;
        }
      }
    } else {
      revenueScore = 3.75; // 无数据默认中等分
    }

    return marketCapScore + revenueScore;
  }

  /**
   * 从市值字符串中提取数值 (单位: 亿港元)
   */
  private extractMarketCap(marketCapStr?: string): number | null {
    if (!marketCapStr || marketCapStr === '待定') return null;
    
    try {
      // 处理类似 "500亿"、"123.4亿港元" 的格式
      const match = marketCapStr.match(/(\d+(?:\.\d+)?)\s*亿/);
      if (match) {
        return parseFloat(match[1]);
      }
      
      // 处理纯数字
      const num = parseFloat(marketCapStr);
      if (!isNaN(num)) {
        // 假设纯数字单位为亿
        return num;
      }
    } catch (e) {
      console.warn('解析市值失败:', marketCapStr, e);
    }
    
    return null;
  }

  /**
   * 从IPO数据中提取营收数值 (单位: 亿港元)
   */
  private extractRevenue(ipoData: IRawIPOData): number | null {
    if (typeof ipoData.revenue === 'number' && Number.isFinite(ipoData.revenue) && ipoData.revenue > 0) {
      return ipoData.revenue;
    }

    const candidateTexts: string[] = [];
    const rawRevenue = (ipoData as unknown as { revenue?: unknown }).revenue;
    if (typeof rawRevenue === 'string') {
      candidateTexts.push(rawRevenue);
    }

    const description = (ipoData as unknown as { description?: unknown }).description;
    if (typeof description === 'string') {
      candidateTexts.push(description);
    }

    for (const text of candidateTexts) {
      const yiMatch = text.match(/(\d+(?:\.\d+)?)\s*亿/);
      if (yiMatch) {
        const yiValue = parseFloat(yiMatch[1]);
        if (!Number.isNaN(yiValue) && yiValue > 0) {
          return yiValue;
        }
      }

      const wanMatch = text.match(/(\d+(?:\.\d+)?)\s*万/);
      if (wanMatch) {
        const wanValue = parseFloat(wanMatch[1]);
        if (!Number.isNaN(wanValue) && wanValue > 0) {
          return wanValue / 10000;
        }
      }
    }

    return null;
  }

  /**
   * 计算业绩与成长性得分 (18分)
   */
  private calculatePerformanceScore(ipoData: IRawIPOData): number {
    let totalScore = 0;

    // 1. 盈利状况 (8分) - 使用现有数据简化处理
    if (ipoData.profitability === 'profitable') {
      if (ipoData.profitGrowth && ipoData.profitGrowth > 0) {
        totalScore += 7.5; // 盈利且增长
      } else {
        totalScore += 5; // 盈利但波动
      }
    } else if (ipoData.profitability === 'loss') {
      totalScore += 2; // 亏损但收窄/营收高增 (简化)
    } else {
      totalScore += 4; // 默认中等分
    }

    // 2. 营收增速 (6分) - 使用现有数据简化处理
    if (ipoData.profitGrowth !== undefined) {
      const growth = ipoData.profitGrowth;
      if (growth >= 30) {
        totalScore += 5.5;
      } else if (growth >= 15) {
        totalScore += 3.5;
      } else if (growth >= 0) {
        totalScore += 1.5;
      }
      // 负增长不加分
    } else {
      totalScore += 3; // 无数据默认中等分
    }

    // 3. 毛利率 (4分) - 使用现有数据简化处理
    // 暂时没有毛利率数据，给默认分
    totalScore += 2;

    return Math.min(totalScore, 18);
  }

  /**
   * 计算估值与定价得分 (15分)
   */
  private calculateValuationScore(ipoData: IRawIPOData): number {
    // 简化的估值评分逻辑
    const valuationLevel = ipoData.valuationLevel;
    
    if (valuationLevel) {
      switch (valuationLevel) {
        case 'cheap':
          return 14; // 便宜
        case 'fair':
          return 10; // 合理
        case 'premium':
          return 6;  // 偏高
        case 'expensive':
          return 2;  // 昂贵
      }
    }

    // 如果没有估值数据，使用PE/PB对比
    const peRatio = ipoData.peRatio || 0;
    const peerPeAvg = ipoData.peerPeAvg || 0;
    
    if (peRatio > 0 && peerPeAvg > 0) {
      const discount = ((peerPeAvg - peRatio) / peerPeAvg) * 100;
      
      for (const range of this.config.valuationRules.discountLevels) {
        if (discount >= range.min && (range.max === null || discount < range.max)) {
          return (range.minScore + range.maxScore) / 2;
        }
      }
    }

    return 8; // 无数据默认中等分
  }

  /**
   * 计算发行中介与结构得分 (22分)
   */
  private calculateStructureScore(ipoData: IRawIPOData): number {
    let totalScore = 0;

    // 1. 保荐人 (7分)
    const underwriter = ipoData.underwriter || '';
    let foundUnderwriter = false;
    
    for (const [tier, tierConfig] of Object.entries(this.config.underwriterTiers)) {
      if (tierConfig.underwriters.some(u => underwriter.includes(u))) {
        totalScore += (tierConfig.minScore + tierConfig.maxScore) / 2;
        foundUnderwriter = true;
        break;
      }
    }
    
    if (!foundUnderwriter && underwriter) {
      totalScore += 2; // 未知保荐人
    }

    // 2. 律师事务所 (3分) - 暂时没有数据
    totalScore += 1.5; // 默认中等分

    // 3. 审计师 (3分) - 暂时没有数据
    totalScore += 1.5; // 默认中等分

    // 4. 基石投资者 (5分)
    if (ipoData.cornerstone) {
      const starInvestors = ipoData.starInvestors || [];
      const topInvestors = ['腾讯', '阿里', '百度', '京东', '美团', '字节', '红杉', '高瓴'];
      const topInvestorCount = starInvestors.filter(inv => 
        topInvestors.some(ti => inv.includes(ti))
      ).length;
      
      if (topInvestorCount >= 2) {
        totalScore += 4.5; // 强基石
      } else {
        totalScore += 2.5; // 一般基石
      }
    } else {
      totalScore += 0.5; // 无基石
    }

    // 5. 绿鞋 (超额配售权) (4分)
    if (ipoData.hasGreenshoe) {
      totalScore += 4;
    }

    return totalScore;
  }

  /**
   * 计算合规与风险得分 (10分)
   */
  private calculateComplianceScore(ipoData: IRawIPOData): number {
    let totalScore = 0;

    // 简化的合规风险评分
    // 实际项目中应根据具体风险数据计算
    
    // 回拨机制 (5分) - 暂时没有数据
    totalScore += 3; // 默认中等分

    // 募资用途 (3分) - 暂时没有数据
    totalScore += 1.5; // 默认中等分

    // 重大风险 (2分) - 暂时没有数据
    totalScore += 1; // 默认中等分

    return totalScore;
  }

  /**
   * 获取评分详情
   */
  getScoreDetails(ipoData: IRawIPOData): {
    items: Array<{ label: string; value: number; maxScore: number; description: string; reason?: string }>;
    total: number;
  } {
    const items: Array<{ label: string; value: number; maxScore: number; description: string; reason?: string }> = [];
    let total = 0;

    // 1. 赛道与细分行业
    const industryScore = this.calculateIndustryScore(ipoData);
    items.push({
      label: '赛道与细分行业',
      value: industryScore,
      maxScore: 20,
      description: ipoData.industry || '未披露',
      reason: ipoData.industry ? `${ipoData.industry}行业，根据行业热度和成长性评分` : '行业信息未披露'
    });
    total += industryScore;

    // 2. 公司规模
    const sizeScore = this.calculateSizeScore(ipoData);
    const marketCap = this.extractMarketCap(ipoData.marketCap);
    items.push({
      label: '公司规模',
      value: sizeScore,
      maxScore: 15,
      description: `市值: ${marketCap !== null ? marketCap + '亿港元' : '待定'} | 营收: 招股书数据`,
      reason: marketCap !== null ? `市值${marketCap}亿港元，根据规模评分` : '市值信息待定'
    });
    total += sizeScore;

    // 3. 业绩与成长性
    const performanceScore = this.calculatePerformanceScore(ipoData);
    let perfDesc = '招股书数据';
    let perfReason = '根据招股书业绩数据评分';
    if (ipoData.profitability === 'profitable') {
      perfDesc = `盈利${ipoData.profitGrowth && ipoData.profitGrowth > 0 ? '且增长' : ''}`;
      perfReason = ipoData.profitGrowth && ipoData.profitGrowth > 0 
        ? `公司盈利且利润增长${(ipoData.profitGrowth * 100).toFixed(1)}%` 
        : '公司盈利';
    } else if (ipoData.profitability === 'loss') {
      perfDesc = '亏损中';
      perfReason = '公司目前处于亏损状态';
    }
    items.push({
      label: '业绩与成长性',
      value: performanceScore,
      maxScore: 18,
      description: perfDesc,
      reason: perfReason
    });
    total += performanceScore;

    // 4. 估值与定价
    const valuationScore = this.calculateValuationScore(ipoData);
    let valDesc = '招股书数据';
    let valReason = '根据估值水平评分';
    if (ipoData.valuationLevel) {
      const valMap: Record<string, string> = {
        cheap: '估值便宜',
        fair: '估值合理',
        premium: '估值偏高',
        expensive: '估值昂贵'
      };
      valDesc = valMap[ipoData.valuationLevel] || ipoData.valuationLevel;
      valReason = ipoData.valuationReason || valDesc;
    }
    items.push({
      label: '估值与定价',
      value: valuationScore,
      maxScore: 15,
      description: valDesc,
      reason: valReason
    });
    total += valuationScore;

    // 5. 发行中介与结构
    const structureScore = this.calculateStructureScore(ipoData);
    let structureDesc = '';
    let structureReason = '根据发行结构和中介机构评分';
    if (ipoData.underwriter) structureDesc += `保荐: ${ipoData.underwriter} `;
    if (ipoData.cornerstone) structureDesc += `有基石 `;
    if (ipoData.hasGreenshoe) structureDesc += `有绿鞋`;
    if (ipoData.underwriter) structureReason = `保荐人${ipoData.underwriter}`;
    if (ipoData.cornerstone) structureReason += '，有基石投资者';
    if (ipoData.hasGreenshoe) structureReason += '，有绿鞋机制';
    items.push({
      label: '发行中介与结构',
      value: structureScore,
      maxScore: 22,
      description: structureDesc || '招股书数据',
      reason: structureReason
    });
    total += structureScore;

    // 6. 合规与风险
    const complianceScore = this.calculateComplianceScore(ipoData);
    items.push({
      label: '合规与风险',
      value: complianceScore,
      maxScore: 10,
      description: '回拨机制、募资用途、重大风险等',
      reason: '根据合规性和风险因素评分'
    });
    total += complianceScore;

    return { items, total };
  }

  /**
   * 根据评分获取等级
   */
  getGrade(score: number): string {
    if (score >= 90) return 'S';
    if (score >= 85) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 75) return 'A-';
    if (score >= 70) return 'B+';
    if (score >= 65) return 'B';
    if (score >= 60) return 'B-';
    if (score >= 55) return 'C+';
    if (score >= 50) return 'C';
    if (score >= 45) return 'C-';
    if (score >= 40) return 'D+';
    if (score >= 35) return 'D';
    if (score >= 30) return 'D-';
    return 'F';
  }

  /**
   * 生成港股打新策略建议
   */
  generateStrategy(score: number, grade: string): {
    recommendation: string;
    action: string;
    riskLevel: string;
    expectedReturn: string;
    allocation: string;
  } {
    if (score >= 85) {
      return {
        recommendation: '强烈推荐',
        action: '积极融资申购，可上杠杆',
        riskLevel: '极低',
        expectedReturn: '50-100%',
        allocation: '重仓 (30-50%资金)'
      };
    } else if (score >= 75) {
      return {
        recommendation: '推荐',
        action: '融资申购，关注市场情绪',
        riskLevel: '低',
        expectedReturn: '30-60%',
        allocation: '中等仓位 (20-30%资金)'
      };
    } else if (score >= 65) {
      return {
        recommendation: '谨慎推荐',
        action: '现金申购为主，适量融资',
        riskLevel: '中低',
        expectedReturn: '20-40%',
        allocation: '轻仓 (10-20%资金)'
      };
    } else if (score >= 55) {
      return {
        recommendation: '观望',
        action: '少量现金申购，保持关注',
        riskLevel: '中等',
        expectedReturn: '10-25%',
        allocation: '极小仓位 (5-10%资金)'
      };
    } else if (score >= 45) {
      return {
        recommendation: '不推荐',
        action: '避免申购，等待更好机会',
        riskLevel: '高',
        expectedReturn: '0-15%',
        allocation: '不参与'
      };
    } else {
      return {
        recommendation: '强烈不推荐',
        action: '坚决不参与',
        riskLevel: '极高',
        expectedReturn: '亏损风险大',
        allocation: '不参与'
      };
    }
  }
}

export default new HKIPOScoringService();
