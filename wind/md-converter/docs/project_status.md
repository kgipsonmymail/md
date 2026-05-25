# MD Converter 项目状态

## 一、项目概述

| 项目 | 位置 | 状态 |
|------|------|------|
| MD Converter (AI排版后端) | `wind/md-converter/` | ✅ 功能完成 |
| Allin (公众号发布前端) | `wind/allin/` | ❓ 源码丢失，需分析 |

## 二、MD Converter 完成状态

### 2.1 核心功能

| 功能 | 状态 | 说明 |
|------|------|------|
| HTML → Markdown | ✅ | `POST /convert` |
| DOCX → Markdown | ✅ | `POST /convert` |
| GitHub 图床上传 | ✅ | 自动上传图片到CDN |
| AI排版优化 | ✅ | `POST /text-format` |
| 提示词热重载 | ✅ | 无需重启服务 |

### 2.2 排版规则（已实现）

| 规则 | 实现 |
|------|------|
| 黄色导读背景框 | ✅ |
| 视频号二维码删除 | ✅ |
| 表格内图片拆解 | ✅ |
| 图片标题放alt text | ✅ |
| `**` 后加空格 | ✅ |
| 图片前2个换行 | ✅ |
| 三级标题 `### 3.1` | ✅ |
| 概率情景用表格 | ✅ |
| 风险提示3条 | ✅ |
| 底部图片在免责声明下方 | ✅ |

### 2.3 文件结构

```
wind/md-converter/
├── src/
│   ├── index.ts              # Fastify 服务入口
│   ├── types.ts              # 类型定义
│   ├── converters/           # 文件转换器
│   │   ├── html.ts
│   │   └── docx.ts
│   ├── routes/               # API 路由
│   │   ├── convert.ts        # POST /convert
│   │   ├── ai-format.ts      # POST /ai-format
│   │   ├── text-format.ts    # POST /text-format
│   │   └── dify.ts
│   └── services/
│       ├── github-image-host.ts
│       ├── minimax-formatter.ts
│       └── dify-formatter.ts
├── prompts/
│   ├── formatting-prompt.md  # AI排版提示词（主用）
│   └── system_prompt.md      # 系统提示词（原始）
├── tests/
│   ├── test_formatting_v2.py # 排版测试
│   └── ...
├── dist/                     # 编译产物
└── README.md
```

### 2.4 测试结果

- 测试脚本：`tests/test_formatting_v2.py`
- 最新结果：100% 相似度（两次生成结果一致）
- 测试输入：`wind/historyword/布伦特-WTI-清理后.md`
- 参考输出：`wind/historyword/参考结果.txt`

## 三、Allin 项目状态

### 3.1 现状分析

| 检查项 | 状态 | 证据 |
|--------|------|------|
| `package.json` | ❌ 不存在 | `npm error: Could not read package.json` |
| 源码目录 | ❌ 为空 | `wind/allin/wind/allin/src/utils/` 仅有一个空目录 |
| `dist/` 编译产物 | ✅ 存在 | 有 `index.html` 和 `assets/*.js` |
| `node_modules/` | ✅ 存在 | 有完整依赖 |
| `.env` | ✅ 存在 | 有 `ZHIPU_API_KEY` |

### 3.2 Git 历史检查

```bash
# 检查 allin 相关文件
git ls-files | Select-String -Pattern "allin"
# 结果：只有 wind/allin/goal.md 被跟踪

# 检查 git 提交历史
git log --all --oneline -- "wind/allin/**"
# 结果：
# 23e04a7 备份：添加PDF导入功能...
# 4a0bd98 backup-feat: Add analysis...
```

**结论**：`goal.md` 被 git 跟踪，但 `package.json` 和源代码从未被提交过。

### 3.3 项目目标

根据 `wind/allin/goal.md`:

```
从想法到公众号，全流程打通
1，我想发我写的想法
2，我想发我写的内容
3，ai 排版优化
4，预览并发到微信草稿箱
```

### 3.4 技术栈（从 node_modules 推断）

- **前端框架**: Vue 3
- **构建工具**: Vite
- **CSS**: Tailwind CSS 4
- **存储**: idb (IndexedDB)
- **文件处理**: jszip, file-saver

### 3.5 dist/index.html 内容

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>All In</title>
  <script type="module" crossorigin src="/assets/index-CchmJKW5.js"></script>
  <link rel="modulepreload" crossorigin href="/assets/chunk-DHx0Hwia.js">
  <link rel="stylesheet" crossorigin href="/assets/index-ewmRO8S5.css">
</head>
<body><div id="app"></div></body>
</html>
```

### 3.6 修复方案选项

#### 选项 A：反向工程恢复
- 从 `dist/assets/*.js` 反编译，了解功能
- 重新创建项目结构
- 风险：代码可能不完整或混淆

#### 选项 B：重新开发
- 根据 `goal.md` 的功能需求重新开发
- 利用 MD Converter 的 AI 排版能力
- 更可控，但需要更多时间

#### 选项 C：寻找备份
- 检查 OneDrive 其他位置是否有备份
- 用户确认是否有本地备份

## 四、下一步行动

### 4.1 MD Converter

1. 暂无阻塞问题
2. 可继续收集更多文章测试 AI 排版效果
3. 考虑添加缓存提高 AI 输出稳定性

### 4.2 Allin

1. **待用户决策**：选择哪种修复方案
2. 如果选择反向工程，需解压分析 `dist/assets/index-*.js`
3. 如果选择重新开发，可基于 MD Converter 的排版 API 构建

## 五、Handoff 信息

### MD Converter
- 提示词文件：`wind/md-converter/prompts/formatting-prompt.md`
- 修改后**无需重启**服务
- 测试：`python tests/test_formatting_v2.py`

### Allin
- 源码丢失，需用户确认处理方式
- 现有 dist 可运行 `npx serve dist`
- 依赖完整，package.json 缺失可手动创建