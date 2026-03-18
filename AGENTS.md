# AGENTS.md - AI Agent 开发规范

## 🤖 项目AI生成说明

本项目由 **WorkBuddy AI助手** 完全生成，包括但不限于：
- 所有源代码
- 文档和说明
- UI/UX设计
- 算法逻辑
- 测试用例

---

## 📋 AI Agent 工作规范

### 1. 代码生成规范

#### 命名规范
```typescript
// ✅ 正确: 清晰、语义化的命名
const calculateWinRate = (subscriptionAmount: number, multiple: number) => {}
const marginMultiple = 125.8;

// ❌ 错误: 模糊、无意义的命名
const calc = (a: number, b: number) => {}
const m = 125.8;
```

#### 类型定义
```typescript
// ✅ 必须为所有变量和函数定义类型
interface IPOStock {
  stockCode: string;
  stockName: string;
  marginMultiple?: number;
}

function estimateWinRate(ipo: IPOStock, amount: number): number {
  return 0.1;
}
```

#### 注释规范
```typescript
/**
 * 计算中签率
 * @param ipo - IPO股票信息
 * @param subscriptionAmount - 申购金额
 * @returns 中签率(0-1之间)
 */
function estimateWinRate(ipo: IPOStock, subscriptionAmount: number): number {
  // 实现逻辑
}
```

### 2. 文件组织规范

#### 组件结构
```typescript
// 组件文件结构
import React from 'react';
import { Card, Table } from 'antd';

// 1. 类型定义
interface Props {
  data: IPOStock[];
}

// 2. 组件定义
const IPOList: React.FC<Props> = ({ data }) => {
  // 2.1 State定义
  const [loading, setLoading] = useState(false);
  
  // 2.2 Effect
  useEffect(() => {}, []);
  
  // 2.3 事件处理
  const handleClick = () => {};
  
  // 2.4 渲染
  return <Card>...</Card>;
};

// 3. 导出
export default IPOList;
```

#### 服务层结构
```typescript
// 服务文件结构
import type { IPOStock } from '../types';

class IPOService {
  // 1. 公共方法
  async fetchIPOData(): Promise<IPOStock[]> {}
  
  // 2. 私有方法
  private calculateScore(ipo: IPOStock): number {}
  
  // 3. 工具方法
  formatMoney(amount: number): string {}
}

export default new IPOService();
```

### 3. 数据处理规范

#### API请求
```typescript
// ✅ 正确: 完整的错误处理
async function fetchData() {
  try {
    const response = await fetch('/api/data');
    if (!response.ok) {
      throw new Error('请求失败');
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('获取数据失败:', error);
    return [];
  }
}
```

#### 数据验证
```typescript
// ✅ 必须验证数据有效性
function processData(data: any) {
  if (!data || !Array.isArray(data)) {
    console.warn('数据格式不正确');
    return [];
  }
  
  return data.filter(item => {
    return item && item.stockCode && item.stockName;
  });
}
```

### 4. UI/UX规范

#### 响应式设计
```typescript
// ✅ 使用Ant Design的Grid系统
<Row gutter={[16, 16]}>
  <Col xs={24} sm={12} md={8} lg={6}>
    <Card>内容</Card>
  </Col>
</Row>
```

#### 错误提示
```typescript
// ✅ 友好的错误提示
try {
  await saveData();
  message.success('保存成功');
} catch (error) {
  message.error('保存失败，请重试');
  console.error('详细错误:', error);
}
```

#### 加载状态
```typescript
// ✅ 明确的加载状态
const [loading, setLoading] = useState(false);

return (
  <Spin spinning={loading}>
    <Table dataSource={data} />
  </Spin>
);
```

### 5. 性能优化规范

#### 避免不必要的渲染
```typescript
// ✅ 使用useMemo缓存计算结果
const filteredData = useMemo(() => {
  return data.filter(item => item.score > 70);
}, [data]);

// ✅ 使用useCallback缓存回调函数
const handleClick = useCallback((id: string) => {
  console.log(id);
}, []);
```

#### 懒加载
```typescript
// ✅ 大组件使用懒加载
const HeavyComponent = React.lazy(() => import('./HeavyComponent'));

return (
  <React.Suspense fallback={<Spin />}>
    <HeavyComponent />
  </React.Suspense>
);
```

### 6. 安全规范

#### 敏感信息处理
```typescript
// ✅ 不在前端存储敏感信息
// ✅ 不在console.log中输出敏感数据
// ✅ 使用环境变量配置API地址

// .env
VITE_API_URL=https://api.example.com

// 代码中使用
const apiUrl = import.meta.env.VITE_API_URL;
```

