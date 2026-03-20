/**
 * AiPO数据网爬虫
 * 主要数据源：https://aipo.myiqdii.com/
 */

const axios = require('axios');
const cheerio = require('cheerio');

class AIPOScraper {
  constructor() {
    this.baseURL = 'https://aipo.myiqdii.com';
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Referer': 'https://aipo.myiqdii.com/'
    };
  }

  /**
   * 爬取孖展数据
   */
  async scrapeMarginData() {
    try {
      console.log('[AiPO] 开始爬取孖展数据...');
      const response = await axios.get(`${this.baseURL}/margin/index`, {
        headers: this.headers,
        timeout: 30000
      });

      const $ = cheerio.load(response.data);
      const marginData = [];

      // 根据实际网页结构调整选择器
      $('table tbody tr, .margin-table tbody tr, .list-table tbody tr').each((index, element) => {
        const cells = $(element).find('td');
        if (cells.length >= 4) {
          const stockCode = $(cells[0]).text().trim();
          const stockName = $(cells[1]).text().trim();
          const marginMultiple = this.parseNumber($(cells[2]).text());
          const marginAmount = this.parseNumber($(cells[3]).text());

          if (stockCode && !isNaN(marginMultiple)) {
            marginData.push({
              stockCode,
              stockName,
              marginMultiple,
              marginAmount,
              updateTime: new Date().toISOString()
            });
          }
        }
      });

      console.log(`[AiPO] 成功获取 ${marginData.length} 条孖展数据`);
      return marginData;
    } catch (error) {
      console.error('[AiPO] 爬取孖展数据失败:', error.message);
      return [];
    }
  }

  /**
   * 爬取申购数据
   */
  async scrapeSubscriptionData() {
    try {
      console.log('[AiPO] 开始爬取申购数据...');
      const response = await axios.get(`${this.baseURL}/aipo/apply`, {
        headers: this.headers,
        timeout: 30000
      });

      const $ = cheerio.load(response.data);
      const subscriptionData = [];

      $('table tbody tr, .subscription-table tbody tr').each((index, element) => {
        const cells = $(element).find('td');
        if (cells.length >= 3) {
          const stockCode = $(cells[0]).text().trim();
          const subscriptionMultiple = this.parseNumber($(cells[1]).text());
          const oneHandWinRate = this.parsePercent($(cells[2]).text());

          if (stockCode && !isNaN(subscriptionMultiple)) {
            subscriptionData.push({
              stockCode,
              subscriptionMultiple,
              oneHandWinRate
            });
          }
        }
      });

      console.log(`[AiPO] 成功获取 ${subscriptionData.length} 条申购数据`);
      return subscriptionData;
    } catch (error) {
      console.error('[AiPO] 爬取申购数据失败:', error.message);
      return [];
    }
  }

  /**
   * 爬取IPO列表
   */
  async scrapeIPOList() {
    try {
      console.log('[AiPO] 开始爬取IPO列表...');
      const response = await axios.get(`${this.baseURL}/aipo/ipo`, {
        headers: this.headers,
        timeout: 30000
      });

      const $ = cheerio.load(response.data);
      const ipoList = [];

      $('table tbody tr, .ipo-table tbody tr').each((index, element) => {
        const cells = $(element).find('td');
        if (cells.length >= 6) {
          const stockCode = $(cells[0]).text().trim();
          const stockName = $(cells[1]).text().trim();
          const listingDate = $(cells[2]).text().trim();
          const issuePrice = this.parseNumber($(cells[3]).text());
          const subscriptionEndDate = $(cells[4]).text().trim();

          if (stockCode && stockName) {
            ipoList.push({
              stockCode,
              stockName,
              listingDate,
              issuePrice: issuePrice.toString(),
              subscriptionEndDate,
              updateTime: new Date().toISOString()
            });
          }
        }
      });

      console.log(`[AiPO] 成功获取 ${ipoList.length} 条IPO数据`);
      return ipoList;
    } catch (error) {
      console.error('[AiPO] 爬取IPO列表失败:', error.message);
      return [];
    }
  }

  /**
   * 解析数字（移除逗号等格式字符）
   */
  parseNumber(str) {
    if (!str) return 0;
    const cleaned = str.replace(/,/g, '').replace(/HK\$/gi, '').replace(/\$/g, '').trim();
    return parseFloat(cleaned) || 0;
  }

  /**
   * 解析百分比
   */
  parsePercent(str) {
    if (!str) return 0;
    const cleaned = str.replace(/%/g, '').trim();
    return parseFloat(cleaned) / 100 || 0;
  }
}

module.exports = new AIPOScraper();
