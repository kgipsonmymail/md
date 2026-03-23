/**
 * Wind 中间件配置示例
 * 复制此文件为 config.ts 并填入你的配置
 */

import type { WindConfig } from '../types'

export const windConfig: WindConfig = {
  // GitHub 图床配置
  github: {
    // Personal Access Token (需要 repo 权限)
    // 获取地址: https://github.com/settings/tokens
    token: 'ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',

    // GitHub 用户名
    owner: 'your-username',

    // 仓库名（建议创建专门的图床仓库）
    repo: 'image-hosting',

    // 分支名
    branch: 'main',

    // 图片存储路径（会自动按年月组织）
    // 最终路径: wind-assets/2024/01/image.png
    path: 'wind-assets',

    // 是否使用 jsDelivr CDN 加速
    // 开启后图片 URL 格式: https://cdn.jsdelivr.net/gh/user/repo@main/path
    useCDN: true,
  },

  // AI 排版配置
  ai: {
    // API 地址
    // OpenAI: https://api.openai.com/v1/chat/completions
    // Azure: https://your-resource.openai.azure.com/openai/deployments/your-deployment/chat/completions?api-version=2023-05-15
    apiEndpoint: 'https://api.openai.com/v1/chat/completions',

    // API 密钥
    apiKey: 'sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',

    // 模型名称
    // OpenAI: gpt-4, gpt-4-turbo, gpt-3.5-turbo
    // Azure: 你的部署名称
    model: 'gpt-4',

    // 温度参数 (0-2)
    // 0.3-0.5: 更保守，适合技术文档
    // 0.7-0.9: 更有创意，适合营销文案
    temperature: 0.7,

    // 系统提示词
    prompt: `你是一个专业的公众号文章排版助手。请根据以下 Markdown 语法规则，对文章进行排版优化：

1. 标题层级：
   - 使用 # 表示一级标题（文章标题）
   - 使用 ## 表示二级标题（章节标题）
   - 使用 ### 表示三级标题（小节标题）
   - 避免使用四级及以下标题

2. 强调格式：
   - 重要概念使用 **加粗**
   - 关键数据使用 **加粗** 或 > 引用块
   - 专业术语使用 \`代码格式\`
   - 避免过度使用强调

3. 列表使用：
   - 并列内容使用无序列表（- 或 *）
   - 步骤流程使用有序列表（1. 2. 3.）
   - 复杂结构使用嵌套列表
   - 列表项保持简洁

4. 段落优化：
   - 每段控制在 3-5 行
   - 长段落适当拆分
   - 段落之间空一行
   - 避免单句成段

5. 图片处理：
   - 保持原有图片位置
   - 添加描述性 alt 文本
   - 图片前后各空一行

6. 代码块：
   - 使用 \`\`\` 包裹代码
   - 指定语言类型
   - 添加注释说明

7. 引用块：
   - 重要观点使用 > 引用
   - 数据统计使用引用块
   - 避免过长的引用

8. 其他规则：
   - 保持原文核心内容不变
   - 不添加原文没有的内容
   - 不删除重要信息
   - 统一标点符号（中文使用中文标点）

输出纯 Markdown 格式，不要添加任何解释或说明。`,
  },
}

// 不同场景的配置示例

// 1. 技术文档配置
export const techDocConfig: WindConfig = {
  github: windConfig.github,
  ai: {
    ...windConfig.ai,
    temperature: 0.3,
    prompt: `你是技术文档排版助手。要求：
1. 保持技术术语准确性
2. 代码块必须指定语言
3. 使用有序列表描述步骤
4. 重要概念使用加粗
5. 警告信息使用引用块
输出纯 Markdown，不添加解释。`,
  },
}

// 2. 营销文案配置
export const marketingConfig: WindConfig = {
  github: windConfig.github,
  ai: {
    ...windConfig.ai,
    temperature: 0.8,
    prompt: `你是营销文案排版助手。要求：
1. 标题要有吸引力
2. 关键卖点使用加粗
3. 数据使用引用块突出
4. 适当使用列表增强可读性
5. 段落简短有力
输出纯 Markdown，不添加解释。`,
  },
}

// 3. 新闻资讯配置
export const newsConfig: WindConfig = {
  github: windConfig.github,
  ai: {
    ...windConfig.ai,
    temperature: 0.5,
    prompt: `你是新闻资讯排版助手。要求：
1. 标题简洁明了
2. 重要信息前置
3. 引用原文使用引用块
4. 时间地点使用加粗
5. 保持客观中立
输出纯 Markdown，不添加解释。`,
  },
}

// 4. 教程指南配置
export const tutorialConfig: WindConfig = {
  github: windConfig.github,
  ai: {
    ...windConfig.ai,
    temperature: 0.4,
    prompt: `你是教程指南排版助手。要求：
1. 使用有序列表描述步骤
2. 每步骤配图说明
3. 注意事项使用引用块
4. 关键操作使用加粗
5. 代码示例使用代码块
输出纯 Markdown，不添加解释。`,
  },
}
