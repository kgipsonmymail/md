# MD Converter 项目进展文档

## 项目概述

后端服务，提供文档转换和 AI 排版功能。

## 项目位置

```
wind/md-converter/
```

## 已实现功能

### 1. POST /convert
- 上传 DOCX/HTML 文件
- 转换为 Markdown
- 图片自动上传 GitHub 图床，返回 CDN URL

### 2. POST /ai-format
- 上传 DOCX 文件
- 转换为 Markdown + 图片上传 + Minimax AI 排版
- 返回排版后的内容

### 3. POST /text-format
- 直接接收文本内容进行 AI 排版
- 便于调试排版效果

## 技术栈

- **框架**: Fastify (Node.js)
- **DOCX 解析**: mammoth
- **HTML 解析**: jsdom
- **图片上传**: GitHub API
- **AI 排版**: Minimax (glm-4-flash-250414)

## 环境变量 (.env)

```env
GITHUB_TOKEN=github_pat_...
GITHUB_REPO=kgipsonmymail/image-home
GITHUB_BRANCH=main
GITHUB_DIR=wind-assets

MINIMAX_API_KEY=91308d65d1b842319e98542b7e1a85df.DCbajDVMDVPeNwA4
MINIMAX_ENDPOINT=https://open.bigmodel.cn/api/paas/v4/chat/completions
MINIMAX_MODEL=glm-4-flash-250414
```

## 启动方式

```bash
cd wind/md-converter
pnpm install  # 首次
pnpm run build
start.bat
```

服务运行在 http://localhost:3000

## 项目结构

```
wind/md-converter/
├── src/
│   ├── index.ts
│   ├── types.ts
│   ├── converters/
│   │   ├── html.ts
│   │   └── docx.ts
│   ├── routes/
│   │   ├── convert.ts
│   │   ├── ai-format.ts
│   │   └── text-format.ts
│   └── services/
│       ├── github-image-host.ts
│       └── minimax-formatter.ts
├── tests/
│   └── test_text_format.py
├── prompts/                    # AI 提示词目录
│   └── formatting-prompt.md   # 排版提示词
├── README.md
├── .env
├── start.bat
├── package.json
└── tsconfig.json
```

## 外部文件

- `wind/system_prompt.md` - AI 排版提示词（原始）

## 状态

🟢 功能开发完成，进入效果优化阶段