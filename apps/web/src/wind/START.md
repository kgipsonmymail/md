# Wind 中间件 - 启动指南

## 🚀 快速启动（3 步）

### 第 1 步：验证依赖

依赖已经安装在主项目中：

```json
{
  "mammoth": "^1.12.0",
  "pinia": "^3.0.4",
  "spark-md5": "^3.0.2"
}
```

✅ 无需额外安装！

### 第 2 步：创建测试页面

我已经为你创建了一个测试页面，位于：

```
apps/web/src/views/WindTest.vue
```

### 第 3 步：启动项目

```bash
# 启动开发服务器
pnpm start

# 或者
pnpm web dev
```

然后访问测试页面（需要在路由中添加）。

## 📝 配置 Wind

### 1. 获取 GitHub Token

1. 访问 https://github.com/settings/tokens
2. 点击 "Generate new token (classic)"
3. 勾选 `repo` 权限
4. 生成并复制 Token

### 2. 获取 AI API Key

**OpenAI**

- 访问 https://platform.openai.com/api-keys
- 创建 API Key

**或使用国内服务**

- 通义千问：https://dashscope.aliyun.com/
- 文心一言：https://cloud.baidu.com/
- 智谱 AI：https://open.bigmodel.cn/

### 3. 在界面中配置

1. 打开 Wind 处理器
2. 点击"显示配置"
3. 填入 Token 和 API Key
4. 保存配置

## 🎯 使用方式

### 方式一：独立测试页面（推荐）

访问 `/wind-test` 路由（需要添加路由配置）

### 方式二：集成到现有编辑器

在你的编辑器组件中导入：

```vue
<script setup>
import WindProcessor from '@/wind/components/WindProcessor.vue'

function handleWindApply(markdown) {
  // 将处理后的内容应用到编辑器
  console.log('处理结果:', markdown)
}
</script>

<template>
  <div class="editor-layout">
    <!-- 你的编辑器 -->
    <div class="main-editor">
      <!-- ... -->
    </div>

    <!-- Wind 处理器侧边栏 -->
    <div v-if="showWind" class="wind-sidebar">
      <WindProcessor @apply="handleWindApply" />
    </div>
  </div>
</template>
```

### 方式三：作为对话框

```vue
<template>
  <Dialog v-model="showWind">
    <WindProcessor />
  </Dialog>
</template>
```

## 🧪 测试功能

### 测试 1：AI 排版

1. 点击"仅 AI 排版"
2. 输入测试文本：

```markdown
这是一个测试

第一段
第二段

重要内容

```

3. 点击"开始处理"
4. 查看结果

### 测试 2：图片上传

1. 点击"文本 + 图片"
2. 输入文本
3. 选择图片
4. 点击"开始处理"
5. 查看上传结果

### 测试 3：.docx 处理

1. 点击"上传 .docx"
2. 选择 Word 文档
3. 点击"开始处理"
4. 查看完整结果

## 🔧 集成到主编辑器

### 选项 1：添加到工具栏

在编辑器工具栏添加一个按钮：

```vue
<button @click="openWind">
  <Icon name="wind" />
  智能排版
</button>
```

### 选项 2：添加到侧边栏

在右侧边栏添加 Wind 面板：

```vue
<div class="sidebar-panel">
  <WindProcessor />
</div>
```

### 选项 3：快捷键触发

```typescript
// 注册快捷键
onMounted(() => {
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'w') {
      showWind.value = true
    }
  })
})
```

## 📂 项目结构

```
你的项目/
├── apps/web/
│   └── src/
│       ├── views/
│       │   └── WindTest.vue    # 测试页面（新建）
│       └── wind/               # Wind 中间件（已完成）
│           ├── components/
│           ├── core/
│           ├── services/
│           └── ...
└── package.json
```

## 🎨 自定义样式

Wind 组件使用 scoped 样式，你可以通过以下方式自定义：

```vue
<style>
/* 覆盖 Wind 样式 */
.wind-processor {
  --primary-color: #4caf50;
  --border-radius: 8px;
}
</style>
```

## 🐛 常见问题

### Q: 找不到模块？

A: 确保路径别名配置正确：

```typescript
// vite.config.ts
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
  },
}
```

### Q: Pinia 未注册？

A: 已经在 main.ts 中注册，无需额外配置

### Q: 组件样式不生效？

A: 检查是否正确导入了组件

## 📞 获取帮助

- 查看 [使用指南](./USAGE.md)
- 查看 [架构设计](./ARCHITECTURE.md)
- 查看示例代码

祝你使用愉快！🎉
