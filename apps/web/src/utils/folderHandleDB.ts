/**
 * 文件夹句柄持久化存储模块
 * 使用 IndexedDB 存储 FileSystemDirectoryHandle 对象
 * 以便在页面刷新后恢复文件夹访问
 */

const DB_NAME = `md-folder-handles`
const DB_VERSION = 1
const STORE_NAME = `handles`

interface StoredFolderHandle {
  id: string
  name: string
  handle: FileSystemDirectoryHandle
  timestamp: number
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: `id` })
      }
    }
  })
}

export async function saveFolderHandle(id: string, name: string, handle: FileSystemDirectoryHandle): Promise<void> {
  const db = await openDB()
  const transaction = db.transaction(STORE_NAME, `readwrite`)
  const store = transaction.objectStore(STORE_NAME)

  const data: StoredFolderHandle = {
    id,
    name,
    handle,
    timestamp: Date.now(),
  }

  return new Promise((resolve, reject) => {
    const request = store.put(data)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function getFolderHandle(id: string): Promise<StoredFolderHandle | null> {
  const db = await openDB()
  const transaction = db.transaction(STORE_NAME, `readonly`)
  const store = transaction.objectStore(STORE_NAME)

  return new Promise((resolve, reject) => {
    const request = store.get(id)
    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(request.error)
  })
}

export async function getAllFolderHandles(): Promise<StoredFolderHandle[]> {
  const db = await openDB()
  const transaction = db.transaction(STORE_NAME, `readonly`)
  const store = transaction.objectStore(STORE_NAME)

  return new Promise((resolve, reject) => {
    const request = store.getAll()
    request.onsuccess = () => resolve(request.result || [])
    request.onerror = () => reject(request.error)
  })
}

export async function deleteFolderHandle(id: string): Promise<void> {
  const db = await openDB()
  const transaction = db.transaction(STORE_NAME, `readwrite`)
  const store = transaction.objectStore(STORE_NAME)

  return new Promise((resolve, reject) => {
    const request = store.delete(id)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function clearAllFolderHandles(): Promise<void> {
  const db = await openDB()
  const transaction = db.transaction(STORE_NAME, `readwrite`)
  const store = transaction.objectStore(STORE_NAME)

  return new Promise((resolve, reject) => {
    const request = store.clear()
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function verifyFolderPermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
  try {
    const permission = await handle.requestPermission({ mode: `readwrite` })
    return permission === `granted`
  }
  catch {
    return false
  }
}