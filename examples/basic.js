/**
 * Basic Example for @aegisx/fastify-multipart
 * 
 * Simple demonstration of plugin usage with minimal setup.
 * Run: node examples/basic.js
 * Test: curl -X POST http://localhost:3000/upload -F "name=test" -F "file=@package.json"
 */

'use strict'

const fastify = require('fastify')({ logger: true })
const multipart = require('../index')

async function start () {
  // Register the multipart plugin
  await fastify.register(multipart, {
    limits: {
      fileSize: 1024 * 1024 * 5, // 5MB
      files: 5
    }
  })

  // Basic upload endpoint
  fastify.post('/upload', async (request, reply) => {
    try {
      const { files, fields } = await request.parseMultipart()

      console.log('Received fields:', fields)
      console.log('Received files:', files.map(f => ({
        filename: f.filename,
        size: f.size,
        mimetype: f.mimetype
      })))

      // Process files
      const fileInfo = []
      for (const file of files) {
        const buffer = await file.toBuffer()
        fileInfo.push({
          filename: file.filename,
          size: buffer.length,
          mimetype: file.mimetype
        })
      }

      return {
        message: 'Upload successful',
        fields,
        files: fileInfo
      }
    } catch (err) {
      reply.code(400).send({ error: err.message })
    }
  })

  // Single file upload
  fastify.post('/upload-single', async (request, reply) => {
    try {
      await request.parseMultipart()
      const file = request.file()

      if (!file) {
        return reply.code(400).send({ error: 'No file uploaded' })
      }

      const buffer = await file.toBuffer()

      return {
        message: 'File uploaded',
        filename: file.filename,
        size: buffer.length,
        mimetype: file.mimetype
      }
    } catch (err) {
      reply.code(400).send({ error: err.message })
    }
  })

  // Streaming upload for large files
  fastify.post('/upload-stream', async (request, reply) => {
    try {
      const processedFiles = []

      for await (const part of request.parts()) {
        if (part.type === 'file') {
          console.log(`Processing file: ${part.filename}`)

          // In real application, you would stream to storage
          // For demo, we just count bytes
          let size = 0
          for await (const chunk of part.stream) {
            size += chunk.length
          }

          processedFiles.push({
            filename: part.filename,
            size,
            mimetype: part.mimetype
          })
        } else {
          console.log(`Field ${part.fieldname}: ${part.value}`)
        }
      }

      return {
        message: 'Stream upload complete',
        files: processedFiles
      }
    } catch (err) {
      reply.code(400).send({ error: err.message })
    }
  })

  await fastify.listen({ port: 3000, host: '0.0.0.0' })
  console.log('Server running at http://localhost:3000')
  console.log('Try uploading files to:')
  console.log('  POST http://localhost:3000/upload')
  console.log('  POST http://localhost:3000/upload-single')
  console.log('  POST http://localhost:3000/upload-stream')
}

start().catch(err => {
  console.error(err)
  process.exit(1)
})

// Example curl commands:
// curl -X POST http://localhost:3000/upload \
//   -F "name=John Doe" \
//   -F "email=john@example.com" \
//   -F "file=@/path/to/file.pdf"
//
// curl -X POST http://localhost:3000/upload-single \
//   -F "document=@/path/to/document.pdf"
