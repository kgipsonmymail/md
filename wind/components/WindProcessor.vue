<script setup lang="ts">
import type { ProcessOptions } from '../types'
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import { useWindStore } from '../stores/wind'
import WindConfig from './WindConfig.vue'

const windStore = useWindStore()
const { processing, progress, currentStep, result, uploadedImages, errors, configValid } = storeToRefs(windStore)

// UI 状态
const showConfig = ref(false)
const mode = ref<'docx' | 'text' | 'format'>('text')

// 输入数据
const docxFile = ref<File | null>(null)
const textContent = ref('')
const imageFiles = ref<File[]>([])

// 处理选项
const options = ref<ProcessOptions>({
  uploadImages: true,
  formatContent: true,
  preserveOriginal: true,
})

// 引用
const docxInput = ref<HTMLInputElement>()
const imageInput = ref<HTMLInputElement>()

// 计算属性
const canProcess = computed(() => {
  if (!configValid.value)
    return false
  if (mode.value === 'docx')
    return docxFile.value !== null
  if (mode.value === 'text')
    return textContent.value.trim().length > 0
  if (mode.value === 'format')
    return textContent.value.trim().length > 0
  return false
})

// 处理 .docx 文件
function handleDocxDrop(e: DragEvent) {
  const files = e.dataTransfer?.files
  if (files && files.length > 0) {
    const file = files[0]
    if (file.name.endsWith('.docx')) {
      docxFile.value = file
    }
  }
}

function handleDocxSelect(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    docxFile.value = target.files[0]
  }
}

// 处理图片
function handleImageSelect(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.files) {
    imageFiles.value.push(...Array.from(target.files))
  }
}

function removeImage(index: number) {
  imageFiles.value.splice(index, 1)
}

function getImagePreview(file: File): string {
  return URL.createObjectURL(file)
}

// 主处理函数
async function handleProcess() {
  windStore.clearResult()

  try {
    if (mode.value === 'docx' && docxFile.value) {
      await windStore.processDocx(docxFile.value, options.value)
    }
    else if (mode.value === 'text') {
      await windStore.processTextWithImages(textContent.value, imageFiles.value, options.value)
    }
    else if (mode.value === 'format') {
      await windStore.formatOnly(textContent.value)
    }
  }
  catch (error) {
    console.error('处理失败:', error)
  }
}

// 复制功能
async function copyMarkdown() {
  if (result.value) {
    await navigator.clipboard.writeText(result.value.markdown)
    alert('Markdown 已复制到剪贴板')
  }
}

async function copyImageUrl(img: any) {
  const url = img.cdnUrl || img.url
  await navigator.clipboard.writeText(url)
  alert('图片链接已复制')
}

// 应用到编辑器
function applyToEditor() {
  if (result.value) {
    // 这里需要与主编辑器集成
    // 可以通过 emit 或者直接操作编辑器实例
    console.log('应用到编辑器:', result.value.markdown)
    alert('功能待实现：需要与主编辑器集成')
  }
}
</script>

<template>
  <div class="wind-processor">
    <div class="processor-header">
      <h3>Wind 智能排版</h3>
      <button class="btn-config" @click="showConfig = !showConfig">
        {{ showConfig ? '隐藏配置' : '显示配置' }}
      </button>
    </div>

    <!-- 配置面板 -->
    <div v-if="showConfig" class="config-panel">
      <WindConfig />
    </div>

    <!-- 主处理区域 -->
    <div class="processor-main">
      <!-- 输入模式选择 -->
      <div class="mode-selector">
        <button
          :class="{ active: mode === 'docx' }"
          @click="mode = 'docx'"
        >
          上传 .docx
        </button>
        <button
          :class="{ active: mode === 'text' }"
          @click="mode = 'text'"
        >
          文本 + 图片
        </button>
        <button
          :class="{ active: mode === 'format' }"
          @click="mode = 'format'"
        >
          仅 AI 排版
        </button>
      </div>

      <!-- .docx 模式 -->
      <div v-if="mode === 'docx'" class="input-section">
        <div class="upload-area" @drop.prevent="handleDocxDrop" @dragover.prevent>
          <input
            ref="docxInput"
            type="file"
            accept=".docx"
            style="display: none"
            @change="handleDocxSelect"
          >
          <div v-if="!docxFile" class="upload-placeholder" @click="$refs.docxInput.click()">
            <div class="upload-icon">
              📄
            </div>
            <p>点击或拖拽上传 .docx 文件</p>
          </div>
          <div v-else class="file-info">
            <span>{{ docxFile.name }}</span>
            <button class="btn-remove" @click="docxFile = null">
              ✕
            </button>
          </div>
        </div>
      </div>

      <!-- 文本 + 图片模式 -->
      <div v-if="mode === 'text'" class="input-section">
        <div class="text-input">
          <textarea
            v-model="textContent"
            placeholder="粘贴或输入文章内容..."
            rows="10"
          />
        </div>
        <div class="image-upload">
          <input
            ref="imageInput"
            type="file"
            accept="image/*"
            multiple
            style="display: none"
            @change="handleImageSelect"
          >
          <button class="btn-upload" @click="$refs.imageInput.click()">
            选择图片
          </button>
          <div v-if="imageFiles.length > 0" class="image-list">
            <div v-for="(file, index) in imageFiles" :key="index" class="image-item">
              <img :src="getImagePreview(file)" :alt="file.name">
              <span>{{ file.name }}</span>
              <button class="btn-remove" @click="removeImage(index)">
                ✕
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 仅排版模式 -->
      <div v-if="mode === 'format'" class="input-section">
        <div class="text-input">
          <textarea
            v-model="textContent"
            placeholder="粘贴 Markdown 内容..."
            rows="15"
          />
        </div>
      </div>

      <!-- 处理选项 -->
      <div class="options-section">
        <label v-if="mode !== 'format'" class="option-item">
          <input v-model="options.uploadImages" type="checkbox">
          上传图片到图床
        </label>
        <label v-if="mode !== 'format'" class="option-item">
          <input v-model="options.formatContent" type="checkbox">
          AI 智能排版
        </label>
        <label class="option-item">
          <input v-model="options.preserveOriginal" type="checkbox">
          保留原始内容
        </label>
      </div>

      <!-- 处理按钮 -->
      <div class="action-section">
        <button
          :disabled="!canProcess || processing"
          class="btn-process"
          @click="handleProcess"
        >
          {{ processing ? currentStep : '开始处理' }}
        </button>
        <div v-if="processing" class="progress-bar">
          <div class="progress-fill" :style="{ width: `${progress}%` }" />
        </div>
      </div>

      <!-- 错误信息 -->
      <div v-if="errors.length > 0" class="error-section">
        <div v-for="(error, index) in errors" :key="index" class="error-message">
          {{ error }}
        </div>
      </div>

      <!-- 处理结果 -->
      <div v-if="result" class="result-section">
        <div class="result-header">
          <h4>处理结果</h4>
          <div class="result-actions">
            <button class="btn-copy" @click="copyMarkdown">
              复制 Markdown
            </button>
            <button class="btn-apply" @click="applyToEditor">
              应用到编辑器
            </button>
          </div>
        </div>

        <!-- 图片上传结果 -->
        <div v-if="uploadedImages.length > 0" class="uploaded-images">
          <h5>已上传图片 ({{ uploadedImages.length }})</h5>
          <div class="image-grid">
            <div v-for="(img, index) in uploadedImages" :key="index" class="uploaded-item">
              <img :src="img.cdnUrl || img.url" :alt="img.originalName">
              <div class="image-info">
                <span class="image-name">{{ img.originalName }}</span>
                <button class="btn-copy-url" @click="copyImageUrl(img)">
                  复制链接
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Markdown 预览 -->
        <div class="markdown-preview">
          <h5>Markdown 内容</h5>
          <pre>{{ result.markdown }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wind-processor {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
}

.processor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: #fff;
  border-bottom: 1px solid #e0e0e0;
}

