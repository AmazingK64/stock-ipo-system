/**
 * HKExNews 爬虫
 * 数据源: https://www2.hkexnews.hk/New-Listings/New-Listing-Information/Main-Board?sc_lang=zh-HK
 *
 * 功能:
 * - 获取主板新股申购信息
 * - 区分股票状态(申购中/即将上市/已上市)
 * - 过滤已上市股票
 */

const axios = require('axios');
const cheerio = require('cheerio');

class HKExNewsScraper {
  constructor() {
    this.baseURL = 'https://www2.hkexnews.hk';
    this.mainBoardURL = '/New-Listings/New-Listing-Information/Main-Board?sc_lang=zh-HK';
    this.gemURL = '/New-Listings/New-Listing-Information/GEM?sc_lang=zh-HK';
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Referer': 'https://www2.hkexnews.hk/'
    };
  }

  /**
   * 获取所有新股数据
   */
  async scrapeAll() {
    try {
      console.log('[HKExNews] 开始爬取主板IPO数据...');

      const [mainBoardData, gemData] = await Promise.all([
        this.scrapePage(this.mainBoardURL, '主板').catch(err => {
          console.warn('[HKExNews] 主板数据获取失败:', err.message);
          return [];
        }),
        this.scrapePage(this.gemURL, 'GEM').catch(err => {
          console.warn('[HKExNews] GEM数据获取失败:', err.message);
          return [];
        })
      ]);

      // 合并并过滤
      const allData = [...mainBoardData, ...gemData];
      const filteredData = this.filterAndCategorize(allData);

      console.log(`[HKExNews] 爬取完成:`);
      console.log(`  - 申购中: ${filteredData.subscribeIPOs.length} 只`);
      console.log(`  - 即将上市: ${filteredData.upcomingIPOs.length} 只`);
      console.log(`  - 已忽略(已上市): ${filteredData.ignoredCount} 只`);

      return filteredData;
    } catch (error) {
      console.error('[HKExNews] 爬取失败:', error.message);
      return null;
    }
  }

  /**
   * 爬取单个页面
   */
  async scrapePage(urlPath, market) {
    try {
      const fullURL = this.baseURL + urlPath;
      const response = await axios.get(fullURL, {
        headers: this.headers,
        timeout: 30000
      });

      const $ = cheerio.load(response.data);
      const stocks = [];

      // HKExNews的页面结构 - 查找新股信息表格
      // 常见的表格类名: .table, .list-table, .data-table
      const tableSelectors = [
        '.table-striped tbody tr',
        '.新股 table tr',
        '#listing-app-table tr',
        '.application-table tr',
        'table tbody tr',
        '.container table tr'
      ];

      let found = false;
      for (const selector of tableSelectors) {
        if (found) break;

        $(selector).each((index, row) => {
          const cells = $(row).find('td');
          if (cells.length < 5) return;

          const stockCode = $(cells[0]).text().trim();
          const stockName = $(cells[1]).text().trim();
          const listingDate = $(cells[2]).text().trim();
          const applicationStart = $(cells[3]).text().trim();
          const applicationEnd = $(cells[4]).text().trim();

          // 验证股票代码 (4-5位数字)
          if (!this.isValidStockCode(stockCode)) return;

          // 解析日期
          const parsedListingDate = this.parseDate(listingDate);
          const parsedAppStart = this.parseDate(applicationStart);
          const parsedAppEnd = this.parseDate(applicationEnd);

          if (stockCode && stockName) {
            stocks.push({
              stockCode: this.cleanStockCode(stockCode),
              stockName: stockName,
              listingDate: parsedListingDate,
              applicationStartDate: parsedAppStart,
              applicationEndDate: parsedAppEnd,
              market: market,
              source: 'HKExNews',
              updateTime: new Date().toISOString()
            });
            found = true;
          }
        });
      }

      // 备选方案: 使用链接模式匹配
      if (!found || stocks.length === 0) {
        console.log('[HKExNews] 表格匹配未找到数据，尝试链接匹配...');

        // 查找包含股票代码的链接
        $('a[href*="/stock-code/"], a[href*="/ipo/"]').each((i, el) => {
          const href = $(el).attr('href') || '';
          const text = $(el).text().trim();

          // 匹配 "00001 股票名称" 格式
          const match = text.match(/^(\d{4,5})\s+(.+)$/);
          if (match) {
            stocks.push({
              stockCode: match[1],
              stockName: match[2],
              listingDate: '',
              applicationStartDate: '',
              applicationEndDate: '',
              market: market,
              source: 'HKExNews',
              updateTime: new Date().toISOString()
            });
          }
        });
      }

      console.log(`[HKExNews] ${market}获取 ${stocks.length} 条数据`);
      return stocks;
    } catch (error) {
      console.error(`[HKExNews] 爬取${market}失败:`, error.message);
      return [];
    }
  }

  /**
   * 过滤并分类股票
   */
  filterAndCategorize(stocks) {
    const now = new Date();
    const result = {
      subscribeIPOs: [],   // 申购中
      upcomingIPOs: [],   // 即将上市(已截止申购)
      ignoredCount: 0      // 已忽略的股票数
    };

    stocks.forEach(stock => {
      const listingDate = stock.listingDate ? new Date(stock.listingDate) : null;
      const appStart = stock.applicationStartDate ? new Date(stock.applicationStartDate) : null;
      const appEnd = stock.applicationEndDate ? new Date(stock.applicationEndDate) : null;

      // 判断状态
      if (listingDate && listingDate < now) {
        // 已上市 - 忽略
        result.ignoredCount++;
        return;
      }

      if (appStart && appEnd) {
        if (now >= appStart && now <= appEnd) {
          // 申购中
          result.subscribeIPOs.push({
            ...stock,
            status: 'subscribe'
          });
        } else if (now > appEnd) {
          // 申购已截止，即将上市
          result.upcomingIPOs.push({
            ...stock,
            status: 'upcoming'
          });
        } else {
          // 还未开始申购
          result.upcomingIPOs.push({
            ...stock,
            status: 'upcoming'
          });
        }
      } else if (listingDate && listingDate > now) {
        // 有上市日期但无申购日期，视为即将上市
        result.upcomingIPOs.push({
          ...stock,
          status: 'upcoming'
        });
      } else {
        // 无法判断状态，归为即将上市
        result.upcomingIPOs.push({
          ...stock,
          status: 'upcoming'
        });
      }
    });

    return result;
  }

  /**
   * 验证股票代码
   */
  isValidStockCode(code) {
    if (!code) return false;
    const cleaned = code.replace(/\s/g, '');
    return /^\d{4,5}$/.test(cleaned);
  }

  /**
   * 清理股票代码
   */
  cleanStockCode(code) {
    if (!code) return '';
    return code.replace(/\s/g, '').replace(/[^0-9]/g, '').slice(0, 5);
  }

  /**
   * 解析日期 (支持多种格式)
   */
  parseDate(str) {
    if (!str || str === '-' || str === '--') return '';

    // 移除多余空格
    str = str.trim();

    // 格式1: 2023-12-25
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      return str;
    }

    // 格式2: 2023/12/25
    if (/^\d{4}\/\d{2}\/\d{2}$/.test(str)) {
      return str.replace(/\//g, '-');
    }

    // 格式3: 25-12-2023 或 25/12/2023
    const ddmmyyyyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (ddmmyyyyMatch) {
      const day = ddmmyyyyMatch[1].padStart(2, '0');
      const month = ddmmyyyyMatch[2].padStart(2, '0');
      return `${ddmmyyyyMatch[3]}-${month}-${day}`;
    }

    // 格式4: 20231225
    if (/^\d{8}$/.test(str)) {
      return `${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)}`;
    }

    // 格式5: 中文格式 2023年12月25日
    const cnMatch = str.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日$/);
    if (cnMatch) {
      return `${cnMatch[1]}-${cnMatch[2].padStart(2, '0')}-${cnMatch[3].padStart(2, '0')}`;
    }

    return str;
  }
}

module.exports = new HKExNewsScraper();