/**
 * AASTOCKS 爬虫
 * 数据源：
 * - https://www.aastocks.com/sc/stocks/market/ipo/mainpage.aspx (孖展数据)
 * - https://www.aastocks.com/sc/stocks/market/ipo/upcomingipo/company-summary (即将上市详情)
 */

const axios = require('axios');
const cheerio = require('cheerio');

class AASTOCKSScraper {
  constructor() {
    this.mainPageURL = 'https://www.aastocks.com/sc/stocks/market/ipo/mainpage.aspx';
    this.upcomingURL = 'https://www.aastocks.com/sc/stocks/market/ipo/upcomingipo/company-summary';
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Referer': 'https://www.aastocks.com/'
    };
  }

  /**
   * 爬取AASTOCKS IPO完整数据
   */
  async scrapeAll() {
    try {
      console.log('[AASTOCKS] 开始爬取IPO完整数据...');

      const [mainPageData, upcomingData] = await Promise.all([
        this.scrapeMainPage().catch(err => {
          console.warn('[AASTOCKS] 主页数据获取失败:', err.message);
          return [];
        }),
        this.scrapeUpcomingPage().catch(err => {
          console.warn('[AASTOCKS] 即将上市数据获取失败:', err.message);
          return [];
        })
      ]);

      // 合并数据，upcomingData作为主要数据源
      const merged = this.mergeData(mainPageData, upcomingData);

      console.log(`[AASTOCKS] 共获取 ${merged.length} 条数据`);
      return merged;
    } catch (error) {
      console.error('[AASTOCKS] 爬取失败:', error.message);
      return [];
    }
  }

  /**
   * 爬取主页孖展数据
   */
  async scrapeMainPage() {
    console.log('[AASTOCKS] 爬取主页孖展数据...');
    const response = await axios.get(this.mainPageURL, {
      headers: this.headers,
      timeout: 30000
    });

    const $ = cheerio.load(response.data);
    const marginData = [];

    // 查找孖展数据表格
    $('table tr').each((index, element) => {
      const cells = $(element).find('td');
      if (cells.length >= 4) {
        const stockCode = $(cells[0]).text().trim();
        const stockName = $(cells[1]).text().trim();
        const marginMultiple = this.parseNumber($(cells[2]).text());
        const marginAmount = this.parseNumber($(cells[3]).text());

        if (stockCode && /^\d{4,5}$/.test(stockCode.replace(/\s/g, '')) && marginMultiple > 0) {
          marginData.push({
            stockCode: this.cleanStockCode(stockCode),
            stockName: stockName,
            marginMultiple,
            marginAmount,
            source: 'AASTOCKS',
            updateTime: new Date().toISOString()
          });
        }
      }
    });

    console.log(`[AASTOCKS] 孖展数据: ${marginData.length} 条`);
    return marginData;
  }

  /**
   * 爬取即将上市详情页
   */
  async scrapeUpcomingPage() {
    console.log('[AASTOCKS] 爬取即将上市详情页...');
    const response = await axios.get(this.upcomingURL, {
      headers: this.headers,
      timeout: 30000
    });

    const $ = cheerio.load(response.data);
    const ipoList = [];

    // AASTOCKS即将上市页面的表格结构
    // 常见的列: 股票代码、股票名称、上市日期、发行价、申购日期、孖展倍数
    const tableSelectors = [
      '.IPOList tr',
      '.ipo-table tr',
      '#IPOList tr',
      'table.ipo-list tr',
      '.content table tr',
      'table tr'
    ];

    let found = false;
    for (const selector of tableSelectors) {
      if (found) break;

      $(selector).each((index, element) => {
        const cells = $(element).find('td');
        if (cells.length >= 6) {
          const stockCode = $(cells[0]).text().trim();
          const stockName = $(cells[1]).text().trim();

          // 跳过表头和无效数据
          if (!stockCode || stockCode.includes('代码') || !/^\d{4,5}$/.test(stockCode.replace(/\s/g, ''))) {
            return;
          }

          const listingDate = $(cells[2]).text().trim();
          const issuePrice = this.parseNumber($(cells[3]).text());
          const subscriptionStartDate = $(cells[4]).text().trim();
          const subscriptionEndDate = $(cells[5]).text().trim();

          // 过滤行业分类条目
          if (!this.isValidStockName(stockName)) return;

          if (stockCode && stockName) {
            ipoList.push({
              stockCode: this.cleanStockCode(stockCode),
              stockName: stockName,
              listingDate: this.parseDate(listingDate),
              issuePrice: issuePrice.toString(),
              subscriptionStartDate: this.parseDate(subscriptionStartDate),
              subscriptionEndDate: this.parseDate(subscriptionEndDate),
              source: 'AASTOCKS',
              updateTime: new Date().toISOString()
            });
            found = true;
          }
        }
      });
    }

    // 备选方案: 查找所有包含股票代码的行
    if (ipoList.length === 0) {
      $('tr').each((rowIndex, row) => {
        if (found) return;
        const cells = $(row).find('td');
        if (cells.length >= 5) {
          const firstCellText = $(cells[0]).text().trim();
          // 匹配4-5位股票代码
          const codeMatch = firstCellText.match(/(\d{4,5})/);
          if (codeMatch) {
            const stockCode = codeMatch[1];
            const stockName = $(cells[1]).text().trim();

            if (!this.isValidStockName(stockName)) return;

            const listingDate = $(cells[2]).text().trim();
            const issuePrice = this.parseNumber($(cells[3]).text());
            const subscriptionEndDate = $(cells[4]).text().trim();

            ipoList.push({
              stockCode: stockCode,
              stockName: stockName,
              listingDate: this.parseDate(listingDate),
              issuePrice: issuePrice.toString(),
              subscriptionEndDate: this.parseDate(subscriptionEndDate),
              source: 'AASTOCKS',
              updateTime: new Date().toISOString()
            });
            found = true;
          }
        }
      });
    }

    console.log(`[AASTOCKS] 即将上市数据: ${ipoList.length} 条`);
    return ipoList;
  }

  /**
   * 爬取AASTOCKS IPO列表 (兼容旧接口)
   */
  async scrapeIPOList() {
    return this.scrapeAll();
  }

  /**
   * 爬取孖展数据
   */
  async scrapeMarginData() {
    return this.scrapeMainPage();
  }

  /**
   * 合并孖展数据和IPO数据
   */
  mergeData(marginData, upcomingData) {
    const merged = new Map();

    // 先添加IPO数据
    upcomingData.forEach(ipo => {
      merged.set(ipo.stockCode, {
        ...ipo,
        marginMultiple: 0,
        marginAmount: 0
      });
    });

    // 合并孖展数据
    marginData.forEach(margin => {
      if (merged.has(margin.stockCode)) {
        const existing = merged.get(margin.stockCode);
        merged.set(margin.stockCode, {
          ...existing,
          marginMultiple: margin.marginMultiple,
          marginAmount: margin.marginAmount
        });
      } else {
        // 只有孖展数据没有IPO详情
        merged.set(margin.stockCode, {
          stockCode: margin.stockCode,
          stockName: margin.stockName,
          listingDate: '',
          issuePrice: '0',
          subscriptionStartDate: '',
          subscriptionEndDate: '',
          marginMultiple: margin.marginMultiple,
          marginAmount: margin.marginAmount,
          source: 'AASTOCKS',
          updateTime: new Date().toISOString()
        });
      }
    });

    return Array.from(merged.values());
  }

  /**
   * 验证股票名称是否有效
   */
  isValidStockName(name) {
    if (!name) return false;

    // 过滤行业分类
    const industryKeywords = [
      '半导体', '家庭及个人护理用品', '资讯科技器材', '软件服务',
      '医疗保健', '工业', '金融', '地产', '能源', '消费',
      '按盘价', '变动率', '上市价'
    ];

    for (const keyword of industryKeywords) {
      if (name.includes(keyword)) return false;
    }

    // 名称不能是纯数字或日期格式
    if (/^\d+$/.test(name) || /^\d{8}$/.test(name)) return false;

    return true;
  }

  /**
   * 清理股票代码
   */
  cleanStockCode(code) {
    if (!code) return '';
    const cleaned = code.replace(/\s/g, '').replace(/[^0-9]/g, '');
    return cleaned;
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
   * 解析日期
   */
  parseDate(str) {
    if (!str || str === '-' || str === '--') return '';
    str = str.trim();

    // 格式: 2023-12-25
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

    // 格式: 2023/12/25
    if (/^\d{4}\/\d{2}\/\d{2}$/.test(str)) return str.replace(/\//g, '-');

    // 格式: 25-12-2023
    const dmyMatch = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (dmyMatch) {
      return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`;
    }

    // 格式: 20231225
    if (/^\d{8}$/.test(str)) {
      return `${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)}`;
    }

    return str;
  }
}

module.exports = new AASTOCKSScraper();
