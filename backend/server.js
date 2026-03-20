/**
 * 港股IPO数据爬虫后端服务
 * 提供统一的API接口给前端
 */

const express = require('express');
const cors = require('cors');
const aipoScraper = require('./scraper/aipo-scraper');
const hkexScraper = require('./scraper/hkex-scraper');

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json());

// 请求日志
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// 缓存数据
let cachedData = {
  ipoList: [],
  marginData: [],
  lastUpdate: null
};

// 获取所有IPO数据（合并多个数据源）
app.get('/api/ipo-list', async (req, res) => {
  try {
    console.log('[API] 获取IPO列表...');

    // 从AiPO获取数据
    const aipoData = await aipoScraper.scrapeIPOList();
    const aipoMargin = await aipoScraper.scrapeMarginData();

    // 从HKEX获取数据
    const hkexData = await hkexScraper.scrapeIPOList();

    // 合并数据
    const mergedData = mergeIPOData(aipoData, aipoMargin, hkexData);

    // 更新缓存
    cachedData.ipoList = mergedData;
    cachedData.lastUpdate = new Date().toISOString();

    res.json({
      success: true,
      data: mergedData,
      lastUpdate: cachedData.lastUpdate,
      sources: {
        aipo: aipoData.length,
        hkex: hkexData.length
      }
    });
  } catch (error) {
    console.error('[API] 获取IPO列表失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取孖展数据
app.get('/api/margin-data', async (req, res) => {
  try {
    console.log('[API] 获取孖展数据...');
    const marginData = await aipoScraper.scrapeMarginData();

    cachedData.marginData = marginData;

    res.json({
      success: true,
      data: marginData,
      lastUpdate: new Date().toISOString()
    });
  } catch (error) {
    console.error('[API] 获取孖展数据失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取申购数据
app.get('/api/subscription-data', async (req, res) => {
  try {
    console.log('[API] 获取申购数据...');
    const subscriptionData = await aipoScraper.scrapeSubscriptionData();

    res.json({
      success: true,
      data: subscriptionData,
      lastUpdate: new Date().toISOString()
    });
  } catch (error) {
    console.error('[API] 获取申购数据失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取缓存数据
app.get('/api/cached-data', (req, res) => {
  res.json({
    success: true,
    data: cachedData.ipoList,
    lastUpdate: cachedData.lastUpdate,
    cached: cachedData.ipoList.length > 0
  });
});

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    lastUpdate: cachedData.lastUpdate
  });
});

/**
 * 合并多个数据源的数据
 */
function mergeIPOData(aipoData, marginData, hkexData) {
  const merged = new Map();

  // 先添加AiPO数据
  aipoData.forEach(ipo => {
    merged.set(ipo.stockCode, {
      ...ipo,
      sources: ['aipo']
    });
  });

  // 添加孖展数据
  marginData.forEach(margin => {
    if (merged.has(margin.stockCode)) {
      const existing = merged.get(margin.stockCode);
      merged.set(margin.stockCode, {
        ...existing,
        marginMultiple: margin.marginMultiple,
        marginAmount: margin.marginAmount,
        sources: [...existing.sources, 'margin']
      });
    } else {
      // 创建新条目（只有孖展数据）
      merged.set(margin.stockCode, {
        stockCode: margin.stockCode,
        stockName: margin.stockName,
        sources: ['margin'],
        marginMultiple: margin.marginMultiple,
        marginAmount: margin.marginAmount
      });
    }
  });

  // 添加HKEX数据
  hkexData.forEach(ipo => {
    if (merged.has(ipo.stockCode)) {
      const existing = merged.get(ipo.stockCode);
      merged.set(ipo.stockCode, {
        ...existing,
        ...ipo,
        sources: [...existing.sources, 'hkex']
      });
    } else {
      merged.set(ipo.stockCode, {
        ...ipo,
        sources: ['hkex']
      });
    }
  });

  return Array.from(merged.values());
}

// 启动服务器
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 港股IPO数据爬虫后端服务已启动                         ║
║                                                           ║
║   📡 API地址: http://localhost:${PORT}                      ║
║                                                           ║
║   📋 可用接口:                                            ║
║   • GET /api/ipo-list       - 获取IPO列表                 ║
║   • GET /api/margin-data    - 获取孖展数据                ║
║   • GET /api/subscription    - 获取申购数据               ║
║   • GET /api/cached-data     - 获取缓存数据                ║
║   • GET /api/health          - 健康检查                   ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);

  // 启动时自动获取一次数据
  console.log('[启动] 正在获取初始数据...');
  aipoScraper.scrapeIPOList().then(data => {
    cachedData.ipoList = data;
    cachedData.lastUpdate = new Date().toISOString();
    console.log(`[启动] 初始数据加载完成，共 ${data.length} 条`);
  });
});

// 错误处理
process.on('uncaughtException', (error) => {
  console.error('[错误] 未捕获的异常:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[错误] 未处理的Promise拒绝:', reason);
});
