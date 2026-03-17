# 港股IPO实时数据爬虫实现方案

## 📊 数据源

### 1. AiPO数据网 (主要数据源)
- **网站**: https://aipo.myiqdii.com/
- **孖展数据**: https://aipo.myiqdii.com/margin/index
- **申购数据**: https://aipo.myiqdii.com/aipo/apply
- **优点**: 数据最全面,包含孖展倍数、认购倍数、一手中签率
- **更新频率**: 实时更新,每分钟刷新

### 2. AASTOCKS (备用数据源)
- **网站**: https://www.aastocks.com/sc/stocks/market/ipo/mainpage.aspx
- **优点**: 官方数据,可靠性高
- **缺点**: 孖展数据更新较慢

### 3. ETNet (补充数据源)
- **网站**: http://stocks.etnet.hk/www/sc/stocks/ci_ipo.php
- **优点**: 专业财经网站,数据准确
- **缺点**: 需要处理简繁体转换

---

## 🚀 后端爬虫实现

### 方案1: Node.js + Puppeteer (推荐)

```javascript
// backend/scraper/aipo-scraper.js
const puppeteer = require('puppeteer');

class AIPOScraper {
  async scrapeMarginData() {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // 设置User-Agent避免被拦截
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    // 访问孖展数据页面
    await page.goto('https://aipo.myiqdii.com/margin/index', {
      waitUntil: 'networkidle2'
    });
    
    // 等待数据加载
    await page.waitForSelector('.margin-table');
    
    // 提取数据
    const marginData = await page.evaluate(() => {
      const rows = document.querySelectorAll('.margin-table tbody tr');
      return Array.from(rows).map(row => {
        const cells = row.querySelectorAll('td');
        return {
          stockCode: cells[0].textContent.trim(),
          stockName: cells[1].textContent.trim(),
          marginMultiple: parseFloat(cells[2].textContent),
          marginAmount: parseFloat(cells[3].textContent),
          updateTime: cells[4].textContent.trim()
        };
      });
    });
    
    await browser.close();
    return marginData;
  }
  
  async scrapeSubscriptionData() {
    // 爬取申购数据
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    
    await page.goto('https://aipo.myiqdii.com/aipo/apply', {
      waitUntil: 'networkidle2'
    });
    
    const subscriptionData = await page.evaluate(() => {
      const rows = document.querySelectorAll('.subscription-table tbody tr');
      return Array.from(rows).map(row => {
        const cells = row.querySelectorAll('td');
        return {
          stockCode: cells[0].textContent.trim(),
          subscriptionMultiple: parseFloat(cells[1].textContent),
          oneHandWinRate: parseFloat(cells[2].textContent) / 100,
          clawbackRatio: parseFloat(cells[3].textContent)
        };
      });
    });
    
    await browser.close();
    return subscriptionData;
  }
}

module.exports = new AIPOScraper();
```

### 方案2: Python + Selenium

```python
# backend/scraper/aipo_scraper.py
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time

class AIPOScraper:
    def __init__(self):
        options = webdriver.ChromeOptions()
        options.add_argument('--headless')
        options.add_argument('--no-sandbox')
        self.driver = webdriver.Chrome(options=options)
    
    def scrape_margin_data(self):
        self.driver.get('https://aipo.myiqdii.com/margin/index')
        
        # 等待表格加载
        WebDriverWait(self.driver, 10).until(
            EC.presence_of_element_located((By.CLASS_NAME, 'margin-table'))
        )
        
        # 提取数据
        rows = self.driver.find_elements(By.CSS_SELECTOR, '.margin-table tbody tr')
        data = []
        for row in rows:
            cells = row.find_elements(By.TAG_NAME, 'td')
            data.append({
                'stockCode': cells[0].text.strip(),
                'stockName': cells[1].text.strip(),
                'marginMultiple': float(cells[2].text),
                'marginAmount': float(cells[3].text),
                'updateTime': cells[4].text.strip()
            })
        
        return data
    
    def close(self):
        self.driver.quit()
```

### 方案3: 直接调用API (最快)

```javascript
// backend/api/aipo-api.js
const axios = require('axios');

class AIPOAPI {
  constructor() {
    this.baseURL = 'https://aipo.myiqdii.com/api';
  }
  
  async getMarginData() {
    try {
      const response = await axios.get(`${this.baseURL}/margin/list`, {
        params: {
          page: 1,
          size: 50
        },
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Referer': 'https://aipo.myiqdii.com/'
        }
      });
      
      return response.data.data;
    } catch (error) {
      console.error('获取孖展数据失败:', error);
      return [];
    }
  }
  
  async getIPOList() {
    try {
      const response = await axios.get(`${this.baseURL}/ipo/list`, {
        params: {
          status: 'subscribing', // 正在招股
          page: 1,
          size: 50
        }
      });
      
      return response.data.data;
    } catch (error) {
      console.error('获取IPO列表失败:', error);
      return [];
    }
  }
}

module.exports = new AIPOAPI();
```

