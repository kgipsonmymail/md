<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, ref, watch } from 'vue'
import { GitHubImageHost } from '../services/github-image-host'
import { useWindStore } from '../stores/wind'

const windStore = useWindStore()
const { config, configValid, errors } = storeToRefs(windStore)

// 本地配置副本
const localConfig = ref(JSON.parse(JSON.stringify(config.value)))

// GitHub 测试状态
const testingGitHub = ref(false)
const githubTestResult = ref<{ success: boolean, message: string } | null>(null)
const initResult = ref<{ success: boolean, message: string } | null>(null)

// 计算属性：动态 placeholder
const providerPlaceholder = computed(() => {
  return localConfig.value.ai.provider === 'dify'
    ? 'https://api.dify.ai/v1'
    : 'https://api.openai.com/v1/chat/completions'
})

const keyPlaceholder = computed(() => {
  return localConfig.value.ai.provider === 'dify'
    ? 'app-xxxxxxxxxxxx'
    : 'sk-xxxxxxxxxxxx'
})

// 监听 store 配置变化
watch(config, (newConfig) => {
  localConfig.value = JSON.parse(JSON.stringify(newConfig))
}, { deep: true })

function handleConfigChange() {
  windStore.updateConfig(localConfig.value)
}

function resetConfig() {
  if (confirm('确定要重置配置吗？')) {
    windStore.resetConfig()
  }
}

async function testGitHubConnection() {
  if (!localConfig.value.github.token || !localConfig.value.github.owner || !localConfig.value.github.repo) {
    githubTestResult.value = {
      success: false,
      message: '请先填写 GitHub Token、用户名和仓库名',
    }
    return
  }

  testingGitHub.value = true
  githubTestResult.value = null

  try {
    const githubHost = new GitHubImageHost(localConfig.value.github)
    const result = await githubHost.validateConfig()

    githubTestResult.value = {
      success: result.valid,
      message: result.valid
        ? '✓ GitHub 连接成功！仓库可访问'
        : `✗ ${result.error}`,
    }
  }
  catch (error) {
    githubTestResult.value = {
      success: false,
      message: `✗ 测试失败: ${(error as Error).message}`,
    }
  }
  finally {
    testingGitHub.value = false
  }
}

async function initRepository() {
  if (!localConfig.value.github.token || !localConfig.value.github.owner || !localConfig.value.github.repo) {
    initResult.value = {
      success: false,
      message: '请先填写 GitHub Token、用户名和仓库名',
    }
    return
  }

  testingGitHub.value = true
  initResult.value = null

  try {
    const githubHost = new GitHubImageHost(localConfig.value.github)
    const result = await githubHost.testUpload()

    initResult.value = {
      success: result.success,
      message: result.message,
    }
  }
  catch (error) {
    initResult.value = {
      success: false,
      message: `✗ 初始化失败: ${(error as Error).message}`,
    }
  }
  finally {
    testingGitHub.value = false
  }
}
</script>

