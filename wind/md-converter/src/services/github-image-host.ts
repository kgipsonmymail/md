import { createHash } from 'crypto'

export interface GitHubConfig {
  token: string
  owner: string
  repo: string
  branch: string
  path: string
  useCDN: boolean
}

export interface UploadResult {
  originalName: string
  url: string
  cdnUrl?: string
  path: string
  sha: string
}

export class GitHubImageHost {
  private config: GitHubConfig
  private cache: Map<string, UploadResult> = new Map()

  constructor() {
    this.config = {
      token: process.env.GITHUB_TOKEN || '',
      owner: process.env.GITHUB_REPO?.split('/')[0] || '',
      repo: process.env.GITHUB_REPO?.split('/')[1] || '',
      branch: process.env.GITHUB_BRANCH || 'main',
      path: process.env.GITHUB_DIR || 'wind-assets',
      useCDN: true,
    }
  }

  async upload(base64: string, contentType: string): Promise<string | null> {
    try {
      const hash = this.calculateHash(base64)
      const ext = contentType.split('/')[1] || 'png'
      const fileName = `${hash}.${ext}`
      const filePath = `${this.config.path}/${this.getDatePath(fileName)}`

      const exists = await this.checkFileExists(filePath)
      if (exists) {
        return this.getCdnUrl(filePath)
      }

      const result = await this.uploadToGitHub(filePath, base64, fileName)
      return result.cdnUrl || result.url
    } catch (error) {
      console.error('Upload failed:', error)
      return null
    }
  }

  private calculateHash(content: string): string {
    return createHash('md5').update(content, 'base64').digest('hex')
  }

  private getDatePath(fileName: string): string {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    return `${year}/${month}/${fileName}`
  }

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
      return response.ok
    } catch {
      return false
    }
  }

  private async uploadToGitHub(path: string, content: string, fileName: string): Promise<UploadResult> {
    const url = `https://api.github.com/repos/${this.config.owner}/${this.config.repo}/contents/${path}`

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.config.token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({
        message: `Upload image: ${fileName}`,
        content,
        branch: this.config.branch,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }))
      throw new Error(`GitHub upload failed: ${error.message}`)
    }

    const data = await response.json()
    const rawUrl = `https://raw.githubusercontent.com/${this.config.owner}/${this.config.repo}/${this.config.branch}/${path}`

    return {
      originalName: fileName,
      url: rawUrl,
      cdnUrl: this.getCdnUrl(path),
      path,
      sha: data.content.sha,
    }
  }

  private getCdnUrl(path: string): string {
    return `https://cdn.jsdelivr.net/gh/${this.config.owner}/${this.config.repo}@${this.config.branch}/${path}`
  }
}