---

## 📡 后端API设计

### Express.js 后端

```javascript
// backend/server.js
const express = require('express');
const cors = require('cors');
const aipoScraper = require('./scraper/aipo-scraper');

const app = express();

app.use(cors());

// 获取实时孖展数据
app.get('/api/margin-data', async (req, res) => {
  try {
    const data = await aipoScraper.scrapeMarginData();
    res.json({
      success: true,
      data,
      updateTime: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取申购数据
app.get('/api/subscription-data', async (req, res) => {
  try {
    const data = await aipoScraper.scrapeSubscriptionData();
    res.json({
      success: true,
      data,
      updateTime: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 定时更新数据(每5分钟)
setInterval(async () => {
  console.log('定时更新数据...');
  await aipoScraper.scrapeMarginData();
}, 5 * 60 * 1000);

app.listen(3001, () => {
  console.log('后端服务运行在 http://localhost:3001');
});
```

---

## 🔄 前端调用

```typescript
// src/services/realTimeDataService.ts (更新)
class RealTimeDataService {
  private baseURL = 'http://localhost:3001/api';
  
  async fetchRealTimeIPOData(): Promise<RealTimeIPOData[]> {
    try {
      // 调用真实后端API
      const [marginRes, subscriptionRes] = await Promise.all([
        fetch(`${this.baseURL}/margin-data`),
        fetch(`${this.baseURL}/subscription-data`)
      ]);
      
      const marginData = await marginRes.json();
      const subscriptionData = await subscriptionRes.json();
      
      // 合并数据
      return this.mergeData(marginData.data, subscriptionData.data);
    } catch (error) {
      console.error('获取实时数据失败:', error);
      // 降级到模拟数据
      return this.getMockData();
    }
  }
  
  private mergeData(marginData: any[], subscriptionData: any[]): RealTimeIPOData[] {
    // 合并孖展数据和申购数据
    return marginData.map(margin => {
      const subscription = subscriptionData.find(s => s.stockCode === margin.stockCode);
      return {
        ...margin,
        ...subscription,
        // 其他字段...
      };
    });
  }
}
```

---

## ⚠️ 注意事项

### 1. 反爬虫机制
- **设置合理的请求频率**: 不要太快,建议间隔2-3秒
- **使用代理IP池**: 避免单一IP被封
- **模拟真实用户**: 设置User-Agent、Referer等请求头
- **处理验证码**: 必要时手动处理或使用OCR识别

### 2. 数据可靠性
- **多数据源交叉验证**: 使用AiPO + AASTOCKS双重验证
- **数据清洗**: 处理异常值、缺失值
- **实时性**: 设置合理的刷新频率(建议5分钟)

### 3. 法律合规
- **遵守robots.txt**: 查看网站的爬虫协议
- **数据版权**: 标注数据来源,仅供个人使用
- **合理使用**: 不要过度请求,避免对服务器造成压力

---

## 🎯 推荐实现方案

### 最简单: 直接使用模拟数据
- 适合演示和测试
- 无需后端
- 数据固定

### 中等方案: Node.js后端 + Puppeteer
- 数据真实可靠
- 实现相对简单
- 需要部署服务器

### 最佳方案: Python后端 + 定时任务
- 数据最全面
- 可扩展性强
- 支持多数据源爬取
- 可部署到云服务器24小时运行

---

## 📦 部署建议

### 开发环境
```bash
# 安装依赖
npm install puppeteer axios

# 启动后端
node backend/server.js

# 启动前端
npm run dev
```

### 生产环境
```bash
# 使用PM2管理进程
pm2 start backend/server.js --name ipo-backend

# 设置开机自启
pm2 startup
pm2 save
```

### Docker部署
```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
EXPOSE 3001

CMD ["node", "backend/server.js"]
```

---

## 🔧 当前状态

✅ 前端已完成实时数据展示组件  
✅ 前端已集成模拟数据服务  
⏳ 后端爬虫待实现(需用户选择方案)  
⏳ 数据库待配置(可选MongoDB/MySQL)

**建议**: 先使用模拟数据完成功能测试,后续再实现真实爬虫后端。
