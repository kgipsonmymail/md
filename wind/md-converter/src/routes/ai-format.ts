import type { FastifyInstance } from 'fastify'
import type { MultipartFile } from '@fastify/multipart'
import { DocxConverter } from '../converters/docx.js'
import { MinimaxFormatter } from '../services/minimax-formatter.js'

const docxConverter = new DocxConverter()
const minimaxFormatter = new MinimaxFormatter()

export async function aiFormatRoutes(fastify: FastifyInstance) {
  fastify.post('/ai-format', async (request, reply) => {
    let file: MultipartFile | undefined
    let fileBuffer: Buffer | undefined
    let filename: string | undefined

    try {
      file = await request.file()

      if (!file) {
        reply.code(400)
        return { success: false, error: 'No file uploaded' }
      }

      filename = file.filename

      const chunks: Buffer[] = []
      for await (const chunk of file.file) {
        chunks.push(chunk)
      }
      fileBuffer = Buffer.concat(chunks)

      const convertResult = await docxConverter.convert({
        filename: filename!,
        buffer: fileBuffer!,
      })

      if (!convertResult.success || !convertResult.markdown) {
        reply.code(500)
        return { success: false, error: convertResult.error || 'Convert failed' }
      }

      console.log(`AI formatting content (length: ${convertResult.markdown.length})...`)
      const formattedMarkdown = await minimaxFormatter.format(convertResult.markdown)

      const outputFilename = `AI排版-${filename!.replace(/\.[^.]+$/, '.txt')}`

      return {
        success: true,
        markdown: formattedMarkdown,
        filename: outputFilename,
      }
    } catch (error) {
      reply.code(500)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  })
}