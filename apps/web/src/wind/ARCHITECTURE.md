# Wind 中间件 - 架构设计

## 🏗️ 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                        用户界面层                              │
│  ┌──────────────────┐         ┌──────────────────┐          │
│  │ WindProcessor.vue│         │  WindConfig.vue  │          │
│  │  - 文件上传      │         │  - GitHub 配置   │          │
│  │  - 模式切换      │         │  - AI 配置       │          │
│  │  - 进度显示      │         │  - 配置验证      │          │
│  │  - 结果展示      │         │  - 配置保存      │          │
│  └──────────────────┘         └──────────────────┘          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                        状态管理层                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                   Pinia Store                         │   │
│  │  - 配置管理（config）                                  │   │
│  │  - 处理状态（processing, progress）                   │   │
│  │  - 结果存储（result, uploadedImages）                 │   │
│  │  - 错误处理（errors）                                  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                        业务逻辑层                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              WindProcessor（流程编排）                 │   │
│  │  - processDocx()          处理 .docx 文件             │   │
│  │  - processTextWithImages() 处理文本+图片              │   │
│  │  - formatOnly()           仅 AI 排版                  │   │
│  │  - uploadImagesOnly()     仅上传图片                  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                        核心模块层                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │DocumentParser│  │ImageManager │  │AIFormatter  │         │
│  │- parseDocx()│  │- uploadImage│  │- format()   │         │
│  │- parseText()│  │- replaceUrls│  │- analyze()  │         │
│  │- extract()  │  │- validate() │  │- chunk()    │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                        服务层                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              GitHubImageHost                          │   │
│  │  - upload()          上传图片到 GitHub                │   │
│  │  - uploadBatch()     批量上传                         │   │
│  │  - getFinalUrl()     获取 CDN URL                     │   │
│  │  - cache             缓存管理                         │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                        外部服务                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ GitHub API  │  │jsDelivr CDN │  │ OpenAI API  │         │
│  │- 图片存储   │  │- 图片加速   │  │- AI 排版    │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

## 📦 模块设计

### 1. 用户界面层

#### WindProcessor.vue

**职责**：主处理界面

- 文件上传（.docx、图片）
- 模式切换（三种模式）
- 进度显示
- 结果展示
- 用户交互

**输入**：

- 用户操作（点击、拖拽、输入）
- 文件选择

**输出**：

- 处理结果
- 错误提示

#### WindConfig.vue

**职责**：配置管理界面

- GitHub 配置
- AI 配置
- 配置验证
- 配置保存

**输入**：

- 用户配置输入

**输出**：

- 验证结果
- 保存状态

### 2. 状态管理层

#### Pinia Store

**职责**：全局状态管理

- 配置存储
- 处理状态跟踪
- 结果缓存
- 错误管理

**状态**：

```typescript
{
  config: WindConfig,
  configValid: boolean,
  processing: boolean,
  progress: number,
  currentStep: string,
  result: ProcessResult | null,
  uploadedImages: UploadResult[],
  errors: string[]
}
```

**方法**：

- updateConfig()
- validateConfig()
- processDocx()
- processTextWithImages()
- formatOnly()
- uploadImagesOnly()

### 3. 业务逻辑层

#### WindProcessor

**职责**：流程编排

- 协调各个模块
- 处理业务流程
- 错误处理
- 进度跟踪

**流程**：

```
输入 → 解析 → 上传 → 排版 → 输出
```

### 4. 核心模块层

#### DocumentParser

**职责**：文档解析

- .docx 文件解析
- 图片提取
- 文本处理

**方法**：

- parseDocx(file) → ParsedDocument
- parseTextWithImages(text, images) → ParsedDocument
- extractImages(content) → ImageAsset[]

#### ImageManager

**职责**：图片管理

- 图片上传
- URL 替换
- 缓存管理

**方法**：

- uploadImage(image) → UploadResult
- uploadImages(images) → Map<string, UploadResult>
- replaceImageUrls(content, images) → string

#### AIFormatter

**职责**：AI 排版

- 调用 AI API
- 内容优化
- 变更分析

**方法**：

- format(content) → FormattedResult
- formatInChunks(content, size) → FormattedResult
- analyzeChanges(original, formatted) → FormatChange[]

### 5. 服务层

#### GitHubImageHost

**职责**：GitHub 图床服务

- GitHub API 调用
- 文件上传
- CDN URL 生成

**方法**：

- upload(blob, name) → UploadResult
- uploadBatch(images) → UploadResult[]
- getFinalUrl(result) → string

## 🔄 数据流

### 处理 .docx 文件流程

```
1. 用户上传 .docx 文件
   ↓
2. WindProcessor.vue 触发处理
   ↓
3. Pinia Store 调用 processDocx()
   ↓
4. WindProcessor 开始编排
   ↓
5. DocumentParser 解析文档
   - 提取文本
   - 提取图片（base64）
   ↓
6. ImageManager 处理图片
   - 计算哈希
   - 检查缓存
   ↓
7. GitHubImageHost 上传图片
   - 调用 GitHub API
   - 生成 CDN URL
   ↓
8. ImageManager 替换 URL
   - base64 → CDN URL
   ↓
9. AIFormatter 优化排版
   - 调用 AI API
   - 分析变更
   ↓
10. 返回结果
    - Markdown 内容
    - 上传的图片列表
    ↓
11. WindProcessor.vue 展示结果
```

