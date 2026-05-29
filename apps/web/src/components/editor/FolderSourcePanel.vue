<script setup lang="ts">
import {
  Download,
  FilePlus,
  FolderClosed,
  FolderOpen,
  FolderPlus,
  FolderTree as FolderTreeIcon,
  Loader2,
  RefreshCw,
  X,
} from 'lucide-vue-next'
import { useFolderFileSync } from '@/composables/useFolderFileSync'
import { useEditorStore } from '@/stores/editor'
import { useFolderSourceStore } from '@/stores/folderSource'
import { usePostStore } from '@/stores/post'
import { useTemplateStore } from '@/stores/template'
import { useUIStore } from '@/stores/ui'
import FolderTree from './FolderTree.vue'

const editorStore = useEditorStore()
const folderSourceStore = useFolderSourceStore()
const postStore = usePostStore()
const templateStore = useTemplateStore()
const uiStore = useUIStore()
const { setCurrentFilePath } = useFolderFileSync()

const { isMobile, isOpenFolderPanel } = storeToRefs(uiStore)

// 控制是否启用动画
const enableAnimation = ref(false)

watch(isOpenFolderPanel, () => {
  if (isMobile.value) {
    enableAnimation.value = true
  }
})

watch(isMobile, () => {
  enableAnimation.value = false
})

const {
  currentFolderHandle,
  fileTree,
  selectedFilePath,
  isLoading,
  loadError,
  isFileSystemAPISupported,
  lastFolderName,
} = storeToRefs(folderSourceStore)

const expandedPaths = ref<Set<string>>(new Set())
const draggingFilePath = ref<string | null>(null)
const dropTargetPath = ref<string | null>(null)

// 组件挂载时自动恢复之前保存的文件夹
onMounted(async () => {
  const result = await folderSourceStore.restoreSavedFolders()
  if (result.restored && fileTree.value.length > 0) {
    expandedPaths.value.add(fileTree.value[0].path)
  }
  else if (result.lastFolderName) {
    toast.info(`上次打开的文件夹是「${result.lastFolderName}」，请点击按钮重新选择`)
  }
})

function handleToggleExpand(path: string) {
  if (expandedPaths.value.has(path)) {
    expandedPaths.value.delete(path)
  }
  else {
    expandedPaths.value.add(path)
  }
  // 触发响应式更新
  expandedPaths.value = new Set(expandedPaths.value)
}

async function handleSelectFolder() {
  await folderSourceStore.selectFolder()
  // 等待下一个 tick，确保 fileTree 已经更新
  await nextTick()
  // 展开根节点
  if (fileTree.value.length > 0) {
    expandedPaths.value.add(fileTree.value[0].path)
  }
}

async function handleRefreshFolder() {
  if (currentFolderHandle.value) {
    await folderSourceStore.loadFileTree(currentFolderHandle.value.handle)
  }
}

function handleCloseFolder() {
  folderSourceStore.closeFolder()
  expandedPaths.value.clear()
  setCurrentFilePath(null)
}

async function handleOpenFile(node: any) {
  try {
    const content = await folderSourceStore.readFile(node.path)

    // 直接复用当前文章，不再新建内容管理项
    const currentPost = postStore.currentPost
    if (currentPost) {
      postStore.updatePostContent(currentPost.id, content)
    }

    // 将文件内容导入编辑器，进入可编辑状态
    editorStore.importContent(content)

    // 记录当前文件路径以便自动同步
    setCurrentFilePath(node.path)

    toast.success(`已加载文件: ${node.name}`)
  }
  catch (error) {
    console.error(`打开文件失败:`, error)
  }
}

function normalizeFileName(name: string): string {
  return name
    .trim()
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
}

function ensureOpenedFolder(): boolean {
  if (!currentFolderHandle.value) {
    toast.error('请先打开本地文件夹')
    return false
  }
  return true
}

async function handleCreateFolder() {
  await handleCreateFolderAtPath(currentFolderHandle.value?.name || null)
}

async function handleCreateFolderAtPath(targetDirectoryPath: string | null) {
  if (!ensureOpenedFolder())
    return

  const input = window.prompt('请输入新文件夹名称')
  if (!input)
    return

  const folderName = normalizeFileName(input)
  if (!folderName) {
    toast.error('文件夹名称不能为空')
    return
  }

  try {
    const basePath = targetDirectoryPath || currentFolderHandle.value!.name
    await folderSourceStore.createDirectory(`${basePath}/${folderName}`)
    await folderSourceStore.loadFileTree(currentFolderHandle.value!.handle)
    expandedPaths.value.add(basePath)
    expandedPaths.value.add(`${basePath}/${folderName}`)
    expandedPaths.value = new Set(expandedPaths.value)
    toast.success(`已创建文件夹: ${folderName}`)
  }
  catch (error: any) {
    toast.error(`创建文件夹失败: ${error.message || '未知错误'}`)
  }
}

