import type { FastifyInstance } from 'fastify'
import type { MultipartFile } from '@fastify/multipart'
import { HtmlConverter } from '../converters/html.js'
import { DocxConverter } from '../converters/docx.js'
import type { ConvertResult } from '../types.js'

const htmlConverter = new HtmlConverter()
const docxConverter = new DocxConverter()

export async function convertRoutes(fastify: FastifyInstance) {
  fastify.post('/convert', async (request, reply) => {
    let file: MultipartFile | undefined
    let fileBuffer: Buffer | undefined
    let filename: string | undefined
    let fileType: string | undefined

    try {
      file = await request.file()

      if (!file) {
        reply.code(400)
        return { success: false, error: 'No file uploaded' } as ConvertResult
      }

      filename = file.filename
      fileType = file.mimetype

      const chunks: Buffer[] = []
      for await (const chunk of file.file) {
        chunks.push(chunk)
      }
      fileBuffer = Buffer.concat(chunks)

      const options = {
        filename: filename!,
        buffer: fileBuffer!,
      }

      let result: ConvertResult

      if (fileType === 'text/html' || fileType === 'application/xhtml+xml' || filename.endsWith('.html') || filename.endsWith('.htm')) {
        result = htmlConverter.convert(options)
      } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || filename.endsWith('.docx')) {
        result = await docxConverter.convert(options)
      } else {
        reply.code(400)
        return { success: false, error: `Unsupported file type: ${fileType}` } as ConvertResult
      }

      if (!result.success) {
        reply.code(500)
      }

      return result
    } catch (error) {
      reply.code(500)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      } as ConvertResult
    }
  })

  fastify.get('/health', async () => {
    return { status: 'ok' }
  })
}