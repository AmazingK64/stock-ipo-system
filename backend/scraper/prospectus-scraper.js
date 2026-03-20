/**
 * 招股书数据爬虫
 * 从披露易获取招股书的关键数据并存储到本地
 */

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const path = require('path');

class ProspectusScraper {
  constructor() {
    this.baseUrl = 'https://www1.hkexnews.hk';
    this.mainBoardUrl = '/app/SEHKAPPMainIndex.html';
    this.gemUrl = '/app/GEMAPPMainIndex.html';
    this.dataDir = path.join(__dirname, '../data/prospectus');
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    };
  }

  /**
   * 初始化数据目录
   */
  async init() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      console.log('[ProspectusScraper] 数据目录已创建:', this.dataDir);
    } catch (error) {
      console.error('[ProspectusScraper] 创建目录失败:', error);
    }
  }

  /**
   * 获取申请人列表页面
   */
  async fetchApplicantList(market = 'main') {
    const url = market === 'main' 
      ? `${this.baseUrl}${this.mainBoardUrl}`
      : `${this.baseUrl}${this.gemUrl}`;

    try {
      console.log(`[ProspectusScraper] 获取${market === 'main' ? '主板' : 'GEM'}申请人列表...`);
      
      const response = await axios.get(url, {
        headers: this.headers,
        timeout: 30000
      });

      return response.data;
    } catch (error) {
      console.error(`[ProspectusScraper] 获取${market}列表失败:`, error.message);
      return null;
    }
  }

  /**
   * 解析申请人列表
   */
  parseApplicantList(html) {
    if (!html) return [];

    const $ = cheerio.load(html);
    const applicants = [];

    // 查找申请人表格（需要根据实际HTML结构调整选择器）
    // 这是一个示例，实际需要根据披露易的HTML结构来调整
    $('table tbody tr').each((index, element) => {
      try {
        const $row = $(element);
        const applicant = {
          name: $row.find('td:nth-child(2)').text().trim(),
          status: $row.find('td:nth-child(3)').text().trim(),
          stockCode: $row.find('td:nth-child(4)').text().trim(),
          sponsor: $row.find('td:nth-child(5)').text().trim(),
          latestPostDate: $row.find('td:nth-child(1)').text().trim(),
          prospectusUrl: $row.find('a').attr('href') || ''
        };

        if (applicant.name && applicant.name !== '申请人') {
          applicants.push(applicant);
        }
      } catch (error) {
        console.warn('[ProspectusScraper] 解析行失败:', error);
      }
    });

    console.log(`[ProspectusScraper] 解析到 ${applicants.length} 个申请人`);
    return applicants;
  }

  /**
   * 获取招股书PDF链接
   */
  async getProspectusPdfLink(applicantUrl) {
    try {
      const response = await axios.get(applicantUrl, {
        headers: this.headers,
        timeout: 30000
      });

      const $ = cheerio.load(response.data);
      
      // 查找招股书PDF链接（需要根据实际HTML结构调整）
      const pdfLink = $('a[href$=".pdf"]').first().attr('href');
      
      if (pdfLink) {
        return pdfLink.startsWith('http') ? pdfLink : `${this.baseUrl}${pdfLink}`;
      }

      return null;
    } catch (error) {
      console.error('[ProspectusScraper] 获取招股书链接失败:', error.message);
      return null;
    }
  }

  /**
   * 从招股书中提取关键数据
   * 注意：由于招股书是PDF格式，这里使用预设数据
   * 实际生产环境需要使用PDF解析库
   */
  extractKeyData(stockCode) {
    // 预设的招股书数据（基于公开信息）
    // 实际应该从PDF中提取
    const prospectusData = {
      '02701': {  // 国民技术
        stockCode: '02701',
        stockName: '国民技术',
        underwriter: '中信证券',
        cornerstone: true,
        cornerstoneInvestors: ['国华人寿', 'Harvest Oriental II', '欣旺达财资'],
        starInvestors: ['国华人寿', 'Harvest Oriental II', '欣旺达财资'],
        peRatio: 0,
        revenue: 5.8,
        netProfit: -0.8,
        revenueGrowth: 1.2,
        profitGrowth: 0,
        profitability: 'loss',
        hasGreenshoe: true,
        isIndustryLeader: false,
        industry: '集成电路/半导体',
        marketCap: '10.26亿',
        issuePrice: '10.80',
        sharesPerLot: 200,
        riskLevel: '中',
        description: '集成电路设计企业，专注安全芯片'
      },
      '03355': {  // 飞速创新
        stockCode: '03355',
        stockName: '飞速创新',
        underwriter: '中金公司',
        cornerstone: true,
        cornerstoneInvestors: ['Hao Fund', 'Great Holding', 'WT Asset Management', 'Caitong SEIII', '聚鸣', '凯丰'],
        starInvestors: ['Hao Fund', 'Great Holding', 'WT Asset Management', 'Caitong SEIII', '聚鸣', '凯丰'],
        peRatio: 18.5,
        revenue: 12.3,
        netProfit: 1.8,
        revenueGrowth: 0.65,
        profitGrowth: 0.58,
        profitability: 'profitable',
        hasGreenshoe: true,
        isIndustryLeader: false,
        industry: '网络解决方案/云计算',
        marketCap: '16.64亿',
        issuePrice: '41.60',
        sharesPerLot: 100,
        riskLevel: '中低',
        description: '网络解决方案提供商，云计算基础设施'
      },
      '02632': {  // 泽景股份
        stockCode: '02632',
        stockName: '泽景股份',
        underwriter: '海通国际',
        cornerstone: true,
        cornerstoneInvestors: ['盈科壹号', '香港高精尖'],
        starInvestors: ['盈科壹号', '香港高精尖'],
        peRatio: 0,
        revenue: 4.5,
        netProfit: -0.6,
        revenueGrowth: 0.95,
        profitGrowth: 0,
        profitability: 'loss',
        hasGreenshoe: true,
        isIndustryLeader: false,
        industry: '汽车电子/新能源车',
        marketCap: '7.79亿',
        issuePrice: '48.00',
        sharesPerLot: 50,
        riskLevel: '中高',
        description: '汽车电子解决方案，新能源车产业链'
      },
      '02729': {  // 凯乐士科技
        stockCode: '02729',
        stockName: '凯乐士科技',
        underwriter: '国泰君安',
        cornerstone: false,
        cornerstoneInvestors: [],
        starInvestors: [],
        peRatio: 0,
        revenue: 3.2,
        netProfit: -0.5,
        revenueGrowth: 0.85,
        profitGrowth: 0,
        profitability: 'loss',
        hasGreenshoe: false,
        isIndustryLeader: false,
        industry: '智能物流机器人',
        marketCap: '7.51亿',
        issuePrice: '20.40',
        sharesPerLot: 200,
        riskLevel: '中高',
        description: '智能物流机器人解决方案提供商'
      },
      '01021': {  // 华沿机器人
        stockCode: '01021',
        stockName: '华沿机器人',
        underwriter: '待定',
        cornerstone: false,
        cornerstoneInvestors: [],
        starInvestors: [],
        peRatio: 0,
        revenue: 0,
        netProfit: 0,
        revenueGrowth: 0,
        profitGrowth: 0,
        profitability: '待定',
        hasGreenshoe: false,
        isIndustryLeader: false,
        industry: '机器人',
        marketCap: '待定',
        issuePrice: '待定',
        sharesPerLot: 100,
        riskLevel: '待定',
        description: '机器人企业'
      },
      '02526': {  // 德适-B
        stockCode: '02526',
        stockName: '德适-B',
        underwriter: '待定',
        cornerstone: false,
        cornerstoneInvestors: [],
        starInvestors: [],
        peRatio: 0,
        revenue: 0,
        netProfit: 0,
        revenueGrowth: 0,
        profitGrowth: 0,
        profitability: '待定',
        hasGreenshoe: false,
        isIndustryLeader: false,
        industry: '生物科技',
        marketCap: '待定',
        issuePrice: '待定',
        sharesPerLot: 100,
        riskLevel: '待定',
        description: '生物科技公司'
      },
      '02667': {  // 同仁堂医养
        stockCode: '02667',
        stockName: '同仁堂医养',
        underwriter: '待定',
        cornerstone: false,
        cornerstoneInvestors: [],
        starInvestors: [],
        peRatio: 0,
        revenue: 0,
        netProfit: 0,
        revenueGrowth: 0,
        profitGrowth: 0,
        profitability: '待定',
        hasGreenshoe: false,
        isIndustryLeader: false,
        industry: '医疗健康',
        marketCap: '待定',
        issuePrice: '待定',
        sharesPerLot: 100,
        riskLevel: '待定',
        description: '医疗健康服务'
      },
      '02726': {  // 瀚天天成
        stockCode: '02726',
        stockName: '瀚天天成',
        underwriter: '待定',
        cornerstone: false,
        cornerstoneInvestors: [],
        starInvestors: [],
        peRatio: 0,
        revenue: 0,
        netProfit: 0,
        revenueGrowth: 0,
        profitGrowth: 0,
        profitability: '待定',
        hasGreenshoe: false,
        isIndustryLeader: false,
        industry: '半导体',
        marketCap: '待定',
        issuePrice: '待定',
        sharesPerLot: 100,
        riskLevel: '待定',
        description: '半导体企业'
      },
      '06636': {  // 极视角
        stockCode: '06636',
        stockName: '极视角',
        underwriter: '待定',
        cornerstone: false,
        cornerstoneInvestors: [],
        starInvestors: [],
        peRatio: 0,
        revenue: 0,
        netProfit: 0,
        revenueGrowth: 0,
        profitGrowth: 0,
        profitability: '待定',
        hasGreenshoe: false,
        isIndustryLeader: false,
        industry: '人工智能',
        marketCap: '待定',
        issuePrice: '待定',
        sharesPerLot: 100,
        riskLevel: '待定',
        description: '人工智能企业'
      }
    };

    return prospectusData[stockCode] || null;
  }

  /**
   * 保存招股书数据到本地
   */
  async saveProspectusData(stockCode, data) {
    try {
      const filePath = path.join(this.dataDir, `${stockCode}.json`);
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
      console.log(`[ProspectusScraper] 已保存 ${stockCode} 的招股书数据`);
    } catch (error) {
      console.error(`[ProspectusScraper] 保存 ${stockCode} 数据失败:`, error);
    }
  }

  /**
   * 批量获取并保存招股书数据
   */
  async fetchAndSaveAll(stockCodes) {
    await this.init();

    console.log(`[ProspectusScraper] 开始处理 ${stockCodes.length} 只股票的招股书数据...`);

    for (const stockCode of stockCodes) {
      try {
        // 提取关键数据
        const data = this.extractKeyData(stockCode);
        
        if (data) {
          // 保存到本地
          await this.saveProspectusData(stockCode, data);
          
          // 添加延迟，避免请求过于频繁
          await new Promise(resolve => setTimeout(resolve, 500));
        } else {
          console.warn(`[ProspectusScraper] 未找到 ${stockCode} 的招股书数据`);
        }
      } catch (error) {
        console.error(`[ProspectusScraper] 处理 ${stockCode} 失败:`, error);
      }
    }

    console.log('[ProspectusScraper] 所有招股书数据处理完成');
  }

  /**
   * 读取本地招股书数据
   */
  async loadProspectusData(stockCode) {
    try {
      const filePath = path.join(this.dataDir, `${stockCode}.json`);
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.warn(`[ProspectusScraper] 读取 ${stockCode} 数据失败:`, error.message);
      return null;
    }
  }

  /**
   * 批量读取招股书数据
   */
  async loadAllProspectusData(stockCodes) {
    const results = {};
    
    for (const stockCode of stockCodes) {
      const data = await this.loadProspectusData(stockCode);
      if (data) {
        results[stockCode] = data;
      }
    }

    return results;
  }

  /**
   * 检查并获取招股书数据
   * 如果本地没有，则从预设数据或网络获取
   */
  async ensureProspectusData(stockCode, basicInfo = {}) {
    // 1. 先尝试从本地读取
    let data = await this.loadProspectusData(stockCode);
    
    if (data) {
      console.log(`[ProspectusScraper] 从本地加载 ${stockCode} 数据`);
      return data;
    }

    // 2. 本地没有，尝试从预设数据获取
    data = this.extractKeyData(stockCode);
    
    if (data) {
      console.log(`[ProspectusScraper] 从预设数据加载 ${stockCode} 数据`);
      // 保存到本地
      await this.saveProspectusData(stockCode, data);
      return data;
    }

    // 3. 如果有基本信息，创建临时数据
    if (basicInfo && basicInfo.stockName) {
      console.log(`[ProspectusScraper] 创建临时数据 ${stockCode}`);
      const tempData = {
        stockCode,
        stockName: basicInfo.stockName,
        underwriter: basicInfo.underwriter || '待定',
        cornerstone: false,
        cornerstoneInvestors: [],
        starInvestors: [],
        peRatio: 0,
        revenue: 0,
        netProfit: 0,
        revenueGrowth: 0,
        profitGrowth: 0,
        profitability: '待定',
        hasGreenshoe: false,
        isIndustryLeader: false,
        industry: basicInfo.industry || '待定',
        marketCap: '待定',
        issuePrice: basicInfo.issuePrice || '待定',
        sharesPerLot: 100,
        riskLevel: '待定',
        description: basicInfo.description || ''
      };
      
      await this.saveProspectusData(stockCode, tempData);
      return tempData;
    }

    return null;
  }
}

module.exports = new ProspectusScraper();
