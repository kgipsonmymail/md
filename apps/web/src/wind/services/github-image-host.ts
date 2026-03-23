/**
 * GitHub 图床服务
 * 使用 GitHub API 上传图片并生成 CDN 链接
 */

import type { GitHubConfig, UploadResult } from '../types'
import { blobToBase64, calculateFileHash, generateDatePath } from '../utils/file-utils'

export class GitHubImageHost {
  private config: GitHubConfig
  private cache: Map<string, UploadResult> = new Map()

  constructor(config: GitHubConfig) {
    this.config = config
    this.loadCache()
  }

  /**
   * 从 localStorage 加载缓存
   */
  private loadCache() {
    try {
      const cached = localStorage.getItem('wind_github_image_cache')
      if (cached) {
        const data = JSON.parse(cached)
        this.cache = new Map(Object.entries(data))
      }
    }
    catch (error) {
      console.warn('加载图片缓存失败:', error)
    }
  }

  /**
   * 保存缓存到 localStorage
   */
  private saveCache() {
    try {
      const data = Object.fromEntries(this.cache)
      localStorage.setItem('wind_github_image_cache', JSON.stringify(data))
    }
    catch (error) {
      console.warn('保存图片缓存失败:', error)
    }
  }

  /**
   * 检查文件是否已存在于 GitHub
   */
  private async checkFileExists(path: string): Promise<boolean> {
    const url = `https://api.github.com/repos/${this.config.owner}/${this.config.repo}/contents/${path}`

    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.config.token}`,
          'Accept': 'application/vnd.github.v3+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      })

      return response.ok // 200 表示文件存在
    }
    catch (error) {
      console.warn('检查文件存在性失败:', error)
      return false // 失败时认为文件不存在
    }
  }

  /**
   * 上传图片到 GitHub
   */
  async upload(blob: Blob, originalName: string): Promise<UploadResult> {
    // 1. 计算文件哈希，检查缓存
    const hash = await calculateFileHash(blob)
    const cached = this.cache.get(hash)
    if (cached) {
      console.log('✅ 图片已存在，使用缓存:', cached.url)
      return cached
    }

    // 2. 生成文件名和路径（使用哈希值）
    const ext = originalName.split('.').pop() || 'png'
    const fileName = `${hash}.${ext}`
    const filePath = `${this.config.path}/${generateDatePath(fileName)}`

    // 3. 检查云端是否已存在
    console.log('🔍 检查云端是否已存在:', filePath)
    const exists = await this.checkFileExists(filePath)
    if (exists) {
      console.log('✅ 图片已存在（云端）:', filePath)

      // 生成 URL
      const rawUrl = `https://raw.githubusercontent.com/${this.config.owner}/${this.config.repo}/${this.config.branch}/${filePath}`
      const cdnUrl = this.config.useCDN
        ? `https://cdn.jsdelivr.net/gh/${this.config.owner}/${this.config.repo}@${this.config.branch}/${filePath}`
        : undefined

      const result = {
        originalName,
        url: rawUrl,
        cdnUrl,
        path: filePath,
        sha: '', // 无法获取 SHA，因为我们没有上传
      }

      // 缓存结果
      this.cache.set(hash, result)
      this.saveCache()

