import type { FastifyInstance, FastifyRequest } from 'fastify'
import { MinimaxFormatter } from '../services/minimax-formatter.js'

const minimaxFormatter = new MinimaxFormatter()

export async function textFormatRoutes(fastify: FastifyInstance) {
  fastify.post('/text-format', async (request: FastifyRequest, reply) => {
    try {
      const body = await request.body as { content?: string; filename?: string; count?: number }

      if (!body || typeof body !== 'object') {
        reply.code(400)
        return { success: false, error: 'Invalid request body' }
      }

      const content = body.content

      if (!content || typeof content !== 'string') {
        reply.code(400)
        return { success: false, error: 'Missing or invalid content field' }
      }

      const filename = body.filename || 'AI排版-result.txt'
      const count = Math.min(Math.max(body.count || 1, 1), 5)

      console.log(`AI formatting text (length: ${content.length}, count: ${count})...`)

      if (count === 1) {
        const formattedMarkdown = await minimaxFormatter.format(content)
        return {
          success: true,
          markdown: formattedMarkdown,
          filename: filename.startsWith('AI排版-') ? filename : `AI排版-${filename}`,
        }
      } else {
        const results = await minimaxFormatter.formatWithRetry(content, count)
        return {
          success: true,
          results,
          filename: filename.startsWith('AI排版-') ? filename : `AI排版-${filename}`,
        }
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