<script setup lang="ts">
import { useFileDialog } from '@vueuse/core'
import { FileCode, Loader2, Wand2 } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { ref } from 'vue'
import { toast } from 'vue-sonner'
import { useEditorStore } from '@/stores/editor'
import { useUIStore } from '@/stores/ui'
import { useWindStore } from '@/wind/stores/wind'

const editorStore = useEditorStore()
const uiStore = useUIStore()
const windStore = useWindStore()

const { isShowImportHtmlDialog } = storeToRefs(uiStore)
const { processing, progress, currentStep, errors } = storeToRefs(windStore)

const isDragover = ref(false)
const uploadImages = ref(true)
const formatContent = ref(false)

const { open: openFileDialog, reset: resetFileDialog, onChange: onFileChange } = useFileDialog({
  accept: `.html,.htm`,
  multiple: false,
})

onFileChange((files) => {
  if (files == null || files.length === 0)
    return
  handleProcessFile(files[0])
})

function handleDrop(event: DragEvent) {
  event.preventDefault()
  isDragover.value = false

  const files = event.dataTransfer?.files
  if (!files || files.length === 0)
    return

  const file = files[0]
  if (!/\.(html|htm)$/i.test(file.name)) {
    toast.error(`请选择 .html 格式的网页文件`)
    return
  }

  handleProcessFile(file)
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => resolve(e.target?.result as string || '')
    reader.onerror = () => reject(new Error('读取文件失败'))
    reader.readAsText(file)
  })
}

async function handleProcessFile(file: File) {
  try {
    const htmlContent = await readFileAsText(file)

    const result = await windStore.processHtml(htmlContent, {
      uploadImages: uploadImages.value,
      formatContent: formatContent.value,
      preserveOriginal: true,
    })

    if (result.success) {
      editorStore.importContent(result.markdown)
      toast.success(`HTML 导入成功`)
      closeDialog()
    }
    else {
      const errorMsg = result.errors?.join(`\n`) || `解析失败`
      toast.error(errorMsg)
    }
  }
  catch (err: any) {
    toast.error(err.message || `处理失败`)
  }
}

function closeDialog() {
  isShowImportHtmlDialog.value = false
  isDragover.value = false
  resetFileDialog()
  windStore.clearResult()
}

function onOpenChange(val: boolean) {
  if (!val) {
    closeDialog()
  }
}
</script>

<template>
  <Dialog :open="isShowImportHtmlDialog" @update:open="onOpenChange">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>导入 HTML 解析</DialogTitle>
        <DialogDescription>
          将本地保存的 HTML 网页（如微信文章源码）解析为 Markdown，支持自动提取正文和图床上传。
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-6 py-4">
        <!-- 拖拽上传区域 -->
        <div
          class="relative flex h-48 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors"
          :class="{
            'border-primary bg-primary/5': isDragover,
            'border-muted-foreground/25 hover:border-muted-foreground/50': !isDragover,
            'pointer-events-none opacity-50': processing,
          }"
          @click="openFileDialog()"
          @dragover.prevent="isDragover = true"
          @dragleave.prevent="isDragover = false"
          @drop="handleDrop"
        >
          <template v-if="!processing">
            <FileCode class="mb-3 size-12 text-muted-foreground" />
            <p class="text-sm text-muted-foreground font-medium">
              点击选择或拖拽 .html 文件到此处
            </p>
            <p class="mt-1 text-xs text-muted-foreground/70">
              仅支持 .html 或 .htm 格式
            </p>
          </template>

          <template v-else>
            <div class="flex flex-col items-center">
              <Loader2 class="mb-3 size-10 animate-spin text-primary" />
              <p class="text-sm font-medium">
                {{ currentStep }}
              </p>
              <div class="mt-4 w-48 px-2">
                <Progress :model-value="progress" class="h-1" />
              </div>
            </div>
          </template>
        </div>

        <!-- 选项配置 -->
        <div class="space-y-4">
          <div class="flex items-center justify-between rounded-lg border p-3">
            <div class="space-y-0.5">
              <label for="upload-images" class="text-sm font-medium">自动上传图片到图床</label>
              <p class="text-xs text-muted-foreground">
                将 HTML 中的图片记录通过图床转链
              </p>
            </div>
            <Switch id="upload-images" v-model:checked="uploadImages" :disabled="processing" />
          </div>

          <div class="flex items-center justify-between rounded-lg border p-3">
            <div class="space-y-0.5">
              <label for="format-content" class="text-sm font-medium flex items-center">
                <Wand2 class="mr-1.5 size-3.5 text-primary" />
                同时进行 AI 优化
              </label>
              <p class="text-xs text-muted-foreground">
                使用 AI 对转换后的 Markdown 进行排版润色
              </p>
            </div>
            <Switch id="format-content" v-model:checked="formatContent" :disabled="processing" />
          </div>
        </div>

        <!-- 错误提示 -->
        <div v-if="errors.length > 0" class="rounded-md bg-destructive/10 p-3">
          <p class="text-xs font-medium text-destructive">
            出现了一些错误：
          </p>
          <ul class="mt-1 list-disc pl-4 text-xs text-destructive/80">
            <li v-for="(err, i) in errors" :key="i">
              {{ err }}
            </li>
          </ul>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" :disabled="processing" @click="closeDialog">
          取消
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