      return result
    }

    // 4. 转换为 Base64
    const base64Content = await blobToBase64(blob)

    // 5. 调用 GitHub API 上传
    const result = await this.uploadToGitHub(filePath, base64Content, originalName)

    // 6. 缓存结果
    this.cache.set(hash, result)
    this.saveCache()

    return result
  }

  /**
   * 验证 GitHub 配置是否正确
   */
  async validateConfig(): Promise<{ valid: boolean, error?: string }> {
    try {
      console.log('🔍 开始验证 GitHub 配置...')
      console.log(`   用户名: ${this.config.owner}`)
      console.log(`   仓库名: ${this.config.repo}`)
      console.log(`   分支名: ${this.config.branch}`)

      // 1. 验证仓库是否存在
      const repoUrl = `https://api.github.com/repos/${this.config.owner}/${this.config.repo}`
      console.log(`📡 请求仓库信息: ${repoUrl}`)

      const repoResponse = await fetch(repoUrl, {
        headers: {
          Authorization: `Bearer ${this.config.token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      })

      if (!repoResponse.ok) {
        if (repoResponse.status === 404) {
          return {
            valid: false,
            error: `仓库 ${this.config.owner}/${this.config.repo} 不存在或无权访问\n请检查：\n1. 用户名是否正确\n2. 仓库名是否正确\n3. 仓库是否为公开仓库`,
          }
        }
        if (repoResponse.status === 401 || repoResponse.status === 403) {
          return {
            valid: false,
            error: 'GitHub Token 无效或权限不足\n请确保 Token 有 repo 权限',
          }
        }
        const error = await repoResponse.json()
        return {
          valid: false,
          error: `GitHub 验证失败: ${error.message || repoResponse.statusText}`,
        }
      }

      console.log('✅ 仓库验证通过')

      // 2. 验证分支是否存在
      const branchUrl = `https://api.github.com/repos/${this.config.owner}/${this.config.repo}/branches/${this.config.branch}`
      console.log(`📡 请求分支信息: ${branchUrl}`)

      const branchResponse = await fetch(branchUrl, {
        headers: {
          Authorization: `Bearer ${this.config.token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      })

      if (!branchResponse.ok) {
        if (branchResponse.status === 404) {
          return {
            valid: false,
            error: `分支 ${this.config.branch} 不存在\nGitHub 仓库默认分支通常是 main 或 master\n请检查分支名是否正确`,
          }
        }
        const error = await branchResponse.json()
        return {
          valid: false,
          error: `分支验证失败: ${error.message || branchResponse.statusText}`,
        }
      }

      console.log('✅ 分支验证通过')
      console.log('✓ GitHub 配置验证成功！')

      return { valid: true }
    }
    catch (error) {
      console.error('❌ 验证失败:', error)
      return {
        valid: false,
        error: `GitHub 验证失败: ${(error as Error).message}`,
      }
    }
  }

  /**
   * 测试上传功能（创建简单文件）
   */
  async testUpload(): Promise<{ success: boolean, message: string }> {
    try {
      console.log('🔍 开始测试上传功能...')

      // 创建一个简单的 README.md 文件
      const testContent = '# Wind Image Host\n\nThis repository is used for storing images uploaded by Wind middleware.'
      const base64Content = btoa(unescape(encodeURIComponent(testContent)))
      const testPath = 'README.md'

      const url = `https://api.github.com/repos/${this.config.owner}/${this.config.repo}/contents/${testPath}`
      console.log(`📡 测试上传 URL: ${url}`)

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.config.token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify({
          message: 'Test upload from Wind middleware',
          content: base64Content,
          branch: this.config.branch,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('❌ 测试上传失败:', error)
        return {
          success: false,
          message: `测试上传失败: ${error.message || response.statusText}`,
        }
      }

      const data = await response.json()
      console.log('✅ 测试上传成功:', data)
      return {
        success: true,
        message: '测试上传成功！仓库已初始化',
      }
    }
    catch (error) {
      console.error('❌ 测试上传异常:', error)
      return {
        success: false,
        message: `测试上传异常: ${(error as Error).message}`,
      }
    }
  }

  /**
   * 调用 GitHub API 上传文件
   */
  private async uploadToGitHub(
    path: string,
    content: string,
    originalName: string,
  ): Promise<UploadResult> {
    const url = `https://api.github.com/repos/${this.config.owner}/${this.config.repo}/contents/${path}`

    console.log('📤 开始上传图片到 GitHub...')
    console.log(`   URL: ${url}`)
    console.log(`   文件名: ${originalName}`)
    console.log(`   分支: ${this.config.branch}`)
    console.log(`   路径: ${path}`)
    console.log(`   内容长度: ${content.length} 字符`)
    console.log(`   内容前 100 字符: ${content.substring(0, 100)}...`)

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.config.token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({
        message: `Upload image: ${originalName}`,
        content,
        branch: this.config.branch,
      }),
    })

    if (!response.ok) {
      let errorMsg = `GitHub 上传失败: ${response.statusText}`

      try {
        const error = await response.json()
        console.error('❌ 上传失败:', error)
        console.error('   状态码:', response.status)

        errorMsg = `GitHub 上传失败: ${error.message || response.statusText}`

        if (response.status === 404) {
          errorMsg = `仓库或路径不存在\n\n详细信息:\n- 仓库: ${this.config.owner}/${this.config.repo}\n- 分支: ${this.config.branch}\n- 路径: ${path}\n\n请检查：\n1. 仓库名是否正确\n2. 用户名是否正确\n3. 仓库是否存在\n4. 分支名是否正确\n\n建议：\n- 点击"测试 GitHub 连接"按钮验证配置\n- 确保仓库已创建且为公开仓库\n- 确保分支名正确（通常是 main 或 master）\n- 确保 Token 有足够的权限`
        }
        else if (response.status === 401 || response.status === 403) {
          errorMsg = `权限不足\n\n详细信息:\n- 状态码: ${response.status}\n- 错误: ${error.message || response.statusText}\n\n请确保：\n1. GitHub Token 有效\n2. Token 有 repo 权限\n3. Token 没有过期`
        }
        else if (response.status === 422) {
          errorMsg = `上传失败: ${error.message || '文件已存在或格式错误'}\n\n详细信息:\n${JSON.stringify(error, null, 2)}`
        }
      }
      catch (e) {
        console.error('❌ 解析错误响应失败:', e)
      }

      throw new Error(errorMsg)
    }

    const data = await response.json()
    console.log('✅ 上传成功:', data)

    // 生成原始 URL
    const rawUrl = `https://raw.githubusercontent.com/${this.config.owner}/${this.config.repo}/${this.config.branch}/${path}`

    // 生成 CDN URL
    const cdnUrl = this.config.useCDN
      ? `https://cdn.jsdelivr.net/gh/${this.config.owner}/${this.config.repo}@${this.config.branch}/${path}`
      : undefined

    console.log(`   原始 URL: ${rawUrl}`)
    console.log(`   CDN URL: ${cdnUrl || '未启用'}`)

    return {
      originalName,
      url: rawUrl,
      cdnUrl,
      path,
      sha: data.content.sha,
    }
  }

  /**
   * 批量上传图片
   */
  async uploadBatch(images: Array<{ blob: Blob, name: string }>): Promise<UploadResult[]> {
    const results: UploadResult[] = []

    for (const image of images) {
      try {
        const result = await this.upload(image.blob, image.name)
        results.push(result)
      }
      catch (error) {
        console.error(`上传图片失败: ${image.name}`, error)
        throw error
      }
    }

    return results
  }

  /**
   * 获取最终使用的 URL（优先 CDN）
   */
  getFinalUrl(result: UploadResult): string {
    return result.cdnUrl || result.url
  }

  /**
   * 清除缓存
   */
  clearCache() {
    this.cache.clear()
    localStorage.removeItem('wind_github_image_cache')
  }

  /**
   * 获取缓存统计
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      items: Array.from(this.cache.values()),
    }
  }
}
