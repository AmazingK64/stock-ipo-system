# 贡献指南

感谢你考虑为本项目做出贡献！虽然这是一个AI生成的项目，但我们欢迎社区的任何贡献。

## 🤝 如何贡献

### 报告Bug

如果你发现了bug，请创建一个[Issue](https://github.com/yourusername/stock-ipo-system/issues)，并包含：

- 清晰的标题和描述
- 复现步骤
- 预期行为 vs 实际行为
- 截图(如果适用)
- 环境信息(操作系统、浏览器、Node版本等)

### 提出新功能

欢迎提出新功能建议！请创建一个Issue并说明：

- 功能描述
- 使用场景
- 预期效果
- 可能的实现方案(可选)

### 提交代码

1. **Fork本项目**
   
2. **创建特性分支**
   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **编写代码**
   - 遵循现有的代码风格
   - 添加必要的注释
   - 编写测试(如果适用)

4. **提交更改**
   ```bash
   git commit -m '✨ 添加某功能'
   ```
   
   提交信息格式：
   - `✨ feat:` 新功能
   - `🐛 fix:` 修复bug
   - `📝 docs:` 文档更新
   - `🎨 style:` 代码格式
   - `♻️ refactor:` 重构
   - `✅ test:` 测试相关
   - `🔧 chore:` 构建/工具

5. **推送到GitHub**
   ```bash
   git push origin feature/amazing-feature
   ```

6. **创建Pull Request**
   - 清晰描述改动内容
   - 关联相关Issue
   - 等待代码审查

## 📋 代码规范

### TypeScript
- 使用严格的类型检查
- 为所有函数和变量定义类型
- 避免使用`any`类型

### React
- 使用函数组件和Hooks
- 组件命名使用PascalCase
- Props定义使用TypeScript接口

### 样式
- 优先使用Ant Design组件
- 使用内联样式或CSS Modules
- 确保响应式设计

### 注释
```typescript
/**
 * 函数描述
 * @param param1 - 参数说明
 * @returns 返回值说明
 */
function example(param1: string): number {
  // 实现逻辑
}
```

## 🧪 测试

如果你的改动涉及核心逻辑，请添加测试：

```bash
# 运行测试
npm test

# 测试覆盖率
npm run test:coverage
```

## 📖 文档

- 更新README.md(如果需要)
- 更新相关文档
- 添加代码注释

## ⚠️ 注意事项

- **AI生成内容**: 本项目由AI生成，可能存在未知问题
- **测试充分**: 提交前请充分测试你的改动
- **保持兼容**: 避免破坏现有功能
- **文档同步**: 代码改动时同步更新文档

## 📜 行为准则

- 尊重所有贡献者
- 保持专业和友善的交流
- 接受建设性批评
- 关注对社区最有利的事情

## ❓ 问题？

如果你有任何问题，可以：

1. 查看[文档](./docs/)
2. 搜索[Issues](https://github.com/yourusername/stock-ipo-system/issues)
3. 创建新Issue提问

---

<div align="center">

**感谢你的贡献！❤️**

</div>
