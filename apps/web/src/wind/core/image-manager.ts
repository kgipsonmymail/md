/**
 * 图片管理器
 * 统一管理图片上传、缓存和 URL 替换
 */

import type { GitHubImageHost } from '../services/github-image-host'
import type { ImageAsset, UploadResult } from '../types'

export class ImageManager {
  private imageHost: GitHubImageHost
  private uploadedImages: Map<string, UploadResult> = new Map()

  constructor(imageHost: GitHubImageHost) {
    this.imageHost = imageHost
  }

  /**
   * 上传单张图片
   */
  async uploadImage(image: ImageAsset): Promise<UploadResult> {
    // 检查是否已上传
    const cached = this.uploadedImages.get(image.id)
    if (cached) {
      return cached
    }

    // 上传到图床
    const result = await this.imageHost.upload(image.blob, image.originalName)

    // 缓存结果
    this.uploadedImages.set(image.id, result)

    return result
  }

  /**
   * 批量上传图片
   */
  async uploadImages(images: ImageAsset[]): Promise<Map<string, UploadResult>> {
    const results = new Map<string, UploadResult>()

    for (const image of images) {
      try {
        const result = await this.uploadImage(image)
        results.set(image.id, result)
      }
      catch (error) {
        console.error(`上传图片失败: ${image.originalName}`, error)
        throw error
      }
    }

    return results
  }

  /**
   * 在 Markdown 中替换图片 URL
   */
  replaceImageUrls(content: string, images: ImageAsset[]): string {
    let result = content

    // 按位置倒序排列，避免替换时位置偏移
    const sortedImages = [...images].sort((a, b) => b.position - a.position)

    for (const image of sortedImages) {
      const uploadResult = this.uploadedImages.get(image.id)
      if (!uploadResult)
        continue

      // 获取最终 URL（优先 CDN）
      const finalUrl = this.imageHost.getFinalUrl(uploadResult)

      // 查找并替换图片
      // 支持多种格式：
      // 1. data:image base64
      // 2. 本地路径
      // 3. PLACEHOLDER_xxx

      // 替换 base64 图片 - 使用位置精确匹配
      const base64Regex = /!\[([^\]]*)\]\((data:image\/[^;]+;base64,[^)]+)\)/g
      let matchIndex = 0
      while (true) {
        const match = base64Regex.exec(result)
        if (!match)
          break

        // 检查这个匹配是否在正确的位置
        const matchPosition = match.index
        if (matchPosition === image.position) {
          // 找到正确位置的图片，进行替换
          const before = result.substring(0, matchPosition)
          const after = result.substring(matchPosition + match[0].length)
          result = `${before}![${match[1] || image.alt || ''}](${finalUrl})${after}`
          break
        }
        matchIndex++
        // 防止无限循环
        if (matchIndex > 1000)
          break
      }

      // 替换占位符
      result = result.replace(
        new RegExp(`PLACEHOLDER_${image.id}`, 'g'),
        finalUrl,
      )
    }

    return result
  }

  /**
   * 提取 Markdown 中的所有图片 URL
   */
  extractImageUrls(content: string): string[] {
    const urls: string[] = []
    const regex = /!\[.*?\]\((.*?)\)/g

    let match = regex.exec(content)
    while (match !== null) {
      urls.push(match[1])
      match = regex.exec(content)
    }

    return urls
  }

  /**
   * 验证图片 URL 是否可访问
   */
  async validateImageUrl(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, { method: 'HEAD' })
      return response.ok
    }
    catch {
      return false
    }
  }

  /**
   * 批量验证图片 URL
   */
  async validateAllImages(content: string): Promise<{ url: string, valid: boolean }[]> {
    const urls = this.extractImageUrls(content)
    const results = await Promise.all(
      urls.map(async url => ({
        url,
        valid: await this.validateImageUrl(url),
      })),
    )
    return results
  }

  /**
   * 获取上传统计
   */
  getUploadStats() {
    return {
      total: this.uploadedImages.size,
      images: Array.from(this.uploadedImages.values()),
    }
  }

  /**
   * 清除缓存
   */
  clearCache() {
    this.uploadedImages.clear()
  }
}
