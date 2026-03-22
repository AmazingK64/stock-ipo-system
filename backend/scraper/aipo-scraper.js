/**
 * AiPO数据网爬虫
 * 主要数据源：https://aipo.myiqdii.com/
 * 孖展数据：https://aipo.myiqdii.com/margin/index
 * 
 * 使用 Puppeteer 获取动态渲染的页面
 */

const puppeteer = require('puppeteer');

class AIPOScraper {
  constructor() {
    this.baseURL = 'https://aipo.myiqdii.com';
    this.marginURL = 'https://aipo.myiqdii.com/margin/index';
  }

  /**
   * 爬取孖展数据
   */
  async scrapeMarginData() {
    let browser = null;
    try {
      console.log('[AiPO] 开始爬取孖展数据...', this.marginURL);

      browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu'
        ]
      });

      const page = await browser.newPage();
      
      // 设置 User-Agent
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // 设置视口大小
      await page.setViewport({ width: 1280, height: 800 });

      console.log('[AiPO] 正在加载页面...');
      
      // 访问页面
      await page.goto(this.marginURL, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // 等待表格加载
      console.log('[AiPO] 等待数据加载...');
      await page.waitForSelector('table, .table, .margin-table', { timeout: 10000 }).catch(() => {
        console.log('[AiPO] 未找到表格元素，尝试其他方式...');
      });

      // 额外等待确保数据加载完成
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 获取页面内容
      const content = await page.content();
      
      // 使用 cheerio 解析
      const cheerio = require('cheerio');
      const $ = cheerio.load(content);
      const marginData = [];

      // 尝试多种表格选择器
      const selectors = [
        'table tbody tr',
        '.table tbody tr',
        '.margin-table tbody tr',
        '.list-table tbody tr',
        '.data-table tbody tr',
        'table tr',
        '.el-table__body tr',
        '.ant-table-tbody tr'
      ];

      let foundRows = 0;
      for (const selector of selectors) {
        const rows = $(selector);
        if (rows.length > 1) { // 大于1行，排除表头
          console.log(`[AiPO] 找到表格: ${selector}, ${rows.length} 行`);
          foundRows = rows.length;
          
          rows.each((index, element) => {
            const cells = $(element).find('td');
            if (cells.length >= 3) {
              const cellTexts = [];
              cells.each((i, cell) => {
                cellTexts.push($(cell).text().trim());
              });

              // 尝试识别股票代码格式 (通常是4-5位数字)
              let stockCode = '';
              let stockName = '';
              let marginMultiple = 0;
              let marginAmount = 0;

              for (let i = 0; i < cellTexts.length; i++) {
                const text = cellTexts[i];
                
                // 检查是否是股票代码
                if (/^\d{4,5}$/.test(text)) {
                  stockCode = text;
                  // 股票名称通常在代码后面
                  if (i + 1 < cellTexts.length && !/^\d/.test(cellTexts[i + 1])) {
                    stockName = cellTexts[i + 1];
                  }
                }
                
                // 检查是否是孖展倍数 (通常带 x 或倍)
                if (text.includes('倍') || text.includes('x') || text.includes('X')) {
                  const num = parseFloat(text.replace(/[倍xX]/g, ''));
                  if (!isNaN(num) && num > 0) {
                    marginMultiple = num;
                  }
                }
                
                // 检查是否是数字 (可能是倍数或金额)
                const num = parseFloat(text.replace(/,/g, ''));
                if (!isNaN(num) && num > 0) {
                  // 如果包含"亿"，则是金额
                  if (text.includes('亿')) {
                    marginAmount = num;
                  } else if (num < 1000 && marginMultiple === 0) {
                    // 较小的数字可能是倍数
                    marginMultiple = num;
                  }
                }
              }

              if (stockCode && marginMultiple > 0) {
                marginData.push({
                  stockCode,
                  stockName: stockName || `股票${stockCode}`,
                  marginMultiple,
                  marginAmount,
                  updateTime: new Date().toISOString()
                });
              }
            }
          });

          if (marginData.length > 0) {
            break;
          }
        }
      }

      // 如果上面没找到，尝试直接从页面提取数据
      if (marginData.length === 0) {
        console.log('[AiPO] 尝试直接从页面提取数据...');
        
        const pageData = await page.evaluate(() => {
          const results = [];
          
          // 查找所有可能的表格
          const tables = document.querySelectorAll('table');
          tables.forEach(table => {
            const rows = table.querySelectorAll('tr');
            rows.forEach(row => {
              const cells = row.querySelectorAll('td');
              if (cells.length >= 3) {
                const cellTexts = Array.from(cells).map(cell => cell.textContent.trim());
                results.push(cellTexts);
              }
            });
          });
          
          return results;
        });

        console.log(`[AiPO] 从页面提取到 ${pageData.length} 行数据`);

        pageData.forEach(row => {
          let stockCode = '';
          let stockName = '';
          let marginMultiple = 0;
          let marginAmount = 0;

          row.forEach((text, i) => {
            // 检查是否是股票代码
            if (/^\d{4,5}$/.test(text)) {
              stockCode = text;
              if (i + 1 < row.length && !/^\d/.test(row[i + 1])) {
                stockName = row[i + 1];
              }
            }
            
            // 解析数字
            const num = parseFloat(text.replace(/[,亿倍xX]/g, ''));
            if (!isNaN(num) && num > 0) {
              if (text.includes('亿')) {
                marginAmount = num;
              } else if (num < 1000 && marginMultiple === 0) {
                marginMultiple = num;
              }
            }
          });

          if (stockCode && marginMultiple > 0) {
            marginData.push({
              stockCode,
              stockName: stockName || `股票${stockCode}`,
              marginMultiple,
              marginAmount,
              updateTime: new Date().toISOString()
            });
          }
        });
      }

      console.log(`[AiPO] 成功获取 ${marginData.length} 条孖展数据`);
      
      if (marginData.length > 0) {
        console.log('[AiPO] 示例数据:', marginData.slice(0, 3));
      } else {
        // 输出调试信息
        console.log('[AiPO] 未找到数据，页面内容片段:');
        const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 500));
        console.log(bodyText);
      }
      
      return marginData;
    } catch (error) {
      console.error('[AiPO] 爬取孖展数据失败:', error.message);
      return [];
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * 爬取申购数据
   */
  async scrapeSubscriptionData() {
    let browser = null;
    try {
      console.log('[AiPO] 开始爬取申购数据...');
      
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
      
      await page.goto(`${this.baseURL}/aipo/apply`, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      await page.waitForSelector('table', { timeout: 10000 }).catch(() => {});
      await new Promise(resolve => setTimeout(resolve, 2000));

      const content = await page.content();
      const cheerio = require('cheerio');
      const $ = cheerio.load(content);
      const subscriptionData = [];

      $('table tbody tr, .subscription-table tbody tr').each((index, element) => {
        const cells = $(element).find('td');
        if (cells.length >= 3) {
          const stockCode = $(cells[0]).text().trim();
          const subscriptionMultiple = parseFloat($(cells[1]).text()) || 0;
          const oneHandWinRate = parseFloat($(cells[2]).text().replace('%', '')) / 100 || 0;

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
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * 爬取IPO列表
   */
  async scrapeIPOList() {
    let browser = null;
    try {
      console.log('[AiPO] 开始爬取IPO列表...');
      
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
      
      await page.goto(`${this.baseURL}/aipo/ipo`, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      await page.waitForSelector('table', { timeout: 10000 }).catch(() => {});
      await new Promise(resolve => setTimeout(resolve, 2000));

      const content = await page.content();
      const cheerio = require('cheerio');
      const $ = cheerio.load(content);
      const ipoList = [];

      $('table tbody tr, .ipo-table tbody tr').each((index, element) => {
        const cells = $(element).find('td');
        if (cells.length >= 6) {
          const stockCode = $(cells[0]).text().trim();
          const stockName = $(cells[1]).text().trim();
          const listingDate = $(cells[2]).text().trim();
          const issuePrice = parseFloat($(cells[3]).text()) || 0;
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
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}

module.exports = new AIPOScraper();
