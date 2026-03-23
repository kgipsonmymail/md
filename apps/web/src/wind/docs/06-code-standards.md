# Wind 代码规范

## 概述

本文档规定 Wind 项目的代码编写标准流程，确保代码质量和可维护性。

---

## 代码规范

### 1. 文件命名

**Vue 组件**：

- 使用 PascalCase：`WindConfig.vue`、`WindProcessor.vue`
- 组件名应该具有描述性

**TypeScript 文件**：

- 使用 camelCase：`ai-formatter.ts`、`wind-processor.ts`
- 文件名应该描述其功能

**文档文件**：

- 使用 kebab-case：`01-directory-structure.md`、`02-features.md`
- 使用数字前缀排序

---

### 2. 代码结构

**Vue 组件结构**：

```vue
<script setup lang="ts">
// 1. 导入
import { ref, computed } from 'vue'
import { useStore } from '@/stores'

// 2. Props 和 Emits
const props = defineProps<{ ... }>()
const emit = defineEmits<{ ... }>()

// 3. 响应式状态
const state = ref(...)
const computed = computed(...)

// 4. 方法
function method1() { ... }
function method2() { ... }
</script>

<template>
  <!-- 模板内容 -->
</template>

<style scoped>
/* 样式内容 */
</style>
```

**TypeScript 文件结构**：

```typescript
// 1. 导入
import { ref, computed } from 'vue'

// 2. 类型定义
interface Type { ... }

// 3. 常量定义
const CONSTANT = ...

// 4. 函数定义
function function1() { ... }
function function2() { ... }

// 5. 导出
export { ... }
```

---

### 3. 注释规范

**文件注释**：

```typescript
/**
 * Wind 智能排版
 * 提供文档处理、AI 排版、图床集成等功能
 */
```

**函数注释**：

```typescript
/**
 * 上传图片到 GitHub
 * @param blob - 图片数据
 * @param originalName - 原始文件名
 * @returns 上传结果
 */
async function upload(blob: Blob, originalName: string): Promise<UploadResult> {
  // ...
}
```

**行内注释**：

```typescript
// 检查缓存是否存在
const cached = this.cache.get(hash)

// 计算文件哈希
const hash = await calculateFileHash(blob)
```

---

### 4. TypeScript 规范

**类型定义**：

- 使用 `interface` 定义对象类型
- 使用 `type` 定义联合类型或别名
- 避免使用 `any`，使用 `unknown` 或具体类型

```typescript
// 正确
interface Config {
  apiKey: string
  endpoint: string
}

type Mode = 'docx' | 'text' | 'format'

// 错误
const data: any = ...
```

**类型导入**：

- 优先使用类型导入：`import type { ... }`
- 避免运行时导入类型

```typescript
// 正确
import type { Config } from './types'

// 错误
import { Config } from './types'
```

---

### 5. Vue 规范

**Composition API**：

- 优先使用 `<script setup>` 语法
- 使用 `ref` 定义响应式状态
- 使用 `computed` 定义计算属性
- 使用 `watch` 监听状态变化

```vue
<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const state = ref(0)
const doubled = computed(() => state.value * 2)

watch(state, (newVal) => {
  console.log('State changed:', newVal)
})
</script>
```

**Props 和 Emits**：

- 使用 `defineProps` 定义 props
- 使用 `defineEmits` 定义 emits
- 明确指定类型

```vue
<script setup lang="ts">
interface Props {
  open: boolean
  title: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'submit': [data: FormData]
}>()
</script>
```

---

### 6. 错误处理

**Try-Catch**：

- 所有可能抛出错误的代码都应该使用 try-catch
- 提供详细的错误信息
- 记录错误日志

```typescript
try {
  await uploadImage(file)
}
catch (error) {
  console.error('上传失败:', error)
  throw new Error(`上传失败: ${error.message}`)
}
```

**错误提示**：

- 提供友好的错误提示
- 给出解决建议
- 避免技术术语

```typescript
if (!config.apiKey) {
  throw new Error('请先配置 API 密钥')
}
```

---

### 7. 异步处理

**Async/Await**：

- 优先使用 async/await
- 避免回调地狱
- 正确处理 Promise 错误

```typescript
// 正确
async function processData() {
  try {
    const result = await fetchData()
    return result
  }
  catch (error) {
    console.error('处理失败:', error)
    throw error
  }
}

// 错误
function processData() {
  fetchData().then((result) => {
    return result
  }).catch((error) => {
    console.error('处理失败:', error)
    throw error
  })
}
```

**并发控制**：

- 使用 `Promise.all` 并发执行
- 使用 `Promise.allSettled` 处理部分失败

```typescript
// 并发上传多个图片
const results = await Promise.all(
  files.map(file => uploadImage(file))
)
```

---

### 8. 性能优化

**避免重复计算**：

- 使用 `computed` 缓存计算结果
- 使用 `memo` 缓存函数结果

