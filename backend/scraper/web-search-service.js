/**
 * IPO评分数据网络搜索服务
 * 当招股书本地数据缺少商业模式、估值等评分维度时，
 * 自动从网络搜索并通过AI分析提取结构化数据
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class WebSearchService {
  constructor() {
    // AI分析API（使用WorkBuddy内置的AI能力或外部API）
    this.aiApiUrl = process.env.AI_API_URL || null;
    this.aiApiKey = process.env.AI_API_KEY || null;
    // 搜索API（使用SerpAPI或类似服务）
    this.serpApiKey = process.env.SERP_API_KEY || null;
    // 缓存目录
    this.cacheDir = path.join(__dirname, '../data/search-cache');
  }

  /**
   * 搜索IPO公司的商业模式、估值等信息
   * @param {string} stockCode - 股票代码
   * @param {string} stockName - 股票名称
   * @param {object} basicInfo - 已有的基本信息（行业、盈利等）
   * @returns {Promise<object|null>} 分析结果
   */
  async searchIPOAnalysis(stockCode, stockName, basicInfo = {}) {
    if (!stockCode || !stockName) {
      console.warn('[WebSearch] 缺少股票代码或名称，跳过搜索');
      return null;
    }

    // 1. 检查缓存
    const cached = await this.loadCache(stockCode);
    if (cached && this.isCacheValid(cached)) {
      console.log(`[WebSearch] 使用缓存数据 ${stockCode} ${stockName}`);
      return cached;
    }

    try {
      console.log(`[WebSearch] 开始搜索 ${stockCode} ${stockName} 的评分数据...`);

      // 2. 构建搜索查询
      const searchQueries = this.buildSearchQueries(stockName, basicInfo);

      // 3. 执行搜索
      const searchResults = await this.executeSearches(searchQueries);

      if (!searchResults || searchResults.length === 0) {
        console.warn(`[WebSearch] ${stockName} 搜索结果为空`);
        return null;
      }

      // 4. AI分析搜索结果
      const analysis = await this.analyzeWithAI(stockName, searchResults, basicInfo);

      if (analysis) {
        // 5. 保存缓存
        await this.saveCache(stockCode, analysis);
        console.log(`[WebSearch] ${stockName} 分析完成:`, JSON.stringify(analysis, null, 2));
      }

      return analysis;
    } catch (error) {
      console.error(`[WebSearch] 搜索 ${stockName} 失败:`, error.message);
      return null;
    }
  }

  /**
   * 构建搜索查询列表
   */
  buildSearchQueries(stockName, basicInfo = {}) {
    const queries = [];

    // 搜索1: 商业模式
    queries.push({
      type: 'business_model',
      query: `${stockName} 港股IPO 商业模式 护城河 竞争优势`,
      fallbackQuery: `${stockName} 招股书 业务模式 核心竞争力`
    });

    // 搜索2: 估值信息
    if (basicInfo.profitability === 'loss') {
      queries.push({
        type: 'valuation',
        query: `${stockName} IPO 估值 市净率 同行对比 亏损`,
        fallbackQuery: `${stockName} 上市 估值 定价 行业平均`
      });
    } else {
      queries.push({
        type: 'valuation',
        query: `${stockName} IPO 估值 市盈率 同行对比`,
        fallbackQuery: `${stockName} 上市 PE PB 行业估值`
      });
    }

    // 搜索3: 行业概况
    if (basicInfo.industry) {
      queries.push({
        type: 'industry',
        query: `${basicInfo.industry} 行业 市场规模 龙头企业 平均估值 2025`,
        fallbackQuery: `${basicInfo.industry} 港股 平均市盈率 平均市净率`
      });
    }

    // 搜索4: AH股信息
    queries.push({
      type: 'ah_info',
      query: `${stockName} A股 港股 折价 AH股`,
      fallbackQuery: `${stockName} 双重上市 A+H`
    });

    return queries;
  }

  /**
   * 执行网络搜索
   */
  async executeSearches(queries) {
    const allResults = [];

    for (const query of queries) {
      try {
        let result = null;

        // 优先使用SerpAPI
        if (this.serpApiKey) {
          result = await this.searchWithSerpAPI(query.query || query.fallbackQuery);
        }

        // 降级：使用免费搜索
        if (!result) {
          result = await this.searchWithDuckDuckGo(query.query || query.fallbackQuery);
        }

        if (result) {
          allResults.push({
            type: query.type,
            query: query.query,
            results: result
          });
        }
      } catch (error) {
        console.warn(`[WebSearch] 搜索 "${query.type}" 失败:`, error.message);
      }

      // 搜索间隔，避免被限制
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    return allResults;
  }

  /**
   * 使用SerpAPI搜索
   */
  async searchWithSerpAPI(query) {
    try {
      const response = await axios.get('https://serpapi.com/search', {
        params: {
          q: query,
          api_key: this.serpApiKey,
          hl: 'zh-cn',
          num: 8,
          engine: 'google'
        },
        timeout: 15000
      });

      const organic = response.data?.organic_results || [];
      return organic.slice(0, 5).map(item => ({
        title: item.title,
        snippet: item.snippet || '',
        url: item.link
      }));
    } catch (error) {
      console.warn('[WebSearch] SerpAPI搜索失败:', error.message);
      return null;
    }
  }

  /**
   * 使用DuckDuckGo免费搜索
   */
  async searchWithDuckDuckGo(query) {
    try {
      const response = await axios.get('https://html.duckduckgo.com/html/', {
        params: { q: query },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        },
        timeout: 15000
      });

      const results = [];
      const html = response.data;

      // 简单解析DuckDuckGo HTML结果
      const resultRegex = /<a rel="nofollow" class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
      let match;

      let count = 0;
      while ((match = resultRegex.exec(html)) !== null && count < 5) {
        results.push({
          title: match[2].replace(/<[^>]*>/g, '').trim(),
          snippet: match[3].replace(/<[^>]*>/g, '').trim(),
          url: match[1]
        });
        count++;
      }

      if (results.length === 0) {
        // 备用解析方式
        const snippetRegex = /class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
        while ((match = snippetRegex.exec(html)) !== null && count < 5) {
          results.push({
            title: '',
            snippet: match[1].replace(/<[^>]*>/g, '').trim(),
            url: ''
          });
          count++;
        }
      }

      return results.length > 0 ? results : null;
    } catch (error) {
      console.warn('[WebSearch] DuckDuckGo搜索失败:', error.message);
      return null;
    }
  }

  /**
   * 使用AI分析搜索结果，提取结构化评分数据
   * 
   * 策略：将搜索结果拼接为文本，构建prompt让AI分析
   * 如果没有AI API，则使用关键词匹配做简单分析
   */
  async analyzeWithAI(stockName, searchResults, basicInfo = {}) {
    // 拼接搜索结果文本
    const searchContext = searchResults.map(group => {
      const items = (group.results || []).map(r => `- ${r.title}: ${r.snippet}`).join('\n');
      return `【${group.type}】\n${items}`;
    }).join('\n\n');

    // 如果有AI API，使用AI分析
    if (this.aiApiUrl && this.aiApiKey) {
      return await this.analyzeWithAIAPI(stockName, searchContext, basicInfo);
    }

    // 否则使用关键词匹配做简单分析
    return this.analyzeWithKeywords(stockName, searchContext, basicInfo);
  }

  /**
   * 调用AI API分析
   */
  async analyzeWithAIAPI(stockName, searchContext, basicInfo) {
    try {
      const prompt = `你是一位港股IPO分析专家。请根据以下关于"${stockName}"的搜索结果，分析并提取结构化数据。

公司信息:
- 股票名称: ${stockName}
- 行业: ${basicInfo.industry || '未知'}
- 盈利状况: ${basicInfo.profitability === 'loss' ? '亏损' : basicInfo.profitability === 'profitable' ? '盈利' : '未知'}
- 营收: ${basicInfo.revenue || '未知'}亿
- 已有描述: ${basicInfo.description || '无'}

搜索结果:
${searchContext}

请严格按以下JSON格式回复，不要加任何其他文字:
{
  "businessModel": "excellent|good|fair|poor",
  "businessModelReason": "一句话说明商业模式评分理由",
  "moatLevel": "wide|moderate|narrow|none",
  "moatReason": "一句话说明护城河评分理由",
  "valuationLevel": "cheap|fair|premium|expensive",
  "valuationReason": "一句话说明估值评分理由",
  "hasAShare": true/false,
  "aShareCode": "A股代码或null",
  "aSharePrice": A股价格(数字)或null,
  "ahDiscount": 折价率(数字,百分比)或null,
  "peerPeAvg": 同行平均PE(数字)或null,
  "peerPbAvg": 同行平均PB(数字)或null,
  "lastRoundValuation": "最后一轮融资估值(文字)或null"
}

评分标准:
- businessModel: excellent=商业模式清晰可持续有壁垒, good=较清晰有一定优势, fair=一般无明显优势, poor=不清晰或不可持续
- moatLevel: wide=技术/品牌/规模壁垒高, moderate=有一定壁垒, narrow=壁垒有限, none=无壁垒
- valuationLevel: cheap=显著低于同行, fair=与同行相当, premium=高于同行, expensive=远高于同行
- 亏损企业不应因此被评为poor或expensive，要看行业前景和增长潜力`;

      const response = await axios.post(this.aiApiUrl, {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: '你是港股IPO分析专家，只返回JSON格式结果，不要加markdown代码块标记。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 1000
      }, {
        headers: {
          'Authorization': `Bearer ${this.aiApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      const content = response.data?.choices?.[0]?.message?.content || '';
      // 尝试解析JSON（可能被markdown代码块包裹）
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return null;
    } catch (error) {
      console.error('[WebSearch] AI分析失败:', error.message);
      // 降级到关键词分析
      return this.analyzeWithKeywords(stockName, searchContext, basicInfo);
    }
  }

  /**
   * 基于关键词匹配的简单分析（AI API不可用时的降级方案）
   */
  analyzeWithKeywords(stockName, searchContext, basicInfo = {}) {
    const result = {
      businessModel: null,
      businessModelReason: '',
      moatLevel: null,
      moatReason: '',
      valuationLevel: null,
      valuationReason: '',
      hasAShare: null,
      aShareCode: null,
      aSharePrice: null,
      ahDiscount: null,
      peerPeAvg: null,
      peerPbAvg: null,
      lastRoundValuation: null
    };

    const context = searchContext.toLowerCase();

    // ===== 商业模式分析 =====
    const excellentKeywords = ['龙头', '领先', '第一', '垄断', '独占', '稀缺', '行业标杆', '标杆企业'];
    const goodKeywords = ['技术壁垒', '专利', '研发投入', '领先技术', '竞争优势', '差异化', '自主知识产权', '核心技术'];
    const poorKeywords = ['同质化', '竞争激烈', '红海', '毛利率低', '无壁垒', '依赖代工'];

    let bmScore = 0;
    let bmMatches = [];
    for (const kw of excellentKeywords) {
      if (context.includes(kw)) { bmScore += 3; bmMatches.push(kw); }
    }
    for (const kw of goodKeywords) {
      if (context.includes(kw)) { bmScore += 2; bmMatches.push(kw); }
    }
    for (const kw of poorKeywords) {
      if (context.includes(kw)) { bmScore -= 2; bmMatches.push(kw); }
    }

    if (bmScore >= 4) {
      result.businessModel = 'excellent';
      result.businessModelReason = `搜索发现关键词: ${bmMatches.slice(0, 3).join('、')}`;
    } else if (bmScore >= 2) {
      result.businessModel = 'good';
      result.businessModelReason = `搜索发现关键词: ${bmMatches.slice(0, 3).join('、')}`;
    } else if (bmScore >= 0) {
      result.businessModel = 'fair';
      result.businessModelReason = '搜索结果未发现明显的竞争优势关键词';
    } else {
      result.businessModel = 'poor';
      result.businessModelReason = `搜索发现风险关键词: ${bmMatches.slice(0, 3).join('、')}`;
    }

    // ===== 护城河分析 =====
    const wideMoatKeywords = ['品牌', '护城河', '壁垒高', '市场份额', '网络效应', '规模效应', '转换成本'];
    const narrowMoatKeywords = ['技术门槛', '门槛较低', '易模仿', '替代品'];

    let moatScore = 0;
    let moatMatches = [];
    for (const kw of wideMoatKeywords) {
      if (context.includes(kw)) { moatScore += 2; moatMatches.push(kw); }
    }
    for (const kw of narrowMoatKeywords) {
      if (context.includes(kw)) { moatScore -= 1; moatMatches.push(kw); }
    }

    if (moatScore >= 3) {
      result.moatLevel = 'wide';
      result.moatReason = `关键词: ${moatMatches.slice(0, 3).join('、')}`;
    } else if (moatScore >= 1) {
      result.moatLevel = 'moderate';
      result.moatReason = `关键词: ${moatMatches.slice(0, 3).join('、')}`;
    } else if (moatScore >= 0) {
      result.moatLevel = 'narrow';
      result.moatReason = '未发现强护城河指标';
    } else {
      result.moatLevel = 'narrow';
      result.moatReason = `风险关键词: ${moatMatches.slice(0, 3).join('、')}`;
    }

    // ===== 估值分析 =====
    const cheapKeywords = ['低估', '便宜', '折价', '低于', '安全边际', '估值底部'];
    const expensiveKeywords = ['高估', '溢价', '高于同行', '估值偏高', '泡沫', '昂贵'];

    let valScore = 0;
    let valMatches = [];
    for (const kw of cheapKeywords) {
      if (context.includes(kw)) { valScore += 2; valMatches.push(kw); }
    }
    for (const kw of expensiveKeywords) {
      if (context.includes(kw)) { valScore -= 2; valMatches.push(kw); }
    }

    if (valScore >= 2) {
      result.valuationLevel = 'cheap';
      result.valuationReason = `关键词: ${valMatches.join('、')}`;
    } else if (valScore >= 0) {
      result.valuationLevel = 'fair';
      result.valuationReason = '未发现明显估值异常';
    } else {
      result.valuationLevel = 'premium';
      result.valuationReason = `关键词: ${valMatches.join('、')}`;
    }

    // ===== AH股检测 =====
    const ahMatch = searchContext.match(/a股.*?(\d{6})/i);
    if (ahMatch) {
      result.hasAShare = true;
      result.aShareCode = ahMatch[1];
    }

    // 折价检测
    const discountMatch = searchContext.match(/折价.*?(\d+)/);
    if (discountMatch) {
      result.ahDiscount = parseInt(discountMatch[1]);
    }

    return result;
  }

  /**
   * 检查IPO数据是否缺少评分维度
   * @param {object} ipoData - IPO数据
   * @returns {boolean} 是否需要搜索补充
   */
  needsSearch(ipoData) {
    if (!ipoData) return false;
    return !ipoData.businessModel || !ipoData.valuationLevel || !ipoData.moatLevel;
  }

  /**
   * 缓存管理
   */
  async initCacheDir() {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
    } catch (error) {
      console.warn('[WebSearch] 创建缓存目录失败:', error.message);
    }
  }

  async loadCache(stockCode) {
    try {
      const filePath = path.join(this.cacheDir, `${stockCode}.json`);
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  async saveCache(stockCode, data) {
    try {
      await this.initCacheDir();
      const cacheData = {
        ...data,
        cachedAt: new Date().toISOString(),
        source: 'web_search'
      };
      const filePath = path.join(this.cacheDir, `${stockCode}.json`);
      await fs.writeFile(filePath, JSON.stringify(cacheData, null, 2), 'utf-8');
    } catch (error) {
      console.warn('[WebSearch] 保存缓存失败:', error.message);
    }
  }

  isCacheValid(cached) {
    if (!cached.cachedAt) return false;
    const cacheTime = new Date(cached.cachedAt);
    const now = new Date();
    const diffHours = (now - cacheTime) / (1000 * 60 * 60);
    return diffHours < 24; // 缓存24小时有效
  }

  /**
   * 批量搜索并补充评分数据
   * @param {Array} ipoList - IPO数据列表
   * @returns {Promise<Array>} 补充后的IPO数据列表
   */
  async batchEnrich(ipoList) {
    if (!ipoList || ipoList.length === 0) return ipoList;

    const enrichedList = [];
    let searchCount = 0;

    for (const ipo of ipoList) {
      if (this.needsSearch(ipo)) {
        const analysis = await this.searchIPOAnalysis(
          ipo.stockCode,
          ipo.stockName,
          ipo
        );

        if (analysis) {
          searchCount++;
          enrichedList.push({
            ...ipo,
            // 合并搜索结果，只覆盖空值
            businessModel: analysis.businessModel || ipo.businessModel,
            businessModelReason: analysis.businessModelReason || ipo.businessModelReason,
            moatLevel: analysis.moatLevel || ipo.moatLevel,
            moatReason: analysis.moatReason || ipo.moatReason,
            valuationLevel: analysis.valuationLevel || ipo.valuationLevel,
            valuationReason: analysis.valuationReason || ipo.valuationReason,
            hasAShare: analysis.hasAShare ?? ipo.hasAShare,
            aShareCode: analysis.aShareCode || ipo.aShareCode,
            aSharePrice: analysis.aSharePrice || ipo.aSharePrice,
            ahDiscount: analysis.ahDiscount ?? ipo.ahDiscount,
            peerPeAvg: analysis.peerPeAvg || ipo.peerPeAvg,
            peerPbAvg: analysis.peerPbAvg || ipo.peerPbAvg,
          });
          console.log(`[WebSearch] ${ipo.stockCode} ${ipo.stockName} 评分数据已补充`);
        } else {
          enrichedList.push(ipo);
        }
      } else {
        enrichedList.push(ipo);
      }
    }

    console.log(`[WebSearch] 批量补充完成，共搜索了 ${searchCount}/${ipoList.length} 只`);
    return enrichedList;
  }
}

module.exports = new WebSearchService();
