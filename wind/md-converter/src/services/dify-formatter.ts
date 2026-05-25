export interface DifyConfig {
  apiKey: string
  endpoint: string
}

export class DifyFormatter {
  private config: DifyConfig

  constructor() {
    this.config = {
      apiKey: process.env.DIFY_API_KEY || '',
      endpoint: process.env.DIFY_ENDPOINT || 'https://api.dify.ai/v1',
    }
  }

  async format(content: string): Promise<string> {
    let cleanedContent = this.removeImageBase64(content)

    // 限制内容长度，避免超出 Dify token 限制
    const maxLength = 100000
    if (cleanedContent.length > maxLength) {
      cleanedContent = cleanedContent.substring(0, maxLength) + '\n\n...[内容已截断]'
    }

    const url = `${this.config.endpoint}/chat-messages`

    console.log(`Calling Dify API...`)
    console.log(`Content length: ${cleanedContent.length}`)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        inputs: {},
        query: `请对以下文章进行排版优化：\n\n${cleanedContent}`,
        response_mode: 'blocking',
        conversation_id: '',
        user: 'md-converter',
        files: [],
      }),
      signal: AbortSignal.timeout(300000),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }))
      throw new Error(`Dify API 调用失败: ${error.message || response.statusText}`)
    }

    const data = await response.json()
    return data.answer
  }

  private removeImageBase64(content: string): string {
    return content.replace(
      /!\[([^\]]*)\]\(data:image\/[^;]+;base64,[^)]+\)/g,
      (_, alt) => `![${alt || '图片'}](IMAGE_PLACEHOLDER)`,
    )
  }
}