### 配置管理流程

```
1. 用户打开配置界面
   ↓
2. WindConfig.vue 加载配置
   ↓
3. 从 localStorage 读取
   ↓
4. 用户修改配置
   ↓
5. 实时验证
   ↓
6. 保存到 localStorage
   ↓
7. 更新 Pinia Store
```

## 🎯 设计原则

### 1. 单一职责

每个模块只负责一个功能：

- DocumentParser：只负责解析
- ImageManager：只负责图片管理
- AIFormatter：只负责 AI 排版

### 2. 依赖注入

通过构造函数注入依赖：

```typescript
class WindProcessor {
  constructor(
    imageHost: GitHubImageHost,
    aiFormatter?: AIFormatter
  ) {
    // ...
  }
}
```

### 3. 接口抽象

使用 TypeScript 接口定义契约：

```typescript
interface ImageHost {
  upload: (blob: Blob, name: string) => Promise<UploadResult>
}
```

### 4. 错误处理

统一的错误处理机制：

```typescript
try {
  // 处理逻辑
}
catch (error) {
  console.error('错误:', error)
  return {
    success: false,
    errors: [(error as Error).message]
  }
}
```

### 5. 可扩展性

- 图床服务可替换
- AI 服务可替换
- 渲染器可替换

## 🔌 扩展点

### 1. 自定义图床

```typescript
class CustomImageHost implements ImageHost {
  async upload(blob: Blob, name: string): Promise<UploadResult> {
    // 自定义上传逻辑
  }
}

const processor = new WindProcessor(new CustomImageHost())
```

### 2. 自定义 AI 服务

```typescript
class CustomAIFormatter extends AIFormatter {
  protected async callAI(content: string): Promise<string> {
    // 自定义 AI 调用
  }
}
```

### 3. 自定义文档解析器

```typescript
class CustomDocumentParser extends DocumentParser {
  async parsePDF(file: File): Promise<ParsedDocument> {
    // PDF 解析逻辑
  }
}
```

## 📊 性能优化

### 1. 缓存策略

**图片缓存**

- 基于文件哈希
- localStorage 存储
- 避免重复上传

**配置缓存**

- localStorage 持久化
- 减少重复配置

### 2. 懒加载

**动态导入**

```typescript
const mammoth = await import('mammoth')
```

### 3. 防抖节流

**配置保存**

- 防抖 500ms
- 避免频繁写入

### 4. 分块处理

**长文档**

- 分块大小：2000 字符
- 并行处理
- 结果合并

## 🔒 安全设计

### 1. 输入验证

```typescript
function validateConfig(config: WindConfig) {
  if (!config.github.token) {
    throw new Error('Token 不能为空')
  }
  // ...
}
```

### 2. XSS 防护

```vue
<!-- 使用 v-text 而不是 v-html -->
<div v-text="userInput"></div>
```

### 3. Token 保护

```typescript
// 不在日志中输出 Token
console.log('配置:', { ...config, token: '***' })
```

## 🧪 测试策略

### 1. 单元测试

```typescript
describe('DocumentParser', () => {
  it('should parse docx file', async () => {
    const parser = new DocumentParser()
    const result = await parser.parseDocx(file)
    expect(result.content).toBeDefined()
  })
})
```

### 2. 集成测试

```typescript
describe('WindProcessor', () => {
  it('should process docx file', async () => {
    const processor = createWindProcessor(config)
    const result = await processor.processDocx(file, options)
    expect(result.success).toBe(true)
  })
})
```

### 3. E2E 测试

```typescript
describe('Wind UI', () => {
  it('should upload and process file', async () => {
    await page.click('[data-test="upload-button"]')
    await page.setInputFiles('input[type="file"]', 'test.docx')
    await page.click('[data-test="process-button"]')
    await expect(page.locator('[data-test="result"]')).toBeVisible()
  })
})
```

## 📈 监控指标

### 1. 性能指标

- 首屏加载时间
- 文件处理时间
- 图片上传时间
- AI 排版时间

### 2. 业务指标

- 处理成功率
- 图片上传成功率
- AI 调用成功率
- 用户活跃度

### 3. 错误监控

- 错误类型统计
- 错误频率
- 错误堆栈

## 🚀 部署架构

```
┌─────────────────────────────────────────┐
│              用户浏览器                   │
│  ┌─────────────────────────────────┐    │
│  │      Wind 中间件（前端）          │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
              ↓           ↓           ↓
    ┌─────────────┐ ┌─────────┐ ┌─────────┐
    │ GitHub API  │ │jsDelivr │ │OpenAI API│
    │  (图床)     │ │  (CDN)  │ │ (AI)    │
    └─────────────┘ └─────────┘ └─────────┘
```

## 📝 总结

Wind 中间件采用分层架构设计，具有以下特点：

1. **清晰的职责划分**：每层有明确的职责
2. **松耦合**：模块之间依赖接口而非实现
3. **可扩展**：易于添加新功能和替换实现
4. **可测试**：每个模块都可以独立测试
5. **高性能**：缓存、懒加载、分块处理
6. **安全可靠**：输入验证、错误处理、日志记录

这种架构设计使得系统易于维护和扩展，为未来的功能增强打下了良好的基础。
