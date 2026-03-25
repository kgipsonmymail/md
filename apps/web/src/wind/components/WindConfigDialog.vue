<script setup lang="ts">
import { ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useWindStore } from '@/wind/stores/wind'
import { toast } from 'vue-sonner'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const windStore = useWindStore()
const localConfig = ref(JSON.parse(JSON.stringify(windStore.config)))
const dialogVisible = ref(props.open)

watch(() => props.open, (val) => {
  if (val) {
    localConfig.value = JSON.parse(JSON.stringify(windStore.config))
  }
  dialogVisible.value = val
})

watch(dialogVisible, (val) => {
  emit('update:open', val)
})

function saveConfig() {
  windStore.updateConfig(JSON.parse(JSON.stringify(localConfig.value)))
  toast.success('自定义配置已保存到浏览器本地')
  dialogVisible.value = false
}
</script>

<template>
  <div v-if="dialogVisible" class="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center">
    <div class="bg-card text-card-foreground shadow-lg border rounded-xl w-[90vw] max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-4 relative">
      <div class="px-6 py-4 border-b flex items-center justify-between">
        <h2 class="text-lg font-semibold">系统配置 (仅存在本地)</h2>
        <Button variant="ghost" size="sm" class="h-8 py-0 px-2 text-muted-foreground" @click="dialogVisible = false">✕</Button>
      </div>
      <div class="px-6 py-4 overflow-y-auto flex-1 space-y-6">
        
        <div class="text-xs text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 p-3 rounded-md">
          ⚠️ 提示：为了保护您的隐私与安全，您的 Token 和 API Key 仅保存在当前浏览器的本地缓存中。请勿在公共电脑上留下敏感信息。
        </div>

        <!-- 图床配置 -->
        <div class="space-y-4">
          <h3 class="text-sm font-medium text-primary border-l-2 border-primary pl-2">GitHub 图床设置</h3>
          <div class="space-y-2">
            <Label>Personal Access Token</Label>
            <Input type="password" v-model="localConfig.github.token" placeholder="ghp_xxx 这将用于自动上传拖入的图片" />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label>GitHub 用户名</Label>
              <Input v-model="localConfig.github.owner" placeholder="例如: octocat" />
            </div>
            <div class="space-y-2">
              <Label>图床仓库名</Label>
              <Input v-model="localConfig.github.repo" placeholder="例如: image-hosting" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label>推流分支</Label>
              <Input v-model="localConfig.github.branch" placeholder="main" />
            </div>
            <div class="space-y-2">
              <Label>存储目录</Label>
              <Input v-model="localConfig.github.path" placeholder="wind-assets" />
            </div>
          </div>
        </div>

        <!-- AI 配置 -->
        <div class="space-y-4 border-t pt-4">
          <h3 class="text-sm font-medium text-primary border-l-2 border-primary pl-2">GLM / 一键排版 大语言模型设置</h3>
          <div class="space-y-2">
            <Label>API Base URL</Label>
            <Input v-model="localConfig.ai.apiEndpoint" placeholder="https://open.bigmodel.cn/api/paas/v4/chat/completions" />
          </div>
          <div class="space-y-2">
            <Label>API Key</Label>
            <Input type="password" v-model="localConfig.ai.apiKey" placeholder="sk-xxx" />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label>调用模型</Label>
              <Input v-model="localConfig.ai.model" placeholder="glm-4.6v" />
            </div>
          </div>
        </div>
      </div>
      <div class="px-6 py-4 border-t flex items-center justify-end space-x-2 bg-muted/20">
        <Button variant="outline" @click="dialogVisible = false">取消</Button>
        <Button @click="saveConfig">完成并保存</Button>
      </div>
    </div>
  </div>
</template>
