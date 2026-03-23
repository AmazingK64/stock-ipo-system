# 🇭🇰 港股IPO智能打新系统

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![AI Generated](https://img.shields.io/badge/AI%20Generated-100%25-ff69b4.svg)

**智能策略 · 实时数据 · 风险可控**

[功能特性](#-功能特性) · [快速开始](#-快速开始) · [使用指南](#-使用指南) · [技术架构](#-技术架构)

</div>

---

## 📝 项目说明

> **⚠️ 重要声明**: 本项目由AI助手(WorkBuddy)完全生成，包括代码、文档、设计等所有内容。项目仅供学习和研究使用，不构成任何投资建议。股市有风险，投资需谨慎。

本项目是一个基于React + TypeScript的港股IPO智能打新系统，提供实时孖展数据分析、智能策略推荐、中签率估算等功能，帮助投资者做出更明智的打新决策。

---

## ✨ 功能特性

### 🎯 核心功能

- **📊 实时孖展数据**
  - 实时获取港股IPO孖展倍数
  - 公开发售认购倍数追踪
  - 一手中签率实时估算
  - 申购人数统计

- **🧠 AI深度分析工作流**
  - 5个AI角色分工协作（基本面分析师、市场分析师、招股书专家、策略分析师、结论复盘师）
  - 基于真实招股书和网络信息的多维度分析
  - 商业模式、护城河、估值水平深度解读
  - 募资用途分析和风险提示
  - 综合投资建议和预期收益

- **⭐ 智能评分系统（100分制）**
  - 行业热度（35分）：AI/半导体等风口行业加分
  - 保荐人（20分）：中金/摩根等第一梯队保荐人加分
  - 投资者背景（16分）：基石投资者和知名机构加分
  - 商业模式（10分）：护城河深度评估
  - 估值水平（10分）：PE/PB对比同行
  - 绿鞋机制（5分）：有无超额配售权
  - AH折价（2分）：A+H股折价安全垫
  - 盈利能力（2分）：盈利/亏损企业差异化评分
  - 评分等级：A+(≥80) / A(72-79) / A-(65-71) / B+(58-64) / B(48-57) / B-(38-47) / C+(28-37) / C(18-27) / D(<18)

- **💰 融资分配策略**
  - 甲组/乙组资金分配建议
  - 融资倍数>100x时优先现金申购策略
  - 资金锁定利息计算
  - 融资费用统计(99HKD/笔)
  - 预期收益和净收益率计算

### 🎨 特色功能

- **📑 招股书PDF下载**
  - 自动从披露易下载招股书
  - 本地缓存管理
  - 已截止招股自动清理

- **🟢 绿鞋红鞋机制**
  - 绿鞋机制(超额配售权)识别
  - 红鞋机制(散户保护)计算
  - 一手党中签率估算

- **🔒 风险控制**
  - 申购总额限制(本金×10)
  - 风险等级标识
  - 破发风险提示
  - 差异化估值：亏损企业不因亏损扣分，18C科创板/生物医药B类正常评分

- **📰 网络信息补充**
  - 自动搜索招股书以外的关键信息
  - 商业模式深度分析
  - 客户集中度、专利风险等识别
  - 小红书讨论热度参考

---

## 🚀 快速开始

### 环境要求

- Node.js >= 16.0.0
- npm >= 8.0.0

### 安装步骤

```bash
# 克隆项目
git clone https://github.com/AmazingK64/stock-ipo-system.git

# 进入项目目录
cd stock-ipo-system

# 安装前端依赖
npm install

# 安装后端依赖（用于获取真实数据）
cd backend && npm install && cd ..
```

### 启动服务

#### 方式一：只启动前端（使用模拟数据）

```bash
npm run dev
```

访问地址: http://localhost:5173

#### 方式二：同时启动前端和后端（推荐，获取真实数据）

```bash
# 终端1：启动后端爬虫服务
npm run backend

# 终端2：启动前端
npm run dev
```

或者一次性启动（需要两个终端）：

```bash
# 终端1：启动后端和前端
npm run start:all
```

### 后端服务说明

后端服务运行在 **http://localhost:3001**，提供以下API：

| 接口 | 说明 |
|------|------|
| `GET /api/ipo-list` | 获取申购中IPO列表（含评分） |
| `GET /api/subscribe-list` | 获取申购中的新股（仅subscribe状态） |
| `GET /api/ipo-all` | 获取分类IPO数据（申购中/即将上市/今日上市/近期上市） |
| `GET /api/margin-data` | 获取孖展数据 |
| `GET /prospectus/:file` | 获取本地缓存的招股书PDF |
| `POST /api/prospectus/update` | 更新招股书（下载+清理） |
| `GET /api/prospectus/list` | 获取已下载招股书列表 |
| `POST /api/scoring/enrich` | 手动触发网络搜索补充评分数据 |
| `GET /api/health` | 健康检查 |

如果后端服务未启动，前端会使用IndexedDB缓存数据。

### 构建生产版本

```bash
npm run build
```

---

## 📖 使用指南

### 1. 设置资金总量

首次使用需要设置可用于打新的资金总量，系统会根据资金规模推荐最优策略。

### 2. 查看实时孖展数据

系统自动获取并展示：
- 正在招股的IPO列表
- 实时孖展倍数和金额
- 公开发售认购倍数
- 一手中签率预估
- 申购热度等级

### 3. 分析策略方案

系统自动生成3个策略方案：
- **最优方案**: 收益率最高
- **次优方案**: 风险收益平衡
- **第三优方案**: 稳健选择

每个方案包含：
- 资金分配明细
- 中签率分析
- 预期收益
- 成本明细
- 风险等级

### 4. 理解关键指标

**热度等级**:
- 🔥 超热门: 认购倍数 > 100x
- 🔥 热门: 认购倍数 50-100x
- 较热门: 认购倍数 20-50x
- 一般: 认购倍数 10-20x
- 冷门: 认购倍数 < 10x

**中签率**:
- 一手党中签率: 只申购1手的成功率
- 一手中签率: 申购1手的综合概率
- 综合中签率: 根据申购金额计算的实际概率

---

## 🏗️ 技术架构

### 技术栈

- **前端框架**: React 18 + TypeScript
- **UI组件库**: Ant Design 5
- **数据存储**: IndexedDB (Dexie.js)
- **构建工具**: Vite
- **状态管理**: React Hooks

### 项目结构

```
stock-ipo-system/
├── src/
│   ├── components/          # React组件
│   │   ├── AIWorkflow.tsx            # AI深度分析工作流
│   │   ├── CapitalManagement.tsx      # 资金管理
│   │   ├── DeepAnalysis.tsx          # 深度分析弹窗
│   │   ├── IPOColumns.tsx            # IPO列表列定义
│   │   ├── IPOList.tsx               # IPO列表主组件
│   │   ├── IPOTabs.tsx               # IPO Tab配置
│   │   ├── RealTimeMarginData.tsx    # 实时孖展数据
│   │   └── StrategyPlans.tsx         # 策略方案
│   ├── services/            # 业务服务
│   │   ├── hkIPOScoring.ts           # 港股IPO评分服务
│   │   ├── ipoScoring.ts            # IPO评分服务
│   │   ├── ipoService.ts            # IPO数据服务
│   │   └── strategyService.ts        # 策略计算服务
│   ├── types/               # TypeScript类型定义
│   ├── db/                  # 数据库配置
│   └── utils/               # 工具函数
├── backend/
│   ├── scraper/             # 爬虫模块
│   │   ├── aastocks-scraper.js       # AASTOCKS孖展爬虫
│   │   ├── etnet-scraper-fixed.js    # ETNet爬虫
│   │   ├── hkex-prospectus-downloader.js  # 披露易招股书下载
│   │   ├── hkexnews-scraper.js       # HKExNews爬虫
│   │   ├── web-search-service.js     # 网络搜索补充服务
│   │   └── prospectus-scraper.js     # 招股书数据
│   ├── data/                # 静态数据
│   │   ├── prospectus/      # 招股书PDF存储
│   │   └── prospectus-data/ # 招股书元数据
│   ├── server.js            # 后端服务入口
│   └── dataProvider.js      # 数据提供器
├── docs/                    # 文档
├── AGENTS.md                # AI Agent规范
├── SKILL.md                 # Skill开发规范
└── README.md                # 项目说明
```

### 核心算法

**评分体系（100分制）**:
```typescript
总分 = 行业热度(35) + 保荐人(20) + 投资者(16) +
      商业模式(10) + 估值(10) + 绿鞋(5) +
      AH折价(2) + 盈利(2)

// 行业热度评分
- AI/半导体/新能源等风口行业: 35分
- 医疗器械/汽车电子等: 20分
- 一般行业: 12分
- 传统行业: 8分

// 保荐人评分
- 中金/摩根/高盛等第一梯队: 20分
- 海通/华泰/招商等第二梯队: 16分
- 其他: 10分

// 投资者背景评分
- 基石投资者≥3家且有知名机构: 16分
- 有基石但无知名机构: 9分
- 无基石投资者: 0分

// 等级划分
- A+级: ≥80分 (顶级优质港股标的)
- A级: 72-79分 (优质港股标的)
- A-级: 65-71分 (良好港股标的)
- B+级: 58-64分 (中上港股标的)
- B级: 48-57分 (中等港股标的)
- B-级: 38-47分 (中下港股标的)
- C+/C/C-: 较差至高风险标的
- D级: <18分 (高风险标的)
```

**差异化估值逻辑**:
- 18C科创板(AI/新能源/半导体+亏损): 亏损不失分,正常18分
- B类生物医药(亏损): 管线价值未体现,给18分
- 传统行业大市值(家电/空调等>50亿): 市值评分降档

---

## 📊 数据来源

### 实际数据源

- **ETNet**: http://stocks.etnet.hk/ （实时行情、招股数据）
- **AASTOCKS**: https://www.aastocks.com/ （孖展数据）
- **HKExNews**: https://www1.hkexnews.hk/ （披露易招股书）
- **静态JSON**: 本地完整新股数据文件

### 数据存储

- **IndexedDB**: 前端本地缓存（通过Dexie.js）
- **招股书PDF**: 后端本地存储 `backend/data/prospectus/`
- **评分缓存**: 后端本地存储 `backend/data/search-cache/`

---

## 🌿 分支管理

本项目采用Git Flow工作流程：

### 分支说明

| 分支类型 | 分支名称 | 说明 |
|---------|---------|------|
| 主分支 | `main` | 稳定的生产版本，只接受经过测试的代码 |
| 迭代分支 | `develop` | 日常功能迭代开发，默认开发分支 |
| 功能分支 | `feature/xxx` | 具体功能开发，从develop创建 |

### 工作流程

#### 1. 日常开发（在develop分支）

```bash
# 确保在develop分支
git checkout develop

# 拉取最新代码
git pull

# 进行代码修改后提交
git add .
git commit -m "✨ 新增功能描述"

# 推送到远程
git push
```

#### 2. 功能稳定后合并到main

```bash
# 切换到main分支
git checkout main

# 拉取最新代码
git pull

# 合并develop分支
git merge develop

# 推送到远程
git push

# 切回develop继续开发
git checkout develop
```

#### 3. 大功能开发（创建feature分支）

```bash
# 从develop创建功能分支
git checkout develop
git checkout -b feature/real-time-scraper

# 开发完成后合并回develop
git checkout develop
git merge feature/real-time-scraper

# 删除功能分支（可选）
git branch -d feature/real-time-scraper
```

---

## 🤝 参与贡献

虽然这是一个AI生成的项目，但欢迎社区贡献！

1. Fork 本项目
2. 切换到develop分支 (`git checkout develop`)
3. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
4. 提交更改 (`git commit -m '✨ Add some AmazingFeature'`)
5. 推送到分支 (`git push origin feature/AmazingFeature`)
6. 提交 Pull Request 到 develop 分支

---

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

---

## ⚠️ 免责声明

1. **AI生成**: 本项目由AI完全生成，可能存在未知bug或逻辑错误
2. **数据准确**: 演示数据仅供参考，不保证准确性
3. **投资风险**: 本系统不构成任何投资建议，投资有风险，决策需谨慎
4. **合规性**: 请遵守当地法律法规，合法使用本系统

---

## 📞 联系方式

- 项目地址: [GitHub](https://github.com/AmazingK64/stock-ipo-system)
- 问题反馈: [Issues](https://github.com/AmazingK64/stock-ipo-system/issues)

---

<div align="center">

**⭐ 如果这个项目对你有帮助，请给一个Star支持一下 ⭐**

Made with ❤️ by AI (WorkBuddy)

</div>
