# 🚀 Wind 中间件 - 如何启动

## 最简单的启动方式（3 步）

### 第 1 步：启动项目

```bash
pnpm start
```

### 第 2 步：添加测试按钮

在 `apps/web/src/App.vue` 中添加以下代码：

```vue
<script setup>
import { ref } from 'vue'
import WindProcessor from '@/wind/components/WindProcessor.vue'

const showWind = ref(false)
</script>

<template>
  <div id="app">
    <!-- 你的现有内容保持不变 -->

    <!-- 在页面右下角添加一个浮动按钮 -->
    <button
      style="position: fixed; bottom: 20px; right: 20px; z-index: 9999; padding: 12px 24px; background: #4CAF50; color: white; border: none; border-radius: 8px; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.2); font-size: 14px;"
      @click="showWind = !showWind"
    >
      {{ showWind ? '隐藏' : '显示' }} Wind 处理器
    </button>

    <!-- Wind 处理器侧边栏 -->
    <div
      v-if="showWind"
      style="position: fixed; top: 0; right: 0; width: 600px; height: 100vh; background: white; box-shadow: -4px 0 12px rgba(0,0,0,0.1); z-index: 9998; overflow-y: auto;"
    >
      <WindProcessor />
    </div>
  </div>
</template>
```

### 第 3 步：配置并使用

1. 刷新页面，点击右下角的"显示 Wind 处理器"按钮
2. 点击"显示配置"
3. 填入配置：
   - GitHub Token: https://github.com/settings/tokens
   - AI API Key: https://platform.openai.com/api-keys
4. 开始使用！

---

## 📋 详细步骤

### 1. 确认依赖

依赖已经在主项目的 `package.json` 中：

```json
{
  "mammoth": "^1.12.0",
  "pinia": "^3.0.4",
  "spark-md5": "^3.0.2"
}
```

✅ 无需额外安装！

### 2. 启动开发服务器

```bash
# 方式 1
pnpm start

# 方式 2
pnpm web dev
```

### 3. 集成到应用

#### 选项 A：最快测试（推荐）

直接在 `apps/web/src/App.vue` 中添加上面的代码。

#### 选项 B：使用测试页面

我已经创建了 `apps/web/src/views/WindTest.vue`，你可以：

1. 直接在某个页面导入：

```vue
<script setup>
import WindTest from '@/views/WindTest.vue'
</script>

<template>
  <WindTest />
</template>
```

2. 或者添加路由（如果使用 Vue Router）

#### 选项 C：集成到编辑器

参考 [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)

### 4. 配置 Wind

#### 获取 GitHub Token

1. 访问 https://github.com/settings/tokens
2. 点击 "Generate new token (classic)"
3. 勾选 `repo` 权限
4. 生成并复制（格式：`ghp_xxxxxxxxxxxx`）

#### 获取 AI API Key

**OpenAI**

- 访问 https://platform.openai.com/api-keys
- 创建 API Key（格式：`sk-xxxxxxxxxxxx`）

**或使用国内服务**

- 通义千问：https://dashscope.aliyun.com/
- 文心一言：https://cloud.baidu.com/
- 智谱 AI：https://open.bigmodel.cn/

#### 在界面中配置

1. 打开 Wind 处理器
2. 点击"显示配置"按钮
3. 填入配置信息
4. 保存（自动保存到 localStorage）

### 5. 开始使用

#### 模式 1：上传 .docx

1. 点击"上传 .docx"标签
2. 选择 Word 文档
3. 点击"开始处理"
4. 等待处理完成
5. 复制结果

#### 模式 2：文本 + 图片

1. 点击"文本 + 图片"标签
2. 输入或粘贴文本
3. 点击"选择图片"上传图片
4. 点击"开始处理"
5. 复制结果

#### 模式 3：仅 AI 排版

1. 点击"仅 AI 排版"标签
2. 粘贴 Markdown 内容
3. 点击"开始处理"
4. 复制优化后的内容

---

## 🎯 快速测试

### 测试 AI 排版（最简单）

1. 打开 Wind 处理器
2. 点击"仅 AI 排版"
3. 输入测试文本：

```markdown
这是一个测试文章

第一段内容
第二段内容

重要信息
关键数据

```

4. 点击"开始处理"
5. 查看 AI 优化后的结果

### 测试图片上传

1. 点击"文本 + 图片"
2. 输入：`这是一张测试图片`
3. 选择一张图片
4. 点击"开始处理"
5. 查看图片是否成功上传到 GitHub

---

## 📂 项目结构

```
你的项目/
├── apps/web/
│   └── src/
│       ├── App.vue              # 在这里添加测试按钮
│       ├── views/
│       │   └── WindTest.vue     # 测试页面（已创建）
│       └── wind/                # Wind 中间件（已完成）
│           ├── components/      # Vue 组件
│           ├── core/            # 核心模块
│           ├── services/        # 服务层
│           ├── stores/          # 状态管理
│           └── ...
└── package.json                 # 依赖已安装
```

---

## 🔍 验证安装

### 检查依赖

```bash
# 查看已安装的包
pnpm list mammoth pinia spark-md5
```

应该看到：

```
mammoth 1.12.0
pinia 3.0.4
spark-md5 3.0.2
```

### 检查文件

确认以下文件存在：

- `apps/web/src/wind/components/WindProcessor.vue`
- `apps/web/src/wind/components/WindConfig.vue`
- `apps/web/src/wind/stores/wind.ts`
- `apps/web/src/views/WindTest.vue`

---

## 🐛 常见问题

### Q: 启动后看不到按钮？

A: 检查是否正确添加了代码到 `App.vue`，刷新页面

### Q: 点击按钮没反应？

A: 打开浏览器控制台查看错误信息

### Q: 提示找不到模块？

A: 检查路径别名配置，确保 `@` 指向 `apps/web/src`

### Q: 配置保存失败？

A: 检查浏览器是否允许 localStorage

---

## 📚 相关文档

- [START.md](./START.md) - 详细启动指南
- [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) - 集成指南
- [QUICKSTART.md](./QUICKSTART.md) - 快速开始
- [USAGE.md](./USAGE.md) - 使用说明

---

## ✅ 启动检查清单

准备工作：

- [ ] 项目可以正常运行
- [ ] 依赖已安装
- [ ] Wind 文件夹存在

添加代码：

- [ ] 在 App.vue 中添加了测试按钮
- [ ] 导入了 WindProcessor 组件
- [ ] 保存并刷新页面

配置：

- [ ] 获取了 GitHub Token
- [ ] 获取了 AI API Key
- [ ] 在界面中配置并保存

测试：

- [ ] 可以看到 Wind 处理器界面
- [ ] 配置显示"✓ 配置有效"
- [ ] 测试了至少一种处理模式

---

## 🎉 开始使用

现在你可以：

1. 上传 Word 文档，自动提取图片并排版
2. 输入文本和图片，自动上传并组合
3. 优化现有 Markdown 内容的排版
4. 一键复制结果到公众号

祝你使用愉快！

有问题随时查看文档或提问。
