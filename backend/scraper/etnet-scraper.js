/**
 * ETNet 爬虫
 * 数据源：http://stocks.etnet.hk/www/sc/stocks/ci_ipo.php
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
  }

  /**
   * 爬取ETNet IPO列表
   */
  async scrapeIPOList() {
    try {
      console.log('[ETNet] 开始爬取IPO列表...');
      const response = await axios.get(this.baseURL, {
        headers: this.headers,
        timeout: 30000
      });

      const $ = cheerio.load(response.data);
      const ipoList = [];

      // ETNet的表格结构 - 需要根据实际页面调整选择器
      // 常见的表格选择器
      const tableSelectors = [
        'table.ipo-table tr',
        'table tr.ipo-row',
        '.ipo-list table tbody tr',
        'table tbody tr',
        '.STKIPO tbody tr',
        '#IPOList tbody tr'
      ];

      let found = false;
      for (const selector of tableSelectors) {
        if (found) break;
        $(selector).each((index, element) => {
          const cells = $(element).find('td');
          if (cells.length >= 5) {
            const stockCode = $(cells[0]).text().trim();
            const stockName = $(cells[1]).text().trim();

            // 跳过表头和无效数据
            if (!stockCode || stockCode.includes('股票代码') || stockCode.length < 4) {
              return;
            }

            const listingDate = $(cells[2]).text().trim();
            const issuePrice = this.parseNumber($(cells[3]).text());
            const subscriptionEndDate = $(cells[4]).text().trim();

            if (stockCode && stockName) {
              ipoList.push({
                stockCode: this.cleanStockCode(stockCode),
                stockName: stockName,
                listingDate: listingDate,
                issuePrice: issuePrice.toString(),
                subscriptionEndDate: subscriptionEndDate,
                industry: '',
                marketCap: '',
                peRatio: 0,
                underwriter: '',
                source: 'ETNet',
                updateTime: new Date().toISOString()
              });
              found = true;
            }
          }
        });
      }

      // 备选方案：尝试直接解析所有表格行
      if (ipoList.length === 0) {
        $('table').each((tableIndex, table) => {
          if (found) return;
          $(table).find('tr').each((rowIndex, row) => {
            const cells = $(row).find('td');
            if (cells.length >= 5) {
              const stockCode = $(cells[0]).text().trim();
              const stockName = $(cells[1]).text().trim();

              if (stockCode && stockName && /^\d{4,5}$/.test(stockCode.replace(/\s/g, ''))) {
                const listingDate = $(cells[2]).text().trim();
                const issuePrice = this.parseNumber($(cells[3]).text());
                const subscriptionEndDate = $(cells[4]).text().trim();

                ipoList.push({
                  stockCode: this.cleanStockCode(stockCode),
                  stockName: stockName,
                  listingDate: listingDate,
                  issuePrice: issuePrice.toString(),
                  subscriptionEndDate: subscriptionEndDate,
                  source: 'ETNet',
                  updateTime: new Date().toISOString()
                });
                found = true;
              }
            }
          });
        });
      }

      console.log(`[ETNet] 成功获取 ${ipoList.length} 条IPO数据`);
      return ipoList;
    } catch (error) {
      console.error('[ETNet] 爬取IPO列表失败:', error.message);
      return [];
    }
  }

  /**
   * 清理股票代码
   */
  cleanStockCode(code) {
    if (!code) return '';
    // 移除空格和其他非数字字符，保留4-5位数字
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
}

module.exports = new ETNetScraper();
