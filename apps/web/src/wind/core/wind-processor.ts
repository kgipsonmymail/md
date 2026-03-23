/**
 * Wind 处理器 - 核心流程编排
 * 整合文档解析、图片上传、AI 排版等功能
 */

import type { GitHubImageHost } from '../services/github-image-host'
import type { ProcessOptions, ProcessResult } from '../types'
import type { AIFormatter } from './ai-formatter'
import { DocumentParser } from './document-parser'
import { ImageManager } from './image-manager'

export class WindProcessor {
  private parser: DocumentParser
  private imageManager: ImageManager
  private aiFormatter: AIFormatter | null = null

  constructor(
    imageHost: GitHubImageHost,
    aiFormatter?: AIFormatter,
  ) {
    this.parser = new DocumentParser()
    this.imageManager = new ImageManager(imageHost)
    this.aiFormatter = aiFormatter || null
  }

  /**
   * 处理 .docx 文件
   */
  async processDocx(file: File, options: ProcessOptions): Promise<ProcessResult> {
    try {
      console.log('📄 开始解析文档...')
      // 1. 解析文档
      const parsed = await this.parser.parseDocx(file)
      console.log(`✅ 文档解析完成，提取到 ${parsed.images.length} 张图片`)

      // 2. 上传图片
      let uploadResults = []
      if (options.uploadImages && parsed.images.length > 0) {
        console.log('📤 开始上传图片...')
        const results = await this.imageManager.uploadImages(parsed.images)
        uploadResults = Array.from(results.values())
        console.log(`✅ 图片上传完成，共 ${uploadResults.length} 张`)

        // 替换图片 URL
        parsed.content = this.imageManager.replaceImageUrls(parsed.content, parsed.images)
      }

      // 3. AI 排版
      let finalMarkdown = parsed.content
      if (options.formatContent && this.aiFormatter) {
        console.log('🤖 开始 AI 排版...')
        const formatted = await this.aiFormatter.format(parsed.content)
        finalMarkdown = formatted.markdown
        console.log(`✅ AI 排版完成，应用了 ${formatted.changes.length} 处修改`)
      }

      return {
        success: true,
        markdown: finalMarkdown,
        html: '', // 由外部渲染器生成
        images: uploadResults,
      }
    }
    catch (error) {
      console.error('❌ 处理失败:', error)
      return {
        success: false,
        markdown: '',
        html: '',
        images: [],
        errors: [(error as Error).message],
      }
    }
  }

  /**
   * 处理纯文本 + 图片文件
   */
  async processTextWithImages(
    text: string,
    imageFiles: File[],
    options: ProcessOptions,
  ): Promise<ProcessResult> {
    try {
      console.log('📝 开始处理文本和图片...')

      // 1. 解析文本和图片
      const parsed = await this.parser.parseTextWithImages(text, imageFiles)
      console.log(`✅ 解析完成，共 ${parsed.images.length} 张图片`)

      // 2. 在文本中插入图片占位符
      let content = this.parser.insertImagePlaceholders(parsed.content, parsed.images)

      // 3. AI 排版（在上传图片之前）
      if (options.formatContent && this.aiFormatter) {
        console.log('🤖 开始 AI 排版...')
        const formatted = await this.aiFormatter.format(content)
        content = formatted.markdown
        console.log(`✅ AI 排版完成`)
      }

      // 4. 上传图片
      let uploadResults = []
      if (options.uploadImages && parsed.images.length > 0) {
        console.log('📤 开始上传图片...')
        const results = await this.imageManager.uploadImages(parsed.images)
        uploadResults = Array.from(results.values())
        console.log(`✅ 图片上传完成`)

        // 替换占位符为实际 URL
        content = this.imageManager.replaceImageUrls(content, parsed.images)
      }

      return {
        success: true,
        markdown: content,
        html: '',
        images: uploadResults,
      }
    }
    catch (error) {
      console.error('❌ 处理失败:', error)
      return {
        success: false,
        markdown: '',
        html: '',
        images: [],
        errors: [(error as Error).message],
      }
    }
  }

  /**
   * 仅进行 AI 排版（不处理图片）
   */
  async formatOnly(content: string): Promise<ProcessResult> {
    if (!this.aiFormatter) {
      return {
        success: false,
        markdown: content,
        html: '',
        images: [],
        errors: ['AI 排版器未配置'],
      }
    }

    try {
      console.log('🤖 开始 AI 排版...')
      const formatted = await this.aiFormatter.format(content)

      return {
        success: true,
        markdown: formatted.markdown,
        html: '',
        images: [],
      }
    }
    catch (error) {
      console.error('❌ AI 排版失败:', error)
      return {
        success: false,
        markdown: content,
        html: '',
        images: [],
        errors: [(error as Error).message],
      }
    }
  }

  /**
   * 仅上传图片（不进行 AI 排版）
   */
  async uploadImagesOnly(content: string, imageFiles: File[]): Promise<ProcessResult> {
    try {
      console.log('📤 开始上传图片...')

      const parsed = await this.parser.parseTextWithImages(content, imageFiles)
      const results = await this.imageManager.uploadImages(parsed.images)
      const uploadResults = Array.from(results.values())

      // 在内容末尾添加图片链接
      let finalContent = content
      uploadResults.forEach((result, index) => {
        const imageUrl = result.cdnUrl || result.url
        finalContent += `\n\n![图片${index + 1}](${imageUrl})`
      })

      return {
        success: true,
        markdown: finalContent,
        html: '',
        images: uploadResults,
      }
    }
    catch (error) {
      console.error('❌ 上传失败:', error)
      return {
        success: false,
        markdown: content,
        html: '',
        images: [],
        errors: [(error as Error).message],
      }
    }
  }

  /**
   * 获取处理统计
   */
  getStats() {
    return {
      images: this.imageManager.getUploadStats(),
    }
  }
}
