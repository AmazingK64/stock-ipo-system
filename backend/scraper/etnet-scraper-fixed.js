/**
 * ETNet 爬虫 - 修复版
 * 数据源：http://stocks.etnet.hk/www/sc/stocks/ci_ipo.php
 *
 * 修复说明：
 * - 区分「今日上市」(实时行情) 和「即将上市新股」(IPO数据)
 * - 过滤行业分类条目
 * - 正确解析HTML结构
 */

const axios = require('axios');
const cheerio = require('cheerio');

class ETNetScraper {
  constructor() {
    this.baseURL = 'http://stocks.etnet.hk/www/sc/stocks/ci_ipo.php';
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Referer': 'http://stocks.etnet.hk/'
    };

    // 行业分类关键词，用于过滤无效数据
    this.industryKeywords = [
      '半导体', '家庭及个人护理用品', '资讯科技器材', '软件服务',
      '医疗保健', '工业', '金融', '地产', '能源', '消费'
    ];
  }

  /**
   * 主入口：爬取所有IPO相关数据
   */
  async scrapeAll() {
    try {
      console.log('[ETNet] 开始爬取IPO页面...');
      const response = await axios.get(this.baseURL, {
        headers: this.headers,
        timeout: 30000
      });

      const $ = cheerio.load(response.data);
      const result = {
        upcomingIPOs: [],      // 即将上市新股
        subscribeIPOs: [],    // 申购中的新股
        todayListed: [],      // 今日上市(实时行情)
        recentListed: [],     // 近期上市(半新股)
        updateTime: new Date().toISOString(),
        source: 'ETNet'
      };

      // 1. 解析今日上市数据 (实时行情)
      result.todayListed = this.parseTodayListed($);

      // 2. 解析即将上市新股
      result.upcomingIPOs = this.parseUpcomingIPOs($);

      // 3. 解析近期上市股票
      result.recentListed = this.parseRecentListed($);

      console.log(`[ETNet] 爬取完成:`);
      console.log(`  - 今日上市: ${result.todayListed.length} 只`);
      console.log(`  - 即将上市: ${result.upcomingIPOs.length} 只`);
      console.log(`  - 近期上市: ${result.recentListed.length} 只`);

      return result;
    } catch (error) {
      console.error('[ETNet] 爬取失败:', error.message);
      return null;
    }
  }

  /**
   * 解析今日上市数据
   * 位置: "今日上市" 区块，class="figureTable"
   * 这是已上市股票的实时行情，不是真正的IPO
   */
  parseTodayListed($) {
    const stocks = [];

    // 查找今日上市区块
    const todaySection = $('.DivFigureBox.shadow').filter((i, el) => {
      return $(el).find('.DivTemplateBHdr').text().includes('今日上市');
    });

    if (todaySection.length === 0) {
      return stocks;
    }

    // 解析表格行
    todaySection.find('tr').each((index, row) => {
      if (index === 0) return; // 跳过表头

      const cells = $(row).find('td');
      if (cells.length < 11) return;

      const stockCode = $(cells[0]).text().trim();
      const stockName = $(cells[1]).text().trim();
      const currentPrice = $(cells[3]).text().trim();
      const change = $(cells[4]).text().trim();
      const changeRate = $(cells[5]).text().trim();
      const issuePrice = $(cells[6]).text().trim();
      const openingPrice = $(cells[7]).text().trim();
      const highPrice = $(cells[8]).text().trim();
      const lowPrice = $(cells[9]).text().trim();
      const turnover = $(cells[10]).text().trim();

      if (!this.isValidStockCode(stockCode)) return;

      stocks.push({
        stockCode: this.cleanStockCode(stockCode),
        stockName: stockName,
        currentPrice: currentPrice,
        change: change,
        changeRate: changeRate,
        issuePrice: issuePrice,
        openingPrice: openingPrice,
        highPrice: highPrice,
        lowPrice: lowPrice,
        turnover: turnover,
        currency: 'HKD',
        status: 'today_listed',
        source: 'ETNet'
      });
    });

    return stocks;
  }

  /**
   * 解析即将上市新股
   * 位置: "上市时间表" 区块，"即将上市新股" 行
   */
  parseUpcomingIPOs($) {
    const stocks = [];

    // 查找即将上市新股的表格行
    // 包含 "即将上市新股" 文字的行后面的表格
    $('table').each((tableIndex, table) => {
      const rows = $(table).find('tr');

      rows.each((rowIndex, row) => {
        const rowText = $(row).text();

        // 找到即将上市新股行
        if (rowText.includes('即将上市新股')) {
          // 下一行开始是数据
          const nextRow = rows[rowIndex + 1];
          if (nextRow) {
            const cells = $(nextRow).find('td');
            cells.each((cellIndex, cell) => {
              const link = $(cell).find('a');
              if (link.length > 0) {
                const href = link.attr('href');
                const text = link.text().trim();

                // 解析链接格式: "02701 国民技术"
                const match = text.match(/^(\d{5})\s+(.+)$/);
                if (match) {
                  stocks.push({
                    stockCode: match[1],
                    stockName: match[2],
                    listingDate: '',  // 需要从日历或其他地方获取
                    status: 'upcoming',
                    source: 'ETNet'
                  });
                }
              }
            });
          }
        }
      });
    });

    return stocks;
  }

  /**
   * 解析近期上市股票
   */
  parseRecentListed($) {
    const stocks = [];

    // 查找热炒半新股区块
    const hotSection = $('a[href*="ci_ipo_listed.php"]').closest('tr');
    hotSection.each((i, row) => {
      const cells = $(row).find('td');
      if (cells.length >= 2) {
        const codeAndName = $(cells[0]).text().trim();
        const match = codeAndName.match(/^(\d{5})\s+(.+)$/);
        if (match) {
          stocks.push({
            stockCode: match[1],
            stockName: match[2],
            status: 'recent_listed',
            source: 'ETNet'
          });
        }
      }
    });

    return stocks;
  }

  /**
   * 验证股票代码是否有效
   */
  isValidStockCode(code) {
    if (!code) return false;

    // 必须是4-5位数字
    const cleaned = code.replace(/\s/g, '');
    if (!/^\d{4,5}$/.test(cleaned)) {
      return false;
    }

    // 股票代码不能是被拼接的(太长)
    if (cleaned.length > 5) {
      return false;
    }

    return true;
  }

  /**
   * 验证股票名称是否有效
   */
  isValidStockName(name) {
    if (!name) return false;

    // 过滤行业分类
    if (this.industryKeywords.includes(name)) {
      return false;
    }

    // 名称不能包含特定关键词
    if (name.includes('按盘价') || name.includes('变动率')) {
      return false;
    }

    // 名称不能是日期格式
    if (/^\d{8}$/.test(name)) {
      return false;
    }

    return true;
  }

  /**
   * 清理股票代码
   */
  cleanStockCode(code) {
    if (!code) return '';
    const cleaned = code.replace(/\s/g, '').replace(/[^0-9]/g, '');
    return cleaned.slice(0, 5); // 最多5位
  }

  /**
   * 解析数字
   */
  parseNumber(str) {
    if (!str) return 0;
    const cleaned = str.replace(/,/g, '').replace(/HK\$/gi, '').replace(/\$/g, '').replace(/[^\d.]/g, '').trim();
    return parseFloat(cleaned) || 0;
  }

  /**
   * 格式化日期
   */
  formatDate(dateStr) {
    if (!dateStr || dateStr.length !== 8) return dateStr;
    return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
  }

  /**
   * 生成统一的IPO列表 (兼容旧接口)
   * 只返回真正的IPO数据(申购中+即将上市)
   */
  async scrapeIPOList() {
    const allData = await this.scrapeAll();
    if (!allData) return [];

    const ipoList = [];

    // 添加即将上市新股
    allData.upcomingIPOs.forEach(ipo => {
      ipoList.push({
        stockCode: ipo.stockCode,
        stockName: ipo.stockName,
        listingDate: ipo.listingDate || '',
        issuePrice: ipo.issuePrice || '0',
        subscriptionEndDate: ipo.subscriptionEndDate || '',
        status: 'upcoming',
        source: 'ETNet',
        updateTime: allData.updateTime
      });
    });

    // 添加申购中的新股
    allData.subscribeIPOs.forEach(ipo => {
      ipoList.push({
        stockCode: ipo.stockCode,
        stockName: ipo.stockName,
        listingDate: ipo.listingDate || '',
        issuePrice: ipo.issuePrice || '0',
        subscriptionEndDate: ipo.subscriptionEndDate || '',
        status: 'subscribe',
        source: 'ETNet',
        updateTime: allData.updateTime
      });
    });

    return ipoList;
  }

  /**
   * 获取实时行情数据 (今日上市股票)
   */
  async scrapeRealtimeQuotes() {
    const allData = await this.scrapeAll();
    return allData ? allData.todayListed : [];
  }
}

module.exports = new ETNetScraper();