```typescript
// 正确
const doubled = computed(() => state.value * 2)

// 错误
function getDoubled() {
  return state.value * 2
}
```

**懒加载**：

- 使用动态导入按需加载
- 使用 `defineAsyncComponent` 延迟加载组件

```typescript
// 动态导入
const Component = defineAsyncComponent(() =>
  import('./Component.vue')
)
```

**防抖和节流**：

- 使用 `debounce` 防抖频繁操作
- 使用 `throttle` 节流高频事件

```typescript
import { debounce } from 'lodash-es'

const handleInput = debounce((value: string) => {
  console.log('输入:', value)
}, 300)
```

---

### 9. 样式规范

**CSS 类名**：

- 使用 kebab-case：`btn-primary`、`text-center`
- 使用 BEM 命名：`block__element--modifier`
- 避免使用内联样式

```vue
<!-- 正确 -->
<div class="btn btn-primary">
按钮
</div>

<!-- 错误 -->
<div style="background: blue;">
按钮
</div>
```

**Scoped 样式**：

- 使用 `scoped` 限制样式作用域
- 避免全局样式污染

```vue
<style scoped>
.btn-primary {
  background: blue;
}
</style>
```

---

### 10. Git 提交规范

**Commit Message**：

- 使用清晰的提交信息
- 遵循 Conventional Commits 规范
- 提交信息应该简洁明了

```
feat: 添加 AI 工具箱功能
fix: 修复 GitHub 图床上传失败
docs: 更新 README 文档
refactor: 重构图片上传逻辑
test: 添加单元测试
chore: 更新依赖包
```

**Commit Message 格式**：

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type 类型**：

- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 重构代码
- `test`: 测试相关
- `chore`: 构建或工具相关

---

### 11. 测试规范

**单元测试**：

- 每个函数都应该有对应的单元测试
- 测试应该覆盖正常情况和边界情况
- 使用描述性的测试名称

```typescript
describe('uploadImage', () => {
  it('应该成功上传图片', async () => {
    const result = await uploadImage(file)
    expect(result.success).toBe(true)
  })

  it('应该处理上传失败', async () => {
    await expect(uploadImage(invalidFile)).rejects.toThrow()
  })
})
```

**集成测试**：

- 测试模块之间的交互
- 测试完整的用户流程
- 使用真实的依赖（或 Mock）

---

### 12. 文档规范

**代码文档**：

- 每个模块都应该有对应的文档
- 文档应该清晰、简洁、准确
- 包含使用示例

**文档结构**：

```
docs/
├── 01-directory-structure.md  # 目录结构
├── 02-features.md           # 功能清单
├── 03-bug-troubleshooting.md # 错题本
├── 04-prompts.md            # Prompt 记录
├── 05-README-summary.md      # README 精要
└── 06-code-standards.md     # 代码规范（本文档）
```

**文档更新**：

- 每次功能更新后更新文档
- 保持文档与代码同步
- 记录重要的变更

---

## 开发流程

### 1. 需求分析

- 明确需求目标
- 分析技术可行性
- 评估开发工作量

### 2. 设计阶段

- 设计模块结构
- 定义接口和类型
- 编写设计文档

### 3. 编码阶段

- 遵循代码规范
- 编写单元测试
- 添加必要的注释

### 4. 测试阶段

- 运行单元测试
- 进行集成测试
- 修复发现的 bug

### 5. 文档更新

- 更新功能文档
- 更新 API 文档
- 更新使用示例

### 6. 代码审查

- 自我审查代码
- 遵循代码规范
- 优化代码质量

### 7. 提交代码

- 遵循 Git 提交规范
- 编写清晰的提交信息
- 推送到远程仓库

---

## 最佳实践

### 1. 代码质量

- 保持代码简洁、清晰
- 避免重复代码
- 使用有意义的变量名
- 遵循单一职责原则

### 2. 性能优化

- 避免不必要的渲染
- 使用缓存减少计算
- 优化网络请求
- 懒加载和按需加载

### 3. 用户体验

- 提供友好的错误提示
- 显示操作进度
- 添加确认对话框
- 显示成功提示

### 4. 可维护性

- 编写清晰的注释
- 保持模块化设计
- 遵循代码规范
- 及时更新文档

---

## 总结

本文档规定了 Wind 项目的代码编写标准流程，包括：

- 文件命名规范
- 代码结构规范
- 注释规范
- TypeScript 规范
- Vue 规范
- 错误处理规范
- 异步处理规范
- 性能优化规范
- 样式规范
- Git 提交规范
- 测试规范
- 文档规范
- 开发流程
- 最佳实践

遵循这些规范可以确保代码质量和可维护性，提高团队协作效率。

**关键原则**：

1. 代码清晰、简洁、可读
2. 遵循最佳实践和设计模式
3. 编写完善的测试和文档
4. 持续优化和改进
5. 保持代码与文档同步
