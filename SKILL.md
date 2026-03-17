# SKILL.md - Skill 开发规范

## 📘 什么是 Skill

Skill 是 WorkBuddy AI助手 的扩展能力模块，用于增强AI在特定领域的专业知识和执行能力。本项目可作为港股投资领域的Skill示例。

---

## 🎯 Skill 设计原则

### 1. 单一职责原则
每个Skill应该专注于一个明确的领域或任务：
```
✅ 好的Skill示例:
- 港股IPO打新分析Skill
- 股票技术分析Skill
- 财务报表分析Skill

❌ 不好的示例:
- 股票分析Skill (太宽泛)
```

### 2. 可复用性
Skill应该是可复用的模块：
```typescript
// ✅ 设计可复用的接口
interface SkillContext {
  userQuery: string;
  availableTools: Tool[];
  projectContext: ProjectInfo;
}

interface SkillResult {
  success: boolean;
  data: any;
  message: string;
}

// Skill执行函数
async function executeSkill(context: SkillContext): Promise<SkillResult> {
  // 实现逻辑
}
```

### 3. 可扩展性
预留扩展接口，便于后续增强：
```typescript
// ✅ 使用插件架构
interface SkillPlugin {
  name: string;
  version: string;
  execute: (context: SkillContext) => Promise<SkillResult>;
}

class SkillManager {
  private plugins: Map<string, SkillPlugin> = new Map();
  
  registerPlugin(plugin: SkillPlugin) {
    this.plugins.set(plugin.name, plugin);
  }
  
  async execute(pluginName: string, context: SkillContext) {
    const plugin = this.plugins.get(pluginName);
    return plugin?.execute(context);
  }
}
```

---

## 📦 Skill 结构规范

### 目录结构
```
skill-hk-ipo/
├── SKILL.md              # Skill说明文档
├── README.md             # 使用指南
├── src/
│   ├── index.ts          # 入口文件
│   ├── types.ts          # 类型定义
│   ├── core/
│   │   ├── analyzer.ts   # 核心分析逻辑
│   │   ├── calculator.ts # 计算引擎
│   │   └── validator.ts  # 数据验证
│   ├── services/
│   │   ├── ipoService.ts # IPO数据服务
│   │   └── apiService.ts # API调用
│   └── utils/
│       ├── helpers.ts    # 辅助函数
│       └── constants.ts  # 常量定义
├── tests/
│   ├── analyzer.test.ts
│   └── calculator.test.ts
└── docs/
    ├── api.md
    └── examples.md
```

### 必需文件

#### 1. SKILL.md
```markdown
# Skill名称

## 功能描述
简要描述Skill的功能和用途

## 使用场景
- 场景1
- 场景2

## 输入输出
- 输入: 数据格式和类型
- 输出: 返回结果格式

## 示例
提供使用示例
```

#### 2. 类型定义 (types.ts)
```typescript
// 输入类型
export interface IPOInput {
  stockCode: string;
  stockName: string;
  issuePrice: string;
  // ...
}

// 输出类型
export interface IPOAnalysis {
  score: number;
  grade: string;
  recommendation: string;
  riskLevel: string;
  // ...
}

// 配置类型
export interface SkillConfig {
  dataSources: string[];
  refreshInterval: number;
  // ...
}
```

---

## 🔧 Skill 开发规范

### 1. 错误处理
```typescript
// ✅ 完整的错误处理
export class SkillError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'SkillError';
  }
}

async function analyzeIPO(data: IPOInput): Promise<IPOAnalysis> {
  try {
    // 验证输入
    if (!data.stockCode) {
      throw new SkillError('股票代码不能为空', 'INVALID_INPUT');
    }
    
    // 执行分析
    const result = await performAnalysis(data);
    
    return result;
  } catch (error) {
    if (error instanceof SkillError) {
      throw error;
    }
    throw new SkillError('分析失败', 'ANALYSIS_FAILED', error);
  }
}
```

### 2. 日志记录
```typescript
// ✅ 结构化日志
enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

class Logger {
  log(level: LogLevel, message: string, context?: any) {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      message,
      context
    }));
  }
  
  info(message: string, context?: any) {
    this.log(LogLevel.INFO, message, context);
  }
  
  error(message: string, context?: any) {
    this.log(LogLevel.ERROR, message, context);
  }
}
```

### 3. 数据验证
```typescript
// ✅ 使用类型守卫
function isIPOInput(data: any): data is IPOInput {
  return (
    typeof data === 'object' &&
    typeof data.stockCode === 'string' &&
    typeof data.stockName === 'string'
  );
}

function validateInput(data: unknown): IPOInput {
  if (!isIPOInput(data)) {
    throw new SkillError('输入数据格式不正确', 'INVALID_INPUT');
  }
  return data;
}
```

