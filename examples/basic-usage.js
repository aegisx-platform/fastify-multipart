/**
 * Basic Usage Example for @aegisx/fastify-multipart
 *
 * Simple example showing the most basic usage pattern.
 * Run: node examples/basic-usage.js
 * Test: curl -X POST http://localhost:3000/upload -F "name=John" -F "file=@package.json"
 */

'use strict'

const fastify = require('fastify')({ logger: true })
const path = require('path')
const fs = require('fs')

async function start () {
  // Register the plugin
  await fastify.register(require('../index.js'), {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
      files: 5,
      fields: 10
    }
  })

  // Simple upload endpoint
  fastify.post('/upload', async (request, reply) => {
    try {
      // Parse multipart form data
      const { files, fields } = await request.parseMultipart()

      // Log received data
      console.log('📝 Fields:', fields)
      console.log('📁 Files:', files.length)

      // Validate required fields
      if (!fields.name) {
        return reply.code(400).send({ error: 'Name is required' })
      }

      // Process files
      const fileResults = []
      for (const file of files) {
        const buffer = await file.toBuffer()

        // Save file (example)
        const uploadDir = path.join(__dirname, '../uploads')
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true })
        }

        const filePath = path.join(uploadDir, file.filename)
        await fs.promises.writeFile(filePath, buffer)

        fileResults.push({
          originalName: file.filename,
          size: file.size,
          mimetype: file.mimetype,
          savedAs: filePath
        })
      }

      return {
        success: true,
        message: 'Upload successful',
        data: {
          // ✅ Text fields are plain strings!
          name: fields.name,
          description: fields.description || '',
          email: fields.email || '',
          files: fileResults
        }
      }
    } catch (error) {
      console.error('Upload error:', error)
      return reply.code(500).send({
        error: 'Upload failed',
        message: error.message
      })
    }
  })

  // Home endpoint
  fastify.get('/', async () => {
    return {
      message: 'Basic @aegisx/fastify-multipart example',
      usage: 'POST /upload with multipart/form-data',
      test: 'curl -X POST http://localhost:3000/upload -F "name=John" -F "file=@package.json"'
    }
  })

  await fastify.listen({ port: 3000, host: '0.0.0.0' })
  console.log('🚀 Basic usage example running at: http://localhost:3000')
  console.log('📝 Test with: curl -X POST http://localhost:3000/upload -F "name=John" -F "file=@package.json"')
}

start().catch(err => {
  console.error('Error starting server:', err)
  process.exit(1)
})
