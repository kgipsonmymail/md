/**
 * AI 排版引擎
 * 使用 AI 对 Markdown 内容进行智能排版
 */

import type { AIFormatterConfig, FormatChange, FormattedResult } from '../types'

export class AIFormatter {
  private config: AIFormatterConfig

  constructor(config: AIFormatterConfig) {
    this.config = config
  }

  /**
   * 格式化 Markdown 内容
   */
  async format(content: string): Promise<FormattedResult> {
    try {
      // 调用 AI API
      const formattedMarkdown = await this.callAI(content)

      // 分析变更
      const changes = this.analyzeChanges(content, formattedMarkdown)

      return {
        markdown: formattedMarkdown,
        html: '', // 由渲染器生成
        changes,
      }
    }
    catch (error) {
      console.error('AI 排版失败:', error)
      throw error
    }
  }

  /**
   * 调用 AI API
   */
  private async callAI(content: string): Promise<string> {
    // 从外部文件读取系统提示词（仅 OpenAI 需要）
    let systemPrompt = this.config.prompt

    // 如果配置的提示词是文件路径，则从文件读取
    if (systemPrompt.startsWith('file://') || systemPrompt.startsWith('/')) {
      try {
        const filePath = systemPrompt.startsWith('file://')
          ? systemPrompt.replace('file://', '')
          : systemPrompt

        const response = await fetch(filePath)
        if (response.ok) {
          systemPrompt = await response.text()
        }
      }
      catch (error) {
        console.warn('无法从文件读取提示词，使用配置中的提示词:', error)
      }
    }

    // 根据不同的提供商调用不同的 API
    if (this.config.provider === 'dify') {
      return this.callDifyAPI(content)
    }
    else {
      return this.callOpenAIAPI(content, systemPrompt)
    }
  }

  /**
   * 调用 OpenAI 兼容 API
   */
  private async callOpenAIAPI(content: string, systemPrompt: string): Promise<string> {
    const apiResponse = await fetch(this.config.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: `请对以下文章进行排版优化：\n\n${content}`,
          },
        ],
        temperature: this.config.temperature,
      }),
    })

    if (!apiResponse.ok) {
      const error = await apiResponse.json()
      throw new Error(`AI API 调用失败: ${error.error?.message || apiResponse.statusText}`)
    }

    const data = await apiResponse.json()
    return data.choices[0].message.content
  }

  /**
   * 调用 Dify API
   */
  private async callDifyAPI(content: string): Promise<string> {
    // Dify 使用固定的 API 地址
    const difyApiEndpoint = 'https://api.dify.ai/v1'
    const url = `${difyApiEndpoint}/chat-messages`
    const apiKey = this.config.difyApiKey || this.config.apiKey

    // 移除图片的 base64 数据，只保留图片占位符
    // 避免因为图片数据过长导致超过 token 限制
    const cleanedContent = this.removeImageBase64(content)

    console.log(`📡 调用 Dify API...`)
    console.log(`   URL: ${url}`)
    console.log(`   API Key: ${apiKey.substring(0, 10)}...`)
    console.log(`   原始内容长度: ${content.length} 字符`)
    console.log(`   清理后内容长度: ${cleanedContent.length} 字符`)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        inputs: {},
        query: `请对以下文章进行排版优化：\n\n${cleanedContent}`,
        response_mode: 'blocking',
        conversation_id: '',
        user: 'wind-formatter',
        files: [],
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('❌ Dify API 调用失败:')
      console.error(`   状态码: ${response.status}`)
      console.error(`   错误信息:`, error)
      console.error(`   完整响应:`, JSON.stringify(error, null, 2))
      throw new Error(`Dify API 调用失败: ${error.message || response.statusText}`)
    }

    const data = await response.json()
    console.log('✅ Dify API 调用成功')
    console.log(`   返回内容长度: ${data.answer?.length || 0}`)
    return data.answer
  }

  /**
   * 移除图片的 base64 数据，只保留图片占位符
   */
  private removeImageBase64(content: string): string {
    // 替换 base64 图片为简单的占位符
    return content.replace(
      /!\[([^\]]*)\]\(data:image\/[^;]+;base64,[^)]+\)/g,
      (_, alt) => `![${alt || '图片'}](IMAGE_PLACEHOLDER)`,
    )
  }

  /**
   * 分析内容变更
   */
  private analyzeChanges(original: string, formatted: string): FormatChange[] {
    const changes: FormatChange[] = []

    // 简单的变更检测（可以使用 diff 库进行更精确的分析）
    const originalLines = original.split('\n')
    const formattedLines = formatted.split('\n')

    let position = 0
    for (let i = 0; i < Math.max(originalLines.length, formattedLines.length); i++) {
      const origLine = originalLines[i] || ''
      const formLine = formattedLines[i] || ''

      if (origLine !== formLine) {
        const changeType = this.detectChangeType(origLine, formLine)
        if (changeType) {
          changes.push({
            type: changeType,
            position,
            original: origLine,
            formatted: formLine,
            reason: this.getChangeReason(changeType),
          })
        }
      }

      position += origLine.length + 1 // +1 for newline
    }

    return changes
  }

  /**
   * 检测变更类型
   */
  private detectChangeType(_original: string, formatted: string): FormatChange['type'] | null {
    if (/^#{1,6}\s/.test(formatted))
      return 'heading'
    if (/^[-*+]\s/.test(formatted) || /^\d+\.\s/.test(formatted))
      return 'list'
    if (/^>\s/.test(formatted))
      return 'blockquote'
    if (formatted.startsWith('```'))
      return 'code'
    if (/\*\*.*\*\*/.test(formatted) || /_.*_/.test(formatted))
      return 'emphasis'
    if (/!\[.*\]\(.*\)/.test(formatted))
      return 'image'

    return null
  }

  /**
   * 获取变更原因
   */
  private getChangeReason(type: FormatChange['type']): string {
    const reasons: Record<FormatChange['type'], string> = {
      heading: '优化标题层级',
      list: '转换为列表格式',
      blockquote: '添加引用块强调',
      code: '格式化代码块',
      emphasis: '添加强调标记',
      image: '优化图片描述',
    }
    return reasons[type]
  }

  /**
   * 批量格式化（用于处理长文档）
   */
  async formatInChunks(content: string, chunkSize: number = 2000): Promise<FormattedResult> {
    const chunks = this.splitIntoChunks(content, chunkSize)
    const formattedChunks: string[] = []
    const allChanges: FormatChange[] = []

    for (const chunk of chunks) {
      const result = await this.format(chunk)
      formattedChunks.push(result.markdown)
      allChanges.push(...result.changes)
    }

    return {
      markdown: formattedChunks.join('\n\n'),
      html: '',
      changes: allChanges,
    }
  }

  /**
   * 将内容分割成块
   */
  private splitIntoChunks(content: string, chunkSize: number): string[] {
    const chunks: string[] = []
    const paragraphs = content.split('\n\n')

    let currentChunk = ''
    for (const para of paragraphs) {
      if (currentChunk.length + para.length > chunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk)
        currentChunk = para
      }
      else {
        currentChunk += (currentChunk ? '\n\n' : '') + para
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk)
    }

    return chunks
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<AIFormatterConfig>) {
    this.config = { ...this.config, ...config }
  }
}
