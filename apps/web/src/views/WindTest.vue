<script setup lang="ts">
import { ref } from 'vue'
import WindProcessor from '@/wind/components/WindProcessor.vue'

const showDocs = ref(false)
</script>

<template>
  <div class="wind-test-page">
    <div class="page-header">
      <h1>Wind 智能排版中间件 - 测试页面</h1>
      <p>测试 Wind 中间件的各项功能</p>
    </div>

    <div class="page-content">
      <WindProcessor />
    </div>

    <div class="page-footer">
      <div class="tips">
        <h3>💡 使用提示</h3>
        <ul>
          <li>首次使用请先点击"显示配置"填入 GitHub Token 和 AI API Key</li>
          <li>支持三种模式：上传 .docx、文本+图片、仅 AI 排版</li>
          <li>处理完成后可以一键复制 Markdown 内容</li>
          <li>所有配置会自动保存到 localStorage</li>
        </ul>
      </div>

      <div class="links">
        <h3>📚 相关文档</h3>
        <ul>
          <li><a href="https://github.com/settings/tokens" target="_blank">获取 GitHub Token</a></li>
          <li><a href="https://platform.openai.com/api-keys" target="_blank">获取 OpenAI API Key</a></li>
          <li><a @click="showDocs = true">查看使用文档</a></li>
        </ul>
      </div>
    </div>

    <!-- 文档对话框 -->
    <div v-if="showDocs" class="docs-dialog" @click="showDocs = false">
      <div class="docs-content" @click.stop>
        <div class="docs-header">
          <h2>Wind 使用文档</h2>
          <button @click="showDocs = false">
            ✕
          </button>
        </div>
        <div class="docs-body">
          <h3>快速开始</h3>
          <ol>
            <li>点击"显示配置"按钮</li>
            <li>填入 GitHub Token（需要 repo 权限）</li>
            <li>填入 AI API Key</li>
            <li>选择处理模式并上传内容</li>
            <li>点击"开始处理"</li>
          </ol>

          <h3>三种模式</h3>
          <ul>
            <li><strong>上传 .docx</strong>：自动解析 Word 文档，提取文本和图片</li>
            <li><strong>文本 + 图片</strong>：分别上传文本和图片，自动组合</li>
            <li><strong>仅 AI 排版</strong>：对已有 Markdown 内容进行优化</li>
          </ul>

          <h3>配置说明</h3>
          <p><strong>GitHub 配置：</strong></p>
          <ul>
            <li>Token：Personal Access Token（需要 repo 权限）</li>
            <li>用户名：你的 GitHub 用户名</li>
            <li>仓库名：用于存储图片的仓库</li>
            <li>分支名：默认 main</li>
            <li>存储路径：图片存储的目录</li>
            <li>使用 CDN：开启后使用 jsDelivr 加速</li>
          </ul>

          <p><strong>AI 配置：</strong></p>
          <ul>
            <li>API 地址：OpenAI 或兼容的 API 地址</li>
            <li>API 密钥：你的 API Key</li>
            <li>模型：GPT-4、GPT-3.5 等</li>
            <li>Temperature：0-2，控制创造性</li>
            <li>提示词：自定义排版规则</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wind-test-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 20px;
}

.page-header {
  text-align: center;
  margin-bottom: 30px;
  padding: 30px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.page-header h1 {
  margin: 0 0 10px 0;
  color: #333;
  font-size: 28px;
}

.page-header p {
  margin: 0;
  color: #666;
  font-size: 16px;
}

.page-content {
  max-width: 1200px;
  margin: 0 auto 30px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.page-footer {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.tips,
.links {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.tips h3,
.links h3 {
  margin: 0 0 15px 0;
  color: #333;
  font-size: 18px;
}

.tips ul,
.links ul {
  margin: 0;
  padding-left: 20px;
  color: #666;
  line-height: 1.8;
}

.links a {
  color: #4caf50;
  text-decoration: none;
  cursor: pointer;
}

.links a:hover {
  text-decoration: underline;
}

/* 文档对话框 */
.docs-dialog {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.docs-content {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 800px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.docs-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
}

.docs-header h2 {
  margin: 0;
  font-size: 20px;
}

.docs-header button {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.docs-header button:hover {
  background: #f5f5f5;
}

.docs-body {
  padding: 20px;
  overflow-y: auto;
  line-height: 1.8;
}

.docs-body h3 {
  margin: 20px 0 10px 0;
  color: #333;
  font-size: 18px;
}

.docs-body h3:first-child {
  margin-top: 0;
}

.docs-body ul,
.docs-body ol {
  margin: 10px 0;
  padding-left: 25px;
  color: #666;
}

.docs-body li {
  margin: 8px 0;
}

.docs-body strong {
  color: #333;
}

.docs-body p {
  margin: 10px 0;
  color: #666;
}

@media (max-width: 768px) {
  .page-footer {
    grid-template-columns: 1fr;
  }
}
</style>
