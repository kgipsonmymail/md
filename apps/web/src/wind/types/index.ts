/**
 * Wind 中间件类型定义
 */

// 文档解析结果
export interface ParsedDocument {
  content: string // Markdown 文本
  images: ImageAsset[] // 图片资源
  metadata: DocumentMetadata // 元数据
}

// 图片资源
export interface ImageAsset {
  id: string // 唯一标识
  originalName: string // 原始文件名
  blob: Blob // 图片数据
  position: number // 在文档中的位置（字符索引）
  alt?: string // 替代文本
}

// 文档元数据
export interface DocumentMetadata {
  title?: string
  author?: string
  createdAt?: Date
  modifiedAt?: Date
}

// 图床配置
export interface ImageHostConfig {
  type: 'github' | 'custom'
  github?: GitHubConfig
}

// GitHub 图床配置
export interface GitHubConfig {
  token: string // Personal Access Token
  owner: string // 用户名
  repo: string // 仓库名
  branch: string // 分支名（默认 main）
  path: string // 存储路径（默认 images）
  useCDN: boolean // 是否使用 jsDelivr CDN
}

// 上传结果
export interface UploadResult {
  originalName: string
  url: string // 图片 URL
  cdnUrl?: string // CDN URL
  path: string // 在仓库中的路径
  sha: string // GitHub 文件 SHA
}

// AI 排版配置
export interface AIFormatterConfig {
  provider: 'openai' | 'dify' // API 提供商
  apiEndpoint: string // API 地址
  apiKey: string // API 密钥（OpenAI 使用）
  difyApiKey: string // Dify API 密钥（Dify 使用）
  model: string // 模型名称
  prompt: string // 系统提示词（仅 OpenAI 需要）
  temperature: number // 温度参数（仅 OpenAI 需要）
}

// 排版结果
export interface FormattedResult {
  markdown: string // 排版后的 Markdown
  html: string // 渲染后的 HTML
  changes: FormatChange[] // 变更记录
}

// 格式变更
export interface FormatChange {
  type: 'heading' | 'list' | 'blockquote' | 'code' | 'emphasis' | 'image'
  position: number
  original: string
  formatted: string
  reason: string
}

// 处理选项
export interface ProcessOptions {
  uploadImages: boolean // 是否上传图片
  formatContent: boolean // 是否 AI 排版
  preserveOriginal: boolean // 是否保留原文
}

// 处理结果
export interface ProcessResult {
  success: boolean
  markdown: string
  html: string
  images: UploadResult[]
  errors?: string[]
}

// Wind 完整配置
export interface WindConfig {
  github: GitHubConfig
  ai: AIFormatterConfig
}

// Wind 配置
export interface WindConfig {
  github: GitHubConfig
  ai: AIFormatterConfig
}