.processor-header h3 {
  margin: 0;
  font-size: 18px;
}

.btn-config {
  padding: 6px 12px;
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-config:hover {
  background: #45a049;
}

.config-panel {
  max-height: 60vh;
  overflow-y: auto;
  background: #fff;
  border-bottom: 1px solid #e0e0e0;
}

.processor-main {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.mode-selector {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.mode-selector button {
  flex: 1;
  padding: 10px;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.mode-selector button.active {
  background: #4caf50;
  color: white;
  border-color: #4caf50;
}

.input-section {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 16px;
}

.upload-area {
  border: 2px dashed #ddd;
  border-radius: 8px;
  padding: 40px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}

.upload-area:hover {
  border-color: #4caf50;
  background: #f9f9f9;
}

.upload-placeholder {
  color: #888;
}

.upload-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.file-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 4px;
}

.text-input textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: monospace;
  font-size: 14px;
  resize: vertical;
  box-sizing: border-box;
}

.image-upload {
  margin-top: 16px;
}

.btn-upload {
  padding: 8px 16px;
  background: #2196f3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-upload:hover {
  background: #1976d2;
}

.image-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
  margin-top: 12px;
}

.image-item {
  position: relative;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 8px;
  background: #fff;
}

.image-item img {
  width: 100%;
  height: 100px;
  object-fit: cover;
  border-radius: 4px;
  margin-bottom: 8px;
}

.image-item span {
  display: block;
  font-size: 12px;
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.btn-remove {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 24px;
  height: 24px;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
}

.options-section {
  background: #fff;
  border-radius: 8px;
  padding: 16px 20px;
  margin-bottom: 16px;
}

.option-item {
  display: flex;
  align-items: center;
  margin: 8px 0;
  cursor: pointer;
}

.option-item input {
  margin-right: 8px;
}

.action-section {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 16px;
}

.btn-process {
  width: 100%;
  padding: 12px;
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-process:hover:not(:disabled) {
  background: #45a049;
}

.btn-process:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.progress-bar {
  margin-top: 12px;
  height: 4px;
  background: #e0e0e0;
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #4caf50;
  transition: width 0.3s;
}

.error-section {
  background: #ffebee;
  border: 1px solid #f44336;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.error-message {
  color: #c62828;
  font-size: 14px;
  margin: 4px 0;
}

.result-section {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.result-header h4 {
  margin: 0;
}

.result-actions {
  display: flex;
  gap: 8px;
}

.btn-copy,
.btn-apply {
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  background: #fff;
}

.btn-copy:hover,
.btn-apply:hover {
  background: #f5f5f5;
}

.uploaded-images {
  margin-bottom: 20px;
}

.uploaded-images h5 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #666;
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.uploaded-item {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
}

.uploaded-item img {
  width: 100%;
  height: 150px;
  object-fit: cover;
}

.image-info {
  padding: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.image-name {
  font-size: 12px;
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.btn-copy-url {
  padding: 4px 8px;
  font-size: 12px;
  background: #2196f3;
  color: white;
  border: none;
  border-radius: 3px;
  cursor: pointer;
}

.markdown-preview {
  margin-top: 20px;
}

.markdown-preview h5 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #666;
}

.markdown-preview pre {
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 16px;
  overflow-x: auto;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-wrap: break-word;
}
</style>
