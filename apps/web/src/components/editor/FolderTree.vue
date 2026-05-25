<script setup lang="ts">
import type { FileSystemNode } from '@/stores/folderSource'
import { ChevronDown, ChevronRight, File, Folder, FolderOpen } from 'lucide-vue-next'
import { FilePlus2, FolderPlus, Pencil, Trash2 } from 'lucide-vue-next'

interface Props {
  nodes: FileSystemNode[]
  selectedPath?: string
  expandedPaths?: Set<string>
  dropTargetPath?: string
  level?: number
}

interface Emits {
  (e: 'select', node: FileSystemNode): void
  (e: 'toggleExpand', path: string): void
  (e: 'dragstart', node: FileSystemNode): void
  (e: 'dragover', node: FileSystemNode): void
  (e: 'drop', node: FileSystemNode): void
  (e: 'dragend'): void
  (e: 'rename', node: FileSystemNode): void
  (e: 'delete', node: FileSystemNode): void
  (e: 'createFile', node: FileSystemNode): void
  (e: 'createFolder', node: FileSystemNode): void
}

const props = withDefaults(defineProps<Props>(), {
  level: 0,
  expandedPaths: () => new Set<string>(),
})

const emit = defineEmits<Emits>()

const isSelected = (path: string) => props.selectedPath === path

const isExpanded = (path: string) => props.expandedPaths.has(path)
const isDropTarget = (path: string) => props.dropTargetPath === path

function handleNodeClick(node: FileSystemNode, event: MouseEvent) {
  event.stopPropagation()
  if (node.type === `file`) {
    emit(`select`, node)
  }
  else {
    emit(`toggleExpand`, node.path)
  }
}

function handleToggleClick(node: FileSystemNode, event: MouseEvent) {
  event.stopPropagation()
  if (node.type === `directory`) {
    emit(`toggleExpand`, node.path)
  }
}

function handleDragStart(node: FileSystemNode) {
  if (node.type === `file`) {
    emit(`dragstart`, node)
  }
}

function handleDragOver(node: FileSystemNode, event: DragEvent) {
  if (node.type !== `directory`) {
    return
  }
  event.preventDefault()
  emit(`dragover`, node)
}

function handleDrop(node: FileSystemNode, event: DragEvent) {
  if (node.type !== `directory`) {
    return
  }
  event.preventDefault()
  emit(`drop`, node)
}

function handleRename(node: FileSystemNode, event: MouseEvent) {
  event.stopPropagation()
  emit(`rename`, node)
}

function handleDelete(node: FileSystemNode, event: MouseEvent) {
  event.stopPropagation()
  emit(`delete`, node)
}

function handleCreateFile(node: FileSystemNode, event: MouseEvent) {
  event.stopPropagation()
  emit(`createFile`, node)
}

function handleCreateFolder(node: FileSystemNode, event: MouseEvent) {
  event.stopPropagation()
  emit(`createFolder`, node)
}
</script>

<template>
  <div class="folder-tree">
    <template v-for="node in nodes" :key="node.path">
      <!-- 节点本身 -->
      <div
        class="tree-node"
        :class="{
          selected: isSelected(node.path),
          'drop-target': isDropTarget(node.path),
          directory: node.type === 'directory',
          file: node.type === 'file',
        }"
        :style="{ paddingLeft: `${level * 16 + 8}px` }"
        :draggable="node.type === 'file'"
        @click="handleNodeClick(node, $event)"
        @dragstart="handleDragStart(node)"
        @dragover="handleDragOver(node, $event)"
        @drop="handleDrop(node, $event)"
        @dragend="emit('dragend')"
      >
        <!-- 展开/折叠图标 -->
        <span
          v-if="node.type === 'directory'"
          class="toggle-icon"
          @click="handleToggleClick(node, $event)"
        >
          <ChevronRight v-if="!isExpanded(node.path)" class="h-4 w-4" />
          <ChevronDown v-else class="h-4 w-4" />
        </span>
        <span v-else class="toggle-icon-placeholder" />

        <!-- 文件/文件夹图标 -->
        <span class="node-icon">
          <Folder v-if="node.type === 'directory' && !isExpanded(node.path)" class="h-4 w-4" />
          <FolderOpen v-else-if="node.type === 'directory' && isExpanded(node.path)" class="h-4 w-4" />
          <File v-else class="h-4 w-4" />
        </span>

        <!-- 节点名称 -->
        <span class="node-name" :title="node.name">
          {{ node.name }}
        </span>

        <span class="node-actions">
          <button
            v-if="node.type === 'directory'"
            class="node-action-btn"
            title="在此目录下新建文件"
            @click="handleCreateFile(node, $event)"
          >
            <FilePlus2 class="h-3 w-3" />
          </button>
          <button
            v-if="node.type === 'directory'"
            class="node-action-btn"
            title="在此目录下新建文件夹"
            @click="handleCreateFolder(node, $event)"
          >
            <FolderPlus class="h-3 w-3" />
          </button>
          <button
            class="node-action-btn"
            title="重命名"
            @click="handleRename(node, $event)"
          >
            <Pencil class="h-3 w-3" />
          </button>
          <button
            class="node-action-btn"
            title="删除"
            @click="handleDelete(node, $event)"
          >
            <Trash2 class="h-3 w-3" />
          </button>
        </span>
      </div>

      <!-- 递归渲染子节点（紧接在父节点之后） -->
      <FolderTree
        v-if="node.type === 'directory' && isExpanded(node.path) && node.children"
        :nodes="node.children"
        :selected-path="selectedPath"
        :expanded-paths="expandedPaths"
        :drop-target-path="dropTargetPath"
        :level="level + 1"
        @select="emit('select', $event)"
        @toggle-expand="emit('toggleExpand', $event)"
        @dragstart="emit('dragstart', $event)"
        @dragover="emit('dragover', $event)"
        @drop="emit('drop', $event)"
        @dragend="emit('dragend')"
        @rename="emit('rename', $event)"
        @delete="emit('delete', $event)"
        @create-file="emit('createFile', $event)"
        @create-folder="emit('createFolder', $event)"
      />
    </template>
  </div>
</template>

<style scoped>
.folder-tree {
  user-select: none;
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.15s ease;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tree-node:hover {
  background-color: hsl(var(--accent) / 0.1);
}

.tree-node.selected {
  background-color: hsl(var(--accent) / 0.2);
  font-weight: 500;
}

.tree-node.drop-target {
  background-color: hsl(var(--primary) / 0.15);
  outline: 1px solid hsl(var(--primary) / 0.45);
}

.toggle-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.toggle-icon-placeholder {
  width: 16px;
  flex-shrink: 0;
}

.node-icon {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  color: hsl(var(--muted-foreground));
}

.tree-node.selected .node-icon {
  color: hsl(var(--primary));
}

.node-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
}

.node-actions {
  display: none;
  align-items: center;
  gap: 2px;
}

.tree-node:hover .node-actions {
  display: inline-flex;
}

.node-action-btn {
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: hsl(var(--muted-foreground));
  cursor: pointer;
}

.node-action-btn:hover {
  background: hsl(var(--accent));
  color: hsl(var(--accent-foreground));
}

.tree-node.directory .node-name {
  font-weight: 500;
}
</style>
