/**
 * 文档解析器
 * 支持 .docx 文件解析，提取文本和图片
 */

import type { ImageAsset, ParsedDocument } from '../types'

export class DocumentParser {
  /**
   * 解析 .docx 文件
   * 注意：需要安装 mammoth 库
   */
  async parseDocx(file: File): Promise<ParsedDocument> {
    // 动态导入 mammoth（需要在项目中安装）
    // @ts-expect-error - mammoth 可能未安装
    const mammoth = await import('mammoth')

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
