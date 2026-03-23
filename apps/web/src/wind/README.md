# Wind 中间件系统

基于现有 Markdown 编辑器的智能排版中间件，实现 AI 驱动的文档处理和图床管理。

## ✨ 特性

- 🚀 **智能排版** - AI 自动优化文章格式，提升可读性
- 📦 **文档解析** - 支持 .docx 文件，自动提取文本和图片
- 🖼️ **图床管理** - GitHub + jsDelivr CDN，快速稳定
- 🎨 **实时预览** - 所见即所得，直接复制到公众号
- ⚙️ **灵活配置** - 支持多种 AI 模型和自定义提示词
- 🔄 **批量处理** - 支持批量上传和处理文档

## 📦 安装

```bash
npm install mammoth spark-md5 pinia
```

## 🚀 快速开始

### 1. 配置

```typescript
import { createWindProcessor } from '@/wind'

const processor = createWindProcessor(
  {
    token: 'ghp_xxxxxxxxxxxx',
    owner: 'your-username',
    repo: 'image-hosting',
    branch: 'main',
    path: 'wind-assets',
    useCDN: true,
  },
  {
    apiEndpoint: 'https://api.openai.com/v1/chat/completions',
    apiKey: 'sk-xxxxxxxxxxxx',
    model: 'gpt-4',
    temperature: 0.7,
    prompt: '你的排版提示词...',
  }
)
```

### 2. 使用 Vue 组件

```vue
<script setup>
import WindProcessor from '@/wind/components/WindProcessor.vue'
</script>

<template>
  <WindProcessor />
</template>
```

### 3. 使用 API

```typescript
// 处理 .docx 文件
const result = await processor.processDocx(file, {
  uploadImages: true,
  formatContent: true,
  preserveOriginal: true,
})

// 处理文本 + 图片
const result = await processor.processTextWithImages(text, images, options)

// 仅 AI 排版
const result = await processor.formatOnly(markdown)
```

## 📁 目录结构

```
wind/
├── README.md                    # 项目文档
├── USAGE.md                     # 使用指南
├── package.json                 # 依赖配置
├── index.ts                     # 入口文件
├── components/                  # Vue 组件
│   ├── WindProcessor.vue       # 主处理界面
│   └── WindConfig.vue          # 配置界面
├── core/                        # 核心模块
│   ├── wind-processor.ts       # 流程编排
│   ├── document-parser.ts      # 文档解析
│   ├── image-manager.ts        # 图片管理
│   └── ai-formatter.ts         # AI 排版
├── services/                    # 服务层
│   └── github-image-host.ts    # GitHub 图床
├── stores/                      # 状态管理
│   └── wind.ts                 # Pinia Store
├── config/                      # 配置管理
│   └── index.ts                # 配置加载/保存
├── utils/                       # 工具函数
│   └── file-utils.ts           # 文件处理
├── types/                       # 类型定义
│   └── index.ts
└── examples/                    # 示例代码
    ├── integration.vue         # 集成示例
    └── config.example.ts       # 配置示例
```

## 🎯 功能模块

### 1. 文档处理 (Document Parser)

- ✅ 支持 .docx 文件解析
- ✅ 自动提取文档中的图片
- ✅ 保持图片与文本的相对位置
- ✅ 支持纯文本 + 图片模式

### 2. 图床管理 (Image Manager)

- ✅ GitHub 图床集成
- ✅ jsDelivr CDN 加速
- ✅ 自动目录结构管理（按年月组织）
- ✅ 图片去重和缓存
- ✅ 批量上传支持

### 3. AI 排版引擎 (AI Formatter)

- ✅ 基于 Markdown 语法的智能排版
- ✅ 自动应用格式提升可读性
- ✅ 可配置的排版风格
- ✅ 支持多种 AI 模型
- ✅ 长文档分块处理

### 4. Vue 组件

- ✅ 完整的 UI 界面
- ✅ 配置管理面板
- ✅ 实时处理进度
- ✅ 结果预览和复制

## 🔧 使用流程

```
输入 → 处理 → 输出
```

### 模式一：.docx 文件

```
上传 .docx → 解析文档 → 提取图片 → 上传图床 → AI 排版 → 生成 Markdown
```

### 模式二：文本 + 图片

```
输入文本 + 选择图片 → 上传图床 → AI 排版 → 插入图片 → 生成 Markdown
```

### 模式三：仅排版

```
输入 Markdown → AI 排版 → 优化格式 → 输出 Markdown
```

## 📖 文档导航

### 快速开始

- 📘 [快速开始](./QUICKSTART.md) - 5 分钟上手指南
- 📦 [安装指南](./INSTALLATION.md) - 详细的安装和配置步骤

### 使用文档

- 📚 [使用指南](./USAGE.md) - 完整的功能说明和最佳实践
- 🏗️ [架构设计](./ARCHITECTURE.md) - 系统架构和设计原则

### 示例代码

- 💡 [配置示例](./examples/config.example.ts) - 各种场景的配置
- 🔌 [集成示例](./examples/integration.vue) - 如何集成到项目

### 项目管理

- 📋 [项目总结](./PROJECT_SUMMARY.md) - 项目完成情况
- ✅ [检查清单](./CHECKLIST.md) - 开发和测试清单
- 📦 [交付文档](./DELIVERY.md) - 项目交付说明
- 🗓️ [开发计划](./TODO.md) - 未来规划和路线图

## 🎨 应用场景

- ✍️ 公众号文章排版
- 📝 技术文档整理
- 📰 新闻资讯发布
- 📚 教程指南制作
- 💼 营销文案优化

## 🛠️ 技术栈

- **TypeScript** - 类型安全
- **Vue 3** - 组件化 UI
- **Pinia** - 状态管理
- **mammoth** - .docx 解析
- **spark-md5** - 文件哈希
- **GitHub API** - 图床服务
- **OpenAI API** - AI 排版

## 📝 配置说明

### GitHub 图床

1. 创建 GitHub 仓库（如 `image-hosting`）
2. 生成 Personal Access Token（需要 `repo` 权限）
3. 配置仓库信息

### AI 排版

支持任何兼容 OpenAI API 格式的服务：

- OpenAI GPT-4
- Azure OpenAI
- 国内 API（通义千问、文心一言等）

## 🔐 安全说明

- Token 和 API Key 存储在 localStorage
- 建议使用环境变量管理敏感信息
- 图片上传到公开仓库，注意隐私

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT

## 🙏 致谢

本项目基于现有的 Markdown 编辑器项目开发，感谢原项目的贡献者。
