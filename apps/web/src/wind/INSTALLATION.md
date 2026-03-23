# Wind 中间件 - 安装指南

## 📦 依赖安装

### 1. 安装 npm 包

```bash
npm install mammoth spark-md5 pinia
```

或使用 yarn：

```bash
yarn add mammoth spark-md5 pinia
```

或使用 pnpm：

```bash
pnpm add mammoth spark-md5 pinia
```

### 2. 依赖说明

| 包名      | 版本   | 用途                       |
| --------- | ------ | -------------------------- |
| mammoth   | ^1.6.0 | .docx 文件解析             |
| spark-md5 | ^3.0.2 | 文件哈希计算               |
| pinia     | ^2.1.7 | 状态管理                   |
| vue       | ^3.4.0 | Vue 框架（peerDependency） |

## 🔧 项目配置

### 1. TypeScript 配置

确保你的 `tsconfig.json` 包含以下配置：

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "jsx": "preserve",
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true
  }
}
```

### 2. Vite 配置（如果使用 Vite）

```typescript
import path from 'node:path'
import vue from '@vitejs/plugin-vue'
// vite.config.ts
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

### 3. 注册 Pinia

在你的主入口文件中注册 Pinia：

```typescript
import { createPinia } from 'pinia'
// main.ts
import { createApp } from 'vue'
import App from './App.vue'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.mount('#app')
```

## 🚀 集成到项目

### 方式一：作为独立模块

将 `wind` 文件夹复制到你的项目中：

```
your-project/
├── src/
│   ├── wind/          # Wind 中间件
│   ├── components/
│   ├── views/
│   └── main.ts
└── package.json
```

### 方式二：作为 npm 包（推荐）

如果你想在多个项目中使用，可以发布为 npm 包：

1. 在 `wind` 目录下运行：

```bash
npm init -y
npm publish
```

2. 在其他项目中安装：

```bash
npm install wind-middleware
```

## 🔑 配置密钥

### 1. GitHub Token

1. 访问 https://github.com/settings/tokens
2. 点击 "Generate new token (classic)"
3. 设置 Token 名称（如 "Wind Middleware"）
4. 勾选权限：
   - ✓ repo（完整仓库访问）
5. 点击 "Generate token"
6. 复制生成的 Token（格式：`ghp_xxxxxxxxxxxx`）

⚠️ 注意：Token 只显示一次，请妥善保存！

### 2. AI API Key

#### OpenAI

1. 访问 https://platform.openai.com/api-keys
2. 点击 "Create new secret key"
3. 设置名称并创建
4. 复制 API Key（格式：`sk-xxxxxxxxxxxx`）

#### 国内替代方案

**通义千问**

- 访问 https://dashscope.aliyun.com/
- 创建 API Key
- API 地址：`https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions`

**文心一言**

- 访问 https://cloud.baidu.com/
- 创建应用获取 API Key
- API 地址：`https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions`

**智谱 AI**

- 访问 https://open.bigmodel.cn/
- 创建 API Key
- API 地址：`https://open.bigmodel.cn/api/paas/v4/chat/completions`

## 🧪 测试安装

### 1. 创建测试文件

```vue
<!-- test-wind.vue -->
<script setup>
import WindProcessor from '@/wind/components/WindProcessor.vue'
</script>

<template>
  <div>
    <h1>Wind 中间件测试</h1>
    <WindProcessor />
  </div>
</template>
```

### 2. 运行测试

```bash
npm run dev
```

访问测试页面，如果能看到 Wind 处理器界面，说明安装成功！

### 3. 配置测试

1. 点击"显示配置"
2. 填入 GitHub Token 和 AI API Key
3. 点击保存
4. 如果显示"✓ 配置有效"，说明配置成功

### 4. 功能测试

#### 测试 AI 排版

1. 点击"仅 AI 排版"标签
2. 输入测试文本：

```markdown
这是一个测试文章

第一段内容
第二段内容

重要信息

```

3. 点击"开始处理"
4. 查看排版结果

#### 测试图片上传

1. 点击"文本 + 图片"标签
2. 输入文本
3. 选择一张测试图片
4. 点击"开始处理"
5. 查看上传结果

## 🐛 常见问题

### Q: mammoth 安装失败？

A: 尝试清除缓存后重新安装：

```bash
npm cache clean --force
npm install mammoth
```

### Q: TypeScript 类型错误？

A: 安装类型定义：

```bash
npm install -D @types/node @types/spark-md5
```

### Q: Pinia 未注册？

A: 确保在 main.ts 中注册了 Pinia：

```typescript
import { createPinia } from 'pinia'

app.use(createPinia())
```

### Q: 组件导入失败？

A: 检查路径别名配置：

```typescript
// vite.config.ts
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
  },
}
```

### Q: localStorage 不可用？

A: 检查浏览器设置，确保允许使用 localStorage

## 🔒 安全建议

### 1. 环境变量

不要在代码中硬编码密钥，使用环境变量：

```typescript
// .env
VITE_GITHUB_TOKEN = ghp_xxxxxxxxxxxx
VITE_AI_API_KEY = sk - xxxxxxxxxxxx
```

```typescript
// config.ts
export const config = {
  github: {
    token: import.meta.env.VITE_GITHUB_TOKEN,
    // ...
  },
  ai: {
    apiKey: import.meta.env.VITE_AI_API_KEY,
    // ...
  },
}
```

### 2. .gitignore

确保不提交敏感信息：

```gitignore
# 环境变量
.env
.env.local
.env.*.local

# 配置文件
config.ts
wind/config/local.ts
```

### 3. 生产环境

生产环境建议使用后端代理 API 调用，避免暴露密钥。

## 📚 下一步

- 阅读 [快速开始](./QUICKSTART.md)
- 查看 [使用指南](./USAGE.md)
- 浏览 [示例代码](./examples/)

## 🆘 获取帮助

如果遇到问题：

1. 查看 [常见问题](./USAGE.md#常见问题)
2. 查看项目文档
3. 提交 Issue
4. 查看示例代码

祝你安装顺利！🎉