async function handleCreateFile() {
  await handleCreateFileAtPath(currentFolderHandle.value?.name || null)
}

async function handleCreateFileAtPath(targetDirectoryPath: string | null) {
  if (!ensureOpenedFolder())
    return

  const input = window.prompt('请输入新文件名（默认 .md）', '新文件.md')
  if (!input)
    return

  const normalized = normalizeFileName(input)
  if (!normalized) {
    toast.error('文件名不能为空')
    return
  }

  const fileName = normalized.toLowerCase().endsWith('.md') ? normalized : `${normalized}.md`

  try {
    const basePath = targetDirectoryPath || currentFolderHandle.value!.name
    await folderSourceStore.writeFile(`${basePath}/${fileName}`, `# ${fileName.replace(/\.md$/i, '')}\n`)
    await folderSourceStore.loadFileTree(currentFolderHandle.value!.handle)
    expandedPaths.value.add(basePath)
    expandedPaths.value = new Set(expandedPaths.value)
    toast.success(`已创建文件: ${fileName}`)
  }
  catch (error: any) {
    toast.error(`创建文件失败: ${error.message || '未知错误'}`)
  }
}

async function exportPostsToFolder() {
  if (!ensureOpenedFolder())
    return

  try {
    const rootName = currentFolderHandle.value!.name
    const contentDir = `${rootName}/content-management`
    await folderSourceStore.createDirectory(contentDir)

    type PostItem = (typeof postStore.posts)[number]
    const childMap = new Map<string | null, PostItem[]>()
    for (const post of postStore.posts) {
      const parentId = post.parentId ?? null
      if (!childMap.has(parentId)) {
        childMap.set(parentId, [])
      }
      childMap.get(parentId)!.push(post)
    }

    const exportNode = async (post: PostItem, baseDir: string) => {
      const safeName = normalizeFileName(post.title) || '未命名内容'
      const shortId = post.id.slice(0, 8)
      const children = childMap.get(post.id) || []

      if (children.length > 0) {
        const nodeDir = `${baseDir}/${safeName}-${shortId}`
        await folderSourceStore.createDirectory(nodeDir)
        await folderSourceStore.writeFile(`${nodeDir}/index.md`, post.content)
        for (const child of children) {
          await exportNode(child, nodeDir)
        }
      }
      else {
        await folderSourceStore.writeFile(`${baseDir}/${safeName}-${shortId}.md`, post.content)
      }
    }

    const roots = childMap.get(null) || []
    for (const root of roots) {
      await exportNode(root, contentDir)
    }

    await folderSourceStore.loadFileTree(currentFolderHandle.value!.handle)
    toast.success(`已导出 ${postStore.posts.length} 个内容文件到 content-management`) 
  }
  catch (error: any) {
    toast.error(`导出内容失败: ${error.message || '未知错误'}`)
  }
}

async function exportTemplatesToFolder() {
  if (!ensureOpenedFolder())
    return

  try {
    const rootName = currentFolderHandle.value!.name
    const templateDir = `${rootName}/template-management`
    await folderSourceStore.createDirectory(templateDir)

    for (const template of templateStore.templates) {
      const safeName = normalizeFileName(template.name) || '未命名模板'
      const shortId = template.id.slice(0, 8)
      const filePath = `${templateDir}/${safeName}-${shortId}.md`
      await folderSourceStore.writeFile(filePath, template.content)
    }

    const summaryPath = `${templateDir}/_templates_meta.json`
    await folderSourceStore.writeFile(summaryPath, JSON.stringify(templateStore.templates, null, 2))

    await folderSourceStore.loadFileTree(currentFolderHandle.value!.handle)
    toast.success(`已导出 ${templateStore.templates.length} 个模板文件到 template-management`)
  }
  catch (error: any) {
    toast.error(`导出模板失败: ${error.message || '未知错误'}`)
  }
}

function handleDragStart(node: any) {
  if (node.type !== 'file') {
    return
  }
  draggingFilePath.value = node.path
}

function handleDragOver(node: any) {
  if (node.type !== 'directory') {
    dropTargetPath.value = null
    return
  }
  dropTargetPath.value = node.path
}

