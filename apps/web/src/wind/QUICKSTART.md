# Wind 中间件 - 快速开始

## 5 分钟上手指南

### 第一步：安装依赖

```bash
npm install mammoth spark-md5 pinia
```

### 第二步：获取 GitHub Token

1. 访问 https://github.com/settings/tokens
2. 点击 "Generate new token (classic)"
3. 勾选 `repo` 权限
4. 生成并复制 Token（格式：`ghp_xxxxxxxxxxxx`）

### 第三步：创建图床仓库

1. 在 GitHub 创建新仓库（如 `image-hosting`）
2. 可以设为私有或公开
3. 记住仓库名和你的用户名

### 第四步：获取 AI API Key

选择以下任一服务：

**OpenAI（推荐）**

- 访问 https://platform.openai.com/api-keys
- 创建 API Key（格式：`sk-xxxxxxxxxxxx`）

**国内替代方案**

- 通义千问：https://dashscope.aliyun.com/
- 文心一言：https://cloud.baidu.com/
- 智谱 AI：https://open.bigmodel.cn/

### 第五步：配置 Wind

在你的项目中使用 WindProcessor 组件：

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

首次使用时，点击"显示配置"按钮，填入：

**GitHub 配置**

- Token: `ghp_xxxxxxxxxxxx`
- 用户名: `your-username`
- 仓库名: `image-hosting`
- 分支名: `main`
- 存储路径: `wind-assets`
- ✓ 使用 jsDelivr CDN 加速

**AI 配置**

- API 地址: `https://api.openai.com/v1/chat/completions`
- API 密钥: `sk-xxxxxxxxxxxx`
- 模型: `gpt-4`
- Temperature: `0.7`

### 第六步：开始使用

#### 方式一：上传 .docx 文件

1. 点击"上传 .docx"标签
2. 拖拽或选择 Word 文档
3. 勾选"上传图片到图床"和"AI 智能排版"
4. 点击"开始处理"
5. 等待处理完成
6. 点击"复制 Markdown"

#### 方式二：文本 + 图片

1. 点击"文本 + 图片"标签
2. 粘贴文章内容
3. 点击"选择图片"上传图片
4. 点击"开始处理"
5. 复制结果

#### 方式三：仅 AI 排版

1. 点击"仅 AI 排版"标签
2. 粘贴 Markdown 内容
3. 点击"开始处理"
4. 复制优化后的内容

## 常见问题

### Q: Token 无效？

A: 确保 Token 有 `repo` 权限，且未过期

### Q: 图片上传失败？

A: 检查网络连接，确保能访问 GitHub API

### Q: AI 排版没反应？

A: 检查 API Key 是否正确，余额是否充足

### Q: 如何查看上传的图片？

A: 访问 `https://github.com/your-username/image-hosting/tree/main/wind-assets`

## 下一步

- 阅读 [完整使用指南](./USAGE.md)
- 查看 [配置示例](./examples/config.example.ts)
- 了解 [集成方法](./examples/integration.vue)

## 技巧

1. **图片优化**：上传前压缩图片，提升加载速度
2. **提示词调优**：根据文章类型调整 AI 提示词
3. **批量处理**：使用 API 方式批量处理多个文档
4. **缓存利用**：相同图片会自动使用缓存，无需重复上传

## 获取帮助

- 查看项目文档
- 提交 Issue
- 查看示例代码

祝你使用愉快！🎉
