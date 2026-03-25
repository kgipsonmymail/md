/**
 * 模板管理相关类型定义
 */

/**
 * 模板接口
 */
export interface Template {
  /** 模板唯一标识符 (UUID) */
  id: string
  /** 模板名称 */
  name: string
  /** 模板内容 (Markdown) */
  content: string
  /** 模板描述（可选） */
  description?: string
  /** 创建时间戳 */
  createdAt: number
  /** 最后修改时间戳 */
  updatedAt: number
  /** 模板标签（可选） */
  tags?: string[]
}

/**
 * 创建模板的参数
 */
export interface CreateTemplateParams {
  /** 模板名称 */
  name: string
  /** 模板内容 */
  content: string
  /** 模板描述（可选） */
  description?: string
  /** 模板标签（可选） */
  tags?: string[]
}

/**
 * 更新模板的参数
 */
export interface UpdateTemplateParams {
  /** 模板名称（可选） */
  name?: string
  /** 模板内容（可选） */
  content?: string
  /** 模板描述（可选） */
  description?: string
  /** 模板标签（可选） */
  tags?: string[]
}

/**
 * 排版模板分类
 */
export type FormattingTemplateCategory = 'finance' | 'medicine' | 'activity' | 'personal' | 'custom'

/**
 * AI 排版模板（用于公众号排版的 system prompt 模板）
 */
export interface FormattingTemplate {
  /** 模板唯一标识符 */
  id: string
  /** 模板名称 */
  name: string
  /** 模板分类 */
  category: FormattingTemplateCategory
  /** 完整的 system prompt 内容 */
  systemPrompt: string
  /** 模板描述（可选） */
  description?: string
  /** 是否为内置模板（内置模板不可删除） */
  isBuiltin: boolean
}
