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

  // 服务类型（优先使用环境变量）
  const type = store.reactive<string>(`openai_type`, ENV_TYPE || DEFAULT_SERVICE_TYPE)

  // 温度参数（0-2，控制随机性）
  const temperature = store.reactive<number>(`openai_temperature`, DEFAULT_SERVICE_TEMPERATURE)

  // 最大 token 数
  const maxToken = store.reactive<number>(`openai_max_token`, DEFAULT_SERVICE_MAX_TOKEN)

  // ==================== 服务相关字段 ====================

  // 服务端点（优先使用环境变量，否则由 watch(type) 初始化）
  const endpoint = ref<string>(ENV_ENDPOINT || ``)

  // 模型名称（优先使用环境变量，否则由 watch(type) 初始化）
  const model = ref<string>(ENV_MODEL || ``)

  // ==================== API Key 管理 ====================

  // API Key（优先使用环境变量，否则按服务类型分别持久化）
  const apiKey = customRef<string>((track, trigger) => {
    let cachedKey = ENV_API_KEY || ``

    if (!ENV_API_KEY) {
      store.get(`openai_key_${type.value}`).then((value) => {
        cachedKey = value || DEFAULT_SERVICE_KEY
      })
    }

    return {
      get() {
        track()
        return cachedKey
      },
      set(val: string) {
        cachedKey = val
        trigger()

        if (!ENV_API_KEY && type.value !== DEFAULT_SERVICE_TYPE) {
          store.set(`openai_key_${type.value}`, val)
        }
      },
    }
  })

  // ==================== 响应式逻辑 ====================

  // 监听服务类型变化，自动同步端点和模型（仅在没有环境变量时生效）
  watch(
    type,
    async (newType) => {
      if (ENV_ENDPOINT && ENV_MODEL && ENV_API_KEY && ENV_TYPE) {
        return
      }

      const svc = serviceOptions.find(s => s.value === newType) ?? serviceOptions[0]

      if (!ENV_ENDPOINT) {
        endpoint.value = svc.endpoint
      }

      if (!ENV_MODEL) {
        const saved = await store.get(`openai_model_${newType}`) || ``
        model.value = svc.models.includes(saved) ? saved : svc.models[0]
        await store.set(`openai_model_${newType}`, model.value)
      }
    },
    { immediate: true },
  )

  // 监听模型变化，持久化存储（仅在没有环境变量时生效）
  watch(model, async (val) => {
    if (!ENV_MODEL) {
      await store.set(`openai_model_${type.value}`, val)
    }
  })

  // ==================== Actions ====================

  /**
   * 重置所有配置到默认值（优先恢复环境变量配置）
   */
  const reset = async () => {
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
