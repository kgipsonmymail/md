/**
 * 文档解析器
 * 支持 .docx 和 .pdf 文件解析，提取文本和图片
 */

import type { HtmlParseOptions, ImageAsset, ParsedDocument } from '../types'
import { HtmlParser } from './html-parser'

export class DocumentParser {
  private htmlParser: HtmlParser

  constructor() {
    this.htmlParser = new HtmlParser()
  }

  /**
   * 解析 HTML 字符串
   */
  async parseHtml(html: string, options?: HtmlParseOptions): Promise<ParsedDocument> {
    if (options) {
      this.htmlParser = new HtmlParser(options)
    }
    return this.htmlParser.parseFromString(html)
  }

  /**
   * 解析 .docx 文件
   * 注意：需要安装 mammoth 库
   */
  async parseDocx(file: File): Promise<ParsedDocument> {
    // 动态导入 mammoth（需要在项目中安装）
    const mammoth = await import('mammoth') as any

    const arrayBuffer = await file.arrayBuffer()

    // 提取文本和图片
    const result = await mammoth.convertToMarkdown(
      { arrayBuffer },
      {
        convertImage: mammoth.images.imgElement((image: any) => {
          return image.read('base64').then((imageBuffer: string) => {
            // 保存图片信息供后续处理
            return {
              src: `data:${image.contentType};base64,${imageBuffer}`,
            }
          })
        }),
      },
    )

    // 解析结果
    const content = result.value
    const images = await this.extractImagesFromContent(content)

    return {
      content,
      images,
      metadata: {
        title: this.extractTitle(content),
        createdAt: new Date(file.lastModified),
        modifiedAt: new Date(file.lastModified),
      },
    }
  }

