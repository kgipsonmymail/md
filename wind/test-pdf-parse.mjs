/**
 * PDF解析测试脚本
 * 用于在Node环境下测试PDF解析效果
 * 运行: node --experimental-vm-modules wind/test-pdf-parse.mjs
 */

import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function testPdfParse() {
  const pdfPath = join(__dirname, 'historyword', '布伦特-WTI价差史诗级倒挂：当“安全”比“基准”更贵-山金期货-20260417.pdf')

  console.log('📄 开始测试PDF解析...')
  console.log('PDF路径:', pdfPath)

  try {
    // 动态导入 pdfjs-dist
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
    console.log('✅ pdfjs-dist 加载成功')

    // 读取PDF文件
    const data = new Uint8Array(readFileSync(pdfPath))
    console.log('✅ PDF文件读取成功，大小:', data.length, 'bytes')

    // 加载PDF文档
    const loadingTask = pdfjsLib.getDocument({ data })
    const pdfDoc = await loadingTask.promise
    console.log('✅ PDF文档加载成功，总页数:', pdfDoc.numPages)

    // 提取文本和图片
    const images = []
    const pageTexts = []

    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum)
      console.log(`\n📑 正在处理第 ${pageNum} 页...`)

      // 获取文本内容
      const textContent = await page.getTextContent()
      const pageText = textContent.items
        .map((item) => {
          if ('str' in item) {
            return item.str
          }
          return ''
        })
        .join('')

      pageTexts.push(pageText)

      // 获取图片
      const operatorList = await page.getOperatorList()
      for (let i = 0; i < operatorList.fnArray.length; i++) {
        if (operatorList.fnArray[i] === pdfjsLib.OPS.paintImageXObject) {
          const imgName = operatorList.argsArray[i][0]
          if (imgName && !imgName.startsWith('g_')) {
            try {
              const img = await page.objs.get(imgName)
              if (img && img.data) {
                // 过滤小图片（页眉页脚logo）
                const dataSize = img.data.length
                const isSmallImage = img.width < 100 || img.height < 100 || dataSize < 5000
                console.log(`  图片: ${imgName}, ${img.width}x${img.height}, 大小: ${dataSize} bytes, 过滤: ${isSmallImage}`)
                if (!isSmallImage) {
                  images.push({
                    name: imgName,
                    width: img.width,
                    height: img.height,
                    data: img.data,
                  })
                }
              }
            }
            catch (e) {
              // 忽略无法提取的图片
            }
          }
        }
      }
    }

    // 清理页眉页脚测试
    const cleanedTexts = pageTexts.map((text, idx) => {
      let cleaned = text.replace(/请务必阅读正文后的重要声明\s*\d*/g, '')
      cleaned = cleaned.replace(/第\s*\d+\s*页/g, '')
      return cleaned
    })

    console.log('\n========== 解析结果 ==========')
    console.log(`提取到 ${images.length} 张有效图片（过滤了小图片）`)
    console.log('\n--- 清理后的第1页文本 (前1000字符) ---')
    console.log(cleanedTexts[0].substring(0, 1000))

    console.log('\n--- 清理后的第2页文本 (前1000字符) ---')
    console.log(cleanedTexts[1].substring(0, 1000))

    // 保存完整结果
    const resultPath = join(__dirname, 'historyword', 'pdf解析测试结果.txt')
    writeFileSync(resultPath, cleanedTexts.join('\n\n---\n\n'), 'utf8')
    console.log('\n✅ 完整文本已保存到:', resultPath)

    return { texts: cleanedTexts, images }
  }
  catch (error) {
    console.error('❌ PDF解析失败:', error)
    throw error
  }
}

testPdfParse().catch(console.error)
