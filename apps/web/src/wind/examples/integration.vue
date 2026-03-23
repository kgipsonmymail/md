<script setup lang="ts">
import { ref } from 'vue'
import WindProcessor from '../components/WindProcessor.vue'

const editorContent = ref('')
const showWindProcessor = ref(false)
const renderedHtml = ref('')

function openWindProcessor() {
  showWindProcessor.value = true
}

function handleWindApply(markdown: string) {
  // 将 Wind 处理后的内容应用到编辑器
  editorContent.value = markdown
  showWindProcessor.value = false
  renderPreview()
}

function renderPreview() {
  // 这里使用你现有的渲染引擎
  // 例如：marked, markdown-it 等
  renderedHtml.value = `<p>渲染后的内容...</p>`
}
</script>

<template>
  <div class="app-container">
    <!-- 主编辑器 -->
    <div class="editor-section">
      <h2>Markdown 编辑器</h2>
      <textarea
        v-model="editorContent"
        placeholder="在这里编辑 Markdown..."
        rows="20"
      />
      <div class="editor-actions">
        <button @click="openWindProcessor">
          打开 Wind 处理器
        </button>
        <button @click="renderPreview">
          渲染预览
        </button>
      </div>
    </div>

    <!-- Wind 处理器侧边栏 -->
    <div v-if="showWindProcessor" class="wind-sidebar">
      <div class="sidebar-header">
        <h3>Wind 智能排版</h3>
        <button @click="showWindProcessor = false">
          ✕
        </button>
      </div>
      <WindProcessor @apply="handleWindApply" />
    </div>

    <!-- 预览区域 -->
    <div class="preview-section">
      <h2>预览</h2>
      <div class="preview-content" v-html="renderedHtml" />
    </div>
  </div>
</template>

<style scoped>
.app-container {
  display: grid;
  grid-template-columns: 1fr 400px 1fr;
  gap: 20px;
  height: 100vh;
  padding: 20px;
}

.editor-section,
.preview-section {
  display: flex;
  flex-direction: column;
}

.editor-section textarea {
  flex: 1;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: monospace;
  resize: none;
}

.editor-actions {
  margin-top: 12px;
  display: flex;
  gap: 8px;
}

.editor-actions button {
  padding: 8px 16px;
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.wind-sidebar {
  position: fixed;
  right: 0;
  top: 0;
  width: 500px;
  height: 100vh;
  background: white;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #e0e0e0;
}

.sidebar-header button {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
}

.preview-content {
  flex: 1;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow-y: auto;
  background: white;
}
</style>
