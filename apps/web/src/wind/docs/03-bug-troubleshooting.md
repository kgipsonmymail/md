# Wind 错题本 - Bug 和解决方案

## 概述

本文档记录 Wind 项目开发过程中遇到的 bug 和排查出的解决方案。

---

## Bug #1: GitHub 图床上传失败 - 404 Not Found

### 问题描述

上传图片到 GitHub 图床时返回 404 错误：

```
PUT https://api.github.com/repos/kgipsonmymail/image-home/contents/wind-assets/2026/03/xxx.png 404 (Not Found)
```

### 错误原因

1. 仓库不存在或无权访问
2. 分支不存在
3. 路径不存在（空仓库）
4. Token 权限不足

### 解决方案

1. **验证仓库和分支**：添加 `validateConfig` 方法验证仓库和分支是否存在
2. **空仓库初始化**：添加 `testUpload` 方法，自动创建 README.md 初始化仓库
3. **改进错误提示**：提供详细的错误信息和解决建议
4. **Token 权限检查**：指导用户创建具有 `repo` 权限的新 Token

**实现文件**：`services/github-image-host.ts`

---

## Bug #2: TypeError: Failed to execute 'text' on 'Response'

### 问题描述

在错误处理中重复读取 response body 导致错误：

```typescript
console.error('响应文本:', await response.text())
const error = await response.json()
```

### 错误原因

Response body 只能读取一次，第二次读取会抛出 TypeError。

### 解决方案

统一使用 `response.json()` 解析错误，移除重复的 `response.text()` 调用。

```typescript
const error = await response.json()
console.error('响应内容:', error)
```

**实现文件**：`services/github-image-host.ts`

---

## Bug #3: GitHub API 上传文件需要 sha 参数

### 问题描述

更新已存在的文件时，GitHub API 要求提供 `sha` 参数，否则返回 422 错误：

```json
{
  "message": "Invalid request.\n\n\"sha\" wasn't supplied.",
  "documentation_url": "https://docs.github.com/rest/repos/contents#create-or-update-file-contents",
  "status": "422"
}
```

### 错误原因

测试脚本直接使用 PUT 请求上传文件，没有检查文件是否存在，也没有提供 `sha` 参数。

### 解决方案

1. **检查文件存在性**：先通过 GET 请求检查文件是否存在
2. **获取 sha 参数**：如果文件存在，获取 `sha` 参数
3. **正确处理上传**：上传时提供 `sha` 参数

**实现文件**：`test-github-upload-with-cloud-cache.mjs`

---

## Bug #4: AI 排版结果无法替换到编辑器

### 问题描述

AI 排版完成后，用户需要手动复制结果，无法一键替换到编辑器。

### 解决方案

1. **添加替换按钮**：在 AI 工具箱、AI 对话、AI 文生图中添加替换按钮
2. **智能替换逻辑**：
   - 有选中文本：只替换选中的内容
   - 无选中文本：替换全部内容
3. **添加确认弹窗**：替换前弹出确认对话框，避免误操作
4. **添加浮窗提示**：替换成功后显示提示信息

**实现文件**：

- `components/ai/tool-box/ToolBoxPopover.vue`
- `components/ai/chat-box/AIAssistantPanel.vue`
- `components/ai/image-generator/AIImageGeneratorPanel.vue`
- `components/WindProcessor.vue`

---

## Bug #5: 相同图片重复上传

### 问题描述

用户上传相同的图片时，会重复上传到图床，浪费存储空间。

### 解决方案

1. **本地缓存**：基于文件哈希的本地缓存，避免重复上传
2. **云端判重**：检查 GitHub 仓库中是否已存在相同哈希值的文件
3. **文件名优化**：使用哈希值作为文件名，确保相同内容生成相同文件名
4. **缓存持久化**：使用 localStorage 保存缓存，跨会话有效

**实现文件**：`services/github-image-host.ts`

---

## Bug #6: 空仓库无法上传图片

### 问题描述

新创建的空 GitHub 仓库无法上传图片，返回 404 错误。

### 解决方案

1. **自动初始化**：添加 `testUpload` 方法，自动创建 README.md 初始化仓库
2. **路径验证**：检查路径是否存在，不存在则创建
3. **友好的错误提示**：指导用户如何初始化仓库

**实现文件**：`services/github-image-host.ts`

---

## Bug #7: Token 权限不足

### 问题描述

GitHub Token 权限不足，无法上传文件或访问仓库。

### 错误信息

```
401 Unauthorized
403 Forbidden
```

### 解决方案

1. **权限检查**：在配置验证时检查 Token 权限
2. **权限说明**：在配置界面说明需要的权限（`repo`）
3. **创建指导**：指导用户创建具有正确权限的新 Token

**实现文件**：`components/WindConfig.vue`

---

## Bug #8: 图片上传进度不准确

### 问题描述

批量上传图片时，进度显示不准确，用户体验不佳。

### 解决方案

1. **精确计算进度**：根据已上传图片数和总图片数计算进度
2. **实时更新**：每上传完一张图片更新一次进度
3. **完成提示**：上传完成后显示完成提示

**实现文件**：`stores/wind.ts`

---

## Bug #9: AI 排版 Prompt 不够优化

### 问题描述

AI 排版效果不够理想，需要优化 Prompt 提示词。

### 解决方案

1. **Prompt 记录**：创建 `docs/04-prompts.md` 记录有效的 Prompt
2. **持续优化**：根据实际使用效果持续优化 Prompt
3. **用户反馈**：收集用户反馈，调整 Prompt

**实现文件**：`docs/04-prompts.md`

---

## Bug #10: 编辑器内容替换后未聚焦

### 问题描述

一键替换到编辑器后，编辑器未聚焦，用户需要手动点击。

### 解决方案

在替换后调用 `editorView.focus()` 方法，自动聚焦编辑器。

```typescript
editorView.focus()
```

**实现文件**：

- `components/ai/tool-box/ToolBoxPopover.vue`
- `components/ai/chat-box/AIAssistantPanel.vue`
- `components/WindProcessor.vue`

---

## 最佳实践

### 1. 错误处理

- 捕获所有可能的错误
- 提供详细的错误信息
- 给出解决建议
- 记录错误日志

### 2. 用户体验

- 提供友好的错误提示
- 显示操作进度
- 添加确认对话框
- 显示成功提示

### 3. 代码质量

- 使用 TypeScript 类型检查
- 添加必要的注释
- 遵循代码规范
- 编写单元测试

### 4. 性能优化

- 使用缓存避免重复计算
- 批量操作优化
- 懒加载和按需加载
- 减少不必要的渲染

---

## 总结

本文档记录了 Wind 项目开发过程中遇到的主要 bug 和解决方案。通过持续的 bug 修复和优化，项目的稳定性和用户体验得到了显著提升。

**关键经验**：

1. 完善的错误处理和提示
2. 用户体验优先的设计
3. 持续优化和改进
4. 文档记录和经验总结
