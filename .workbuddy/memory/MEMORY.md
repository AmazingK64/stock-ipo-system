# 工作记忆

## 系统架构

### 数据流程
```
前端 React → 后端 Express → 爬虫(ETNet/AASTOCKS/HKExNews)
```

### 关键文件
- `backend/server.js` - 后端API服务
- `backend/scraper/etnet-scraper-fixed.js` - ETNet爬虫
- `backend/scraper/aastocks-scraper.js` - AASTOCKS爬虫
- `backend/scraper/hkexnews-scraper.js` - HKExNews爬虫
- `backend/scraper/hkex-prospectus-downloader.js` - 披露易招股书PDF下载器
- `backend/scraper/prospectus-scraper.js` - 招股书数据(预设/元数据)
- `src/components/IPOList.tsx` - IPO列表组件
- `src/components/IPOColumns.tsx` - IPO列定义、评分详情组件
- `src/components/IPOTabs.tsx` - IPO Tab配置
- `src/components/AllocationStrategy.tsx` - 融资分配策略组件

### 股票状态规则
- `subscribe`: 申购中(当前日期在申购开始和截止日期之间)
- `upcoming`: 即将上市(申购已截止但还未上市)
- `today_listed`: 今日上市
- `recent_listed`: 近期上市(已上市)
- `listed`: 已上市(会被过滤掉)

### IPO数据合并逻辑
1. ETNet数据作为基础数据源
2. AASTOCKS孖展数据补充
3. HKExNews作为补充
4. 已上市股票会被过滤，不会返回给前端

## 组件拆分
IPOList组件已拆分为三个文件:
- IPOColumns.tsx - 列定义和工具函数
- IPOTabs.tsx - Tab配置
- IPOList.tsx - 主组件(精简)

## 新增功能 (2026-03-20)

### 实时孖展数据过滤
- 新增后端API `/api/subscribe-list`，只返回subscribe状态的股票
- `realTimeDataService` 改用 `/api/subscribe-list` 接口
- 三层过滤保护：后端API过滤 → 服务层过滤 → 组件层过滤
- 获取失败时保留上次成功数据（`lastSuccessfulData`缓存机制）
- 模拟数据也会按申购截止日期过滤

### 融资分配策略简化
- 主页面只显示简洁卡片和"查看分配详情"按钮
- 点击按钮打开弹窗查看完整策略
- 统计信息:批次数量、资金总额

### 评分交互功能
- 点击评分/等级显示详细评分依据
- 评分细则:行业热度、保荐人、投资者、市值规模、估值水平
- 等级说明:A+/A/B+/B/C+/C/D各等级的含义和建议
- **差异化估值逻辑**: 根据公司类型调整亏损企业评分
  - 18C科创板(AI/新能源/半导体+亏损): 亏损不失分,正常18分
  - B类生物医药(亏损): 管线价值未体现,给18分
  - 传统行业大市值(家电/空调等>50亿): 市值评分降档,涨幅预期有限

### 评分体系
- 满分100分，8个维度: 行业热度(30)+保荐人(18)+投资者(16)+商业模式(17)+估值(10)+绿鞋(5)+AH折价(2)+盈利(2)
- 行业热度: AI/半导体等风口30分，传统行业8分，其他12分
- 保荐人: 中金/摩根等第一梯队18分，第二梯队14分，第三梯队9分，其他6分
- 投资者: 基石+知名机构(≥3家)16分，基石+无知名9分，无基石0分
- 商业模式: `businessModel`(excellent/good/fair/poor) + `moatLevel`(wide/moderate/narrow/none)，满分17
- AH折价: 非A+H股=1分(基础分)，A+H折价≥50%=2分，折价<50%=1分
- 估值: 盈利用PE对比同行，亏损用PB对比(不因亏损扣分)，也支持`valuationLevel`(cheap/fair/premium/expensive)
- 盈利能力: 亏损=0分，盈利=1分，盈利+增长=2分（亏损不代表不好）
- 等级门槛: A+(≥80), A(72-79), A-(65-71), B+(58-64), B(48-57), B-(38-47), C+(28-37), C(18-27), D(<18)
- 评分服务在 `src/services/ipoScoring.ts`，独立文件方便修改
- 评分详情弹窗在 `src/components/IPOColumns.tsx`

### 网络搜索补充评分数据
- 当本地数据缺少 `businessModel`/`valuationLevel`/`moatLevel` 时，自动触发网络搜索
- 搜索服务: `backend/scraper/web-search-service.js`
- 搜索类型: 商业模式、估值、行业概况、AH股信息
- AI分析: 有API时用AI分析，无API时用关键词匹配降级
- 缓存: 24小时有效，存储在 `backend/data/search-cache/`
- 手动触发API: `POST /api/scoring/enrich` (Body: `{ stockCode?: string }`)
- 新增字段: `businessModelReason`, `moatReason`, `valuationReason`, `lastRoundValuation`

### 数据转换注意点
- `ipoService.ts` 和 `realTimeDataService.ts` 的 `transformAPIData` 必须包含所有字段
- 新增字段时需同时更新: types/index.ts → transformAPIData → prospectus-scraper.js → 静态JSON
- IndexedDB缓存旧数据可能导致新字段不显示，App.tsx有`hasMissingFields`检测自动刷新

### 港股IPO发售手数规则
- `totalLots` = 公开发售手数（散户可申购部分），不是总发行手数
- 公开发售比例一般5%-10%，大部分股份走国际配售
- 每手股数不固定:常见50/100/200/500/1000股，必须从招股书获取
- 公司估值在定价前通常为"待定"，上市后才能确定

### 披露易招股书下载
- 爬虫: `hkex-prospectus-downloader.js`
- 数据源: `https://www2.hkexnews.hk/New-Listings/New-Listing-Information/Main-Board?sc_lang=zh-HK`
- 页面表格: 股份代号|名称|新上市公告|招股章程|配发结果
- PDF链接格式: `https://www1.hkexnews.hk/listedco/listconews/sehk/{年}/{月日}/{文件编号}_c.pdf`
- PDF存储: `backend/data/prospectus/`（JSON元数据在 `backend/data/prospectus-data/`）
- API: `POST /api/prospectus/update`(下载+清理), `GET /api/prospectus/list`, `GET /prospectus/{file}`
- 清理逻辑: 已截止招股的股票PDF会自动删除（基于IPO数据中的subscriptionEndDate判断）
- 前端"刷新数据"按钮同时触发招股书更新

### 定时刷新策略
- **已移除** scheduler 定时器，不再自动刷新
- 仅在用户点击"刷新数据"按钮时触发数据更新和招股书下载
- App.tsx 首次加载仍会检查数据日期/缺失字段并自动刷新