import 'dotenv/config'
import Fastify from 'fastify'
import multipart from '@fastify/multipart'
import { convertRoutes } from './routes/convert.js'
import { aiFormatRoutes } from './routes/ai-format.js'
import { textFormatRoutes } from './routes/text-format.js'

const fastify = Fastify({
  logger: true,
})

fastify.addHook('onSend', async (request, reply) => {
  reply.header('Access-Control-Allow-Origin', '*')
  reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
})

await fastify.register(multipart, {
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
})

await fastify.register(convertRoutes)
await fastify.register(aiFormatRoutes)
await fastify.register(textFormatRoutes)

const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' })
    console.log('Server running at http://localhost:3000')
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()