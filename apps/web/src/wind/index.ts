/**
 * Wind 中间件系统 - 入口文件
 * 提供统一的 API 接口
 */

import type { AIFormatterConfig, GitHubConfig, HtmlParseOptions, ProcessOptions } from './types'
import { AIFormatter } from './core/ai-formatter'
import { WindProcessor } from './core/wind-processor'
import { GitHubImageHost } from './services/github-image-host'

export * from './core/ai-formatter'
export * from './core/document-parser'
export * from './core/image-manager'
export * from './core/wind-processor'
export * from './services/github-image-host'
export * from './types'
export * from './utils/file-utils'

/**
 * 创建 Wind 处理器实例
 */
export function createWindProcessor(
  githubConfig: GitHubConfig,
  aiConfig?: AIFormatterConfig,
) {
  const imageHost = new GitHubImageHost(githubConfig)
  const aiFormatter = aiConfig ? new AIFormatter(aiConfig) : undefined

  return new WindProcessor(imageHost, aiFormatter)
}

/**
 * 快速处理 .docx 文件
 */
export async function processDocxFile(
  file: File,
  githubConfig: GitHubConfig,
  aiConfig?: AIFormatterConfig,
  options: ProcessOptions = {
    uploadImages: true,
    formatContent: true,
    preserveOriginal: true,
  },
) {
  const processor = createWindProcessor(githubConfig, aiConfig)
  return await processor.processDocx(file, options)
}

/**
 * 快速处理文本 + 图片
 */
export async function processTextWithImages(
  text: string,
  images: File[],
  githubConfig: GitHubConfig,
  aiConfig?: AIFormatterConfig,
  options: ProcessOptions = {
    uploadImages: true,
    formatContent: true,
    preserveOriginal: true,
  },
) {
  const processor = createWindProcessor(githubConfig, aiConfig)
  return await processor.processTextWithImages(text, images, options)
}

/**
 * 快速处理 HTML 字符串
 */
export async function processHtmlContent(
  html: string,
  githubConfig: GitHubConfig,
  aiConfig?: AIFormatterConfig,
  options: ProcessOptions & { htmlOptions?: HtmlParseOptions } = {
    uploadImages: true,
    formatContent: true,
    preserveOriginal: true,
    htmlOptions: {
      preserveImages: true,
      extractTitle: true,
      cleanupStyles: true,
    },
  },
) {
  const processor = createWindProcessor(githubConfig, aiConfig)
  return await processor.processHtml(html, options)
}

/**
 * 默认配置
 */
export const defaultConfig = {
  github: {
    token: '',
    owner: '',
    repo: '',
    branch: 'main',
    path: 'wind-assets',
    useCDN: true,
  } as GitHubConfig,

  ai: {
    provider: 'openai' as const,
    apiEndpoint: 'https://api.openai.com/v1/chat/completions',
    apiKey: '',
    model: 'gpt-4',
    temperature: 0.7,
    prompt: `你是一个专业的公众号文章排版助手。请根据以下 Markdown 语法规则，对文章进行排版优化：

1. 使用合适的标题层级（# ## ###）
2. 重要内容使用加粗或引用块
3. 列表使用有序或无序列表
4. 代码使用代码块
5. 图片添加合适的描述文字
6. 保持段落简洁，适当分段
7. 关键信息使用高亮或强调

请保持原文的核心内容不变，只优化排版格式。`,
  } as AIFormatterConfig,
}
