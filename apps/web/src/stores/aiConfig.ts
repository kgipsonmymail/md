import { serviceOptions } from '@md/shared/configs'
import {
  DEFAULT_SERVICE_KEY,
  DEFAULT_SERVICE_MAX_TOKEN,
  DEFAULT_SERVICE_TEMPERATURE,
  DEFAULT_SERVICE_TYPE,
} from '@md/shared/constants'
import { store } from '@/utils/storage'

const ENV_ENDPOINT = import.meta.env.VITE_DEFAULT_AI_ENDPOINT || ``
const ENV_MODEL = import.meta.env.VITE_DEFAULT_AI_MODEL || ``
const ENV_API_KEY = import.meta.env.VITE_DEFAULT_AI_API_KEY || ``
const ENV_TYPE = import.meta.env.VITE_DEFAULT_AI_TYPE || ``

/**
 * AI 配置 Store
 * 负责管理 AI 服务的配置，包括服务类型、模型、温度等参数
 */
export const useAIConfigStore = defineStore(`AIConfig`, () => {
  // ==================== 全局配置 ====================

  // 是否使用自定义配置（持久化）
  const useCustom = store.reactive<boolean>(`openai_use_custom`, false)

  // 服务类型（优先使用环境变量，除非开启自定义）
  const type = store.reactive<string>(`openai_type`, ENV_TYPE || DEFAULT_SERVICE_TYPE)

  // 温度参数（0-2，控制随机性）
  const temperature = store.reactive<number>(`openai_temperature`, DEFAULT_SERVICE_TEMPERATURE)

  // 最大 token 数
  const maxToken = store.reactive<number>(`openai_max_token`, DEFAULT_SERVICE_MAX_TOKEN)

  // ==================== 服务相关字段 ====================

  // 服务端点
  const endpoint = ref<string>(ENV_ENDPOINT || ``)

  // 模型名称
  const model = ref<string>(ENV_MODEL || ``)

  // ==================== API Key 管理 ====================

  // API Key
  const apiKey = customRef<string>((track, trigger) => {
    let cachedKey = (useCustom.value ? `` : ENV_API_KEY) || ``

    const loadKey = async () => {
      const value = await store.get(`openai_key_${type.value}`)
      cachedKey = value || (useCustom.value ? `` : (ENV_API_KEY || DEFAULT_SERVICE_KEY))
      trigger()
    }

    loadKey()

    return {
      get() {
        track()
        return cachedKey
      },
      set(val: string) {
        cachedKey = val
        trigger()

        if (type.value !== DEFAULT_SERVICE_TYPE) {
          store.set(`openai_key_${type.value}`, val)
        }
      },
    }
  })

  // ==================== 响应式逻辑 ====================

  // 监听服务类型/自定义状态变化，同步端点和模型
  watch(
    [type, useCustom],
    async ([newType, isCustom]) => {
      // 如果没有开启自定义且所有环境变量都存在，则锁定为环境配置
      if (!isCustom && ENV_ENDPOINT && ENV_MODEL && ENV_API_KEY && ENV_TYPE) {
        endpoint.value = ENV_ENDPOINT
        model.value = ENV_MODEL
        return
      }

      const svc = serviceOptions.find(s => s.value === newType) ?? serviceOptions[0]

      // 同步端点
      if (isCustom || !ENV_ENDPOINT) {
        endpoint.value = svc.endpoint
      }
      else {
        endpoint.value = ENV_ENDPOINT
      }

      // 同步模型
      if (isCustom || !ENV_MODEL) {
        const saved = await store.get(`openai_model_${newType}`) || ``
        model.value = svc.models.includes(saved) ? saved : svc.models[0]
        await store.set(`openai_model_${newType}`, model.value)
      }
      else {
        model.value = ENV_MODEL
      }
    },
    { immediate: true },
  )

  // 监听模型变化，持久化存储（仅在自定义模式或没有环境模型时生效）
  watch(model, async (val) => {
    if (useCustom.value || !ENV_MODEL) {
      await store.set(`openai_model_${type.value}`, val)
    }
  })

  // ==================== Actions ====================

  /**
   * 重置所有配置到默认值（优先恢复环境变量配置）
   */
  const reset = async () => {
    useCustom.value = false
    type.value = ENV_TYPE || DEFAULT_SERVICE_TYPE
    temperature.value = DEFAULT_SERVICE_TEMPERATURE
    maxToken.value = DEFAULT_SERVICE_MAX_TOKEN

    if (ENV_ENDPOINT) {
      endpoint.value = ENV_ENDPOINT
    }
    if (ENV_MODEL) {
      model.value = ENV_MODEL
    }

    // 清理所有服务相关的持久化数据
    await Promise.all(
      serviceOptions.map(async ({ value }) => {
        await store.remove(`openai_key_${value}`)
        await store.remove(`openai_model_${value}`)
      }),
    )
  }

  return {
    // State
    useCustom,
    type,
    endpoint,
    model,
    temperature,
    maxToken,
    apiKey,

    // Actions
    reset,
  }
})

// 默认导出（向后兼容）
export default useAIConfigStore
