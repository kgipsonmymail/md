```
<script setup lang="ts">
import { Loader2, Wand2, Image as ImageIcon, Plus, Trash2, Settings } from 'lucide-vue-next'
import { ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { useEditorStore } from '@/stores/editor'
import { useUIStore } from '@/stores/ui'
import { useWindStore } from '@/wind/stores/wind'
import { useImageUploader } from '@/composables/useImageUploader'
import { useDraftStore } from '@/wind/stores/draft'
import WindConfigDialog from './WindConfigDialog.vue'

const editorStore = useEditorStore()
const uiStore = useUIStore()
const windStore = useWindStore()
const draftStore = useDraftStore()
const { upload } = useImageUploader()

const { isShowDraftEditorDialog } = storeToRefs(uiStore)
const { processing, currentStep, errors } = storeToRefs(windStore)
const { drafts, currentDraft, currentDraftId } = storeToRefs(draftStore)

const draftText = ref('')
const draftTitle = ref('')
const isUploading = ref(false)
const showConfigDialog = ref(false)

// Init/Sync content
watch(currentDraft, (newVal) => {
  if (newVal) {
    draftText.value = newVal.content
    draftTitle.value = newVal.title
  } else {
    draftText.value = ''
    draftTitle.value = ''
  }
}, { immediate: true })

// Auto save changes
watch([draftText, draftTitle], ([newText, newTitle]) => {
  if (currentDraftId.value && currentDraft.value) {
    if (newText !== currentDraft.value.content || newTitle !== currentDraft.value.title) {
      draftStore.updateDraft(currentDraftId.value, { content: newText, title: newTitle })
    }
  } else if (newText.trim() || newTitle.trim()) {
    draftStore.addDraft(newTitle || '未命名草稿', newText)
  }
})

function createNewDraft() {
  draftStore.addDraft('未命名草稿', '')
}

function selectDraft(id: string) {
  draftStore.setCurrentDraft(id)
}

function deleteDraft(id: string, e: Event) {
  e.stopPropagation()
  if (confirm('确定要删除这个草稿吗？')) {
    draftStore.deleteDraft(id)
  }
}


async function handlePaste(e: ClipboardEvent) {
  const items = e.clipboardData?.items
  if (!items) return

  let hasImage = false
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      hasImage = true
      break
    }
  }
  if (!hasImage) return

  // Prevent default if we are handling an image
  // Note: we let text paste through
  e.preventDefault()

  for (const item of items) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile()
      if (file) {
        await processAndInsertImage(file)
      }
    } else if (item.type === 'text/plain') {
      item.getAsString((str) => {
        insertAtCursor(str)
      })
    }
  }
}

async function handleDrop(e: DragEvent) {
  e.preventDefault()
  const files = e.dataTransfer?.files
  if (!files) return
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    if (file.type.startsWith('image/')) {
      await processAndInsertImage(file)
    }
  }
}

async function processAndInsertImage(file: File) {
  try {
    isUploading.value = true
    const placeholder = `\n![上传中...](${Date.now()})\n`
    insertAtCursor(placeholder)
    
    // Check if useCompression is true and handle if needed. 
    // For simplicity we just use the upload function directly as the hook handles config.
    const url = await upload(file)
    if (url) {
      draftText.value = draftText.value.replace(placeholder, `\n![](${url})\n`)
      toast.success('图片上传成功')
    } else {
      draftText.value = draftText.value.replace(placeholder, '')
      toast.error('图片获取URL失败')
    }
  } catch (err: any) {
    toast.error(err.message || '图片上传失败')
  } finally {
    isUploading.value = false
  }
}

function insertAtCursor(textToInsert: string) {
  const textarea = document.getElementById('draft-textarea') as HTMLTextAreaElement
  if (!textarea) {
    draftText.value += textToInsert
    return
  }
  const startPos = textarea.selectionStart
  const endPos = textarea.selectionEnd
  draftText.value = draftText.value.substring(0, startPos) + textToInsert + draftText.value.substring(endPos)
  setTimeout(() => {
    textarea.selectionStart = startPos + textToInsert.length
    textarea.selectionEnd = startPos + textToInsert.length
    textarea.focus()
  }, 0)
}

function triggerFileInput() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.multiple = true
  input.onchange = async (e: any) => {
    const files = e.target.files
    if (!files) return
    for (let i = 0; i < files.length; i++) {
      await processAndInsertImage(files[i])
    }
  }
  input.click()
}

async function startProcessing() {
  if (!draftText.value.trim()) {
    toast.error('请输入需要排版的草稿内容')
    return
  }
  try {
    const result = await windStore.formatOnly(draftText.value)
    if (result.success) {
      editorStore.importContent(result.markdown)
      toast.success('AI排版完成，已同步到编辑区')
      closeDialog()
    } else {
      const errorMsg = result.errors?.join('\n') || '解析失败'
      toast.error(errorMsg)
    }
  } catch (err: any) {
    toast.error(err.message || '处理失败')
  }
}

function closeDialog() {
  isShowDraftEditorDialog.value = false
  draftText.value = ''
  windStore.clearResult()
}

function onOpenChange(val: boolean) {
  if (!val) closeDialog()
}
</script>

<template>
  <Dialog :open="isShowDraftEditorDialog" @update:open="onOpenChange">
    <DialogContent class="sm:max-w-5xl flex gap-0 p-0 overflow-hidden h-[85vh]">
      <!-- 左侧画廊区 (草稿本) -->
      <div class="w-64 bg-muted/20 border-r flex flex-col h-full overflow-hidden">
        <div class="px-4 py-3 border-b flex items-center justify-between shadow-sm">
          <span class="font-semibold text-sm">本地草稿箱</span>
          <div class="flex items-center gap-1">
            <Button variant="ghost" size="icon" class="h-6 w-6 text-muted-foreground hover:text-foreground" @click="showConfigDialog = true" title="系统配置">
              <Settings class="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" class="h-6 w-6" @click="createNewDraft" :disabled="processing || isUploading">
              <Plus class="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div class="flex-1 overflow-y-auto p-2 space-y-2">
          <div 
            v-for="draft in drafts" 
            :key="draft.id"
            @click="selectDraft(draft.id)"
            class="group relative rounded-md border p-2 cursor-pointer transition-colors hover:bg-muted"
            :class="{ 'bg-primary/10 border-primary/50': currentDraftId === draft.id, 'bg-card': currentDraftId !== draft.id }"
          >
            <div class="flex items-start gap-2">
              <div v-if="draft.coverImage" class="h-10 w-10 shrink-0 overflow-hidden rounded bg-muted/50 border">
                <img :src="draft.coverImage" class="h-full w-full object-cover" />
              </div>
              <div v-else class="h-10 w-10 shrink-0 rounded bg-muted flex items-center justify-center border">
                <ImageIcon class="h-4 w-4 text-muted-foreground/50" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium truncate">{{ draft.title || '未命名' }}</div>
                <div class="text-[10px] text-muted-foreground mt-1">{{ new Date(draft.updateDatetime).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(/\//g, '-') }}</div>
              </div>
            </div>
            <Button
              variant="ghost" 
              size="icon" 
              class="absolute right-1 top-1 h-6 w-6 opacity-0 group-hover:opacity-100 bg-background/50 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-opacity"
              @click="deleteDraft(draft.id, $event)"
            >
              <Trash2 class="h-3 w-3" />
            </Button>
          </div>
          
          <div v-if="drafts.length === 0" class="text-center py-10 text-xs text-muted-foreground">
            暂无草稿内容
          </div>
        </div>
      </div>

      <!-- 右侧编辑器 -->
      <div class="flex-1 flex flex-col h-full bg-background relative relative">
        <DialogHeader class="px-6 py-4 border-b shrink-0">
          <DialogTitle>草稿加工区</DialogTitle>
          <DialogDescription>
            在此处粘贴原文本与图片。我们会自动将图片转存图床并在完成后一键提交AI排版。
          </DialogDescription>
        </DialogHeader>

        <div class="flex-1 flex flex-col p-6 overflow-hidden space-y-4">
          <input 
            v-model="draftTitle" 
            placeholder="草稿标题..." 
            class="text-lg font-bold bg-transparent border-none outline-none focus:ring-0 placeholder:text-muted-foreground shrink-0"
            :disabled="processing || isUploading"
          />
          <div class="relative flex-1">
            <textarea
              id="draft-textarea"
              v-model="draftText"
              class="w-full h-full p-3 text-sm rounded-md border border-input bg-muted/5 outline-none resize-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="正文内容... 
  （支持拖拽、直接粘贴图片截图至此输入框）"
              :disabled="processing || isUploading"
              @paste="handlePaste"
              @drop="handleDrop"
              @dragover.prevent
            ></textarea>
            
            <div class="absolute bottom-4 right-4 flex items-center pr-2">
               <Button type="button" variant="outline" size="sm" @click="triggerFileInput" :disabled="processing || isUploading" class="shadow-sm">
                <ImageIcon class="w-4 h-4 mr-1" />
                插入图片
              </Button>
            </div>

            <template v-if="processing || isUploading">
              <div class="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-10 rounded-md">
                <Loader2 class="mb-3 size-10 animate-spin text-primary" />
                <p class="text-sm font-medium text-foreground">
                  {{ isUploading ? '正在上传图片到图床...' : currentStep }}
                </p>
              </div>
            </template>
          </div>
          
          <!-- 错误提示 -->
          <div v-if="errors.length > 0" class="rounded-md bg-destructive/10 p-3 shrink-0">
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

        <DialogFooter class="px-6 py-4 border-t shrink-0">
          <Button variant="outline" :disabled="processing || isUploading" @click="closeDialog">
            退出
          </Button>
          <Button :disabled="processing || isUploading || !draftText.trim()" @click="startProcessing" class="font-semibold">
            <Wand2 class="mr-1.5 size-4" />
            一键 AI 排版
          </Button>
        </DialogFooter>
      </div>
    </DialogContent>
  </Dialog>
  <WindConfigDialog v-model:open="showConfigDialog" />
</template>
