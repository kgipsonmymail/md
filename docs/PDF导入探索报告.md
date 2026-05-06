# PDF 导入功能探索报告

## 一、问题描述

目标：实现 PDF 文件导入，效果与 DOCX 接近
要求：
1. PDF 导入的内容不能没有图片
2. PDF 导入的内容不能有错误的换行

---

## 二、技术背景

### PDF vs DOCX 格式本质区别

| 特性 | DOCX | PDF |
|------|------|-----|
| 格式保留 | ✅ 保留标题、加粗、斜体等语义信息 | ❌ 不保留 |
| 文本提取 | mammoth 转换为 Markdown，保留格式标记 | 纯文本提取，无格式信息 |
| 图片提取 | 内嵌图片直接提取 | 需通过渲染和操作符列表提取 |

**结论**：PDF 本质上是"打印后的页面"，只记录"在哪里显示什么字"，不记录"这是标题"。因此 PDF 解析出来的一定是纯文本，无法保留原始格式。

---

## 三、已完成的工作

### 1. 核心解析模块

| 文件 | 功能 |
|------|------|
| `apps/web/src/wind/core/document-parser.ts` | parsePdf 方法实现 |
| `apps/web/src/wind/core/wind-processor.ts` | processPdf 方法实现 |
| `apps/web/src/wind/stores/wind.ts` | processPdf store action |
| `apps/web/src/components/editor/ImportPdfDialog.vue` | PDF 导入对话框 UI |
| `apps/web/src/stores/ui.ts` | PDF 对话框状态管理 |
| `apps/web/src/components/editor/editor-header/FileDropdown.vue` | 菜单入口 |
| `apps/web/src/views/CodemirrorEditor.vue` | 组件注册 |

### 2. 依赖安装

```bash
pnpm add pdfjs-dist@4.9.155 -w
```

### 3. 文本处理（已完成）

- ✅ 移除页眉页脚（"请务必阅读正文后的重要声明 X"）
- ✅ 移除页码标记
- ✅ 修复句号/逗号后的换行问题
- ✅ 移除连续空行

---

## 四、图片提取问题

### 1. 当前状态

- **DOCX 图片提取**：✅ 正常工作（使用 mammoth 库）
- **PDF 图片提取**：❌ 失败（提取到 0 张图片）

### 2. PDF 图片提取代码逻辑

```typescript
// 1. 渲染页面以触发图片加载
await page.render({
  canvasContext: ctx,
  viewport,
}).promise

// 2. 通过操作符列表查找图片
const operatorList = await page.getOperatorList()
for (let i = 0; i < operatorList.fnArray.length; i++) {
  if (operatorList.fnArray[i] === pdfjsLib.OPS.paintImageXObject) {
    const imgName = operatorList.argsArray[i][0]
    const img = await page.objs.get(imgName)
    // 提取图片...
  }
}
```

### 3. 已尝试的解决方法

| 方法 | 描述 | 结果 |
|------|------|------|
| 直接获取 | `page.objs.get(imgName)` | ❌ 返回 null |
| 渲染后获取 | 先 render 再 get | ❌ 仍返回 null |
| 等待延迟 | 添加 setTimeout 延迟 | ❌ 仍返回 null |
| 重试机制 | 循环重试 3 次 | ❌ 仍返回 null |
| 强制渲染 | 使用 canvas 渲染完整页面 | ❌ 仍返回 null |

### 4. 可能的原因

**pdfjs-dist 图片加载机制**：
- `page.objs` 是一个懒加载对象池
- 图片数据在渲染时异步加载
- 即使渲染完成，图片对象可能还未完全加载到内存
- 需要特殊处理才能获取图片原始数据

**浏览器环境限制**：
- pdfjs-dist 设计用于浏览器环境，worker 需要正确配置
- CORS 限制可能影响 CDN worker 加载

---

## 五、Node.js 测试结果 vs 浏览器结果

### Node.js 测试（成功）

```bash
node --experimental-vm-modules wind/test-pdf-parse.mjs
```