<template>
  <div class="wind-config">
    <div class="config-header">
      <h3>Wind 中间件配置</h3>
      <button class="btn-reset" @click="resetConfig">
        重置配置
      </button>
    </div>

    <div v-if="errors.length > 0" class="config-errors">
      <div v-for="(error, index) in errors" :key="index" class="error-item">
        {{ error }}
      </div>
    </div>

    <div class="config-section">
      <h4>GitHub 图床配置</h4>
      <div class="form-group">
        <label>Personal Access Token *</label>
        <input
          v-model="localConfig.github.token"
          type="password"
          placeholder="ghp_xxxxxxxxxxxx"
          @blur="handleConfigChange"
        >
        <small>需要 repo 权限，<a href="https://github.com/settings/tokens" target="_blank">创建 Token</a></small>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>用户名 *</label>
          <input
            v-model="localConfig.github.owner"
            placeholder="your-username"
            @blur="handleConfigChange"
          >
        </div>
        <div class="form-group">
          <label>仓库名 *</label>
          <input
            v-model="localConfig.github.repo"
            placeholder="image-hosting"
            @blur="handleConfigChange"
          >
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>分支名</label>
          <input
            v-model="localConfig.github.branch"
            placeholder="main"
            @blur="handleConfigChange"
          >
        </div>
        <div class="form-group">
          <label>存储路径</label>
          <input
            v-model="localConfig.github.path"
            placeholder="wind-assets"
            @blur="handleConfigChange"
          >
        </div>
      </div>

      <div class="form-group">
        <label class="checkbox-label">
          <input
            v-model="localConfig.github.useCDN"
            type="checkbox"
            @change="handleConfigChange"
          >
          使用 jsDelivr CDN 加速
        </label>
        <small>开启后图片将通过 CDN 访问，速度更快</small>
      </div>

      <div class="form-group">
        <button class="btn-test" :disabled="testingGitHub" @click="testGitHubConnection">
          {{ testingGitHub ? '测试中...' : '测试 GitHub 连接' }}
        </button>
        <div v-if="githubTestResult" class="test-result" :class="[githubTestResult.success ? 'success' : 'error']">
          {{ githubTestResult.message }}
        </div>
      </div>

      <div class="form-group">
        <button class="btn-test" :disabled="testingGitHub" @click="initRepository">
          {{ testingGitHub ? '初始化中...' : '初始化仓库' }}
        </button>
        <div v-if="initResult" class="test-result" :class="[initResult.success ? 'success' : 'error']">
          {{ initResult.message }}
        </div>
      </div>
    </div>

    <div class="config-section">
      <h4>AI 排版配置</h4>
      <div class="form-group">
        <label>API 提供商 *</label>
        <select
          v-model="localConfig.ai.provider"
          @change="handleConfigChange"
        >
          <option value="openai">
            OpenAI 兼容 API
          </option>
          <option value="dify">
            Dify API
          </option>
        </select>
        <small>选择不同的 API 提供商</small>
      </div>

      <div class="form-group">
        <label>API 地址 *</label>
        <input
          v-model="localConfig.ai.apiEndpoint"
          :placeholder="providerPlaceholder"
          @blur="handleConfigChange"
        >
      </div>

      <div class="form-group">
        <label>API 密钥 *</label>
        <input
          v-model="localConfig.ai.apiKey"
          type="password"
          :placeholder="keyPlaceholder"
          @blur="handleConfigChange"
        >
      </div>

      <div v-if="localConfig.ai.provider === 'openai'" class="form-row">
        <div class="form-group">
          <label>模型</label>
          <input
            v-model="localConfig.ai.model"
            placeholder="gpt-4"
            list="model-suggestions"
            @blur="handleConfigChange"
          >
          <datalist id="model-suggestions">
            <option value="gpt-4">
              GPT-4
            </option>
            <option value="gpt-4-turbo">
              GPT-4 Turbo
            </option>
            <option value="gpt-3.5-turbo">
              GPT-3.5 Turbo
            </option>
            <option value="claude-3-opus-20240229">
              Claude 3 Opus
            </option>
            <option value="claude-3-sonnet-20240229">
              Claude 3 Sonnet
            </option>
            <option value="qwen-turbo">
              通义千问 Turbo
            </option>
            <option value="qwen-plus">
              通义千问 Plus
            </option>
            <option value="qwen-max">
              通义千问 Max
            </option>
            <option value="ernie-bot-4">
              文心一言 4.0
            </option>
            <option value="ernie-bot-turbo">
              文心一言 Turbo
            </option>
          </datalist>
          <small>输入任意兼容 OpenAI API 格式的模型名称</small>
        </div>
        <div class="form-group">
          <label>Temperature</label>
          <input
            v-model.number="localConfig.ai.temperature"
            type="number"
            min="0"
            max="2"
            step="0.1"
            @blur="handleConfigChange"
          >
        </div>
      </div>

      <div v-if="localConfig.ai.provider === 'openai'" class="form-group">
        <label>系统提示词</label>
        <textarea
          v-model="localConfig.ai.prompt"
          rows="8"
          placeholder="输入 AI 排版的系统提示词..."
          @blur="handleConfigChange"
        />
        <small>支持文件路径（如 /wind/system_prompt.md）或直接输入提示词内容</small>
      </div>
    </div>

    <div class="config-footer">
      <div v-if="configValid" class="status-valid">
        ✓ 配置有效
      </div>
      <div v-else class="status-invalid">
        ✗ 配置无效，请检查必填项
      </div>
    </div>
  </div>
</template>

<style scoped>
.wind-config {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.config-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.config-header h3 {
  margin: 0;
  font-size: 20px;
}

.btn-reset {
  padding: 6px 12px;
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
}

.btn-reset:hover {
  background: #e8e8e8;
}

.btn-test {
  width: 100%;
  padding: 10px 16px;
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.btn-test:hover:not(:disabled) {
  background: #45a049;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3);
}

.btn-test:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.test-result {
  margin-top: 8px;
  padding: 10px 12px;
  border-radius: 4px;
  font-size: 13px;
  white-space: pre-wrap;
  line-height: 1.5;
}

.test-result.success {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.test-result.error {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.config-errors {
  background: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 4px;
  padding: 12px;
  margin-bottom: 20px;
}

.error-item {
  color: #856404;
  font-size: 14px;
  margin: 4px 0;
}

.config-section {
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.config-section h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: #333;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
  font-weight: 500;
  color: #555;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #4caf50;
}

.form-group small {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: #888;
}

.form-group small a {
  color: #4caf50;
  text-decoration: none;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.checkbox-label input[type='checkbox'] {
  width: auto;
  margin-right: 8px;
}

.config-footer {
  text-align: center;
  padding: 12px;
  border-radius: 4px;
}

.status-valid {
  color: #4caf50;
  font-weight: 500;
}

.status-invalid {
  color: #f44336;
  font-weight: 500;
}
</style>
