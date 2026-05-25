# MD Converter 后端服务

文档转换服务，支持将 HTML 和 DOCX 文件转换为 Markdown，并自动上传图片到 GitHub 图床。

## 功能

- **HTML → Markdown**: 解析 HTML 文件转换为 Markdown，支持微信公众号文章
- **DOCX → Markdown**: 解析 Word 文档转换为 Markdown，自动提取并上传图片
- **图片上传**: 自动将文档中的图片上传到 GitHub 图床，返回 CDN URL
- **AI 排版**: 调用 Dify "排版大师" API 对文档进行智能排版优化

## 快速开始

### 1. 配置环境变量

创建 `.env` 文件：

```env
GITHUB_TOKEN=your_github_token
GITHUB_REPO=owner/repo
GITHUB_BRANCH=main
GITHUB_DIR=wind-assets
```

### 2. 启动服务

```bash
cd wind/md-converter
pnpm install
pnpm run build
start.bat
```

服务运行在 http://localhost:3000

## API 接口

### POST /convert

上传文件并转换为 Markdown。

**请求**

- Content-Type: `multipart/form-data`
- 字段: `file` (文件)

**支持的文件类型**

- `.html`, `.htm` → HTML 文件
- `.docx` → Word 文档

**响应**

```json
{
  "success": true,
  "markdown": "# 标题\n\n内容...",
  "filename": "output.md",
  "images": [
    {
      "id": "img_0",
      "base64": "iVBOR...",
      "contentType": "image/png"
    }
  ]
}
```

**示例**

```bash
curl -X POST http://localhost:3000/convert -F "file=@document.docx"
```

### GET /health

健康检查接口。

**响应**

```json
{ "status": "ok" }
```

### POST /ai-format

上传 DOCX 文件，转换为 Markdown 并调用 Minimax AI 进行智能排版优化。

**请求**

- Content-Type: `multipart/form-data`
- 字段: `file` (文件，仅支持 .docx)

**响应**

```json
{
  "success": true,
  "markdown": "AI排版后的内容...",
  "filename": "AI排版-原始文件名.txt"
}
```

**流程**

1. 解析 DOCX 文件，提取文本和图片
2. 上传图片到 GitHub 图床
3. 将内容发送给 Minimax AI (使用 system_prompt.md 中的排版规则)
4. 返回 AI 排版后的 Markdown

**示例**

```bash
curl -X POST http://localhost:3000/ai-format -F "file=@document.docx"
```

## 环境变量

| 变量 | 说明 | 示例 |
|------|------|------|
| `GITHUB_TOKEN` | GitHub Personal Access Token | `github_pat_xxx` |
| `GITHUB_REPO` | 仓库名 (owner/repo) | `kgipsonmymail/image-home` |
| `GITHUB_BRANCH` | 分支名 | `main` |
| `GITHUB_DIR` | 图片存储目录 | `wind-assets` |
| `MINIMAX_API_KEY` | Minimax API Key | `xxx.dcbaj...` |
| `MINIMAX_ENDPOINT` | Minimax API 地址 | `https://open.bigmodel.cn/api/paas/v4/chat/completions` |
| `MINIMAX_MODEL` | 模型名称 | `glm-4-flash-250414` |

## 项目结构

```
wind/md-converter/
├── src/
│   ├── index.ts              # 服务入口
│   ├── types.ts              # 类型定义
│   ├── converters/
│   │   ├── html.ts           # HTML 转换器
│   │   └── docx.ts           # DOCX 转换器
│   ├── routes/
│   │   ├── convert.ts        # 转换路由
│   │   └── ai-format.ts      # AI 排版路由
│   └── services/
│       ├── github-image-host.ts  # GitHub 图床
│       └── minimax-formatter.ts  # Minimax AI 排版服务
├── tests/
│   └── test_ai_format.py     # 测试脚本
├── .env                      # 环境变量
├── start.bat                 # 启动脚本
├── README.md
├── package.json
└── tsconfig.json
```

## 图片上传说明

对于 DOCX 文件，转换流程：

1. 使用 mammoth 提取文档内容和图片（base64 格式）
2. 调用 GitHub API 上传图片到指定仓库
3. 返回 CDN URL 并替换 markdown 中的 base64 图片
4. 图片路径格式: `{GITHUB_DIR}/年/月/{hash}.{ext}`

GitHub Token 需要以下权限:
- `repo` (完整仓库访问)
- 或 `workflow` + `write:packages`