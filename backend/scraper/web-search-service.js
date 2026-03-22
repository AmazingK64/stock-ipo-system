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
    this.aiApiUrl = process.env.AI_API_URL || process.env.OPENAI_BASE_URL || null;
    this.aiApiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY || null;
    this.aiModel = process.env.AI_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini';
    this.enableLLMScoring = process.env.ENABLE_LLM_SCORING !== 'false';
    this.tavilyApiKeys = this.parseKeyPool(process.env.TAVILY_API_KEY || process.env.TAVILY_API_KEYS);
    this.serpApiKeys = this.parseKeyPool(process.env.SERP_API_KEY || process.env.SERPAPI_API_KEYS);
    this.braveApiKeys = this.parseKeyPool(process.env.BRAVE_API_KEY || process.env.BRAVE_API_KEYS);
    // 缓存目录
    this.cacheDir = path.join(__dirname, '../data/search-cache');

    // 修正API URL：确保包含完整的chat/completions路径
    if (this.aiApiUrl && !this.aiApiUrl.includes('/chat/completions')) {
      this.aiApiUrl = this.aiApiUrl.replace(/\/$/, '') + '/chat/completions';
    }

    // 调试日志：确认环境变量加载情况
    console.log('[WebSearch] 环境变量加载情况:');
    console.log('  - AI_API_URL:', process.env.AI_API_URL || '(未设置)');
    console.log('  - OPENAI_BASE_URL:', process.env.OPENAI_BASE_URL || '(未设置)');
    console.log('  - AI_API_KEY:', process.env.AI_API_KEY ? '[已设置]' : '(未设置)');
    console.log('  - OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '[已设置]' : '(未设置)');
    console.log('  - AI_MODEL:', process.env.AI_MODEL || '(未设置)');
    console.log('  - OPENAI_MODEL:', process.env.OPENAI_MODEL || '(未设置)');
    console.log('  - ENABLE_LLM_SCORING:', process.env.ENABLE_LLM_SCORING || '(未设置，默认true)');
    console.log('  - this.aiApiUrl:', this.aiApiUrl || '(未定义)');
    console.log('  - this.aiApiKey:', this.aiApiKey ? '[已定义]' : '(未定义)');
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

  parseKeyPool(rawValue) {
    if (!rawValue) return [];
    return rawValue
      .split(',')
      .map(key => key.trim())
      .filter(Boolean);
  }

  pickKey(keys = []) {
    if (!Array.isArray(keys) || keys.length === 0) return null;
    const index = Math.floor(Math.random() * keys.length);
    return keys[index];
  }

  /**
   * 执行网络搜索
   */
  async executeSearches(queries) {
    const allResults = [];

    for (const query of queries) {
      try {
        let result = null;

        const finalQuery = query.query || query.fallbackQuery;

        if (!result) {
          result = await this.searchWithTavily(finalQuery);
        }

        if (!result) {
          result = await this.searchWithSerpAPI(finalQuery);
        }

        if (!result) {
          result = await this.searchWithBrave(finalQuery);
        }

        // 降级：使用免费搜索
        if (!result) {
          result = await this.searchWithDuckDuckGo(finalQuery);
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

  async searchWithTavily(query) {
    try {
      const apiKey = this.pickKey(this.tavilyApiKeys);
      if (!apiKey) return null;

      const response = await axios.post('https://api.tavily.com/search', {
        api_key: apiKey,
        query,
        search_depth: 'basic',
        include_answer: false,
        max_results: 6,
        topic: 'news'
      }, {
        timeout: 15000
      });

      const results = response.data?.results || [];
      return results.slice(0, 5).map(item => ({
        title: item.title || '',
        snippet: item.content || item.raw_content || '',
        url: item.url || ''
      }));
    } catch (error) {
      console.warn('[WebSearch] Tavily搜索失败:', error.message);
      return null;
    }
  }

  /**
   * 使用SerpAPI搜索
   */
  async searchWithSerpAPI(query) {
    try {
      const apiKey = this.pickKey(this.serpApiKeys);
      if (!apiKey) return null;

      const response = await axios.get('https://serpapi.com/search', {
        params: {
          q: query,
          api_key: apiKey,
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

  async searchWithBrave(query) {
    try {
      const apiKey = this.pickKey(this.braveApiKeys);
      if (!apiKey) return null;

      const response = await axios.get('https://api.search.brave.com/res/v1/web/search', {
        params: {
          q: query,
          count: 8,
          freshness: 'pw'
        },
        headers: {
          'X-Subscription-Token': apiKey,
          'Accept': 'application/json'
        },
        timeout: 15000
      });

      const results = response.data?.web?.results || [];
      return results.slice(0, 5).map(item => ({
        title: item.title || '',
        snippet: item.description || '',
        url: item.url || ''
      }));
    } catch (error) {
      console.warn('[WebSearch] Brave搜索失败:', error.message);
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
    let searchContext = '';
    if (searchResults && searchResults.length > 0) {
      searchContext = searchResults.map(group => {
        const items = (group.results || []).map(r => `- ${r.title}: ${r.snippet}`).join('\n');
        return `【${group.type}】\n${items}`;
      }).join('\n\n');
    }

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
        model: this.aiModel,
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

  buildScoringFallback(ipoData = {}) {
    let score = 55;

    if (ipoData.businessModel === 'excellent') score += 10;
    if (ipoData.businessModel === 'good') score += 6;
    if (ipoData.businessModel === 'fair') score += 2;
    if (ipoData.businessModel === 'poor') score -= 6;

    if (ipoData.moatLevel === 'wide') score += 8;
    if (ipoData.moatLevel === 'moderate') score += 5;
    if (ipoData.moatLevel === 'narrow') score += 1;
    if (ipoData.moatLevel === 'none') score -= 4;

    if (ipoData.valuationLevel === 'cheap') score += 9;
    if (ipoData.valuationLevel === 'fair') score += 4;
    if (ipoData.valuationLevel === 'premium') score -= 3;
    if (ipoData.valuationLevel === 'expensive') score -= 8;

    if (ipoData.cornerstone) score += 4;
    if ((ipoData.starInvestors || []).length >= 2) score += 4;
    if (typeof ipoData.marginMultiple === 'number' && ipoData.marginMultiple >= 15) score += 6;
    if (typeof ipoData.marginMultiple === 'number' && ipoData.marginMultiple >= 5 && ipoData.marginMultiple < 15) score += 3;
    if (ipoData.profitability === 'loss') score -= 4;
    if (ipoData.profitability === 'profitable') score += 3;
    if ((ipoData.revenueGrowth || 0) > 0.5) score += 3;

    score = Math.max(20, Math.min(95, Math.round(score)));

    let grade = 'B';
    if (score >= 90) grade = 'A+';
    else if (score >= 85) grade = 'A';
    else if (score >= 80) grade = 'A-';
    else if (score >= 75) grade = 'B+';
    else if (score >= 65) grade = 'B';
    else if (score >= 55) grade = 'B-';
    else if (score >= 45) grade = 'C+';
    else if (score >= 35) grade = 'C';
    else grade = 'D';

    return {
      score,
      grade,
      strategy: {
        recommendation: score >= 80 ? '可重点参与' : score >= 65 ? '谨慎参与' : '观望为主',
        action: score >= 80 ? '现金+适度融资申购' : score >= 65 ? '小仓位现金申购' : '暂不申购',
        riskLevel: score >= 80 ? '中' : score >= 65 ? '中高' : '高',
        expectedReturn: score >= 80 ? '中高' : score >= 65 ? '中' : '低'
      },
      llmScoringReason: '基于基础数据的量化评分，暂无AI分析'
    };
  }

  getGrade(score) {
    if (score >= 90) return 'A+';
    if (score >= 85) return 'A';
    if (score >= 80) return 'A-';
    if (score >= 75) return 'B+';
    if (score >= 65) return 'B';
    if (score >= 55) return 'B-';
    if (score >= 45) return 'C+';
    if (score >= 35) return 'C';
    return 'D';
  }

  normalizeScoringResult(rawResult, ipoData = {}) {
    if (!rawResult || typeof rawResult !== 'object') return null;
    if (typeof rawResult.score !== 'number' || Number.isNaN(rawResult.score)) return null;
    if (rawResult.score < 0 || rawResult.score > 100) return null;

    const score = Math.round(rawResult.score);
    const grade = this.getGrade(score);
    
    const fallback = this.buildScoringFallback(ipoData);
    const strategy = rawResult.strategy && typeof rawResult.strategy === 'object'
      ? rawResult.strategy
      : fallback.strategy;

    const result = {
      score,
      grade,
      strategy: {
        recommendation: strategy.recommendation || fallback.strategy.recommendation,
        action: strategy.action || fallback.strategy.action,
        riskLevel: strategy.riskLevel || fallback.strategy.riskLevel,
        expectedReturn: strategy.expectedReturn || fallback.strategy.expectedReturn
      },
      llmScoringReason: typeof rawResult.reasoning === 'string' ? rawResult.reasoning : ''
    };
    console.log('[WebSearch] normalizeScoringResult: score=', result.score, 'grade=', result.grade, 'reasoning=', result.llmScoringReason?.substring(0, 50));
    return result;
  }

  async scoreIPOWithAI(ipoData = {}) {
    if (!this.enableLLMScoring || !this.aiApiUrl || !this.aiApiKey) {
      console.warn('[WebSearch] LLM评分跳过: enableLLMScoring=', this.enableLLMScoring, 'aiApiUrl=', !!this.aiApiUrl, 'aiApiKey=', !!this.aiApiKey);
      return this.buildScoringFallback(ipoData);
    }

    console.log(`[WebSearch] 调用LLM评分: ${ipoData.stockCode} ${ipoData.stockName}, URL=${this.aiApiUrl}, Model=${this.aiModel}`);

    try {
      const prompt = `你是一位资深的港股IPO打新策略专家，拥有丰富的港股打新实战经验。请仅输出JSON，不要输出其他文本。

## 评分标准（总分100分）

### 1. 行业赛道质量（25分）
- 热门赛道（AI、半导体、新能源、机器人、智能驾驶、创新药）：20-25分
- 成长赛道（云计算、生物医药、消费电子、医疗器械）：15-19分
- 传统赛道（医疗、教育、零售、餐饮、中医）：8-14分
- 衰退赛道（房地产、传统金融、传统制造）：0-7分
- 注意：区分医疗细分领域
  - 创新药/生物制药：属于热门赛道，高分
  - 医疗器械/诊断：属于成长赛道，中高分
  - 传统医疗/中医/诊所：属于传统赛道，低分，多为"捞钱"型IPO

### 2. 公司基本面（25分）
- 盈利且高增长（营收增长>30%，利润增长>20%）：20-25分
- 盈利但增长缓慢：12-19分
- 亏损但有明确盈利路径：8-14分
- 亏损且无盈利预期：0-7分
- **特别说明**：
  - 热门赛道（AI、半导体、机器人、新能源、创新药）的亏损公司：不因亏损扣分，重点关注营收增长率和市场地位
  - 这些行业的初创公司亏损是正常的，市场更看重成长性和赛道前景
  - 如果是热门赛道+亏损+高增长（营收增长>50%）：仍可给15-20分

### 3. 估值合理性（20分）
- 估值便宜（PE低于同行业30%以上）：16-20分
- 估值合理（PE接近同行业）：10-15分
- 估值偏高（PE高于同行业20-50%）：5-9分
- 估值昂贵（PE高于同行业50%以上）：0-4分

### 4. 发行结构（15分）
- 有知名基石+明星投资者+绿鞋：12-15分
- 有基石或明星投资者：8-11分
- 无特殊结构：5-7分
- 公开发售比例极低（<10%）：扣3-5分

### 5. 保荐人质量（10分）
- 一线保荐人（中金、摩根、高盛、大摩）：8-10分
- 二线保荐人（中信、华泰、招银）：5-7分
- 其他保荐人：2-4分

### 6. 市场情绪（5分）
- 孖展倍数>100倍：5分
- 孖展倍数50-100倍：4分
- 孖展倍数10-50倍：2-3分
- 孖展倍数<10倍：0-1分

## 特别扣分项
- 传统医疗/中医/诊所类公司：-5到-10分（行业赛道差，多为捞钱型IPO）
- 传统行业转型概念：-3到-5分
- 市值过小（<5亿）：-3分
- 无基石投资者：-3分
- 热门赛道但营收增长<20%：-3分（说明竞争力不足）

## 特别加分项
- 创新药/生物制药（有管线、有临床进展）：+5分
- 医疗器械（有核心技术）：+3分
- 热门赛道+亏损+高增长（营收增长>50%）：+5分（成长性溢价）
- 有知名基石投资者（腾讯、阿里、红杉、高瓴等）：+3分
- 孖展倍数>100倍：+3分（市场认可度高）

## 评级标准
- A+ (90-100): 强烈推荐，必打
- A (85-89): 重点推荐，可重仓
- A- (80-84): 推荐申购
- B+ (75-79): 可参与，中等仓位
- B (65-74): 谨慎参与，小仓位
- B- (55-64): 观望为主
- C+ (45-54): 不建议参与
- C (35-44): 风险较高
- D (<35): 强烈不推荐

## 公司数据
${JSON.stringify({
  stockCode: ipoData.stockCode,
  stockName: ipoData.stockName,
  industry: ipoData.industry,
  listingDate: ipoData.listingDate,
  subscriptionEndDate: ipoData.subscriptionEndDate,
  issuePrice: ipoData.issuePrice,
  marketCap: ipoData.marketCap,
  peRatio: ipoData.peRatio,
  pbRatio: ipoData.pbRatio,
  profitability: ipoData.profitability,
  revenue: ipoData.revenue,
  netProfit: ipoData.netProfit,
  revenueGrowth: ipoData.revenueGrowth,
  profitGrowth: ipoData.profitGrowth,
  underwriter: ipoData.underwriter,
  cornerstone: ipoData.cornerstone,
  starInvestors: ipoData.starInvestors,
  marginMultiple: ipoData.marginMultiple,
  publicSharesRatio: ipoData.publicSharesRatio,
  businessModel: ipoData.businessModel,
  moatLevel: ipoData.moatLevel,
  valuationLevel: ipoData.valuationLevel,
  ahDiscount: ipoData.ahDiscount
}, null, 2)}

## 输出格式
{
  "score": 0-100之间数字,
  "grade": "A+|A|A-|B+|B|B-|C+|C|D",
  "reasoning": "一句话说明评分核心依据（要具体，比如：行业赛道差+估值偏高+无基石，典型的捞钱型IPO）",
  "strategy": {
    "recommendation": "总体建议（强烈推荐/推荐/谨慎/观望/不推荐）",
    "action": "具体操作建议",
    "riskLevel": "低|中|中高|高",
    "expectedReturn": "低|中|中高|高"
  }
}`;

      const response = await axios.post(this.aiApiUrl, {
        model: this.aiModel,
        messages: [
          { role: 'system', content: '你是港股IPO打新策略专家，只返回JSON格式结果，不要使用markdown代码块。评分要客观严格，不要给平庸的公司高分。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 900
      }, {
        headers: {
          'Authorization': `Bearer ${this.aiApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 20000  // 20秒超时
      });

      const content = response.data?.choices?.[0]?.message?.content || '';
      console.log('[WebSearch] LLM响应内容:', content.substring(0, 300));
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn('[WebSearch] 未找到JSON内容');
        return this.buildScoringFallback(ipoData);
      }

      const parsed = JSON.parse(jsonMatch[0]);
      console.log('[WebSearch] 解析结果:', JSON.stringify(parsed).substring(0, 200));
      return this.normalizeScoringResult(parsed, ipoData) || this.buildScoringFallback(ipoData);
    } catch (error) {
      console.warn('[WebSearch] LLM评分失败，使用降级评分:', error.message);
      if (error.response) {
        console.warn('[WebSearch] API响应状态:', error.response.status);
        console.warn('[WebSearch] API响应数据:', JSON.stringify(error.response.data).substring(0, 200));
      } else if (error.request) {
        console.warn('[WebSearch] 请求已发送但没有收到响应');
      }
      return this.buildScoringFallback(ipoData);
    }
  }

  async enrichAndScoreSubscribeIPOs(ipoList) {
    if (!Array.isArray(ipoList) || ipoList.length === 0) return ipoList;

    const now = new Date();
    const results = [];

    for (const ipo of ipoList) {
      const isSubscribe = ipo?.status === 'subscribe';
      const endDate = ipo?.subscriptionEndDate ? new Date(ipo.subscriptionEndDate) : null;
      const isActive = !endDate || endDate > now;

      console.log(`[WebSearch] 处理IPO: ${ipo.stockCode} ${ipo.stockName}, status=${ipo.status}, isSubscribe=${isSubscribe}, isActive=${isActive}`);

      if (!isSubscribe || !isActive) {
        results.push(ipo);
        continue;
      }

      let merged = { ...ipo };

      // 强制调用LLM评分，添加错误处理确保不会阻塞
      try {
        const scoreResult = await this.scoreIPOWithAI(merged);
        console.log(`[WebSearch] LLM评分完成: ${scoreResult.score}分, ${scoreResult.grade}级, 原因: ${scoreResult.llmScoringReason?.substring(0, 50)}...`);
        results.push({
          ...merged,
          score: scoreResult.score,
          grade: scoreResult.grade,
          strategy: scoreResult.strategy,
          llmScoringReason: scoreResult.llmScoringReason || merged.llmScoringReason
        });
      } catch (err) {
        console.warn(`[WebSearch] 评分失败，使用基础评分:`, err.message);
        const fallback = this.buildScoringFallback(merged);
        results.push({
          ...merged,
          score: fallback.score,
          grade: fallback.grade,
          strategy: fallback.strategy,
          llmScoringReason: '评分系统暂时不可用'
        });
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('[WebSearch] 全部IPO处理完成，共:', results.length);
    return results;
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
