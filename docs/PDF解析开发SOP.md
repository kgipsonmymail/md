# PDF 解析功能开发 SOP

## 一、开发流程

### 1. 创建 Node 测试脚本

在 `wind/test-pdf-parse.mjs` 创建独立测试脚本：

```javascript
import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function testPdfParse() {
  const pdfPath = join(__dirname, 'historyword', 'xxx.pdf')
  // 使用 pdfjs-dist/legacy/build/pdf.mjs 路径
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
  // ... 测试代码
}
```

### 2. 运行测试

```bash
node --experimental-vm-modules wind/test-pdf-parse.mjs
```

### 3. 实现功能

1. 在 `document-parser.ts` 添加 `parsePdf` 方法
2. 在 `wind-processor.ts` 添加 `processPdf` 方法
3. 在 `wind.ts` store 添加 `processPdf` 方法
4. 创建 `ImportPdfDialog.vue` PDF 导入对话框
5. 在 `ui.ts` 添加状态 `isShowImportPdfDialog`
6. 在 `FileDropdown.vue` 添加菜单项
7. 在 `CodemirrorEditor.vue` 导入组件

### 4. 验证流程

完整流程：
```
PDF文件 → parsePdf(提取文本和图片) → processPdf(上传图片+AI排版) → Markdown输出
```

---

## 二、已验证成功的关键代码

### 图片过滤（过滤页眉页脚 logo）

```javascript
// 过滤小图片（通常是页眉页脚的logo）
const dataSize = img.data.length
const isSmallImage = img.width < 100 || img.height < 100 || dataSize < 5000

if (!isSmallImage) {
  // 有效图片，添加到列表
}
```

### 页眉页脚清理

```javascript
// 移除"请务必阅读正文后的重要声明 X"这类页眉页脚
let cleaned = pageText.replace(/请务必阅读正文后的重要声明\s*\d*/g, '')

// 移除页码
cleaned = cleaned.replace(/第\s*\d+\s*页/g, '')
```

### 在文本中插入图片占位符

```javascript
// 构建带图片引用的Markdown内容
result += `\n\n![${image.alt}](PLACEHOLDER_${image.id})\n\n`
```

### Worker CDN 配置

```javascript
// 正确的 workerSrc 配置
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`
```

---

## 三、遇到的问题和解决

### 1. pdfjs-dist 版本和路径问题

- **问题**：直接 import `pdfjs-dist` 可能找不到 legacy 版本
- **解决**：使用 `pdfjs-dist/legacy/build/pdf.mjs` 路径（Node.js）或正确的 CDN（浏览器）

### 2. ESM 模块中 require 未定义

- **问题**：`require is not defined`
- **解决**：使用 `import` 导入 fs 模块，不要用 require

### 3. PDF 不保留原始格式

- **问题**：PDF 解析出来的是纯文本，丢失了标题、加粗等格式
- **解决**：这是 PDF 格式的本质问题，只能通过 AI 排版来恢复格式，或者使用 DOCX 格式

### 4. 图片提取数量问题（Node.js vs 浏览器）

- **Node.js**：能提取到 19 张原始图片，过滤后保留 4 张有效图片
- **浏览器**：提取到 0 张图片
- **原因**：pdfjs-dist 在浏览器环境下图片是懒加载的，`page.objs.get()` 返回 null
- **尝试过的解决**：
  - 直接获取 → ❌ 返回 null
  - 渲染后获取 → ❌ 仍返回 null
  - 等待延迟 → ❌ 仍返回 null
  - 重试机制 → ❌ 仍返回 null
  - 强制渲染 → ❌ 仍返回 null

### 5. Worker CDN 404

- **问题**：`cdnjs.cloudflare.com/ajax/libs/pdf.js/4.9.155/pdf.worker.min.js` 404
- **解决**：改用 `cdn.jsdelivr.net/npm/pdfjs-dist@${version}/build/pdf.worker.min.mjs`

### 6. 依赖安装问题

- **问题**：`@antv/infographic` 解析失败
- **解决**：运行 `pnpm install` 重新安装依赖

### 7. 服务启动失败

- **问题**：端口被占用或连接被重置
- **解决**：先 `taskkill /F /IM node.exe` 杀死所有 node 进程，再重新启动

### 8. GitHub 配置为空

- **问题**：URL 显示 `https://api.github.com/repos///contents/...`（owner/repo 为空）
- **解决**：在前端配置中正确填写 GitHub 图床信息

---

## 四、主界面添加 PDF 导入菜单的完整步骤

### 1. 创建 ImportPdfDialog.vue

参考 `ImportDocxDialog.vue`，创建 PDF 导入对话框组件

### 2. 在 ui.ts 添加状态

```typescript
// 是否展示导入 PDF 对话框
const isShowImportPdfDialog = ref(false)
const toggleShowImportPdfDialog = useToggle(isShowImportPdfDialog)
```

### 3. 在 FileDropdown.vue 添加菜单项

```typescript
const { ..., toggleShowImportPdfDialog } = uiStore

<MenubarItem @click="toggleShowImportPdfDialog(true)">
  <FileCode class="mr-2 size-4" />
  导入 PDF
</MenubarItem>
```

### 4. 在 CodemirrorEditor.vue 导入组件

```typescript
import ImportPdfDialog from '@/components/editor/ImportPdfDialog.vue'

// 在 template 中添加
<ImportPdfDialog />
```

---

## 五、关键文件位置

| 文件 | 作用 |
|------|------|
| `apps/web/src/wind/core/document-parser.ts` | 文档解析核心（parsePdf 方法） |
| `apps/web/src/wind/core/wind-processor.ts` | 处理流程编排（processPdf 方法） |
| `apps/web/src/wind/stores/wind.ts` | Pinia Store（processPdf action） |
| `apps/web/src/components/editor/ImportPdfDialog.vue` | PDF 导入对话框 |
| `apps/web/src/stores/ui.ts` | UI 状态管理 |
| `apps/web/src/components/editor/editor-header/FileDropdown.vue` | 文件菜单 |
| `apps/web/src/views/CodemirrorEditor.vue` | 组件注册 |
| `wind/test-pdf-parse.mjs` | Node 测试脚本 |

---

## 六、测试验证清单

- [x] PDF 文件能正常解析
- [x] 页眉页脚文本被正确移除
- [x] 小图片（logo）被过滤掉（Node.js 验证）
- [x] 前端界面能正常显示 PDF 导入选项
- [x] 前端菜单能打开 PDF 导入对话框
- [ ] 有效图片被提取并上传到图床（浏览器环境）
- [ ] 图片占位符被替换为实际 URL
- [ ] AI 排版正常工作（如果开启）

---

## 七、已知限制

1. **PDF 不保留格式**：PDF 格式本质不存储语义信息，解析出来是纯文本
2. **浏览器图片提取失败**：pdfjs-dist 在浏览器环境下图片加载机制导致无法提取
3. **AI 排版可选**：需要开启 AI 排版才能恢复格式

---

## 八、下一步方向

### 方案 A：继续研究浏览器图片提取
- 使用不同的 API 访问图片数据
- 参考 pdfjs-dist 官方示例

### 方案 B：后端处理
- 将 PDF 解析移到 Node.js 后端
- 不受浏览器限制

### 方案 C：使用 DOCX
- 如果需要保留格式，使用 DOCX 版本导入

---

**最后更新**：2026 年 5 月 6 日