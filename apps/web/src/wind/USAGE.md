# Wind 中间件使用指南

## 快速开始

### 1. 安装依赖

```bash
npm install mammoth spark-md5 pinia
```

### 2. 配置 GitHub 图床

1. 创建一个 GitHub 仓库用于存储图片（如 `image-hosting`）
2. 生成 Personal Access Token：
   - 访问 https://github.com/settings/tokens
   - 点击 "Generate new token (classic)"
   - 勾选 `repo` 权限
   - 生成并保存 Token

### 3. 配置 AI API

支持任何兼容 OpenAI API 格式的服务：

- OpenAI GPT-4
- Azure OpenAI
- 国内 API（如通义千问、文心一言等）

### 4. 在项目中使用

#### 方式一：使用 Vue 组件（推荐）

```vue
<script setup>
import WindProcessor from '@/wind/components/WindProcessor.vue'
</script>

<template>
  <div>
    <WindProcessor />
  </div>
</template>
```

#### 方式二：直接使用 API

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

// 处理 .docx 文件
const result = await processor.processDocx(file, {
  uploadImages: true,
  formatContent: true,
  preserveOriginal: true,
})

console.log(result.markdown)
```

## 功能说明

### 1. 处理 .docx 文件

自动提取文档中的文本和图片，上传图片到图床，并进行 AI 排版。

**使用场景：**

- 从 Word 文档导入文章
- 批量处理文档

**流程：**

1. 上传 .docx 文件
2. 系统自动解析文档
3. 提取所有图片并上传到 GitHub
4. AI 对文本进行排版优化
5. 生成可直接复制到公众号的 Markdown

### 2. 文本 + 图片模式

分别上传文本和图片，系统会按顺序插入图片。

**使用场景：**

- 已有文本内容，需要添加图片
- 图片和文本分开准备

**流程：**

1. 粘贴或输入文本
2. 选择要上传的图片
3. 系统上传图片到 GitHub
4. AI 对内容进行排版
5. 图片按顺序插入到文本中

### 3. 仅 AI 排版

对已有的 Markdown 内容进行智能排版优化。

**使用场景：**

- 优化现有文章排版
- 统一文章风格

**流程：**

1. 粘贴 Markdown 内容
2. AI 分析并优化排版
3. 应用合适的格式（标题、列表、引用等）

## 配置说明

### GitHub 图床配置

| 字段   | 说明                         | 必填 |
| ------ | ---------------------------- | ---- |
| token  | Personal Access Token        | ✓    |
| owner  | GitHub 用户名                | ✓    |
| repo   | 仓库名                       | ✓    |
| branch | 分支名（默认 main）          | ✓    |
| path   | 存储路径（默认 wind-assets） | ✓    |
| useCDN | 是否使用 jsDelivr CDN        | -    |

**图片存储结构：**

```
wind-assets/
├── 2024/
│   ├── 01/
│   │   ├── 1704067200000_a1b2c3d4.png
│   │   └── 1704153600000_e5f6g7h8.jpg
│   └── 02/
│       └── ...
└── 2025/
    └── ...
```

**URL 格式：**

- 原始 URL: `https://raw.githubusercontent.com/user/repo/main/wind-assets/2024/01/image.png`
- CDN URL: `https://cdn.jsdelivr.net/gh/user/repo@main/wind-assets/2024/01/image.png`

### AI 排版配置

| 字段        | 说明            | 必填 |
| ----------- | --------------- | ---- |
| apiEndpoint | API 地址        | ✓    |
| apiKey      | API 密钥        | ✓    |
| model       | 模型名称        | ✓    |
| temperature | 温度参数（0-2） | -    |
| prompt      | 系统提示词      | -    |

**提示词优化建议：**

```
你是一个专业的公众号文章排版助手。请根据以下规则优化文章排版：

1. 标题层级：
   - 一级标题：文章标题
   - 二级标题：章节标题
   - 三级标题：小节标题

2. 强调格式：
   - 重要概念：**加粗**
   - 关键数据：**加粗** 或 > 引用块
   - 专业术语：`代码格式`

3. 列表使用：
   - 并列内容：无序列表
   - 步骤流程：有序列表
   - 嵌套关系：多级列表

4. 段落优化：
   - 每段 3-5 行
   - 长段落拆分
   - 适当留白

5. 图片处理：
   - 添加描述性 alt 文本
   - 图片前后空行

输出纯 Markdown 格式，不要添加任何解释。
```

## 高级用法

### 自定义图片处理

```typescript
import { ImageManager } from '@/wind/core/image-manager'
import { GitHubImageHost } from '@/wind/services/github-image-host'

const imageHost = new GitHubImageHost(config)
const imageManager = new ImageManager(imageHost)

// 上传单张图片
const result = await imageManager.uploadImage({
  id: 'img_1',
  originalName: 'photo.jpg',
  blob: imageBlob,
  position: 0,
})

// 验证图片 URL
const isValid = await imageManager.validateImageUrl(result.url)
```

### 批量处理文档

```typescript
const files = [file1, file2, file3]
const results = []

for (const file of files) {
  const result = await processor.processDocx(file, options)
  results.push(result)
}

console.log(`处理完成：${results.length} 个文件`)
```

### 自定义 AI 排版逻辑

```typescript
import { AIFormatter } from '@/wind/core/ai-formatter'

const formatter = new AIFormatter(config)

// 分块处理长文档
const result = await formatter.formatInChunks(longContent, 2000)

// 更新配置
formatter.updateConfig({
  temperature: 0.5,
  prompt: '新的提示词...',
})
```

## 集成到现有项目

### 1. 作为侧边栏

```vue
<script setup>
function handleApply(markdown) {
  // 将处理后的内容应用到编辑器
  editor.setValue(markdown)
}
</script>

<template>
  <div class="editor-layout">
    <div class="main-editor">
      <!-- 你的编辑器 -->
    </div>
    <div class="sidebar">
      <WindProcessor @apply="handleApply" />
    </div>
  </div>
</template>
```

### 2. 作为对话框

```vue
<template>
  <Dialog v-model="showWind">
    <WindProcessor @apply="handleApply" />
  </Dialog>
</template>
```

### 3. 作为独立页面

```vue
<template>
  <div class="wind-page">
    <WindProcessor />
  </div>
</template>
```

## 常见问题

### Q: 图片上传失败？

A: 检查以下几点：

1. GitHub Token 是否有 `repo` 权限
2. 仓库名和用户名是否正确
3. 网络是否能访问 GitHub API
4. Token 是否过期

### Q: AI 排版效果不理想？

A: 可以尝试：

1. 调整 temperature 参数（0.3-0.9）
2. 优化系统提示词
3. 提供更多示例
4. 使用更强大的模型（如 GPT-4）

### Q: 如何自定义图片存储路径？

A: 修改配置中的 `path` 字段：

```typescript
{
  path: 'my-custom-path/images'
}
```

### Q: 支持其他图床吗？

A: 目前仅支持 GitHub，但可以扩展：

1. 实现 `ImageHost` 接口
2. 创建自定义图床服务
3. 传入 `ImageManager`

## 性能优化

### 1. 图片缓存

系统会自动缓存已上传的图片（基于文件哈希），避免重复上传。

### 2. 并发上传

批量上传时会串行处理，避免 API 限流。如需并发，可以修改 `ImageManager`。

### 3. 长文档处理

使用 `formatInChunks` 方法分块处理长文档，避免 API 限制。

## 许可证

MIT
