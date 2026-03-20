/**
 * 港股IPO数据爬虫后端服务
 * 提供统一的API接口给前端
 *
 * 数据源:
 * - 静态JSON (完整的新股数据)
 * - ETNet (实时行情)
 * - AASTOCKS (孖展数据)
 */

const express = require('express');
const cors = require('cors');
const net = require('net');
const etnetScraper = require('./scraper/etnet-scraper-fixed');
const aastocksScraper = require('./scraper/aastocks-scraper');
const prospectusScraper = require('./scraper/prospectus-scraper');
const dataProvider = require('./dataProvider');

const app = express();
const PORT = process.env.PORT || 3001;

/**
 * 检测端口是否已被占用
 * @param {number} port - 要检测的端口
 * @returns {Promise<boolean>} - true表示端口已被占用，false表示端口可用
 */
function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`[检测] 端口 ${port} 已被占用`);
        resolve(true);
      } else {
        resolve(false);
      }
    });

    server.once('listening', () => {
      server.close();
      resolve(false);
    });

    server.listen(port);
  });
}

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
  categorizedData: null,
  marginData: [],
  lastUpdate: null
};

// 当前日期
const getCurrentDateInfo = () => {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const currentTime = now.toISOString();
  return { now, today, currentTime };
};

// 获取所有IPO数据（合并多个数据源）
app.get('/api/ipo-list', async (req, res) => {
  const timeout = 15000; // 15秒超时

  try {
    console.log('[API] 获取IPO列表...');

    // 优先使用静态数据
    const unlistedIPOs = await dataProvider.getAllUnlistedIPOs();

    if (unlistedIPOs && unlistedIPOs.length > 0) {
      console.log(`[API] 使用静态数据，共 ${unlistedIPOs.length} 条`);

      return res.json({
        success: true,
        data: unlistedIPOs,
        lastUpdate: new Date().toISOString(),
        cached: false,
        source: 'static'
      });
    }

    // 如果静态数据为空，尝试爬虫
    console.log('[API] 静态数据为空，使用爬虫数据...');
    const { now, today } = getCurrentDateInfo();

    const [etnetData, aastocksData] = await Promise.all([
      Promise.race([
        etnetScraper.scrapeAll(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('ETNet超时')), timeout)
        )
      ]).catch(err => {
        console.warn('[API] ETNet获取失败:', err.message);
        return null;
      }),

      Promise.race([
        aastocksScraper.scrapeAll(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('AASTOCKS超时')), timeout)
        )
      ]).catch(err => {
        console.warn('[API] AASTOCKS获取失败:', err.message);
        return null;
      })
    ]);

    const mergedData = mergeAndFilterIPOData(etnetData, aastocksData, null, now, today);

    res.json({
      success: true,
      data: mergedData.filter(ipo => ipo.status !== 'listed'),
      lastUpdate: new Date().toISOString(),
      source: 'scraper'
    });
  } catch (error) {
    console.error('[API] 获取IPO列表失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取申购中的IPO数据（仅subscribe状态）
// 供实时孖展数据组件使用，只返回正在招股的股票
app.get('/api/subscribe-list', async (req, res) => {
  const timeout = 15000;
  try {
    console.log('[API] 获取申购中的IPO列表(仅subscribe)...');

    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // 优先使用静态数据
    const staticData = await dataProvider.getAllData();

    if (staticData && staticData.subscribeIPOs?.length > 0) {
      // 根据当前时间再次过滤，确保只返回真正在申购中的
      const activeSubscriptions = staticData.subscribeIPOs.filter(ipo => {
        if (!ipo.subscriptionEndDate) return true; // 没有截止日期的保留
        const endDate = new Date(ipo.subscriptionEndDate);
        return endDate >= now;
      });

      console.log(`[API] 申购中数据: ${staticData.subscribeIPOs.length} -> ${activeSubscriptions.length} 条`);

      // 尝试获取孖展数据并合并
      let mergedWithMargin = activeSubscriptions;
      try {
        const marginData = await Promise.race([
          aastocksScraper.scrapeMarginData(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('孖展数据超时')), timeout))
        ]).catch(err => {
          console.warn('[API] 孖展数据获取失败:', err.message);
          return [];
        });

        if (marginData && marginData.length > 0) {
          const marginMap = new Map();
          marginData.forEach(m => marginMap.set(m.stockCode, m));

          mergedWithMargin = activeSubscriptions.map(ipo => {
            const margin = marginMap.get(ipo.stockCode);
            if (margin) {
              return {
                ...ipo,
                marginMultiple: margin.marginMultiple,
                marginAmount: margin.marginAmount
              };
            }
            return ipo;
          });

          console.log(`[API] 孖展数据合并: ${marginData.length} 条匹配`);
        }
      } catch (err) {
        console.warn('[API] 孖展数据合并失败:', err.message);
      }

      // 合并招股书数据（保荐人、基石、营收、利润等）
      let mergedWithProspectus = mergedWithMargin;
      try {
        const stockCodes = mergedWithMargin.map(ipo => ipo.stockCode);
        const prospectusMergePromises = mergedWithMargin.map(async (ipo) => {
          try {
            const prospectusData = await prospectusScraper.ensureProspectusData(ipo.stockCode, ipo);
            if (prospectusData) {
              return {
                ...ipo,
                // 招股书核心数据覆盖
                underwriter: prospectusData.underwriter || ipo.underwriter,
                cornerstone: prospectusData.cornerstone,
                cornerstoneInvestors: prospectusData.cornerstoneInvestors || [],
                starInvestors: prospectusData.starInvestors || [],
                peRatio: prospectusData.peRatio,
                revenue: prospectusData.revenue,
                netProfit: prospectusData.netProfit,
                revenueGrowth: prospectusData.revenueGrowth,
                profitGrowth: prospectusData.profitGrowth,
                profitability: prospectusData.profitability,
                hasGreenshoe: prospectusData.hasGreenshoe,
                isIndustryLeader: prospectusData.isIndustryLeader,
                industry: prospectusData.industry || ipo.industry,
                marketCap: prospectusData.marketCap || ipo.marketCap,
                companyValue: prospectusData.companyValue || ipo.companyValue,
                issuePrice: prospectusData.issuePrice || ipo.issuePrice,
                sharesPerLot: prospectusData.sharesPerLot || ipo.sharesPerLot,
                offeringShares: prospectusData.offeringShares || ipo.offeringShares,
                totalLots: prospectusData.totalLots || ipo.totalLots,
                publicSharesRatio: prospectusData.publicSharesRatio || ipo.publicSharesRatio,
                description: prospectusData.description || ipo.description,
              };
            }
            return ipo;
          } catch (err) {
            console.warn(`[API] 招股书数据合并失败(${ipo.stockCode}):`, err.message);
            return ipo;
          }
        });

        mergedWithProspectus = await Promise.all(prospectusMergePromises);

        const mergedCount = mergedWithProspectus.filter(
          (ipo, idx) => ipo.profitability !== mergedWithMargin[idx].profitability || 
                        ipo.starInvestors?.length !== mergedWithMargin[idx].starInvestors?.length
        ).length;
        if (mergedCount > 0) {
          console.log(`[API] 招股书数据合并: ${mergedCount} 条有数据更新`);
        }
      } catch (err) {
        console.warn('[API] 招股书数据合并失败:', err.message);
      }

      return res.json({
        success: true,
        data: mergedWithProspectus,
        lastUpdate: new Date().toISOString(),
        source: 'static'
      });
    }

    // 降级：爬虫数据
    console.log('[API] 静态数据为空，尝试爬虫数据...');
    const [etnetData, aastocksData] = await Promise.all([
      Promise.race([
        etnetScraper.scrapeAll(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('ETNet超时')), timeout))
      ]).catch(err => {
        console.warn('[API] ETNet获取失败:', err.message);
        return null;
      }),

      Promise.race([
        aastocksScraper.scrapeAll(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('AASTOCKS超时')), timeout))
      ]).catch(err => {
        console.warn('[API] AASTOCKS获取失败:', err.message);
        return null;
      })
    ]);

    const mergedData = mergeAndFilterIPOData(etnetData, aastocksData, null, now, today);

    // 只返回subscribe状态的
    const subscribeData = mergedData.filter(ipo => ipo.status === 'subscribe');

    console.log(`[API] 申购中数据(爬虫): 共 ${subscribeData.length} 条`);

    res.json({
      success: true,
      data: subscribeData,
      lastUpdate: new Date().toISOString(),
      source: 'scraper'
    });
  } catch (error) {
    console.error('[API] 获取申购中数据失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取孖展数据
app.get('/api/margin-data', async (req, res) => {
  const timeout = 15000;
  try {
    console.log('[API] 获取孖展数据...');

    // 获取所有孖展数据
    const marginData = await Promise.race([
      aastocksScraper.scrapeMarginData(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('孖展数据请求超时')), timeout)
      )
    ]).catch(err => {
      console.warn(`[API] 孖展数据获取失败:`, err.message);
      return [];
    });

    // 获取当前时间
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    console.log(`[API] 当前时间: ${now.toISOString()}, 今天: ${today}`);

    // 获取申购中的股票代码列表(从静态数据中获取)
    const staticData = await dataProvider.getAllData();
    const subscribeStockCodes = new Set(
      (staticData?.subscribeIPOs || []).map(ipo => ipo.stockCode)
    );

    // 获取所有股票的申购截止日期信息
    const allIPOs = [
      ...(staticData?.subscribeIPOs || []),
      ...(staticData?.upcomingIPOs || [])
    ];
    
    const subscriptionEndDates = new Map();
    allIPOs.forEach(ipo => {
      if (ipo.subscriptionEndDate) {
        subscriptionEndDates.set(ipo.stockCode, ipo.subscriptionEndDate);
      }
    });

    // 过滤孖展数据:只保留申购中的股票
    const filteredMarginData = marginData.filter(margin => {
      const stockCode = margin.stockCode;
      
      // 1. 首先检查是否在静态数据的申购中列表
      if (!subscribeStockCodes.has(stockCode)) {
        console.log(`[API] 过滤股票 ${stockCode}: 不在申购中列表`);
        return false;
      }
      
      // 2. 检查申购截止日期
      const subscriptionEndDate = subscriptionEndDates.get(stockCode);
      if (subscriptionEndDate) {
        const endDate = new Date(subscriptionEndDate);
        
        // 如果截止日期已过,则过滤掉
        if (endDate < now) {
          console.log(`[API] 过滤股票 ${stockCode}: 申购已截止 (截止日期: ${subscriptionEndDate})`);
          return false;
        }
      }
      
      return true;
    });

    console.log(`[API] 孖展数据过滤: ${marginData.length} -> ${filteredMarginData.length} 条`);

    cachedData.marginData = filteredMarginData;

    res.json({
      success: true,
      data: filteredMarginData,
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
  const timeout = 15000;
  try {
    console.log('[API] 获取申购数据...');

    // AASTOCKS和ETNet的申购数据在同一页面
    const [aastocksData, etnetData] = await Promise.all([
      aastocksScraper.scrapeIPOList().catch(() => []),
      etnetScraper.scrapeIPOList().catch(() => [])
    ]);

    const subscriptionData = [...aastocksData, ...etnetData];

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

// 获取今日上市股票实时行情 (新增)
app.get('/api/today-listed', async (req, res) => {
  const timeout = 15000;
  try {
    console.log('[API] 获取今日上市实时行情...');

    const quotes = await Promise.race([
      etnetScraper.scrapeRealtimeQuotes(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('实时行情请求超时')), timeout)
      )
    ]).catch(err => {
      console.warn(`[API] 实时行情获取失败:`, err.message);
      return [];
    });

    res.json({
      success: true,
      data: quotes || [],
      lastUpdate: new Date().toISOString()
    });
  } catch (error) {
    console.error('[API] 获取实时行情失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取所有IPO数据(分类)
app.get('/api/ipo-all', async (req, res) => {
  const timeout = 20000;
  try {
    console.log('[API] 获取完整IPO数据(分类)...');

    // 优先使用静态数据提供器
    const staticData = await dataProvider.getAllData();

    // 如果有静态数据，直接返回
    if (staticData && (staticData.subscribeIPOs?.length > 0 || staticData.upcomingIPOs?.length > 0)) {
      console.log('[API] 使用静态数据，共', staticData.subscribeIPOs.length + staticData.upcomingIPOs.length, '条');

      // 同时获取实时行情作为补充
      const realtimeQuotes = await Promise.race([
        etnetScraper.scrapeRealtimeQuotes(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('实时行情超时')), timeout))
      ]).catch(err => {
        console.warn('[API] 实时行情获取失败:', err.message);
        return [];
      });

      // 如果有实时行情，更新今日上市数据
      if (realtimeQuotes && realtimeQuotes.length > 0) {
        staticData.todayListed = realtimeQuotes;
      }

      return res.json({
        success: true,
        ...staticData,
        cached: false,
        source: 'static+realtime'
      });
    }

    // 如果静态数据为空，尝试使用爬虫数据
    console.log('[API] 静态数据为空，使用爬虫数据...');
    const { now, today } = getCurrentDateInfo();

    const [etnetData, aastocksData] = await Promise.all([
      Promise.race([
        etnetScraper.scrapeAll(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('ETNet超时')), timeout)
      )]).catch(err => {
        console.warn('[API] ETNet获取失败:', err.message);
        return null;
      }),

      Promise.race([
        aastocksScraper.scrapeAll(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('AASTOCKS超时')), timeout)
      )]).catch(err => {
        console.warn('[API] AASTOCKS获取失败:', err.message);
        return null;
      })
    ]);

    const categorizedData = mergeAndCategorizeData(etnetData, aastocksData, null, now, today);

    res.json({
      success: true,
      ...categorizedData,
      lastUpdate: new Date().toISOString(),
      cached: false,
      source: 'scraper'
    });
  } catch (error) {
    console.error('[API] 获取IPO数据失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 合并并分类IPO数据
 */
function mergeAndCategorizeData(etnetData, aastocksData, hkexnewsData, now, today) {
  const result = {
    subscribeIPOs: [],
    upcomingIPOs: [],
    todayListed: [],
    recentListed: [],
    updateTime: new Date().toISOString(),
    source: 'multi-source'
  };

  const stockMap = new Map();

  // 处理ETNet数据
  if (etnetData) {
    // 今日上市
    result.todayListed = etnetData.todayListed || [];

    // 近期上市
    result.recentListed = (etnetData.recentListed || []).map(ipo => ({
      ...ipo,
      status: 'recent_listed'
    }));

    // 即将上市
    (etnetData.upcomingIPOs || []).forEach(ipo => {
      stockMap.set(ipo.stockCode, {
        ...ipo,
        status: 'upcoming',
        sources: ['etnet']
      });
    });

    // 申购中
    (etnetData.subscribeIPOs || []).forEach(ipo => {
      stockMap.set(ipo.stockCode, {
        ...ipo,
        status: 'subscribe',
        sources: ['etnet']
      });
    });
  }

  // 处理AASTOCKS数据
  if (Array.isArray(aastocksData)) {
    aastocksData.forEach(ipo => {
      const status = determineStatus(ipo, now, today);

      if (stockMap.has(ipo.stockCode)) {
        const existing = stockMap.get(ipo.stockCode);
        const finalStatus = getHigherPriorityStatus(existing.status, status);
        stockMap.set(ipo.stockCode, {
          ...existing,
          ...ipo,
          status: finalStatus,
          marginMultiple: ipo.marginMultiple || existing.marginMultiple,
          sources: [...existing.sources, 'aastocks']
        });
      } else {
        stockMap.set(ipo.stockCode, {
          ...ipo,
          status,
          sources: ['aastocks']
        });
      }
    });
  }

  // 处理HKExNews数据
  if (hkexnewsData) {
    (hkexnewsData.subscribeIPOs || []).forEach(ipo => {
      if (stockMap.has(ipo.stockCode)) {
        const existing = stockMap.get(ipo.stockCode);
        stockMap.set(ipo.stockCode, {
          ...existing,
          ...ipo,
          status: getHigherPriorityStatus(existing.status, 'subscribe'),
          sources: [...existing.sources, 'hkexnews']
        });
      } else {
        stockMap.set(ipo.stockCode, {
          ...ipo,
          status: 'subscribe',
          sources: ['hkexnews']
        });
      }
    });

    (hkexnewsData.upcomingIPOs || []).forEach(ipo => {
      if (stockMap.has(ipo.stockCode)) {
        const existing = stockMap.get(ipo.stockCode);
        if (existing.status !== 'subscribe') {
          stockMap.set(ipo.stockCode, {
            ...existing,
            ...ipo,
            status: 'upcoming',
            sources: [...existing.sources, 'hkexnews']
          });
        }
      } else {
        stockMap.set(ipo.stockCode, {
          ...ipo,
          status: 'upcoming',
          sources: ['hkexnews']
        });
      }
    });
  }

  // 分配到对应分类
  stockMap.forEach((value) => {
    if (value.status === 'subscribe') {
      result.subscribeIPOs.push(value);
    } else if (value.status === 'upcoming') {
      result.upcomingIPOs.push(value);
    } else if (value.status === 'listed') {
      // 已上市股票不添加到列表
    }
  });

  // 按上市日期排序
  result.subscribeIPOs.sort((a, b) => {
    const dateA = a.listingDate ? new Date(a.listingDate) : new Date('9999-12-31');
    const dateB = b.listingDate ? new Date(b.listingDate) : new Date('9999-12-31');
    return dateA - dateB;
  });

  result.upcomingIPOs.sort((a, b) => {
    const dateA = a.listingDate ? new Date(a.listingDate) : new Date('9999-12-31');
    const dateB = b.listingDate ? new Date(b.listingDate) : new Date('9999-12-31');
    return dateA - dateB;
  });

  return result;
}

/**
 * 合并多个数据源的数据并过滤已上市股票
 */
function mergeAndFilterIPOData(etnetData, aastocksData, hkexnewsData, now, today) {
  const merged = new Map();

  // 1. 处理ETNet数据
  if (etnetData) {
    // 即将上市
    (etnetData.upcomingIPOs || []).forEach(ipo => {
      merged.set(ipo.stockCode, {
        ...ipo,
        status: 'upcoming',
        sources: ['etnet']
      });
    });

    // 申购中
    (etnetData.subscribeIPOs || []).forEach(ipo => {
      if (merged.has(ipo.stockCode)) {
        const existing = merged.get(ipo.stockCode);
        merged.set(ipo.stockCode, {
          ...existing,
          ...ipo,
          status: 'subscribe',
          sources: [...existing.sources, 'etnet']
        });
      } else {
        merged.set(ipo.stockCode, {
          ...ipo,
          status: 'subscribe',
          sources: ['etnet']
        });
      }
    });

    // 今日上市(实时行情) - 标记为已上市，过滤掉
    (etnetData.todayListed || []).forEach(quote => {
      // 添加到merged中但标记为listed，后面会过滤
      merged.set(quote.stockCode + '_today', {
        ...quote,
        status: 'listed',
        isTodayListed: true,
        sources: ['etnet']
      });
    });
  }

  // 2. 处理AASTOCKS数据
  if (Array.isArray(aastocksData)) {
    aastocksData.forEach(ipo => {
      const status = determineStatus(ipo, now, today);

      if (merged.has(ipo.stockCode)) {
        const existing = merged.get(ipo.stockCode);
        // 如果已有的状态比新状态优先级更高，保留原有状态
        const finalStatus = getHigherPriorityStatus(existing.status, status);
        merged.set(ipo.stockCode, {
          ...existing,
          ...ipo,
          status: finalStatus,
          marginMultiple: ipo.marginMultiple || existing.marginMultiple,
          marginAmount: ipo.marginAmount || existing.marginAmount,
          sources: [...existing.sources, 'aastocks']
        });
      } else {
        merged.set(ipo.stockCode, {
          ...ipo,
          status,
          sources: ['aastocks']
        });
      }
    });
  }

  // 3. 处理HKExNews数据
  if (hkexnewsData) {
    // 申购中
    (hkexnewsData.subscribeIPOs || []).forEach(ipo => {
      if (merged.has(ipo.stockCode)) {
        const existing = merged.get(ipo.stockCode);
        const finalStatus = getHigherPriorityStatus(existing.status, 'subscribe');
        merged.set(ipo.stockCode, {
          ...existing,
          ...ipo,
          status: finalStatus,
          sources: [...existing.sources, 'hkexnews']
        });
      } else {
        merged.set(ipo.stockCode, {
          ...ipo,
          status: 'subscribe',
          sources: ['hkexnews']
        });
      }
    });

    // 即将上市
    (hkexnewsData.upcomingIPOs || []).forEach(ipo => {
      if (merged.has(ipo.stockCode)) {
        const existing = merged.get(ipo.stockCode);
        // 不覆盖已有的申购中状态
        if (existing.status !== 'subscribe') {
          merged.set(ipo.stockCode, {
            ...existing,
            ...ipo,
            status: 'upcoming',
            sources: [...existing.sources, 'hkexnews']
          });
        }
      } else {
        merged.set(ipo.stockCode, {
          ...ipo,
          status: 'upcoming',
          sources: ['hkexnews']
        });
      }
    });
  }

  // 4. 过滤已上市的股票(但保留今日上市的实时行情)
  const result = [];
  merged.forEach((value, key) => {
    // 跳过今日上市的条目（它们有_today后缀）
    if (key.endsWith('_today')) return;

    // 过滤已上市的股票
    if (value.status === 'listed') return;

    result.push(value);
  });

  return result;
}

/**
 * 判断股票状态
 */
function determineStatus(ipo, now, today) {
  const listingDate = ipo.listingDate ? new Date(ipo.listingDate) : null;
  const appStart = ipo.subscriptionStartDate ? new Date(ipo.subscriptionStartDate) : null;
  const appEnd = ipo.subscriptionEndDate ? new Date(ipo.subscriptionEndDate) : null;

  // 有上市日期且已过期 = 已上市
  if (listingDate && listingDate < now) {
    return 'listed';
  }

  // 有申购日期范围
  if (appStart && appEnd) {
    if (now >= appStart && now <= appEnd) {
      return 'subscribe'; // 申购中
    } else if (now > appEnd) {
      return 'upcoming'; // 申购截止，等待上市
    } else {
      return 'upcoming'; // 还未开始申购
    }
  }

  // 只有上市日期
  if (listingDate && listingDate > now) {
    return 'upcoming';
  }

  return 'unknown';
}

/**
 * 获取优先级更高的状态
 * 优先级: subscribe > upcoming > unknown > listed
 */
function getHigherPriorityStatus(status1, status2) {
  const priority = { 'subscribe': 3, 'upcoming': 2, 'unknown': 1, 'listed': 0 };

  const p1 = priority[status1] || 0;
  const p2 = priority[status2] || 0;

  return p1 >= p2 ? status1 : status2;
}

// 启动服务器（带端口检测）
async function startServer() {
  // 检测端口是否已被占用
  const portInUse = await isPortInUse(PORT);

  if (portInUse) {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   ⏭️  端口 ${PORT} 已被占用，后端服务已在运行中              ║
║                                                           ║
║   📡 API地址: http://localhost:${PORT}                      ║
║                                                           ║
║   如果需要重启，请先停止已有的服务                         ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
    `);
    return; // 不再启动新服务
  }

  app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 港股IPO数据爬虫后端服务已启动                         ║
║                                                           ║
║   📡 API地址: http://localhost:${PORT}                      ║
║                                                           ║
║   📋 可用接口:                                            ║
║   • GET /api/ipo-list       - 获取IPO列表(已过滤已上市)    ║
║   • GET /api/subscribe-list - 获取申购中的IPO列表          ║
║   • GET /api/ipo-all        - 获取完整分类IPO数据         ║
║   • GET /api/margin-data    - 获取孖展数据                ║
║   • GET /api/subscription    - 获取申购数据               ║
║   • GET /api/today-listed    - 获取今日上市实时行情        ║
║   • GET /api/cached-data     - 获取缓存数据                ║
║   • GET /api/health          - 健康检查                   ║
║                                                           ║
║   📊 数据源:                                              ║
║   • 静态JSON (完整数据)                                   ║
║   • ETNet (实时行情)                                       ║
║   • AASTOCKS (孖展数据)                                    ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
    `);

    // 启动时加载数据
    console.log('[启动] 正在加载初始数据...');

    dataProvider.getAllData().then(staticData => {
      cachedData.categorizedData = {
        subscribeIPOs: staticData.subscribeIPOs || [],
        upcomingIPOs: staticData.upcomingIPOs || [],
        todayListed: staticData.todayListed || [],
        recentListed: staticData.recentListed || [],
        updateTime: staticData.updateTime || new Date().toISOString(),
        source: 'static'
      };
      cachedData.lastUpdate = new Date().toISOString();

      console.log(`[启动] 初始数据加载完成:`);
      console.log(`  - 申购中: ${cachedData.categorizedData.subscribeIPOs.length} 只`);
      console.log(`  - 即将上市: ${cachedData.categorizedData.upcomingIPOs.length} 只`);
      console.log(`  - 今日上市: ${cachedData.categorizedData.todayListed.length} 只`);
    });
  });
}

startServer();

// 错误处理
process.on('uncaughtException', (error) => {
  console.error('[错误] 未捕获的异常:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[错误] 未处理的Promise拒绝:', reason);
});
