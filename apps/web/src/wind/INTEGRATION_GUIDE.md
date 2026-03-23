# Wind 中间件 - 集成指南

## 🎯 三种集成方式

### 方式一：独立测试页面（最简单）

#### 1. 使用已创建的测试页面

我已经创建了 `apps/web/src/views/WindTest.vue`，你只需要：

**选项 A：直接访问（临时测试）**

在 `App.vue` 或任何页面中临时导入：

```vue
<script setup>
import WindTest from '@/views/WindTest.vue'
</script>

<template>
  <div>
    <!-- 你的现有内容 -->

    <!-- 添加 Wind 测试 -->
    <WindTest />
  </div>
</template>
```

**选项 B：添加路由（推荐）**

如果你的项目使用 Vue Router，添加路由：

```typescript
// router/index.ts
{
  path: '/wind-test',
  name: 'WindTest',
  component: () => import('@/views/WindTest.vue')
}
```

然后访问 `http://localhost:5173/wind-test`

#### 2. 或者直接在现有页面测试

在任何现有页面中添加：

```vue
<script setup>
import { ref } from 'vue'
import WindProcessor from '@/wind/components/WindProcessor.vue'

const showWind = ref(false)
</script>

<template>
  <div>
    <button @click="showWind = !showWind">
      {{ showWind ? '隐藏' : '显示' }} Wind 处理器
    </button>

    <div v-if="showWind">
      <WindProcessor />
    </div>
  </div>
</template>
```

---

### 方式二：集成到编辑器（推荐用于生产）

#### 1. 找到你的主编辑器组件

通常在 `apps/web/src/App.vue` 或类似位置

#### 2. 添加 Wind 按钮

在工具栏或侧边栏添加触发按钮：

```vue
<script setup>
import { ref } from 'vue'
import WindProcessor from '@/wind/components/WindProcessor.vue'

const content = ref('')
const showWind = ref(false)

function openWind() {
  showWind.value = true
}

function closeWind() {
  showWind.value = false
}

function handleWindApply(markdown) {
  // 将 Wind 处理后的内容应用到编辑器
  content.value = markdown
  closeWind()
}
</script>

<template>
  <div class="editor-layout">
    <!-- 工具栏 -->
    <div class="toolbar">
      <!-- 现有按钮 -->
      <button>保存</button>
      <button>导出</button>

      <!-- 新增 Wind 按钮 -->
      <button class="wind-button" @click="openWind">
        🎨 智能排版
      </button>
    </div>

    <!-- 编辑器主体 -->
    <div class="editor-main">
      <!-- 你的编辑器 -->
      <textarea v-model="content" />
    </div>

    <!-- Wind 侧边栏 -->
    <transition name="slide">
      <div v-if="showWind" class="wind-sidebar">
        <div class="sidebar-header">
          <h3>Wind 智能排版</h3>
          <button @click="closeWind">
            ✕
          </button>
        </div>
        <WindProcessor @apply="handleWindApply" />
      </div>
    </transition>
  </div>
</template>

<style scoped>
.editor-layout {
  display: flex;
  height: 100vh;
}

.wind-sidebar {
  width: 500px;
  background: white;
  border-left: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #e0e0e0;
}

/* 滑入动画 */
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
}
</style>
```

---

### 方式三：作为对话框/弹窗

#### 使用现有的对话框组件

```vue
<script setup>
import { ref } from 'vue'
import WindProcessor from '@/wind/components/WindProcessor.vue'
// import Dialog from '@/components/Dialog.vue' // 你的对话框组件

const showDialog = ref(false)

function handleApply(markdown) {
  console.log('处理结果:', markdown)
  showDialog.value = false
}
</script>

<template>
  <div>
    <button @click="showDialog = true">
      打开 Wind 处理器
    </button>

    <!-- 使用你项目中的 Dialog 组件 -->
    <Dialog v-model="showDialog" title="Wind 智能排版" width="900px">
      <WindProcessor @apply="handleApply" />
    </Dialog>
  </div>
</template>
```

---

## 🚀 最快启动方式（推荐）

### 1 分钟快速测试

在 `apps/web/src/App.vue` 中添加：

