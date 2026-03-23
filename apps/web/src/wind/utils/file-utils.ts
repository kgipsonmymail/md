/**
 * 文件处理工具函数
 */

import SparkMD5 from 'spark-md5'

/**
 * 计算文件 MD5 哈希
 */
export async function calculateFileHash(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    const spark = new SparkMD5.ArrayBuffer()

    reader.onload = (e) => {
      if (e.target?.result) {
        spark.append(e.target.result as ArrayBuffer)
        resolve(spark.end())
      }
      else {
        reject(new Error('文件读取失败'))
      }
    }

    reader.onerror = () => reject(new Error('文件读取错误'))
    reader.readAsArrayBuffer(file)
  })
}

/**
 * 将 Blob 转换为 Base64
 */
export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      resolve(result.split(',')[1]) // 移除 data:image/xxx;base64, 前缀
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * 将 Base64 转换为 Blob
 */
export function base64ToBlob(base64: string, mimeType: string = 'image/png'): Blob {
  const byteString = atob(base64)
  const ab = new ArrayBuffer(byteString.length)
  const ia = new Uint8Array(ab)

  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i)
  }

  return new Blob([ab], { type: mimeType })
}

/**
 * 生成唯一文件名
 */
export function generateUniqueFileName(originalName: string, hash: string): string {
  const ext = originalName.split('.').pop() || 'png'
  const timestamp = Date.now()
  const shortHash = hash.substring(0, 8)
  return `${timestamp}_${shortHash}.${ext}`
}

/**
 * 获取文件扩展名
 */
export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || ''
}

/**
 * 检查是否为图片文件
 */
export function isImageFile(filename: string): boolean {
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp']
  return imageExts.includes(getFileExtension(filename))
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0)
    return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / k ** i).toFixed(2)} ${sizes[i]}`
}

/**
 * 生成按日期组织的路径
 * 例如: 2024/03/image.png
 */
export function generateDatePath(filename: string): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}/${month}/${filename}`
}