#### XSS防护
```typescript
// ✅ 使用React的自动转义
<Text>{userInput}</Text>

// ❌ 避免使用dangerouslySetInnerHTML
<div dangerouslySetInnerHTML={{__html: userInput}} />
```

---

## 🔄 AI Agent 工作流程

### 需求分析阶段
1. 理解用户需求
2. 分析技术可行性
3. 确定实现方案
4. 创建TODO列表

### 开发实现阶段
1. 编写类型定义
2. 实现核心逻辑
3. 编写UI组件
4. 集成测试

### 文档编写阶段
1. 编写代码注释
2. 更新README
3. 编写使用指南
4. 记录已知问题

### 代码审查阶段
1. 检查类型错误
2. 优化性能
3. 修复bug
4. 完善测试

---

## 📝 代码审查清单

AI Agent在提交代码前必须检查:

### 🔴 强制验证步骤（提交前必须完成）

- [ ] **运行read_lints工具检查TypeScript错误**
- [ ] **验证所有导入的组件和模块都存在**
- [ ] **确保没有ReferenceError、TypeError等运行时错误**
- [ ] **测试修改的功能是否正常工作**

### 🟡 代码质量检查

- [ ] 所有变量和函数都有明确的类型定义
- [ ] 关键逻辑有清晰的注释
- [ ] 异步操作有错误处理
- [ ] 用户输入有数据验证
- [ ] 加载状态和错误提示友好
- [ ] 响应式设计适配不同屏幕
- [ ] 没有console.log遗留(除错误日志)
- [ ] 没有硬编码的敏感信息
- [ ] 性能优化(useMemo, useCallback)
- [ ] 遵循项目目录结构

### 🟢 最佳实践

- [ ] 代码可读性强，命名语义化
- [ ] 模块化设计，低耦合高内聚
- [ ] 预留扩展接口，易于添加新功能
- [ ] 完善的错误处理和边界条件判断

---

## 🎯 质量标准

### 代码质量
- **可读性**: 代码清晰易懂，命名语义化
- **可维护性**: 模块化设计，低耦合高内聚
- **可扩展性**: 预留扩展接口，易于添加新功能
- **健壮性**: 完善的错误处理和边界条件判断

### 文档质量
- **完整性**: 覆盖所有核心功能
- **准确性**: 文档与代码一致
- **易读性**: 结构清晰，示例丰富
- **及时性**: 随代码更新同步更新

### 用户体验
- **直观性**: UI清晰易懂，操作简单
- **响应性**: 快速响应，流畅体验
- **友好性**: 明确的提示和反馈
- **容错性**: 错误处理完善，不崩溃

---

## 🔧 工具和配置

### 推荐VSCode插件
- ESLint
- Prettier
- TypeScript Hero
- React Developer Tools
- Ant Design Snippets

### TypeScript配置
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### ESLint配置
```json
{
  "extends": [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  "rules": {
    "no-unused-vars": "error",
    "@typescript-eslint/no-unused-vars": "error",
    "react/react-in-jsx-scope": "off"
  }
}
```

---

## 📚 学习资源

- [React官方文档](https://react.dev/)
- [TypeScript官方文档](https://www.typescriptlang.org/)
- [Ant Design组件库](https://ant.design/)
- [Vite构建工具](https://vitejs.dev/)
- [IndexedDB (Dexie.js)](https://dexie.org/)

---

## ⚠️ 注意事项

1. **代码提交前强制验证**
   - ❗ **必须运行read_lints工具检查错误**
   - ❗ **必须验证所有导入的组件都存在**
   - ❗ **必须确保没有运行时错误（ReferenceError、TypeError等）**
   - ❗ **必须测试修改的功能是否正常**
   - ❗ **禁止未经验证直接提交代码**
   - 使用 `git add` 后先检查 `git status` 确认修改内容
   - 提交信息要清晰描述修改内容和原因

2. **AI生成代码的局限性**
   - 可能存在未发现的bug
   - 某些边界情况可能未考虑
   - 性能优化可能不够完善
   - 需要人工审查和测试

3. **使用建议**
   - 在生产环境使用前进行充分测试
   - 根据实际需求调整和优化代码
   - 定期更新依赖包版本
   - 关注安全性问题

4. **贡献指南**
   - 发现bug请提Issue
   - 有改进建议请提Pull Request
   - 提供详细的复现步骤和错误信息

---

<div align="center">

**本文档由AI生成，遵循持续改进原则**

</div>
