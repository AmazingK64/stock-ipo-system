/**
 * 披露易招股书下载爬虫
 * 从港交所新上市资料页面获取招股书PDF链接并下载到本地
 *
 * 数据源:
 * - 主板: https://www2.hkexnews.hk/New-Listings/New-Listing-Information/Main-Board?sc_lang=zh-HK
 * - GEM: https://www2.hkexnews.hk/New-Listings/New-Listing-Information/GEM?sc_lang=zh-HK
 *
 * 页面表格结构:
 * | 股份代号 | 股份名称 | 新上市公告 | 招股章程 | 股份配发结果 |
 * 招股章程列有PDF下载链接
 */

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const path = require('path');
const dataProvider = require('../dataProvider');

class HKExProspectusDownloader {
  constructor() {
    this.mainBoardUrl = 'https://www2.hkexnews.hk/New-Listings/New-Listing-Information/Main-Board?sc_lang=zh-HK';
    this.gemUrl = 'https://www2.hkexnews.hk/New-Listings/New-Listing-Information/GEM?sc_lang=zh-HK';
    this.prospectusDir = path.join(__dirname, '../data/prospectus');
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
    };
  }

  /**
   * 初始化招股书存储目录
   */
  async init() {
    try {
      await fs.mkdir(this.prospectusDir, { recursive: true });
      console.log('[招股书下载] 目录已就绪:', this.prospectusDir);
    } catch (error) {
      console.error('[招股书下载] 创建目录失败:', error);
    }
  }

  /**
   * 从披露易页面获取新上市公司列表及招股书链接
   * @param {string} market - 'main' 或 'gem'
   * @returns {Array} 上市公司列表，每项包含 stockCode, stockName, prospectusUrl 等
   */
  async fetchListingPage(market = 'main') {
    const url = market === 'main' ? this.mainBoardUrl : this.gemUrl;
    const marketName = market === 'main' ? '主板' : 'GEM';

    try {
      console.log(`[招股书下载] 获取${marketName}新上市资料...`);
      const response = await axios.get(url, {
        headers: this.headers,
        timeout: 30000
      });

      const $ = cheerio.load(response.data);
      const listings = [];

      // 解析表格 - 新上市资料页面有一个包含招股章程链接的表格
      // 表格列: 股份代号 | 股份名称 | 新上市公告 | 招股章程 | 股份配发结果
      $('table tbody tr, .new-listing-table tr, table.listing-table tr, table tr').each((index, row) => {
        const cells = $(row).find('td');
        if (cells.length < 4) return;

        const stockCode = $(cells[0]).text().trim();
        const stockName = $(cells[1]).text().trim();

        // 验证股票代码 (3-5位数字)
        if (!/^\d{3,5}$/.test(stockCode)) return;

        // 获取招股章程PDF链接
        // 页面结构: 第1列=代号, 第2列=名称, 第3列=新上市公告, 第4列=招股章程, 第5列=配发结果
        let prospectusUrl = '';
        let announcementUrl = '';
        let allotmentUrl = '';

        cells.each((colIndex, cell) => {
          const $cell = $(cell);
          const link = $cell.find('a[href*=".pdf"]');
          if (link.length > 0) {
            const href = link.attr('href') || '';
            const fullUrl = href.startsWith('http') ? href : `https://www1.hkexnews.hk${href}`;

            if (colIndex === 2) {
              announcementUrl = fullUrl;
            } else if (colIndex === 3) {
              prospectusUrl = fullUrl;
            } else if (colIndex >= 4) {
              allotmentUrl = fullUrl;
            }
          }
        });

        if (stockCode && stockName) {
          listings.push({
            stockCode,
            stockName: stockName.replace(/[-WBZPS]$/, '').trim(), // 去掉特殊后缀标识
            stockNameRaw: stockName,
            prospectusUrl,
            announcementUrl,
            allotmentUrl,
            market,
            fetchedAt: new Date().toISOString()
          });
        }
      });

      console.log(`[招股书下载] ${marketName}获取到 ${listings.length} 条记录`);
      return listings;
    } catch (error) {
      console.error(`[招股书下载] 获取${marketName}数据失败:`, error.message);
      return [];
    }
  }

  /**
   * 获取所有市场的新上市资料
   */
  async fetchAllListings() {
    const [mainData, gemData] = await Promise.all([
      this.fetchListingPage('main').catch(err => {
        console.warn('[招股书下载] 主板数据获取失败:', err.message);
        return [];
      }),
      this.fetchListingPage('gem').catch(err => {
        console.warn('[招股书下载] GEM数据获取失败:', err.message);
        return [];
      })
    ]);

    return [...mainData, ...gemData];
  }

  /**
   * 下载招股书PDF到本地
   * @param {string} stockCode - 股票代码
   * @param {string} stockName - 股票名称
   * @param {string} url - PDF下载链接
   * @returns {Object} 下载结果 { success, filePath, fileSize }
   */
  async downloadProspectus(stockCode, stockName, url) {
    if (!url) {
      return { success: false, reason: '无PDF链接' };
    }

    try {
      console.log(`[招股书下载] 下载 ${stockCode} ${stockName}...`);

      const response = await axios.get(url, {
        headers: this.headers,
        timeout: 120000, // PDF可能很大，给2分钟超时
        responseType: 'arraybuffer'
      });

      // 保存到本地
      const fileName = `${stockCode}_${stockName}.pdf`;
      const filePath = path.join(this.prospectusDir, fileName);

      await fs.writeFile(filePath, response.data);

      const fileSizeMB = (response.data.length / 1024 / 1024).toFixed(2);
      console.log(`[招股书下载] ${stockCode} ${stockName} 下载完成 (${fileSizeMB}MB)`);

      return {
        success: true,
        filePath,
        fileName,
        fileSize: response.data.length,
        fileSizeMB: parseFloat(fileSizeMB),
        downloadedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error(`[招股书下载] ${stockCode} 下载失败:`, error.message);
      return { success: false, reason: error.message };
    }
  }

  /**
   * 从IPO数据中获取申购中股票代码集合
   * 根据申购截止日期判断，只返回当前仍在申购中的
   * @returns {Set<string>} 申购中的股票代码集合
   */
  async getSubscribingCodes() {
    try {
      const data = await dataProvider.getAllData();
      const now = new Date();
      const subscribingCodes = new Set();

      const allIPOs = [
        ...(data.subscribeIPOs || []),
        ...(data.upcomingIPOs || [])
      ];

      for (const ipo of allIPOs) {
        if (!ipo.stockCode) continue;

        // 如果有申购截止日期，检查是否已过
        if (ipo.subscriptionEndDate) {
          const endDate = new Date(ipo.subscriptionEndDate);
          if (endDate >= now) {
            // 仍在申购中
            subscribingCodes.add(ipo.stockCode);
          }
        } else {
          // 没有截止日期的，默认保留（仍在申购中）
          subscribingCodes.add(ipo.stockCode);
        }
      }

      console.log(`[招股书下载] 申购中的股票: ${subscribingCodes.size} 只 (${[...subscribingCodes].join(', ')})`);
      return subscribingCodes;
    } catch (error) {
      console.warn('[招股书下载] 获取IPO数据失败，将下载披露易所有招股书:', error.message);
      return null; // 返回null表示无法判断，降级处理
    }
  }

  /**
   * 更新招股书库: 下载新招股书 + 剔除过期数据
   *
   * 逻辑:
   * 1. 从IPO数据获取当前仍在申购中的股票代码
   * 2. 从披露易获取当前新上市资料列表
   * 3. 只下载同时满足「在披露易列表中」且「申购中」的招股书
   * 4. 删除本地已截止申购或不在披露易列表中的招股书
   * 5. 返回操作结果
   *
   * @returns {Object} 操作结果
   */
  async updateProspectusLibrary() {
    await this.init();

    console.log('[招股书下载] 开始更新招股书库...');

    // 1. 获取当前仍在申购中的股票代码
    const subscribingCodes = await this.getSubscribingCodes();

    // 2. 获取披露易当前的新上市列表
    const listings = await this.fetchAllListings();
    if (listings.length === 0) {
      console.warn('[招股书下载] 无法获取披露易数据，跳过更新');
      return { success: false, reason: '披露易数据获取失败' };
    }

    // 当前在披露易上的股票代码集合
    const hkexCodes = new Set(listings.map(l => l.stockCode));

    // 3. 确定应该保留的招股书：在披露易上且申购中
    const shouldKeepCodes = new Set();
    for (const listing of listings) {
      if (subscribingCodes === null) {
        // 无法判断申购状态，保留所有披露易上的
        shouldKeepCodes.add(listing.stockCode);
      } else if (subscribingCodes.has(listing.stockCode)) {
        shouldKeepCodes.add(listing.stockCode);
      } else {
        console.log(`[招股书下载] 跳过已截止: ${listing.stockCode} ${listing.stockName}`);
      }
    }

    // 4. 检查本地已有文件
    try {
      const files = await fs.readdir(this.prospectusDir);
      const localFiles = files.filter(f => f.endsWith('.pdf'));

      // 解析本地文件名获取股票代码: 格式为 {stockCode}_{stockName}.pdf
      const localFileMap = new Map(); // stockCode -> fileName
      localFiles.forEach(f => {
        const match = f.match(/^(\d{3,5})_/);
        if (match) {
          localFileMap.set(match[1], f);
        }
      });

      // 5. 删除不在 shouldKeepCodes 中的过期招股书
      // 原因: 申购已截止 或 已从披露易页面消失
      const expiredCodes = [...localFileMap.keys()].filter(code => !shouldKeepCodes.has(code));
      const deletedFiles = [];

      for (const code of expiredCodes) {
        const fileName = localFileMap.get(code);
        if (!fileName) continue;
        try {
          const filePath = path.join(this.prospectusDir, fileName);
          await fs.unlink(filePath);
          console.log(`[招股书下载] 删除过期招股书: ${fileName} (申购已截止或已从披露易移除)`);
          deletedFiles.push(fileName);
        } catch (err) {
          console.warn(`[招股书下载] 删除 ${fileName} 失败:`, err.message);
        }
      }

      // 6. 下载新的招股书（只下载 shouldKeepCodes 中且本地不存在的）
      const newDownloads = [];
      let downloadedCount = 0;
      let failedCount = 0;
      let skippedExpired = 0;

      for (const listing of listings) {
        // 跳过已截止申购的
        if (!shouldKeepCodes.has(listing.stockCode)) {
          skippedExpired++;
          continue;
        }

        // 检查是否已有本地文件
        if (localFileMap.has(listing.stockCode)) {
          continue; // 已存在，跳过
        }

        // 尝试下载招股书
        const result = await this.downloadProspectus(
          listing.stockCode,
          listing.stockNameRaw || listing.stockName,
          listing.prospectusUrl
        );

        if (result.success) {
          newDownloads.push(result);
          downloadedCount++;
        } else {
          failedCount++;
        }

        // 延迟避免请求过快
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      console.log(`[招股书下载] 更新完成:`);
      console.log(`  - 披露易当前: ${listings.length} 只`);
      console.log(`  - 申购中(应保留): ${shouldKeepCodes.size} 只`);
      console.log(`  - 跳过已截止: ${skippedExpired} 只`);
      console.log(`  - 本地已有: ${localFileMap.size} 份`);
      console.log(`  - 新下载: ${downloadedCount} 份`);
      console.log(`  - 下载失败: ${failedCount} 份`);
      console.log(`  - 删除过期: ${deletedFiles.length} 份`);

      return {
        success: true,
        totalOnHKEx: listings.length,
        subscribingCount: shouldKeepCodes.size,
        localFiles: localFileMap.size - deletedFiles.length + newDownloads.length,
        newDownloads,
        deletedFiles,
        skippedExpired,
        skippedAlreadyExist: [...shouldKeepCodes].filter(c => localFileMap.has(c)).length,
        failedDownloads: failedCount
      };
    } catch (error) {
      console.error('[招股书下载] 读取本地目录失败:', error);
      return { success: false, reason: error.message };
    }
  }

  /**
   * 获取本地招股书文件列表
   */
  async getLocalProspectusList() {
    try {
      const files = await fs.readdir(this.prospectusDir);
      const pdfFiles = files.filter(f => f.endsWith('.pdf'));

      const list = await Promise.all(pdfFiles.map(async (fileName) => {
        const filePath = path.join(this.prospectusDir, fileName);
        const stat = await fs.stat(filePath);
        const match = fileName.match(/^(\d{3,5})_(.+)\.pdf$/);

        return {
          fileName,
          stockCode: match ? match[1] : '',
          stockName: match ? match[2] : '',
          fileSize: stat.size,
          fileSizeMB: (stat.size / 1024 / 1024).toFixed(2),
          downloadedAt: stat.mtime.toISOString()
        };
      }));

      return list.sort((a, b) => a.stockCode.localeCompare(b.stockCode));
    } catch (error) {
      console.error('[招股书下载] 获取本地文件列表失败:', error);
      return [];
    }
  }
}

module.exports = new HKExProspectusDownloader();
