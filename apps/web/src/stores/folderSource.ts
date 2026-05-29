import { clearAllFolderHandles, deleteFolderHandle, getAllFolderHandles, saveFolderHandle, verifyFolderPermission } from '@/utils/folderHandleDB'
import { store } from '@/utils/storage'
import { addPrefix } from '@/utils'

/**
 * 文件系统节点接口
 */
export interface FileSystemNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileSystemNode[]
  handle?: FileSystemFileHandle | FileSystemDirectoryHandle
}

/**
 * 运行时文件夹信息（包含 handle，仅在内存中）
 */
interface RuntimeFolderInfo {
  id: string
  name: string
  handle: FileSystemDirectoryHandle
}

/**
 * Safely extract a message from an unknown error value.
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error)
    return error.message
  return String(error)
}

/**
 * Safely extract the error name from an unknown error value.
 */
function getErrorName(error: unknown): string {
  if (error instanceof Error)
    return error.name
  return `UnknownError`
}

/**
 * 本地文件夹源 Store
 * 负责管理本地文件夹的访问、文件树结构和文件读写
 */
export const useFolderSourceStore = defineStore(`folderSource`, () => {
  // 内存中的运行时文件夹信息（不持久化）
  const runtimeFolderMap = new Map<string, RuntimeFolderInfo>()

  // 当前激活的文件夹 ID（不持久化）
  const currentFolderId = ref<string | null>(null)

  // 当前文件夹的文件树（不持久化，因为包含不可序列化的 handle）
  const fileTree = ref<FileSystemNode[]>([])

  // 选中的文件路径
  const selectedFilePath = ref<string>(``)

  // 是否正在加载
  const isLoading = ref(false)

  // 加载错误信息
  const loadError = ref<string>(``)

  // 上次打开的文件夹名称（持久化到 localStorage）
  const lastFolderName = store.reactive<string>(addPrefix(`last_folder_name`), ``)

  // 当前运行时文件夹
  const currentRuntimeFolder = computed(() => {
    if (!currentFolderId.value)
      return null
    return runtimeFolderMap.get(currentFolderId.value) || null
  })

  // 兼容旧代码的属性
  const folderHandles = computed(() => {
    return Array.from(runtimeFolderMap.values()).map(folder => ({
      id: folder.id,
      name: folder.name,
      handle: folder.handle,
      permission: true,
    }))
  })

  const currentFolderHandle = computed(() => {
    if (!currentRuntimeFolder.value)
      return null
    return {
      id: currentRuntimeFolder.value.id,
      name: currentRuntimeFolder.value.name,
      handle: currentRuntimeFolder.value.handle,
      permission: true,
    }
  })

  // 兼容：savedFolders 返回空数组
  const savedFolders = ref<any[]>([])

  // 检查浏览器是否支持 File System Access API
  const isFileSystemAPISupported = computed(() => {
    return typeof window !== `undefined` && `showDirectoryPicker` in window
  })

  /**
   * 选择并打开本地文件夹
   */
  async function selectFolder() {
    if (!isFileSystemAPISupported.value) {
      toast.error(`您的浏览器不支持 File System Access API`)
      return
    }

    try {
      isLoading.value = true
      loadError.value = ``

      const handle = await window.showDirectoryPicker({
        mode: `readwrite`,
        startIn: `documents`,
      })

      // 请求权限
      const permission = await handle.requestPermission({ mode: `readwrite` })
      if (permission !== `granted`) {
        toast.error(`未授予文件夹访问权限`)
        return
      }

      // 检查是否已经打开过这个文件夹
      let folderId: string
      const existingFolder = Array.from(runtimeFolderMap.values()).find(f => f.name === handle.name)

      if (existingFolder) {
        folderId = existingFolder.id
        // 更新 handle
        existingFolder.handle = handle
      }
      else {
        // 创建新文件夹信息
        folderId = generateFolderId()
        const folderInfo: RuntimeFolderInfo = {
          id: folderId,
          name: handle.name,
          handle,
        }
        runtimeFolderMap.set(folderId, folderInfo)
      }

      currentFolderId.value = folderId

      // 持久化到 IndexedDB
      await saveFolderHandle(folderId, handle.name, handle)

      // 保存文件夹名称到 localStorage
      lastFolderName.value = handle.name

      // 加载文件树
      await loadFileTree(handle)

      toast.success(`文件夹「${handle.name}」已打开`)
    }
    catch (error: unknown) {
      if (getErrorName(error) === `AbortError`) {
        // 用户取消了选择
        return
      }
      const msg = getErrorMessage(error)
      loadError.value = msg
      toast.error(`打开文件夹失败: ${msg}`)
    }
    finally {
      isLoading.value = false
    }
  }

  /**
   * 关闭当前文件夹
   */
  function closeFolder() {
    currentFolderId.value = null
    fileTree.value = []
    selectedFilePath.value = ``
  }

  /**
   * 恢复之前保存的文件夹
   * 从 IndexedDB 读取保存的文件夹句柄，验证权限后恢复
   */
  async function restoreSavedFolders(): Promise<{ restored: boolean, lastFolderName: string | null }> {
    if (!isFileSystemAPISupported.value) {
      return { restored: false, lastFolderName: null }
    }

    try {
      const savedHandles = await getAllFolderHandles()
      if (savedHandles.length === 0) {
        return { restored: false, lastFolderName: null }
      }

      // 按时间戳排序，恢复最近使用的文件夹
      savedHandles.sort((a, b) => b.timestamp - a.timestamp)

      const mostRecentName = savedHandles[0].name

      for (const saved of savedHandles) {
        const hasPermission = await verifyFolderPermission(saved.handle)
        if (hasPermission) {
          // 恢复到内存
          const folderId = saved.id
          const folderInfo: RuntimeFolderInfo = {
            id: folderId,
            name: saved.name,
            handle: saved.handle,
          }
          runtimeFolderMap.set(folderId, folderInfo)
          currentFolderId.value = folderId

          // 保存文件夹名称
          lastFolderName.value = saved.name

          // 加载文件树
          await loadFileTree(saved.handle)

          toast.success(`已恢复文件夹「${saved.name}」`)
          return { restored: true, lastFolderName: null }
        }
        else {
          // 权限被拒绝，从 IndexedDB 删除
          await deleteFolderHandle(saved.id)
        }
      }

      // 所有句柄都失效，保存最近的文件夹名称供提示
      lastFolderName.value = mostRecentName
      return { restored: false, lastFolderName: mostRecentName }
    }
    catch (error: any) {
      console.error(`恢复文件夹失败:`, error)
      return { restored: false, lastFolderName: null }
    }
  }

  /**
   * 清除所有保存的文件夹句柄
   */
  async function clearSavedFolders(): Promise<void> {
    await clearAllFolderHandles()
  }

  /**
   * 从列表中移除文件夹
   */
  async function removeFolder(folderId: string) {
    runtimeFolderMap.delete(folderId)

    // 从 IndexedDB 删除
    await deleteFolderHandle(folderId)

    // 如果关闭的是当前文件夹，清空当前状态
    if (currentFolderId.value === folderId) {
      closeFolder()
    }
  }

  /**
   * 加载文件树
   */
  async function loadFileTree(handle: FileSystemDirectoryHandle): Promise<void> {
    try {
      const tree = await buildFileTree(handle, handle.name)
      fileTree.value = [tree]
    }
    catch (error: unknown) {
      loadError.value = getErrorMessage(error)
      throw error
    }
  }

  /**
   * 递归构建文件树
   */
  async function buildFileTree(
    handle: FileSystemDirectoryHandle,
    path: string,
  ): Promise<FileSystemNode> {
    const node: FileSystemNode = {
      name: handle.name,
      path,
      type: `directory`,
      children: [],
      handle,
    }

    try {
      for await (const entry of handle.values()) {
        const entryPath = `${path}/${entry.name}`
        if (entry.kind === `file`) {
          // 只添加 Markdown 文件
          if (entry.name.toLowerCase().endsWith(`.md`)) {
            node.children!.push({
              name: entry.name,
              path: entryPath,
              type: `file`,
              handle: entry as FileSystemFileHandle,
            })
          }
        }
        else if (entry.kind === `directory`) {
          // 递归处理子目录
          const childNode = await buildFileTree(entry as FileSystemDirectoryHandle, entryPath)
          node.children!.push(childNode)
        }
      }

      // 排序：目录在前，文件在后，按名称排序
      node.children!.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === `directory` ? -1 : 1
        }
        return a.name.localeCompare(b.name, `zh-CN`)
      })
    }
    catch (error: unknown) {
      console.error(`读取目录失败: ${path}`, getErrorMessage(error))
    }

    return node
  }

  /**
   * 读取文件内容
   */
  async function readFile(filePath: string): Promise<string> {
    if (!currentRuntimeFolder.value) {
      throw new Error(`未选择文件夹`)
    }

    try {
      // 直接从文件树中查找节点
      const node = findNodeByPath(fileTree.value, filePath)
      if (!node) {
        throw new Error(`文件不存在: ${filePath}`)
      }

      if (node.type !== `file`) {
        throw new Error(`不是文件: ${filePath}`)
      }

      // 使用节点中存储的文件句柄
      const fileHandle = node.handle as FileSystemFileHandle
      const file = await fileHandle.getFile()
      return await file.text()
    }
    catch (error: unknown) {
      toast.error(`读取文件失败: ${getErrorMessage(error)}`)
      throw error
    }
  }

  /**
   * 写入文件内容
   */
  async function writeFile(filePath: string, content: string): Promise<void> {
    if (!currentRuntimeFolder.value) {
      throw new Error(`未选择文件夹`)
    }

    try {
      // 解析路径，找到对应的目录句柄
      const pathParts = filePath.split(`/`).slice(1) // 移除第一部分（文件夹名）
      const directoryPath = pathParts.slice(0, -1).join(`/`)
      const currentHandle = await ensureDirectoryHandle(directoryPath)

      // 获取或创建文件句柄
      const fileName = pathParts[pathParts.length - 1]
      const fileHandle = await currentHandle.getFileHandle(fileName, { create: true })

      // 写入内容
      const writable = await fileHandle.createWritable()
      await writable.write(content)
      await writable.close()
    }
    catch (error: unknown) {
      console.error(`保存文件失败: ${getErrorMessage(error)}`)
      throw error
    }
  }

  /**
   * 创建目录（支持多级目录）
   */
  async function createDirectory(dirPath: string): Promise<void> {
    if (!currentRuntimeFolder.value) {
      throw new Error(`未选择文件夹`)
    }

    try {
      const pathParts = dirPath.split(`/`).slice(1).filter(Boolean) // 移除第一部分（文件夹名）
      await ensureDirectoryHandle(pathParts.join(`/`))
    }
    catch (error: any) {
      console.error(`创建目录失败: ${error.message}`)
      throw error
    }
  }

  /**
   * 移动文件到目标目录
   */
  async function moveFile(sourceFilePath: string, targetDirectoryPath: string): Promise<string> {
    if (!currentRuntimeFolder.value) {
      throw new Error(`未选择文件夹`)
    }

    const sourceParts = sourceFilePath.split(`/`).slice(1).filter(Boolean)
    const targetParts = targetDirectoryPath.split(`/`).slice(1).filter(Boolean)

    if (sourceParts.length === 0 || targetParts.length === 0) {
      throw new Error(`路径无效`)
    }

    const fileName = sourceParts[sourceParts.length - 1]
    const sourceDirectoryParts = sourceParts.slice(0, -1)

    // 同目录下拖拽视为无变化
    if (sourceDirectoryParts.join(`/`) === targetParts.join(`/`)) {
      return sourceFilePath
    }

    const sourceDirectoryHandle = await getDirectoryHandleByParts(sourceDirectoryParts, false)
    const targetDirectoryHandle = await getDirectoryHandleByParts(targetParts, true)
    const sourceFileHandle = await sourceDirectoryHandle.getFileHandle(fileName)
    const sourceFile = await sourceFileHandle.getFile()

    const targetFileName = await getAvailableFileName(targetDirectoryHandle, fileName)
    const targetFileHandle = await targetDirectoryHandle.getFileHandle(targetFileName, { create: true })
    const writable = await targetFileHandle.createWritable()

    try {
      await writable.write(await sourceFile.arrayBuffer())
      await writable.close()
      await sourceDirectoryHandle.removeEntry(fileName)
      return `${currentRuntimeFolder.value.name}/${targetParts.join(`/`)}/${targetFileName}`
    }
    catch (error) {
      await writable.abort()
      throw error
    }
  }

  /**
   * 重命名文件或目录
   */
  async function renameEntry(
    sourcePath: string,
    newName: string,
    type: 'file' | 'directory',
  ): Promise<string> {
    if (!currentRuntimeFolder.value) {
      throw new Error(`未选择文件夹`)
    }

    const sourceParts = sourcePath.split(`/`).slice(1).filter(Boolean)
    if (sourceParts.length === 0) {
      throw new Error(`路径无效`)
    }

    const oldName = sourceParts[sourceParts.length - 1]
    const parentParts = sourceParts.slice(0, -1)
    const parentHandle = await getDirectoryHandleByParts(parentParts, false)

    if (type === `file`) {
      const oldFileHandle = await parentHandle.getFileHandle(oldName)
      const oldFile = await oldFileHandle.getFile()
      const finalName = await getAvailableFileName(parentHandle, newName)

      if (finalName === oldName) {
        return sourcePath
      }

      const newFileHandle = await parentHandle.getFileHandle(finalName, { create: true })
      const writable = await newFileHandle.createWritable()
      try {
        await writable.write(await oldFile.arrayBuffer())
        await writable.close()
        await parentHandle.removeEntry(oldName)
      }
      catch (error) {
        await writable.abort()
        throw error
      }

      return `${currentRuntimeFolder.value.name}/${parentParts.join(`/`)}${parentParts.length ? `/` : ``}${finalName}`
    }

    const finalDirectoryName = await getAvailableDirectoryName(parentHandle, newName)
    if (finalDirectoryName === oldName) {
      return sourcePath
    }

    const oldDirHandle = await parentHandle.getDirectoryHandle(oldName)
    const newDirHandle = await parentHandle.getDirectoryHandle(finalDirectoryName, { create: true })
    await copyDirectoryRecursive(oldDirHandle, newDirHandle)
    await parentHandle.removeEntry(oldName, { recursive: true })

    return `${currentRuntimeFolder.value.name}/${parentParts.join(`/`)}${parentParts.length ? `/` : ``}${finalDirectoryName}`
  }

  /**
   * 删除文件或目录
   */
  async function deleteEntry(path: string, type: 'file' | 'directory'): Promise<void> {
    if (!currentRuntimeFolder.value) {
      throw new Error(`未选择文件夹`)
    }

    const parts = path.split(`/`).slice(1).filter(Boolean)
    if (parts.length === 0) {
      throw new Error(`路径无效`)
    }

    const name = parts[parts.length - 1]
    const parentParts = parts.slice(0, -1)
    const parentHandle = await getDirectoryHandleByParts(parentParts, false)
    await parentHandle.removeEntry(name, { recursive: type === `directory` })
  }

  /**
   * 确保目录存在并返回目录句柄
   */
  async function ensureDirectoryHandle(directoryPath: string): Promise<FileSystemDirectoryHandle> {
    if (!currentRuntimeFolder.value) {
      throw new Error(`未选择文件夹`)
    }

    const pathParts = directoryPath.split(`/`).filter(Boolean)
    let currentHandle = currentRuntimeFolder.value.handle as FileSystemDirectoryHandle

    for (const dirName of pathParts) {
      currentHandle = await currentHandle.getDirectoryHandle(dirName, { create: true })
    }

    return currentHandle
  }

  /**
   * 根据路径片段获取目录句柄
   */
  async function getDirectoryHandleByParts(
    parts: string[],
    create: boolean,
  ): Promise<FileSystemDirectoryHandle> {
    if (!currentRuntimeFolder.value) {
      throw new Error(`未选择文件夹`)
    }

    let currentHandle = currentRuntimeFolder.value.handle as FileSystemDirectoryHandle
    for (const part of parts) {
      currentHandle = await currentHandle.getDirectoryHandle(part, { create })
    }
    return currentHandle
  }

  /**
   * 获取不冲突的目标文件名
   */
  async function getAvailableFileName(
    directoryHandle: FileSystemDirectoryHandle,
    fileName: string,
  ): Promise<string> {
    const dotIndex = fileName.lastIndexOf(`.`)
    const baseName = dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName
    const extension = dotIndex > 0 ? fileName.slice(dotIndex) : ``

    let index = 0
    while (true) {
      const candidate = index === 0 ? fileName : `${baseName} (${index})${extension}`
      try {
        await directoryHandle.getFileHandle(candidate)
        index += 1
      }
      catch {
        return candidate
      }
    }
  }

  /**
   * 获取不冲突的目录名
   */
  async function getAvailableDirectoryName(
    directoryHandle: FileSystemDirectoryHandle,
    directoryName: string,
  ): Promise<string> {
    let index = 0
    while (true) {
      const candidate = index === 0 ? directoryName : `${directoryName} (${index})`
      try {
        await directoryHandle.getDirectoryHandle(candidate)
        index += 1
      }
      catch {
        return candidate
      }
    }
  }

  /**
   * 递归复制目录内容
   */
  async function copyDirectoryRecursive(
    source: FileSystemDirectoryHandle,
    target: FileSystemDirectoryHandle,
  ): Promise<void> {
    for await (const entry of source.values()) {
      if (entry.kind === `file`) {
        const sourceFile = await (entry as FileSystemFileHandle).getFile()
        const targetFileHandle = await target.getFileHandle(entry.name, { create: true })
        const writable = await targetFileHandle.createWritable()
        try {
          await writable.write(await sourceFile.arrayBuffer())
          await writable.close()
        }
        catch (error) {
          await writable.abort()
          throw error
        }
      }
      else {
        const sourceChildDir = entry as FileSystemDirectoryHandle
        const targetChildDir = await target.getDirectoryHandle(sourceChildDir.name, { create: true })
        await copyDirectoryRecursive(sourceChildDir, targetChildDir)
      }
    }
  }

  /**
   * 在文件树中查找节点
   */
  function findNodeByPath(nodes: FileSystemNode[], path: string): FileSystemNode | null {
    for (const node of nodes) {
      if (node.path === path) {
        return node
      }
      if (node.children) {
        const found = findNodeByPath(node.children, path)
        if (found)
          return found
      }
    }
    return null
  }

  /**
   * 获取所有 Markdown 文件列表
   */
  function getAllMarkdownFiles(nodes: FileSystemNode[] = fileTree.value): FileSystemNode[] {
    const files: FileSystemNode[] = []
    for (const node of nodes) {
      if (node.type === `file`) {
        files.push(node)
      }
      if (node.children) {
        files.push(...getAllMarkdownFiles(node.children))
      }
    }
    return files
  }

  /**
   * 生成文件夹 ID
   */
  function generateFolderId(): string {
    return `folder_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
  }

  return {
    // State
    folderHandles, // 兼容旧代码
    currentFolderHandle, // 兼容旧代码
    savedFolders,
    fileTree,
    selectedFilePath,
    isLoading,
    loadError,
    lastFolderName,

    // Computed
    isFileSystemAPISupported,

    // Actions
    selectFolder,
    closeFolder,
    removeFolder,
    loadFileTree,
    readFile,
    writeFile,
    createDirectory,
    moveFile,
    renameEntry,
    deleteEntry,
    findNodeByPath,
    getAllMarkdownFiles,
    restoreSavedFolders,
    clearSavedFolders,
  }
})