function handleDragEnd() {
  draggingFilePath.value = null
  dropTargetPath.value = null
}

async function handleDropToDirectory(node: any) {
  if (!draggingFilePath.value || !currentFolderHandle.value || node.type !== 'directory') {
    handleDragEnd()
    return
  }

  const sourcePath = draggingFilePath.value
  const targetPath = node.path

  // 不能拖到当前同级目录（由 store 内部判定）
  try {
    await folderSourceStore.moveFile(sourcePath, targetPath)
    await folderSourceStore.loadFileTree(currentFolderHandle.value.handle)
    expandedPaths.value.add(targetPath)
    expandedPaths.value = new Set(expandedPaths.value)
    toast.success('文件移动成功')
  }
  catch (error: any) {
    toast.error(`文件移动失败: ${error.message || '未知错误'}`)
  }
  finally {
    handleDragEnd()
  }
}

async function handleRenameNode(node: any) {
  if (!ensureOpenedFolder())
    return

  const currentName = node.type === 'file' ? node.name.replace(/\.md$/i, '') : node.name
  const input = window.prompt('请输入新的名称', currentName)
  if (!input)
    return

  const normalized = normalizeFileName(input)
  if (!normalized) {
    toast.error('名称不能为空')
    return
  }

  const finalName = node.type === 'file'
    ? (normalized.toLowerCase().endsWith('.md') ? normalized : `${normalized}.md`)
    : normalized

  try {
    const newPath = await folderSourceStore.renameEntry(node.path, finalName, node.type)
    await folderSourceStore.loadFileTree(currentFolderHandle.value!.handle)

    if (selectedFilePath.value === node.path) {
      selectedFilePath.value = newPath
      setCurrentFilePath(newPath)
    }

    toast.success(`已重命名为: ${finalName}`)
  }
  catch (error: any) {
    toast.error(`重命名失败: ${error.message || '未知错误'}`)
  }
}

async function handleDeleteNode(node: any) {
  if (!ensureOpenedFolder())
    return

  const confirmText = node.type === 'directory'
    ? `确定删除文件夹「${node.name}」及其全部内容吗？`
    : `确定删除文件「${node.name}」吗？`

  if (!window.confirm(confirmText)) {
    return
  }

  try {
    await folderSourceStore.deleteEntry(node.path, node.type)
    await folderSourceStore.loadFileTree(currentFolderHandle.value!.handle)

    if (selectedFilePath.value === node.path) {
      selectedFilePath.value = ''
      setCurrentFilePath(null)
    }

    toast.success(`已删除: ${node.name}`)
  }
  catch (error: any) {
    toast.error(`删除失败: ${error.message || '未知错误'}`)
  }
}

function handleCreateFileInNode(node: any) {
  if (node.type !== 'directory')
    return
  handleCreateFileAtPath(node.path)
}

function handleCreateFolderInNode(node: any) {
  if (node.type !== 'directory')
    return
  handleCreateFolderAtPath(node.path)
}
</script>