### 4. 性能优化
```typescript
// ✅ 使用缓存
class CacheManager {
  private cache = new Map<string, { data: any; expire: number }>();
  
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (item && Date.now() < item.expire) {
      return item.data as T;
    }
    return null;
  }
  
  set(key: string, data: any, ttl: number = 300000) {
    this.cache.set(key, {
      data,
      expire: Date.now() + ttl
    });
  }
}

// ✅ 使用并发控制
async function batchAnalyze(items: IPOInput[]): Promise<IPOAnalysis[]> {
  const limit = 5; // 并发限制
  const results: IPOAnalysis[] = [];
  
  for (let i = 0; i < items.length; i += limit) {
    const batch = items.slice(i, i + limit);
    const batchResults = await Promise.all(
      batch.map(item => analyzeIPO(item))
    );
    results.push(...batchResults);
  }
  
  return results;
}
```

---

## 🧪 测试规范

### 单元测试
```typescript
// tests/calculator.test.ts
import { describe, it, expect } from 'vitest';
import { calculateWinRate } from '../src/core/calculator';

describe('中签率计算', () => {
  it('应该正确计算甲组中签率', () => {
    const result = calculateWinRate({
      subscriptionAmount: 100000,
      groupType: '甲组',
      multiple: 50
    });
    
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(1);
  });
  
  it('应该正确处理边界情况', () => {
    const result = calculateWinRate({
      subscriptionAmount: 0,
      groupType: '甲组',
      multiple: 0
    });
    
    expect(result).toBe(0);
  });
});
```

### 集成测试
```typescript
// tests/integration.test.ts
import { describe, it, expect } from 'vitest';
import SkillManager from '../src/index';

describe('Skill集成测试', () => {
  it('应该能够完成完整的分析流程', async () => {
    const skill = new SkillManager();
    const result = await skill.execute({
      stockCode: '01989',
      stockName: '广合科技'
    });
    
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });
});
```

---

## 📊 Skill 质量标准

### 代码质量指标
- **测试覆盖率**: ≥ 80%
- **类型覆盖率**: 100%
- **代码复杂度**: < 10 (圈复杂度)
- **文档完整性**: 所有公共API都有注释

### 性能指标
- **响应时间**: < 2秒 (90%请求)
- **内存使用**: < 100MB
- **CPU使用**: < 50% (峰值)
- **错误率**: < 1%

### 可维护性指标
- **依赖更新**: 每季度更新一次
- **代码审查**: 所有PR都需审查
- **文档更新**: 随代码同步更新
- **issue响应**: < 24小时

---

## 🔐 安全规范

### 数据安全
```typescript
// ✅ 敏感数据加密
import crypto from 'crypto';

function encryptData(data: string, key: string): string {
  const cipher = crypto.createCipher('aes-256-cbc', key);
  return cipher.update(data, 'utf8', 'hex') + cipher.final('hex');
}

// ✅ 数据脱敏
function maskSensitiveData(data: string): string {
  return data.replace(/\d{4}/g, '****');
}
```

### API安全
```typescript
// ✅ 请求限流
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100 // 最多100个请求
});

// ✅ 输入验证
function validateAPIInput(req: Request, res: Response, next: NextFunction) {
  const { stockCode } = req.params;
  
  if (!/^\d{5}$/.test(stockCode)) {
    return res.status(400).json({ error: '股票代码格式不正确' });
  }
  
  next();
}
```

---

## 📚 Skill 开发最佳实践

### 1. 版本管理
```json
// package.json
{
  "name": "skill-hk-ipo",
  "version": "1.0.0",
  "changelog": [
    {
      "version": "1.0.0",
      "date": "2026-03-17",
      "changes": ["初始版本发布"]
    }
  ]
}
```

### 2. 文档规范
```markdown
# API文档模板

## 函数名称

### 描述
简要描述函数功能

### 语法
\`\`\`typescript
functionName(param1: Type, param2: Type): ReturnType
\`\`\`

### 参数
- `param1`: 参数说明
- `param2`: 参数说明

### 返回值
返回值说明

### 示例
\`\`\`typescript
const result = functionName('value1', 'value2');
console.log(result); // 输出结果
\`\`\`

### 注意事项
- 注意事项1
- 注意事项2
```

### 3. 发布检查清单
- [ ] 所有测试通过
- [ ] 文档已更新
- [ ] CHANGELOG已更新
- [ ] 版本号已更新
- [ ] 无安全隐患
- [ ] 性能测试通过
- [ ] 代码审查完成
- [ ] 发布说明已准备

---

## 🤝 Skill 贡献指南

### 提交规范
```
feat: 添加新功能
fix: 修复bug
docs: 文档更新
style: 代码格式调整
refactor: 代码重构
test: 测试相关
chore: 构建/工具相关
```

### Pull Request 流程
1. Fork 项目
2. 创建特性分支
3. 编写代码和测试
4. 更新文档
5. 提交 PR
6. 等待代码审查
7. 合并到主分支

---

## 📖 参考资源

- [TypeScript最佳实践](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
- [Node.js最佳实践](https://github.com/goldbergyoni/nodebestpractices)
- [API设计指南](https://github.com/microsoft/api-guidelines)
- [语义化版本](https://semver.org/lang/zh-CN/)

---

<div align="center">

**本文档定义了Skill开发的标准和规范**

</div>
