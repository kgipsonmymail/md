/**
 * Wind 配置管理
 */

import type { AIFormatterConfig, GitHubConfig } from '../types'

export interface WindConfig {
  github: GitHubConfig
  ai: AIFormatterConfig
}

/**
 * 从环境变量读取默认配置
 */
const ENV_IMAGE_HOST: string = ''

let envGitHubConfig: GitHubConfig = {
  token: '',
  owner: '',
  repo: '',
  branch: 'main',
  path: 'wind-assets',
  useCDN: true,
}

if (ENV_IMAGE_HOST) {
  const parts = ENV_IMAGE_HOST.split(';')
  if (parts.length >= 5) {
    envGitHubConfig = {
      token: parts[0] || '',
      owner: parts[1] || '',
      repo: parts[2] || '',
      branch: parts[3] || 'main',
      path: parts[4] || 'wind-assets',
      useCDN: true,
    }
  }
}

/**
 * 默认配置
 */
export const defaultWindConfig: WindConfig = {
  github: envGitHubConfig,
  ai: {
    provider: 'openai',
    apiEndpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    apiKey: '',
    difyApiKey: '',
    model: 'glm-4.6v',
    temperature: 0.7,
    prompt: `你是一个专业的公众号文章排版助手。请根据以下 Markdown 语法规则，对文章进行排版优化：

1. 使用合适的标题层级（# ## ###）
2. 重要内容使用加粗或引用块
3. 列表使用有序或无序列表
4. 代码使用代码块
5. 图片添加合适的描述文字
6. 保持段落简洁，适当分段
7. 关键信息使用高亮或强调

请保持原文的核心内容不变，只优化排版格式。输出纯 Markdown 格式，不要添加任何解释。`,
  },
}

/**
 * 配置存储键
 */
const STORAGE_KEY = 'wind_config'

/**
 * 加载配置
 */
export function loadWindConfig(): WindConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const config = JSON.parse(stored)

      // 深度合并配置：如果存储的值为空字符串且默认值不为空，则保留默认值
      // 这里的目的是防止 .env 中的变量被 LocalStorage 里的空字符串覆盖
      const mergeConfig = (target: any, source: any) => {
        const result = { ...target }
        for (const key in source) {
          if (source[key] !== undefined && source[key] !== null && source[key] !== '') {
            result[key] = source[key]
          }
        }
        return result
      }

      return {
        github: mergeConfig(defaultWindConfig.github, config.github),
        ai: mergeConfig(defaultWindConfig.ai, config.ai),
      }
    }
  }
  catch (error) {
    console.warn('加载配置失败:', error)
  }
  return { ...defaultWindConfig }
}

/**
 * 保存配置
 */
export function saveWindConfig(config: WindConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  }
  catch (error) {
    console.error('保存配置失败:', error)
    throw error
  }
}

/**
 * 验证 GitHub 配置
 */
export function validateGitHubConfig(config: GitHubConfig): string[] {
  const errors: string[] = []

  if (ENV_IMAGE_HOST) {
    return errors
  }

  if (!config.token) {
    errors.push('GitHub Token 不能为空')
  }
  if (!config.owner) {
    errors.push('GitHub 用户名不能为空')
  }
  if (!config.repo) {
    errors.push('仓库名不能为空')
  }
  if (!config.branch) {
    errors.push('分支名不能为空')
  }

  return errors
}

/**
 * 验证 AI 配置
 */
export function validateAIConfig(config: AIFormatterConfig): string[] {
  const errors: string[] = []

  const hasEnvAI = !!(
    import.meta.env.VITE_DEFAULT_AI_ENDPOINT
      && import.meta.env.VITE_DEFAULT_AI_API_KEY
      && import.meta.env.VITE_DEFAULT_AI_MODEL
  )

  if (hasEnvAI) {
    return errors
  }

  if (!config.apiEndpoint) {
    errors.push('API 地址不能为空')
  }
  if (!config.apiKey) {
    errors.push('API 密钥不能为空')
  }

  // OpenAI 需要模型和温度参数
  if (config.provider === 'openai') {
    if (!config.model) {
      errors.push('模型名称不能为空')
    }
  }

  return errors
}

/**
 * 验证完整配置
 */
export function validateWindConfig(config: WindConfig): {
  valid: boolean
  errors: string[]
} {
  const errors = [
    ...validateGitHubConfig(config.github),
    ...validateAIConfig(config.ai),
  ]

  return {
    valid: errors.length === 0,
    errors,
  }
}