<template>
  <!-- 移动端遮罩层 -->
  <Transition name="fade">
    <div
      v-if="isMobile && isOpenFolderPanel"
      class="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
      @click="isOpenFolderPanel = false"
    />
  </Transition>

  <div
    class="folder-source-panel h-full flex flex-col"
    :class="{
      'fixed top-0 left-0 z-55 w-full bg-background border-r border-border shadow-xl': isMobile,
      'animate-slider': isMobile && enableAnimation,
    }"
    :style="isMobile ? { transform: isOpenFolderPanel ? 'translateX(0)' : 'translateX(-100%)' } : undefined"
  >
    <!-- 头部工具栏 -->
    <div class="panel-header sticky top-0 z-10 bg-background border-b p-2">
      <div class="flex items-center justify-between mb-2">
        <h3 class="text-sm font-semibold flex items-center gap-2">
          <FolderTreeIcon class="h-4 w-4" />
          本地文件夹
        </h3>
        <div class="flex items-center gap-1">
          <Button
            v-if="currentFolderHandle"
            variant="ghost"
            size="sm"
            class="h-7 w-7 p-0"
            title="关闭文件夹"
            @click="handleCloseFolder"
          >
            <FolderClosed class="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            class="h-7 w-7 p-0"
            title="关闭面板"
            @click="isOpenFolderPanel = false"
          >
            <X class="h-3 w-3" />
          </Button>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="flex gap-1">
        <Button
          variant="outline"
          size="sm"
          class="flex-1 text-xs"
          :disabled="isLoading || !isFileSystemAPISupported"
          @click="handleSelectFolder"
        >
          <FolderPlus v-if="!isLoading" class="h-3 w-3 mr-1" />
          <Loader2 v-else class="h-3 w-3 mr-1 animate-spin" />
          打开文件夹
        </Button>

        <Button
          v-if="currentFolderHandle"
          variant="outline"
          size="sm"
          class="text-xs"
          :disabled="isLoading"
          title="新建文件夹"
          @click="handleCreateFolder"
        >
          <FolderPlus class="h-3 w-3" />
        </Button>

        <Button
          v-if="currentFolderHandle"
          variant="outline"
          size="sm"
          class="text-xs"
          :disabled="isLoading"
          title="新建 Markdown 文件"
          @click="handleCreateFile"
        >
          <FilePlus class="h-3 w-3" />
        </Button>

        <Button
          v-if="currentFolderHandle"
          variant="outline"
          size="sm"
          class="text-xs"
          :disabled="isLoading"
          @click="handleRefreshFolder"
        >
          <RefreshCw class="h-3 w-3" :class="{ 'animate-spin': isLoading }" />
        </Button>
      </div>

      <div v-if="currentFolderHandle" class="grid grid-cols-2 gap-1 mt-1">
        <Button
          variant="outline"
          size="sm"
          class="text-xs"
          :disabled="isLoading"
          @click="exportPostsToFolder"
        >
          <Download class="h-3 w-3 mr-1" />
          导出内容
        </Button>
        <Button
          variant="outline"
          size="sm"
          class="text-xs"
          :disabled="isLoading"
          @click="exportTemplatesToFolder"
        >
          <Download class="h-3 w-3 mr-1" />
          导出模板
        </Button>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="panel-content flex-1 overflow-y-auto p-2">
      <!-- 不支持 API 的提示 -->
      <div
        v-if="!isFileSystemAPISupported"
        class="flex flex-col items-center justify-center h-full text-center p-4 text-muted-foreground"
      >
        <FolderClosed class="h-12 w-12 mb-2 opacity-50" />
        <p class="text-sm">
          您的浏览器不支持本地文件夹访问
        </p>
        <p class="text-xs mt-1">
          请使用 Chrome、Edge 或 Opera 浏览器
        </p>
      </div>

      <!-- 加载中 -->
      <div
        v-else-if="isLoading"
        class="flex flex-col items-center justify-center h-full"
      >
        <Loader2 class="h-8 w-8 animate-spin text-primary" />
        <p class="text-sm text-muted-foreground mt-2">
          加载中...
        </p>
      </div>

      <!-- 错误提示 -->
      <div
        v-else-if="loadError"
        class="flex flex-col items-center justify-center h-full text-center p-4 text-destructive"
      >
        <p class="text-sm">
          {{ loadError }}
        </p>
      </div>

      <!-- 空状态 -->
      <div
        v-else-if="!currentFolderHandle"
        class="flex flex-col items-center justify-center h-full text-center p-4 text-muted-foreground"
      >
        <FolderOpen class="h-12 w-12 mb-2 opacity-50" />
        <p class="text-sm">
          未打开文件夹
        </p>
        <p v-if="lastFolderName" class="text-xs mt-1 text-primary">
          上次打开: {{ lastFolderName }}
        </p>
        <p class="text-xs mt-1">
          点击上方按钮打开本地文件夹
        </p>
      </div>

      <!-- 文件树 -->
      <div v-else class="file-tree-container">
        <div class="text-xs text-muted-foreground mb-2 px-2">
          {{ currentFolderHandle.name }}
        </div>
        <FolderTree
          :nodes="fileTree"
          :selected-path="selectedFilePath"
          :expanded-paths="expandedPaths"
          :drop-target-path="dropTargetPath || undefined"
          @select="handleOpenFile"
          @toggle-expand="handleToggleExpand"
          @dragstart="handleDragStart"
          @dragover="handleDragOver"
          @drop="handleDropToDirectory"
          @dragend="handleDragEnd"
          @rename="handleRenameNode"
          @delete="handleDeleteNode"
          @create-file="handleCreateFileInNode"
          @create-folder="handleCreateFolderInNode"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.folder-source-panel {
  background-color: hsl(var(--background));
}

.panel-header {
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.panel-content {
  min-height: 0;
}

.file-tree-container {
  min-height: 100%;
}

/* 移动端侧边栏动画 */
.animate-slider {
  transition: transform 300ms cubic-bezier(0.16, 1, 0.3, 1);
}

/* 遮罩动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 200ms ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
