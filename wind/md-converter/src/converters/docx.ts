import type { ConvertResult, ConvertOptions, ImageInfo } from '../types.js'
import { HtmlConverter } from './html.js'
import { GitHubImageHost } from '../services/github-image-host.js'

export class DocxConverter {
  private htmlConverter = new HtmlConverter()
  private imageHost = new GitHubImageHost()

  async convert(options: ConvertOptions): Promise<ConvertResult & { images?: ImageInfo[] }> {
    try {
      const images: ImageInfo[] = []
      let imageIndex = 0

      const mammoth = await import('mammoth')

      const htmlResult = await mammoth.convertToHtml({ buffer: options.buffer }, {
        styleMap: [
          "p[style-name='Heading 1'] => h1",
          "p[style-name='Heading 2'] => h2",
          "p[style-name='Heading 3'] => h3",
          "p[style-name='Heading 4'] => h4",
          "p[style-name='Heading 5'] => h5",
          "p[style-name='Heading 6'] => h6",
          "b => strong",
          "i => em",
        ],
        convertImage: mammoth.images.imgElement((image) => {
          return image.read('base64').then((imageBuffer) => {
            const id = `img_${imageIndex++}`
            images.push({
              id,
              base64: imageBuffer,
              contentType: image.contentType,
            })
            return {
              src: `data:${image.contentType};base64,${imageBuffer}`,
            }
          })
        }),
      })

      const htmlBuffer = Buffer.from(htmlResult.value, 'utf-8')
      const result = this.htmlConverter.convert({
        filename: options.filename,
        buffer: htmlBuffer,
      })

      if (result.success && result.markdown) {
        let markdown = result.markdown
        markdown = markdown.replace(/\n{3,}/g, '\n\n')

        for (const img of images) {
          const placeholder = `data:${img.contentType};base64,${img.base64}`
          const url = await this.imageHost.upload(img.base64, img.contentType)
          if (url) {
            markdown = markdown.replace(
              `![](${placeholder})`,
              `![image](${url})`
            )
          }
        }

        result.markdown = markdown
      }

      result.filename = options.filename.replace(/\.docx$/, '.md')

      return {
        ...result,
        images,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }
}