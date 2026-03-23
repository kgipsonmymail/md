# Wind 项目目录结构

## 概述

Wind 是一个智能排版中间件，提供 AI 排版、图床集成、文档处理等功能。

## 目录结构

```
wind/
├── components/           # Vue 组件
│   ├── WindConfig.vue   # 配置界面组件
│   └── WindProcessor.vue # 主处理界面组件
├── config/              # 配置文件
│   ├── default.json     # 默认配置
│   └── index.ts        # 配置管理
├── core/               # 核心功能模块
│   ├── ai-formatter.ts # AI 排版引擎
│   ├── document-parser.ts # 文档解析器
│   ├── image-manager.ts # 图片管理器
│   └── wind-processor.ts # 主处理器
├── examples/           # 示例代码
│   ├── config.example.ts # 配置示例
│   └── integration.vue  # 集成示例
├── services/           # 外部服务
│   └── github-image-host.ts # GitHub 图床服务
├── stores/            # 状态管理
│   └── wind.ts       # Wind Store
├── types/            # TypeScript 类型定义
│   └── index.ts      # 类型定义
├── utils/            # 工具函数
│   └── file-utils.ts # 文件处理工具
├── docs/             # 文档目录
│   ├── 01-directory-structure.md # 目录结构（本文档）
│   ├── 02-features.md          # 功能模块清单
│   ├── 03-bug-troubleshooting.md # 错题本
│   ├── 04-prompts.md           # Prompt 提示词记录
│   ├── 05-README-summary.md    # README 精要
│   └── 06-code-standards.md   # 代码规范
├── ARCHITECTURE.md    # 架构文档
├── CHECKLIST.md       # 功能检查清单
├── INSTALLATION.md    # 安装指南
├── INTEGRATION_GUIDE.md # 集成指南
├── README.md         # 项目说明
├── START.md          # 快速开始
├── index.ts          # 主入口文件
└── package.json      # 包配置
```

## 核心模块说明

### components/

- **WindConfig.vue**: 提供用户配置界面，包括 AI 配置和 GitHub 图床配置
- **WindProcessor.vue**: 主处理界面，支持三种模式：上传 .docx、文本+图片、仅 AI 排版

### core/

- **ai-formatter.ts**: AI 排版引擎，调用 AI API 进行智能排版
- **document-parser.ts**: 文档解析器，支持 .docx 文件解析
- **image-manager.ts**: 图片管理器，处理图片上传和管理
- **wind-processor.ts**: 主处理器，协调各个模块完成整体流程

### services/

- **github-image-host.ts**: GitHub 图床服务，支持图片上传、云端判重、CDN 加速

### stores/

- **wind.ts**: Pinia Store，管理 Wind 模块的状态

### types/

- **index.ts**: TypeScript 类型定义，包括配置、结果、错误等类型

## 文档说明

所有文档位于 `docs/` 目录下，按功能分类：

1. **01-directory-structure.md**: 项目目录结构（本文档）
2. **02-features.md**: 已完成的功能模块清单
3. **03-bug-troubleshooting.md**: 开发过程中遇到的 bug 和解决方案
4. **04-prompts.md**: AI Prompt 提示词记录
5. **05-README-summary.md**: 项目精要说明
6. **06-code-standards.md**: 代码规范和开发标准

## 使用建议

- 新手：从 `README.md` 或 `START.md` 开始
- 集成开发：参考 `INTEGRATION_GUIDE.md`
- 功能开发：参考 `ARCHITECTURE.md` 和 `02-features.md`
- 问题排查：参考 `03-bug-troubleshooting.md`
- 代码规范：参考 `06-code-standards.md`