结果：
- ✅ 提取到 19 张原始图片
- ✅ 过滤后保留 4 张有效图片（1819x414, 275x274, 678x361, 690x364）
- ✅ 文本提取正常

**关键差异**：Node.js 使用 `pdfjs-dist/legacy/build/pdf.mjs`，浏览器使用 `pdfjs-dist`（ESM 版本）

### 浏览器测试（失败）

结果：
- ❌ 提取到 0 张图片
- ✅ 文本提取正常

---

## 六、文档格式问题

### 当前解析结果

**输入 PDF 第一页内容**：
```
主要内容布伦特与 WTI 正常价差 2-5 美元/桶...
```

**期望输出**：
```
# 布伦特与 WTI 价差史诗级倒挂

2026 年 4 月 17日

## 主要内容
布伦特与 WTI 正常价差 2-5 美元/桶...
```

**实际输出（无格式）**：
```
主要内容布伦特与 WTI 正常价差 2-5 美元/桶...
```

### 解决方案

1. **AI 排版** - 根据内容语义重新判断标题、加粗等结构
2. **使用 DOCX** - 如果需要保留原始格式，使用 DOCX 版本导入

---

## 七、GitHub 图床配置问题

### 问题现象

```
GET https://api.github.com/repos///contents/...  # owner/repo 为空
```

### 原因

前端配置未正确加载 GitHub 图床信息

### 解决

- 在前端 Wind 配置面板中正确填写 GitHub 设置
- 或配置 .env 文件中的 `VITE_IMAGE_HOST`

---

## 八、Worker 配置问题

### 错误信息

```
Failed to fetch dynamically imported module: https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.9.155/pdf.worker.min.js 404
```

### 解决

修改 workerSrc 为正确的 CDN：

```typescript
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`
```

---

## 九、测试脚本位置

`wind/test-pdf-parse.mjs` - Node.js 环境 PDF 解析测试

```bash
node --experimental-vm-modules wind/test-pdf-parse.mjs
```

测试结果文件：
- `wind/historyword/pdf解析测试结果.txt`

---

## 十、下一步方向

### 方案 A：继续研究浏览器图片提取

需要深入研究 pdfjs-dist 的图片加载机制，可能需要：
- 使用不同的 API 访问图片数据
- 修改渲染策略确保图片完全加载
- 参考 pdfjs-dist 官方示例

### 方案 B：后端处理

将 PDF 解析移到后端，使用 Node.js 脚本处理：
- 不受浏览器限制
- 可以使用 fs 模块直接读取文件
- 更容易调试和控制

### 方案 C：使用外部服务

调用第三方 PDF 解析 API（如 pdfparser.org、pdf.js 等服务）

---

## 十一、关键文件清单

| 文件路径 | 说明 |
|----------|------|
| `apps/web/src/wind/core/document-parser.ts` | parsePdf 方法 |
| `apps/web/src/wind/core/wind-processor.ts` | processPdf 方法 |
| `apps/web/src/wind/stores/wind.ts` | processPdf store |
| `apps/web/src/components/editor/ImportPdfDialog.vue` | PDF 导入 UI |
| `apps/web/src/stores/ui.ts` | UI 状态 |
| `apps/web/src/components/editor/editor-header/FileDropdown.vue` | 菜单 |
| `apps/web/src/views/CodemirrorEditor.vue` | 组件注册 |
| `wind/test-pdf-parse.mjs` | Node 测试脚本 |
| `docs/PDF解析开发SOP.md` | 开发 SOP |
| `wind/historyword/pdf解析测试结果.txt` | 测试结果 |

---

## 十二、已验证可用的功能

- ✅ PDF 文本提取（无格式）
- ✅ 页眉页脚清理
- ✅ 换行问题修复
- ✅ PDF 上传 UI
- ✅ 图片过滤逻辑（Node.js 环境）
- ✅ 图片上传到 GitHub 图床

---

**最后更新**：2026 年 5 月 6 日
**状态**：图片提取待解决