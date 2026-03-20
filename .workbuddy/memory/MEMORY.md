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
- `backend/scraper/hkexnews-scraper.js` - HKExNews爬虫(新建)
- `src/components/IPOList.tsx` - IPO列表组件
- `src/components/IPOColumns.tsx` - IPO列定义
- `src/components/IPOTabs.tsx` - IPO Tab配置

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