```vue
<script setup>
import { ref } from 'vue'
import WindProcessor from '@/wind/components/WindProcessor.vue'

const showWind = ref(false)
</script>

<template>
  <div id="app">
    <!-- 你的现有内容 -->

    <!-- 临时添加 Wind 测试 -->
    <div style="position: fixed; bottom: 20px; right: 20px; z-index: 9999;">
      <button
        style="padding: 12px 24px; background: #4CAF50; color: white; border: none; border-radius: 8px; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.2);"
        @click="showWind = !showWind"
      >
        {{ showWind ? '隐藏' : '显示' }} Wind
      </button>
    </div>

    <div
      v-if="showWind"
      style="position: fixed; top: 0; right: 0; width: 600px; height: 100vh; background: white; box-shadow: -4px 0 12px rgba(0,0,0,0.1); z-index: 9998; overflow-y: auto;"
    >
      <WindProcessor />
    </div>
  </div>
</template>
```

然后：

```bash
# 启动项目
pnpm start
```

访问你的应用，点击右下角的按钮即可看到 Wind 处理器！

---

## 📝 配置步骤

### 1. 获取 GitHub Token

1. 访问 https://github.com/settings/tokens
2. 点击 "Generate new token (classic)"
3. 勾选 `repo` 权限
4. 生成并复制 Token（格式：`ghp_xxxxxxxxxxxx`）

### 2. 获取 AI API Key

**OpenAI（推荐）**

- 访问 https://platform.openai.com/api-keys
- 创建 API Key（格式：`sk-xxxxxxxxxxxx`）

**国内替代**

- 通义千问：https://dashscope.aliyun.com/
- 文心一言：https://cloud.baidu.com/
- 智谱 AI：https://open.bigmodel.cn/

### 3. 在界面中配置

1. 打开 Wind 处理器
2. 点击"显示配置"
3. 填入 Token 和 API Key
4. 点击保存

配置会自动保存到 localStorage，下次无需重新配置。

---

## 🎨 自定义样式

### 修改主题色

```vue
<style>
.wind-processor {
  --primary-color: #your-color;
  --border-radius: 8px;
}
</style>
```

### 调整尺寸

```vue
<WindProcessor style="width: 800px; height: 600px;" />
```

---

## 🔧 高级集成

### 与编辑器双向绑定

```vue
<script setup>
import { ref, watch } from 'vue'
import { useWindStore } from '@/wind/stores/wind'

const windStore = useWindStore()
const editorContent = ref('')

// 监听 Wind 处理结果
watch(() => windStore.result, (result) => {
  if (result?.success) {
    editorContent.value = result.markdown
  }
})

// 将编辑器内容传给 Wind
function processWithWind() {
  windStore.formatOnly(editorContent.value)
}
</script>
```

### 自定义处理流程

```typescript
import { createWindProcessor } from '@/wind'

const processor = createWindProcessor(githubConfig, aiConfig)

// 自定义处理
const result = await processor.processDocx(file, {
  uploadImages: true,
  formatContent: true,
  preserveOriginal: true,
})

console.log(result.markdown)
```

---

## 🐛 故障排除

### 问题 1：找不到模块

```
Error: Cannot find module '@/wind/components/WindProcessor.vue'
```

**解决方案**：检查路径别名配置

```typescript
// vite.config.ts
resolve: {
  alias: {
    '@': path.resolve(__dirname, './apps/web/src'),
  },
}
```

### 问题 2：Pinia 未注册

```
Error: getActivePinia was called with no active Pinia
```

**解决方案**：已在 `main.ts` 中注册，无需额外配置

### 问题 3：样式不生效

**解决方案**：确保正确导入组件，样式是 scoped 的

---

## 📞 获取帮助

- 查看 [START.md](./START.md) - 启动指南
- 查看 [USAGE.md](./USAGE.md) - 使用说明
- 查看 [QUICKSTART.md](./QUICKSTART.md) - 快速开始

---

## ✅ 检查清单

启动前确认：

- [ ] 依赖已安装（mammoth, pinia, spark-md5）
- [ ] 项目可以正常运行（`pnpm start`）
- [ ] 已添加 Wind 组件到页面
- [ ] 已获取 GitHub Token
- [ ] 已获取 AI API Key

开始使用：

- [ ] 打开 Wind 处理器
- [ ] 配置 GitHub 和 AI
- [ ] 测试三种模式
- [ ] 查看处理结果

祝你使用愉快！🎉
