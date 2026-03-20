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

- **🧠 智能策略推荐**
  - 基于多维度的IPO评分系统
  - 自动生成Top3最优策略方案
  - 考虑融资倍数的中签率计算
  - 智能资金分配建议

- **💰 成本收益分析**
  - 机会成本计算(资金锁定利息)
  - 融资费用统计(99HKD/笔)
  - 交易费用预估
  - 净收益率计算

- **🏭 行业赛道评分**
  - 热门赛道识别(AI、新能源、半导体等)
  - 行业龙头加分机制
  - 行业增长前景评估
  - PE合理性分析

### 🎨 特色功能

- **🟢 绿鞋红鞋机制**
  - 绿鞋机制(超额配售权)识别
  - 红鞋机制(散户保护)计算
  - 一手党中签率估算
  - 甲组/乙组分类

- **📈 盈利能力评分**
  - 净利润规模评估
  - 营收增长率分析
  - 亏损企业高增长识别
  - 财务健康度评分

- **🔒 风险控制**
  - 申购总额限制(本金×10)
  - 风险等级标识
  - 破发风险提示
  - 热度等级分类

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
| `GET /api/ipo-list` | 获取IPO列表（从AiPO、HKEX等数据源） |
| `GET /api/margin-data` | 获取孖展数据 |
| `GET /api/subscription-data` | 获取申购数据 |
| `GET /api/cached-data` | 获取缓存数据 |
| `GET /api/health` | 健康检查 |

如果后端服务未启动，前端会自动降级到模拟数据。

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
│   │   ├── CapitalManagement.tsx      # 资金管理
│   │   ├── IPOList.tsx                # IPO列表
│   │   ├── StrategyPlans.tsx          # 策略方案
│   │   ├── RealTimeMarginData.tsx     # 实时数据
│   │   └── AllocationStrategy.tsx     # 分配策略
│   ├── services/            # 业务服务
│   │   ├── ipoService.ts              # IPO数据服务
│   │   ├── strategyService.ts         # 策略计算服务
│   │   └── realTimeDataService.ts     # 实时数据服务
│   ├── types/               # TypeScript类型定义
│   ├── db/                  # 数据库配置
│   └── utils/               # 工具函数
├── docs/                    # 文档
│   └── real-time-data-scraper.md      # 爬虫实现方案
├── AGENTS.md                # AI Agent规范
├── SKILL.md                 # Skill开发规范
└── README.md                # 项目说明
```

### 核心算法

**中签率计算模型**:
```typescript
// 甲组(≤500万): 一手党保护机制
oneHandPartyRate = min(1, totalLots × 0.7 / oneHandApplicants)

// 综合中签率: 边际递减效应
winRate = oneHandWinRate × log(subscriptionHands + 1) / log(2) × 孖展惩罚系数

// 预期中签手数: 保底+概率
expectedLots = expectedLotsFromRate × 0.7 + 保底机制 × 0.3
```

**评分体系**:
```typescript
总分 = 基础分 × 30% +
      保荐人分 × 20% +
      行业赛道分 × 20% +
      盈利能力分 × 20% +
      龙头地位分 × 5% +
      绿鞋机制分 × 5%
```

---

## 📊 数据来源

### 当前使用

- **模拟数据**: 基于真实数据结构生成的演示数据
- **本地存储**: IndexedDB本地数据库

### 生产环境(待实现)

- **AiPO数据网**: https://aipo.myiqdii.com/
- **AASTOCKS**: https://www.aastocks.com/
- **ETNet**: http://stocks.etnet.hk/

详细实现方案见: [docs/real-time-data-scraper.md](docs/real-time-data-scraper.md)

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
