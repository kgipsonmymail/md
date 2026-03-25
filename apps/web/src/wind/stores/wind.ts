/**
 * Wind 中间件 Store
 */

import type { ProcessOptions, ProcessResult, UploadResult, WindConfig } from '../types'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { defaultWindConfig, loadWindConfig, saveWindConfig, validateWindConfig } from '../config'
import { createWindProcessor } from '../index'

export const useWindStore = defineStore('wind', () => {
  // 配置
  const config = ref<WindConfig>(loadWindConfig())
  const configValid = ref(false)

  // 处理状态
  const processing = ref(false)
  const progress = ref(0)
  const currentStep = ref('')

  // 处理结果
  const result = ref<ProcessResult | null>(null)
  const uploadedImages = ref<UploadResult[]>([])

  // 错误信息
  const errors = ref<string[]>([])

  /**
   * 更新配置
   */
  function updateConfig(newConfig: Partial<WindConfig>) {
    config.value = { ...config.value, ...newConfig }
    saveWindConfig(config.value)
    validateConfig()
  }

  /**
   * 验证配置
   */
  function validateConfig() {
    const validation = validateWindConfig(config.value)
    configValid.value = validation.valid
    if (!validation.valid) {
      errors.value = validation.errors
    }
    else {
      errors.value = []
    }
    return validation
  }

  /**
   * 重置配置
   */
  function resetConfig() {
    config.value = defaultWindConfig
    saveWindConfig(config.value)
    validateConfig()
  }

  /**
   * 处理 .docx 文件
   */
  async function processDocx(
    file: File,
    options: ProcessOptions = {
      uploadImages: true,
      formatContent: true,
      preserveOriginal: true,
    },
  ) {
    const apiKey = config.value.ai.apiKey || import.meta.env.VITE_DEFAULT_AI_API_KEY || ''
    const apiEndpoint = config.value.ai.apiEndpoint || import.meta.env.VITE_DEFAULT_AI_ENDPOINT || ''
    const model = config.value.ai.model || import.meta.env.VITE_DEFAULT_AI_MODEL || ''
    const token = config.value.github.token || import.meta.env.VITE_IMAGE_HOST?.split(';')[0] || ''

    if (!apiKey && options.formatContent) {
      throw new Error('AI API 密钥未配置')
    }
    if (!apiEndpoint && options.formatContent) {
      throw new Error('AI API 地址未配置')
    }
    if (!model && options.formatContent) {
      throw new Error('AI 模型名称未配置')
    }
    if (!token && options.uploadImages) {
      throw new Error('GitHub Token 未配置')
    }

    processing.value = true
    progress.value = 0
    currentStep.value = '开始处理...'
    errors.value = []

    try {
      const githubConfig = {
        ...config.value.github,
        token: token || config.value.github.token,
      }
      const aiConfig = {
        ...config.value.ai,
        apiKey: apiKey || config.value.ai.apiKey,
        apiEndpoint: apiEndpoint || config.value.ai.apiEndpoint,
        model: model || config.value.ai.model,
      }
      const processor = createWindProcessor(githubConfig, aiConfig)

      currentStep.value = '解析文档...'
      progress.value = 20

      const processResult = await processor.processDocx(file, options)

      progress.value = 100
      currentStep.value = '处理完成'

      result.value = processResult
      uploadedImages.value = processResult.images

      if (!processResult.success && processResult.errors) {
        errors.value = processResult.errors
      }

      return processResult
    }
    catch (error) {
      const errorMsg = (error as Error).message
      errors.value = [errorMsg]
      throw error
    }
    finally {
      processing.value = false
    }
  }

  /**
   * 处理 HTML 字符串
   */
  async function processHtml(
    html: string,
    options: ProcessOptions = {
      uploadImages: true,
      formatContent: true,
      preserveOriginal: true,
    },
  ) {
    const apiKey = config.value.ai.apiKey || import.meta.env.VITE_DEFAULT_AI_API_KEY || ''
    const apiEndpoint = config.value.ai.apiEndpoint || import.meta.env.VITE_DEFAULT_AI_ENDPOINT || ''
    const model = config.value.ai.model || import.meta.env.VITE_DEFAULT_AI_MODEL || ''
    const token = config.value.github.token || import.meta.env.VITE_IMAGE_HOST?.split(';')[0] || ''

    if (!apiKey && options.formatContent) {
      throw new Error('AI API 密钥未配置')
    }
    if (!apiEndpoint && options.formatContent) {
      throw new Error('AI API 地址未配置')
    }
    if (!model && options.formatContent) {
      throw new Error('AI 模型名称未配置')
    }
    if (!token && options.uploadImages) {
      throw new Error('GitHub Token 未配置')
    }

    processing.value = true
    progress.value = 0
    currentStep.value = '开始处理...'
    errors.value = []

    try {
      const githubConfig = {
        ...config.value.github,
        token: token || config.value.github.token,
      }
      const aiConfig = {
        ...config.value.ai,
        apiKey: apiKey || config.value.ai.apiKey,
        apiEndpoint: apiEndpoint || config.value.ai.apiEndpoint,
        model: model || config.value.ai.model,
      }
      const processor = createWindProcessor(githubConfig, aiConfig)

      currentStep.value = '解析 HTML...'
      progress.value = 20

      const processResult = await processor.processHtml(html, options)

      progress.value = 100
      currentStep.value = '处理完成'

      result.value = processResult
      uploadedImages.value = processResult.images

      if (!processResult.success && processResult.errors) {
        errors.value = processResult.errors
      }

      return processResult
    }
    catch (error) {
      const errorMsg = (error as Error).message
      errors.value = [errorMsg]
      throw error
    }
    finally {
      processing.value = false
    }
  }

  /**
   * 处理文本 + 图片
   */
  async function processTextWithImages(
    text: string,
    imageFiles: File[],
    options: ProcessOptions = {
      uploadImages: true,
      formatContent: true,
      preserveOriginal: true,
    },
  ) {
    const apiKey = config.value.ai.apiKey || import.meta.env.VITE_DEFAULT_AI_API_KEY || ''
    const apiEndpoint = config.value.ai.apiEndpoint || import.meta.env.VITE_DEFAULT_AI_ENDPOINT || ''
    const model = config.value.ai.model || import.meta.env.VITE_DEFAULT_AI_MODEL || ''
    const token = config.value.github.token || import.meta.env.VITE_IMAGE_HOST?.split(';')[0] || ''

    if (!apiKey && options.formatContent) {
      throw new Error('AI API 密钥未配置')
    }
    if (!apiEndpoint && options.formatContent) {
      throw new Error('AI API 地址未配置')
    }
    if (!model && options.formatContent) {
      throw new Error('AI 模型名称未配置')
    }
    if (!token && options.uploadImages) {
      throw new Error('GitHub Token 未配置')
    }

    processing.value = true
    progress.value = 0
    currentStep.value = '开始处理...'
    errors.value = []

    try {
      const githubConfig = {
        ...config.value.github,
        token: token || config.value.github.token,
      }
      const aiConfig = {
        ...config.value.ai,
        apiKey: apiKey || config.value.ai.apiKey,
        apiEndpoint: apiEndpoint || config.value.ai.apiEndpoint,
        model: model || config.value.ai.model,
      }
      const processor = createWindProcessor(githubConfig, aiConfig)

      currentStep.value = '处理文本和图片...'
      progress.value = 20

      const processResult = await processor.processTextWithImages(text, imageFiles, options)

      progress.value = 100
      currentStep.value = '处理完成'

      result.value = processResult
      uploadedImages.value = processResult.images

      if (!processResult.success && processResult.errors) {
        errors.value = processResult.errors
      }

      return processResult
    }
    catch (error) {
      const errorMsg = (error as Error).message
      errors.value = [errorMsg]
      throw error
    }
    finally {
      processing.value = false
    }
  }

  /**
   * 仅 AI 排版
   */
  async function formatOnly(content: string) {
    const apiKey = config.value.ai.apiKey || import.meta.env.VITE_DEFAULT_AI_API_KEY || ''
    const apiEndpoint = config.value.ai.apiEndpoint || import.meta.env.VITE_DEFAULT_AI_ENDPOINT || ''
    const model = config.value.ai.model || import.meta.env.VITE_DEFAULT_AI_MODEL || ''

    if (!apiKey) {
      throw new Error('AI API 密钥未配置')
    }
    if (!apiEndpoint) {
      throw new Error('AI API 地址未配置')
    }
    if (!model) {
      throw new Error('AI 模型名称未配置')
    }

    processing.value = true
    currentStep.value = 'AI 排版中...'
    errors.value = []

    try {
      const aiConfig = {
        ...config.value.ai,
        apiKey,
        apiEndpoint,
        model,
      }
      const processor = createWindProcessor(config.value.github, aiConfig)
      const processResult = await processor.formatOnly(content)

      result.value = processResult

      if (!processResult.success && processResult.errors) {
        errors.value = processResult.errors
      }

      return processResult
    }
    catch (error) {
      const errorMsg = (error as Error).message
      errors.value = [errorMsg]
      throw error
    }
    finally {
      processing.value = false
    }
  }

  /**
   * 仅上传图片
   */
  async function uploadImagesOnly(content: string, imageFiles: File[]) {
    const token = config.value.github.token || import.meta.env.VITE_IMAGE_HOST?.split(';')[0] || ''
    if (!token) {
      throw new Error('GitHub Token 未配置')
    }

    processing.value = true
    currentStep.value = '上传图片中...'
    errors.value = []

    try {
      const githubConfig = {
        ...config.value.github,
        token,
      }
      const processor = createWindProcessor(githubConfig)
      const processResult = await processor.uploadImagesOnly(content, imageFiles)

      result.value = processResult
      uploadedImages.value = processResult.images

      if (!processResult.success && processResult.errors) {
        errors.value = processResult.errors
      }

      return processResult
    }
    catch (error) {
      const errorMsg = (error as Error).message
      errors.value = [errorMsg]
      throw error
    }
    finally {
      processing.value = false
    }
  }

  /**
   * 清除结果
   */
  function clearResult() {
    result.value = null
    uploadedImages.value = []
    errors.value = []
    progress.value = 0
    currentStep.value = ''
  }

  // 初始化时验证配置
  validateConfig()

  return {
    // 状态
    config,
    configValid,
    processing,
    progress,
    currentStep,
    result,
    uploadedImages,
    errors,

    // 方法
    updateConfig,
    validateConfig,
    resetConfig,
    processDocx,
    processHtml,
    processTextWithImages,
    formatOnly,
    uploadImagesOnly,
    clearResult,
  }
})
