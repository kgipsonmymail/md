/**
 * GitHub 图床上传测试脚本（带云端判重）
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 配置信息
const CONFIG = {
  token: process.env.GITHUB_TOKEN || 'YOUR_GITHUB_TOKEN',
  owner: 'kgipsonmymail',
  repo: 'image-home',
  branch: 'main',
  basePath: 'wind-assets',
  useCDN: true,
  testImagePath: path.join(__dirname, '../../../../docs/图1.png'),
}

// 缓存
const cache = new Map()

// 日志函数
function log(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString()
  const colors = {
    info: '\x1B[36m', // 青色
    success: '\x1B[32m', // 绿色
    error: '\x1B[31m', // 红色
    warning: '\x1B[33m', // 黄色
    reset: '\x1B[0m',
  }

  const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'
  console.log(`${colors[type]}[${timestamp}] ${icon} ${message}${colors.reset}`)
}

// 计算文件哈希
async function calculateFileHash(filePath) {
  const crypto = await import('node:crypto')
  const buffer = fs.readFileSync(filePath)
  const hash = crypto.createHash('md5')
  hash.update(buffer)
  return hash.digest('hex')
}

// 生成日期路径
function generateDatePath(fileName) {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}/${month}/${fileName}`
}

// 检查文件是否已存在于 GitHub
async function checkFileExists(filePath) {
  const url = `https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/contents/${filePath}`

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${CONFIG.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    })

    if (response.ok) {
      const data = await response.json()
      return { exists: true, sha: data.sha }
    }
    return { exists: false, sha: null }
  }
  catch (error) {
    console.warn('检查文件存在性失败:', error)
    return { exists: false, sha: null }
  }
}

// 测试 GitHub 连接
async function testConnection() {
  log('开始测试 GitHub 连接...', 'info')

  try {
    // 测试仓库
    log(`请求仓库信息: ${CONFIG.owner}/${CONFIG.repo}`, 'info')
    const repoUrl = `https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}`
    const repoResponse = await fetch(repoUrl, {
      headers: {
        'Authorization': `Bearer ${CONFIG.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    })

    if (!repoResponse.ok) {
      const error = await repoResponse.json()
      if (repoResponse.status === 404) {
        throw new Error(`仓库 ${CONFIG.owner}/${CONFIG.repo} 不存在或无权访问`)
      }
      else if (repoResponse.status === 401 || repoResponse.status === 403) {
        throw new Error('GitHub Token 无效或权限不足')
      }
      throw new Error(`仓库验证失败: ${error.message}`)
    }

    const repoData = await repoResponse.json()
    log('✅ 仓库验证通过', 'success')
    log(`仓库大小: ${repoData.size} KB`, 'info')
    log(`默认分支: ${repoData.default_branch}`, 'info')
    if (repoData.permissions) {
      log(`权限: ${JSON.stringify(repoData.permissions)}`, 'info')
    }

    // 测试分支
    log(`请求分支信息: ${CONFIG.branch}`, 'info')
    const branchUrl = `https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/branches/${CONFIG.branch}`
    const branchResponse = await fetch(branchUrl, {
      headers: {
        'Authorization': `Bearer ${CONFIG.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    })

    if (!branchResponse.ok) {
      if (branchResponse.status === 404) {
        throw new Error(`分支 ${CONFIG.branch} 不存在`)
      }
      const error = await branchResponse.json()
      throw new Error(`分支验证失败: ${error.message}`)
    }

    log('✅ 分支验证通过', 'success')
    log('✅ GitHub 配置验证成功！', 'success')
    return true
  }
  catch (error) {
    log(`❌ 测试失败: ${error.message}`, 'error')
    return false
  }
}

// 上传图片
async function uploadImage(imagePath, uploadCount) {
  log(`\n开始上传图片 (第 ${uploadCount} 次)...`, 'info')

  try {
    // 检查文件是否存在
    if (!fs.existsSync(imagePath)) {
      throw new Error(`图片文件不存在: ${imagePath}`)
    }

    // 计算文件哈希
    log('计算文件哈希...', 'info')
    const fileHash = await calculateFileHash(imagePath)
    log(`文件哈希: ${fileHash}`, 'info')

    // 检查缓存
    if (cache.has(fileHash)) {
      const cachedResult = cache.get(fileHash)
      log('✅ 图片已存在，使用缓存！', 'success')
      log(`缓存的 URL: ${cachedResult.url}`, 'info')
      return cachedResult
    }

    // 读取文件
    log(`读取图片文件: ${imagePath}`, 'info')
    const imageBuffer = fs.readFileSync(imagePath)
    const base64Content = imageBuffer.toString('base64')
    const fileSize = (imageBuffer.length / 1024).toFixed(2)

    log(`文件大小: ${fileSize} KB`, 'info')
    log(`Base64 编码完成，长度: ${base64Content.length} 字符`, 'info')

    // 生成文件名和路径（使用哈希值）
    const ext = path.extname(imagePath).slice(1) || 'png'
    const fileName = `${fileHash}.${ext}`
    const filePath = `${CONFIG.basePath}/${generateDatePath(fileName)}`

    log(`上传路径: ${filePath}`, 'info')

    // 检查云端是否已存在
    log('🔍 检查云端是否已存在...', 'info')
    const { exists, sha } = await checkFileExists(filePath)

    if (exists) {
      log('✅ 图片已存在（云端）！', 'success')

      // 生成 URL
      const rawUrl = `https://raw.githubusercontent.com/${CONFIG.owner}/${CONFIG.repo}/${CONFIG.branch}/${filePath}`
      const cdnUrl = CONFIG.useCDN
        ? `https://cdn.jsdelivr.net/gh/${CONFIG.owner}/${CONFIG.repo}@${CONFIG.branch}/${filePath}`
        : null

      const result = {
        success: true,
        url: rawUrl,
        cdnUrl,
        filePath,
        fileHash,
      }

      // 缓存结果
      cache.set(fileHash, result)
      log(`✅ 结果已缓存`, 'info')

      return result
    }

    // 上传到 GitHub
    const url = `https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/contents/${filePath}`
    log(`请求 URL: ${url}`, 'info')

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${CONFIG.token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({
        message: `Upload image: ${path.basename(imagePath)}`,
        content: base64Content,
        branch: CONFIG.branch,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      log(`响应状态: ${response.status}`, 'error')
      log(`响应内容: ${errorText.substring(0, 500)}`, 'error')
      let error
      try {
        error = JSON.parse(errorText)
      }
      catch {
        error = { message: errorText }
      }
      let errorMsg = `上传失败: ${error.message || response.statusText}`

      if (response.status === 404) {
        errorMsg = `仓库或路径不存在\n请检查配置`
      }
      else if (response.status === 401 || response.status === 403) {
        errorMsg = `权限不足，请检查 Token 权限`
      }

      throw new Error(errorMsg)
    }

    const data = await response.json()
    log('✅ 上传成功！', 'success')

    // 生成 URL
    const rawUrl = `https://raw.githubusercontent.com/${CONFIG.owner}/${CONFIG.repo}/${CONFIG.branch}/${filePath}`
    const cdnUrl = CONFIG.useCDN
      ? `https://cdn.jsdelivr.net/gh/${CONFIG.owner}/${CONFIG.repo}@${CONFIG.branch}/${filePath}`
      : null

    log(`原始 URL: ${rawUrl}`, 'info')
    if (cdnUrl) {
      log(`CDN URL: ${cdnUrl}`, 'info')
    }

    log(`GitHub 文件: ${data.content.html_url}`, 'info')

    const result = {
      success: true,
      url: rawUrl,
      cdnUrl,
      filePath,
      fileHash,
    }

    // 缓存结果
    cache.set(fileHash, result)
    log(`✅ 结果已缓存`, 'info')

    return result
  }
  catch (error) {
    log(`❌ 上传失败: ${error.message}`, 'error')
    return {
      success: false,
      error: error.message,
    }
  }
}

// 主函数
async function main() {
  console.log('\n========================================')
  console.log('  GitHub 图床上传测试 (带云端判重)')
  console.log('========================================\n')

  // 步骤 1: 测试连接
  console.log('【步骤 1】测试 GitHub 连接')
  console.log('----------------------------------------')
  const connectionOk = await testConnection()
  if (!connectionOk) {
    return
  }

  // 步骤 2: 第一次上传
  console.log('\n【步骤 2】第一次上传图片')
  console.log('----------------------------------------')
  const result1 = await uploadImage(CONFIG.testImagePath, 1)

  if (!result1.success) {
    console.log('\n========================================')
    console.log('  ❌ 测试失败！')
    console.log('========================================')
    console.log(`\n错误: ${result1.error}\n`)
    return
  }

  // 步骤 3: 第二次上传（相同图片）
  console.log('\n【步骤 3】第二次上传相同图片')
  console.log('----------------------------------------')
  const result2 = await uploadImage(CONFIG.testImagePath, 2)

  if (!result2.success) {
    console.log('\n========================================')
    console.log('  ❌ 测试失败！')
    console.log('========================================')
    console.log(`\n错误: ${result2.error}\n`)
    return
  }

  // 步骤 4: 验证结果
  console.log('\n【步骤 4】验证结果')
  console.log('----------------------------------------')

  const urlsMatch = result1.url === result2.url
  const filePathsMatch = result1.filePath === result2.filePath
  const fileHashesMatch = result1.fileHash === result2.fileHash

  log(`第一次上传 URL: ${result1.url}`, 'info')
  log(`第二次上传 URL: ${result2.url}`, 'info')
  log(`URL 是否相同: ${urlsMatch ? '✅ 是' : '❌ 否'}`, urlsMatch ? 'success' : 'error')
  log(`文件路径是否相同: ${filePathsMatch ? '✅ 是' : '❌ 否'}`, filePathsMatch ? 'success' : 'error')
  log(`文件哈希是否相同: ${fileHashesMatch ? '✅ 是' : '❌ 否'}`, fileHashesMatch ? 'success' : 'error')

  if (urlsMatch && filePathsMatch && fileHashesMatch) {
    console.log('\n========================================')
    console.log('  ✅ 云端判重测试成功！')
    console.log('========================================')
    console.log('\n相同的图片返回了相同的 URL，云端判重机制正常工作！')
    console.log(`\n图片 URL: ${result1.url}`)
    if (result1.cdnUrl) {
      console.log(`CDN URL: ${result1.cdnUrl}`)
    }
  }
  else {
    console.log('\n========================================')
    console.log('  ❌ 云端判重测试失败！')
    console.log('========================================')
    console.log('\n相同的图片返回了不同的 URL，云端判重机制可能有问题！')
  }
}

// 运行测试
main().catch(console.error)