  /**
   * 解析 .pdf 文件
   * 注意：需要安装 pdfjs-dist 库
   */
  async parsePdf(file: File): Promise<ParsedDocument> {
    const pdfjsLib = await import('pdfjs-dist') as any

    // 设置 workerSrc 以避免警告，使用正确的 CDN 路径
    if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
      // 使用 jsdelivr CDN 而不是 cloudflare
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`
    }

    const arrayBuffer = await file.arrayBuffer()
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) })
    const pdfDoc = await loadingTask.promise

    const images: ImageAsset[] = []
    const pageTexts: string[] = []
    const pageImages: { pageNum: number; img: ImageAsset }[][] = []

    // 遍历每一页
    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum)

      // 获取文本内容
      const textContent = await page.getTextContent()
      const pageText = textContent.items
        .map((item: any) => {
          if ('str' in item) {
            return item.str
          }
          return ''
        })
        .join('')

      pageTexts.push(pageText)
      pageImages.push([])

      // 获取图片信息 - 强制渲染页面以加载所有图片对象
      const viewport = page.getViewport({ scale: 1.0 })

      // 先渲染页面（这会触发图片加载）
      await page.render({
        canvasContext: document.createElement('canvas').getContext('2d'),
        viewport,
      }).promise

      // 等待图片对象加载完成
      await new Promise(resolve => setTimeout(resolve, 100))

      const operatorList = await page.getOperatorList()
      for (let i = 0; i < operatorList.fnArray.length; i++) {
        if (operatorList.fnArray[i] === pdfjsLib.OPS.paintImageXObject) {
          const imgName = operatorList.argsArray[i][0]
          if (imgName && !imgName.startsWith('g_')) {
            try {
              // 等待图片数据加载
              let img = null
              for (let retry = 0; retry < 3; retry++) {
                img = await page.objs.get(imgName)
                if (img && img.data)
                  break
                await new Promise(resolve => setTimeout(resolve, 50))
              }

              if (img && img.data) {
                const dataSize = img.data.length
                const isSmallImage = img.width < 100 || img.height < 100 || dataSize < 5000

                if (!isSmallImage) {
                  const jpegBase64 = this.rgbaToJpegBase64(img.data, img.width, img.height)
                  const imageAsset: ImageAsset = {
                    id: `pdf_img_${images.length}`,
                    originalName: `pdf_image_${images.length + 1}.jpg`,
                    blob: this.base64ToBlob(jpegBase64, 'image/jpeg'),
                    position: -1,
                    alt: `图片${images.length + 1}`,
                  }
                  images.push(imageAsset)
                  pageImages[pageNum - 1].push({ pageNum, img: imageAsset })
                }
              }
            }
            catch (_e) {
              // 忽略无法提取的图片
            }
          }
        }
      }
    }

    // 构建带图片引用的Markdown内容
    let fullText = this.buildPdfMarkdown(pdfDoc.numPages, pageTexts, pageImages, images)

    // 清理PDF文本中的多余空格和换行问题
    fullText = this.cleanPdfText(fullText)

    return {
      content: fullText,
      images,
      metadata: {
        createdAt: new Date(file.lastModified),
        modifiedAt: new Date(file.lastModified),
      },
    }
  }

  /**
   * 构建带图片引用的PDF Markdown内容
   */
  private buildPdfMarkdown(
    numPages: number,
    pageTexts: string[],
    pageImages: { pageNum: number; img: ImageAsset }[][],
    allImages: ImageAsset[],
  ): string {
    const lines: string[] = []

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const pageText = pageTexts[pageNum - 1]
      const imagesOnPage = pageImages[pageNum - 1]

      // 清理页眉页脚（"请务必阅读正文后的重要声明 X"）
      let cleanedPageText = this.cleanPdfPageHeader(pageText, pageNum)

      // 解析文本中的图表引用（如"图1：布伦特原油主力K线图"）
      cleanedPageText = this.insertImageReferences(cleanedPageText, imagesOnPage, allImages)

      lines.push(cleanedPageText)
      lines.push('') // 页面之间空行
    }

    return lines.join('\n')
  }

  /**
   * 清理单页PDF的页眉页脚
   */
  private cleanPdfPageHeader(pageText: string, pageNum: number): string {
    // 移除"请务必阅读正文后的重要声明 X"这类页眉页脚
    let cleaned = pageText.replace(/请务必阅读正文后的重要声明\s*\d*/g, '')

    // 移除页码（单独的页码数字）
    cleaned = cleaned.replace(new RegExp(`\\s*${pageNum}\\s*`, 'g'), '')

    // 移除"第X页"格式
    cleaned = cleaned.replace(/第\s*\d+\s*页/g, '')

    // 移除"作者∣xxx"前的多余内容
    cleaned = cleaned.replace(/作者∣/g, '\n\n作者∣')

    // 移除"数据来源：xxx"前后的杂质
    cleaned = cleaned.replace(/数据来源：/g, '\n\n数据来源：')

    return cleaned.trim()
  }

  /**
   * 在文本中插入图片引用
   * 根据图表名称匹配图片
   */
  private insertImageReferences(
    pageText: string,
    pageImages: { pageNum: number; img: ImageAsset }[],
    allImages: ImageAsset[],
  ): string {
    if (pageImages.length === 0)
      return pageText

    let result = pageText

    // 按图片在页面出现的顺序插入
    pageImages.forEach((item) => {
      // 查找最近的图表标题位置
      const imgIndex = allImages.findIndex(img => img.id === item.img.id)
      if (imgIndex >= 0) {
        // 在图表引用文字后插入图片
        const chartPatterns = [
          /(图\s*\d+[：:].*?)(\n|$)/g,
          /(图\d+[：:].*?)(?=\s*数据来源|$)/g,
        ]

        for (const pattern of chartPatterns) {
          const match = result.match(pattern)
          if (match) {
            const insertPos = result.indexOf(match[0]) + match[0].length
            const imgMd = `\n\n![${item.img.alt}](PLACEHOLDER_${item.img.id})\n\n`
            result = result.slice(0, insertPos) + imgMd + result.slice(insertPos)
            break
          }
        }

        // 如果没有找到图表标题，就在页面末尾添加
        if (!result.includes(`PLACEHOLDER_${item.img.id}`)) {
          result += `\n\n![${item.img.alt}](PLACEHOLDER_${item.img.id})\n\n`
        }
      }
    })

    return result
  }

  /**
   * 清理PDF提取的文本
   * 修复换行问题和多余空格
   */
  private cleanPdfText(text: string): string {
    // 不再有页面标记需要移除（现在在buildPdfMarkdown中处理）

    // 修复常见的换行问题：句号/逗号后换行
    let cleaned = text.replace(/([。！？；])\s*\n\s*/g, '$1')
    cleaned = cleaned.replace(/([，、])\s*\n\s*/g, '$1')

    // 移除行首行尾空格
    cleaned = cleaned.split('\n').map(line => line.trim()).join('\n')

    // 移除连续的空行（保留最多两个）
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n')

    // 修复标题前的空行
    cleaned = cleaned.replace(/\n\n(#+\s)/g, '\n$1')

    return cleaned.trim()
  }

  /**
   * 将 RGBA 像素数据转换为 JPEG base64
   */
  private rgbaToJpegBase64(rgbaData: Uint8Array, width: number, height: number): string {
    // 创建 canvas 来转换
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')!

    const imageData = ctx.createImageData(width, height)
    imageData.data.set(rgbaData)
    ctx.putImageData(imageData, 0, 0)

    return canvas.toDataURL('image/jpeg').split(',')[1]
  }

  /**
   * 从内容中提取图片
   */
  private async extractImagesFromContent(content: string): Promise<ImageAsset[]> {
    const images: ImageAsset[] = []
    const imageRegex = /!\[(.*?)\]\((data:image\/([^;]+);base64,([^)]+))\)/g

    let match = imageRegex.exec(content)
    let index = 0
    while (match !== null) {
      const [, alt, , mimeType, base64Data] = match
      const position = match.index

      // 将 base64 转换为 Blob
      const blob = this.base64ToBlob(base64Data, `image/${mimeType}`)

      images.push({
        id: `img_${index}`,
        originalName: `image_${index}.${mimeType}`,
        blob,
        position,
        alt: alt || undefined,
      })

      index++
      match = imageRegex.exec(content)
    }

    return images
  }

  /**
   * Base64 转 Blob
   */
  private base64ToBlob(base64: string, mimeType: string): Blob {
    const byteString = atob(base64)
    const ab = new ArrayBuffer(byteString.length)
    const ia = new Uint8Array(ab)

    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i)
    }

    return new Blob([ab], { type: mimeType })
  }

  /**
   * 提取文档标题
   */
  private extractTitle(content: string): string | undefined {
    const titleMatch = content.match(/^#\s+(.+)$/m)
    return titleMatch?.[1]
  }

  /**
   * 解析纯文本 + 图片文件
   * 用户分别上传文本和图片时使用
   */
  async parseTextWithImages(
    text: string,
    imageFiles: File[],
  ): Promise<ParsedDocument> {
    const images: ImageAsset[] = []

    // 处理图片文件
    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i]
      const blob = new Blob([await file.arrayBuffer()], { type: file.type })

      images.push({
        id: `img_${i}`,
        originalName: file.name,
        blob,
        position: -1, // 位置待定
        alt: file.name.split('.')[0],
      })
    }

    return {
      content: text,
      images,
      metadata: {
        createdAt: new Date(),
        modifiedAt: new Date(),
      },
    }
  }

  /**
   * 在文本中插入图片占位符
   * 用于用户手动指定图片位置
   */
  insertImagePlaceholders(content: string, images: ImageAsset[]): string {
    let result = content

    images.forEach((image, index) => {
      const placeholder = `\n\n![${image.alt || `图片${index + 1}`}](PLACEHOLDER_${image.id})\n\n`
      result += placeholder
    })

    return result
  }

  /**
   * 替换图片占位符为实际 URL
   */
  replacePlaceholders(content: string, imageMap: Map<string, string>): string {
    let result = content

    imageMap.forEach((url, imageId) => {
      const placeholder = `PLACEHOLDER_${imageId}`
      result = result.replace(new RegExp(placeholder, 'g'), url)
    })

    return result
  }
}
