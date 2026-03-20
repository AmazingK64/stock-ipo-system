/**
 * 港交所披露易数据爬虫
 * 数据源：https://www.hkex.com.hk/IPO
 */

const axios = require('axios');
const cheerio = require('cheerio');

class HKEXScraper {
  constructor() {
    this.baseURL = 'https://www.hkex.com.hk';
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
    };
  }

  /**
   * 爬取港交所IPO列表
   */
  async scrapeIPOList() {
    try {
      console.log('[HKEX] 开始爬取IPO列表...');
      // 注意：港交所的实际IPO页面可能有不同的URL结构
      const response = await axios.get(`${this.baseURL}/IPO/Issuers_List`, {
        headers: this.headers,
        timeout: 30000
      });

      const $ = cheerio.load(response.data);
      const ipoList = [];

      // 根据实际网页结构调整选择器
      $('table tbody tr, .listing-table tbody tr').each((index, element) => {
        const cells = $(element).find('td');
        if (cells.length >= 5) {
          const stockCode = $(cells[0]).text().trim();
          const stockName = $(cells[1]).text().trim();
          const listingDate = $(cells[2]).text().trim();
          const issuePrice = this.parseNumber($(cells[3]).text());
          const market = $(cells[4]).text().trim();

          if (stockCode && stockName) {
            ipoList.push({
              stockCode,
              stockName,
              listingDate,
              issuePrice: issuePrice.toString(),
              market,
              source: 'HKEX',
              updateTime: new Date().toISOString()
            });
          }
        }
      });

      console.log(`[HKEX] 成功获取 ${ipoList.length} 条IPO数据`);
      return ipoList;
    } catch (error) {
      console.error('[HKEX] 爬取IPO列表失败:', error.message);
      return [];
    }
  }

  /**
   * 解析数字
   */
  parseNumber(str) {
    if (!str) return 0;
    const cleaned = str.replace(/,/g, '').replace(/HK\$/gi, '').trim();
    return parseFloat(cleaned) || 0;
  }
}

module.exports = new HKEXScraper();
