import type { FormattingTemplate, FormattingTemplateCategory } from '@md/shared'
import { builtinFormattingTemplates, getDefaultFormattingTemplate } from '@md/shared/configs'
import { addPrefix } from '@/utils'
import { store } from '@/utils/storage'

/**
 * 排版模板 Store
 * 管理 AI 公众号排版的 system prompt 模板（内置 + 自定义）
 */
export const useFormattingTemplateStore = defineStore(`formattingTemplate`, () => {
  // ==================== 状态 ====================

  // 自定义模板列表（持久化到 localStorage）
  const customTemplates = store.reactive<FormattingTemplate[]>(
    addPrefix(`formatting_templates`),
    [],
  )

  // 当前选中的模板 ID
  const selectedTemplateId = store.reactive<string>(
    addPrefix(`selected_formatting_template`),
    `builtin-finance`,
  )

  // ==================== 计算属性 ====================

  /** 所有可用模板（内置 + 自定义） */
  const allTemplates = computed<FormattingTemplate[]>(() => [
    ...builtinFormattingTemplates,
    ...customTemplates.value,
  ])

  /** 当前选中的模板 */
  const selectedTemplate = computed<FormattingTemplate>(() => {
    return (
      allTemplates.value.find(t => t.id === selectedTemplateId.value)
      ?? getDefaultFormattingTemplate()
    )
  })

  /** 按分类分组的模板 */
  const templatesByCategory = computed(() => {
    const groups: Record<FormattingTemplateCategory, FormattingTemplate[]> = {
      finance: [],
      medicine: [],
      activity: [],
      personal: [],
      custom: [],
    }
    for (const t of allTemplates.value) {
      groups[t.category].push(t)
    }
    return groups
  })

  // ==================== 方法 ====================

  /** 选择模板 */
  function selectTemplate(id: string) {
    selectedTemplateId.value = id
  }

  /** 根据 ID 获取模板 */
  function getTemplateById(id: string): FormattingTemplate | undefined {
    return allTemplates.value.find(t => t.id === id)
  }

  /** 新增自定义模板 */
  function addCustomTemplate(params: {
    name: string
    systemPrompt: string
    description?: string
  }): FormattingTemplate {
    const newTemplate: FormattingTemplate = {
      id: `custom-${Date.now()}`,
      name: params.name,
      category: `custom`,
      systemPrompt: params.systemPrompt,
      description: params.description,
      isBuiltin: false,
    }
    customTemplates.value.push(newTemplate)
    toast.success(`排版模板「${params.name}」创建成功`)
    return newTemplate
  }

  /** 更新自定义模板 */
  function updateCustomTemplate(
    id: string,
    params: Partial<Pick<FormattingTemplate, 'name' | 'systemPrompt' | 'description'>>,
  ): boolean {
    const index = customTemplates.value.findIndex(t => t.id === id)
    if (index === -1) {
      toast.error(`模板不存在或为内置模板，无法修改`)
      return false
    }
    customTemplates.value[index] = { ...customTemplates.value[index], ...params }
    toast.success(`排版模板已更新`)
    return true
  }

  /** 删除自定义模板 */
  function deleteCustomTemplate(id: string): boolean {
    const index = customTemplates.value.findIndex(t => t.id === id)
    if (index === -1) {
      toast.error(`模板不存在或为内置模板，无法删除`)
      return false
    }
    const name = customTemplates.value[index].name
    customTemplates.value.splice(index, 1)

    // 如果删除的是当前选中的模板，回退到默认
    if (selectedTemplateId.value === id) {
      selectedTemplateId.value = `builtin-finance`
    }
    toast.success(`排版模板「${name}」已删除`)
    return true
  }

  return {
    // 状态
    customTemplates,
    selectedTemplateId,

    // 计算属性
    allTemplates,
    selectedTemplate,
    templatesByCategory,

    // 方法
    selectTemplate,
    getTemplateById,
    addCustomTemplate,
    updateCustomTemplate,
    deleteCustomTemplate,
  }
})
