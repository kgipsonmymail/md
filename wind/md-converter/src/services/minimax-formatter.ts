import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

export interface MinimaxConfig {
  apiKey: string
  endpoint: string
  model: string
}

export class MinimaxFormatter {
  private config: MinimaxConfig
  private promptPath: string

  constructor() {
    this.config = {
      apiKey: process.env.MINIMAX_API_KEY || '',
      endpoint: process.env.MINIMAX_ENDPOINT || 'https://api.bigmodel.cn/api/paas/v4/chat/completions',
      model: process.env.MINIMAX_MODEL || 'glm-4-flash-250414',
    }
    this.promptPath = resolve(process.cwd(), 'prompts/formatting-prompt.md')
  }

  async format(content: string): Promise<string> {
    const cleanedContent = this.removeImageBase64(content)
    const systemPrompt = this.loadSystemPrompt()

    const response = await fetch(this.config.endpoint, {
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
            content: `请对以下文章进行排版优化，只返回排版后的 Markdown 内容，不要包裹在代码块中：\n\n${cleanedContent}`,
          },
        ],
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(300000),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }))
      throw new Error(`Minimax API 调用失败: ${error.message || response.statusText}`)
    }

    const data = await response.json()
    let result = data.choices[0].message.content

    // 移除 markdown 代码块包裹
    const markdownBlockRegex = /^```markdown\s*\n([\s\S]*?)\n```$/i
    const match = result.match(markdownBlockRegex)
    if (match) {
      result = match[1].trim()
    } else {
      // 尝试更简单的模式
      result = result.replace(/^```markdown\s*/i, '').replace(/\s*```$/i, '').trim()
    }

    return result
  }

  async formatWithRetry(content: string, count: number = 2): Promise<string[]> {
    const results: string[] = []
    for (let i = 0; i < count; i++) {
      console.log(`Formatting attempt ${i + 1}/${count}...`)
      try {
        const result = await this.format(content)
        results.push(result)
      } catch (error) {
        console.error(`Attempt ${i + 1} failed:`, error)
      }
    }
    return results
  }

  private loadSystemPrompt(): string {
    try {
      if (existsSync(this.promptPath)) {
        console.log(`Loading prompt from: ${this.promptPath}`)
        return readFileSync(this.promptPath, 'utf-8')
      }
      console.log(`Prompt file not found at ${this.promptPath}, using default`)
    } catch (error) {
      console.error('Failed to load prompt file:', error)
    }
    return '请对文章进行 Markdown 排版优化，保留原文所有信息，使用丰富的 Markdown 语法提升可读性。'
  }

  private removeImageBase64(content: string): string {
    return content.replace(
      /!\[([^\]]*)\]\(data:image\/[^;]+;base64,[^)]+\)/g,
      (_, alt) => `![${alt || '图片'}](IMAGE_PLACEHOLDER)`,
    )
  }
}