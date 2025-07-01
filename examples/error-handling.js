/**
 * Error Handling Example for @aegisx/fastify-multipart
 *
 * Demonstrates comprehensive error handling for common scenarios:
 * - File size limits
 * - File count limits
 * - Field limits
 * - Invalid content types
 * - Custom validation errors
 *
 * Run: node examples/error-handling.js
 * Test various scenarios to see different error responses
 */

'use strict'

const fastify = require('fastify')({ logger: true })
const path = require('path')
const fs = require('fs')

async function start () {
  // Register plugin with strict limits for demonstration
  await fastify.register(require('../index.js'), {
    limits: {
      fileSize: 1024 * 1024, // 1MB (small for demo)
      files: 2, // Max 2 files
      fields: 5, // Max 5 fields
      fieldSize: 1024 // 1KB field size
    }
  })

  // ✅ Global error handler for multipart errors
  fastify.setErrorHandler((error, request, reply) => {
    console.error('❌ Error caught:', error.message)

    // Handle multipart-specific errors
    if (error instanceof fastify.multipartErrors.FileSizeLimit) {
      return reply.status(413).send({
        error: 'FILE_TOO_LARGE',
        message: 'File size exceeds limit of 1MB',
        details: error.message,
        statusCode: 413
      })
    }

    if (error instanceof fastify.multipartErrors.FilesLimit) {
      return reply.status(413).send({
        error: 'TOO_MANY_FILES',
        message: 'Maximum 2 files allowed',
        details: error.message,
        statusCode: 413
      })
    }

    if (error instanceof fastify.multipartErrors.FieldsLimit) {
      return reply.status(413).send({
        error: 'TOO_MANY_FIELDS',
        message: 'Maximum 5 fields allowed',
        details: error.message,
        statusCode: 413
      })
    }

    if (error instanceof fastify.multipartErrors.InvalidMultipartContentType) {
      return reply.status(400).send({
        error: 'INVALID_CONTENT_TYPE',
        message: 'Request must be multipart/form-data',
        details: error.message,
        statusCode: 400
      })
    }

    // Handle other errors
    reply.status(500).send({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      details: error.message,
      statusCode: 500
    })
  })

  function ensureUploadsDir () {
    const uploadsDir = path.join(__dirname, '../uploads')
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true })
    }
    return uploadsDir
  }

  // Home with error testing info
  fastify.get('/', async () => {
    return {
      message: 'Error Handling Example',
      limits: {
        fileSize: '1MB',
        maxFiles: 2,
        maxFields: 5,
        fieldSize: '1KB'
      },
      testScenarios: [
        'POST /upload/strict - Strict validation with custom errors',
        'POST /upload/size-test - Test file size limits',
        'POST /upload/count-test - Test file count limits',
        'POST /upload/field-test - Test field count limits'
      ],
      examples: [
        'curl -X POST http://localhost:3003/upload/strict -F "file=@large-file" (size error)',
        'curl -X POST http://localhost:3003/upload/count-test -F "file1=@file1" -F "file2=@file2" -F "file3=@file3" (count error)'
      ]
    }
  })

  // ✅ Strict upload with comprehensive validation
  fastify.post('/upload/strict', async (request, reply) => {
    const { files, fields } = await request.parseMultipart()

    // Custom business logic validation
    const errors = []

    // Validate required fields
    if (!fields.title) {
      errors.push('Title is required')
    }

    if (!fields.category) {
      errors.push('Category is required')
    }

    // Validate field values
    if (fields.category && !['image', 'document', 'video'].includes(fields.category)) {
      errors.push('Category must be: image, document, or video')
    }

    // Validate files
    if (!files || files.length === 0) {
      errors.push('At least one file is required')
    }

    // Validate file types based on category
    if (fields.category === 'image') {
      const invalidImages = files.filter(file => !file.mimetype.startsWith('image/'))
      if (invalidImages.length > 0) {
        errors.push('All files must be images when category is "image"')
      }
    }

    // Return validation errors
    if (errors.length > 0) {
      return reply.code(400).send({
        error: 'VALIDATION_FAILED',
        message: 'Request validation failed',
        errors,
        statusCode: 400
      })
    }

    // Process valid upload
    const uploadsDir = ensureUploadsDir()
    const savedFiles = []

    for (const file of files) {
      const buffer = await file.toBuffer()
      const filename = `${Date.now()}_${file.filename}`
      const filepath = path.join(uploadsDir, filename)
      await fs.promises.writeFile(filepath, buffer)

      savedFiles.push({
        originalName: file.filename,
        savedAs: filename,
        size: file.size,
        mimetype: file.mimetype
      })
    }

    return {
      success: true,
      message: 'Upload successful',
      data: {
        title: fields.title,
        category: fields.category,
        description: fields.description || '',
        files: savedFiles
      }
    }
  })

  // ✅ Test file size limits
  fastify.post('/upload/size-test', async (request, reply) => {
    const { files } = await request.parseMultipart()

    return {
      success: true,
      message: 'Files within size limit',
      info: 'Try uploading a file larger than 1MB to see size limit error',
      files: files.map(f => ({
        name: f.filename,
        size: f.size,
        sizeFormatted: `${Math.round(f.size / 1024)}KB`
      }))
    }
  })

  // ✅ Test file count limits
  fastify.post('/upload/count-test', async (request, reply) => {
    const { files } = await request.parseMultipart()

    return {
      success: true,
      message: `Uploaded ${files.length} files (within limit of 2)`,
      info: 'Try uploading more than 2 files to see count limit error',
      files: files.map(f => f.filename)
    }
  })

  // ✅ Test field limits
  fastify.post('/upload/field-test', async (request, reply) => {
    const { fields } = await request.parseMultipart()

    return {
      success: true,
      message: `Received ${Object.keys(fields).length} fields (within limit of 5)`,
      info: 'Try sending more than 5 form fields to see field limit error',
      fields: Object.keys(fields),
      fieldValues: fields
    }
  })

  // ✅ Manual error trigger for testing
  fastify.post('/upload/trigger-error', async (request, reply) => {
    // Check content type manually
    if (!request.headers['content-type']?.includes('multipart/form-data')) {
      throw new fastify.multipartErrors.InvalidMultipartContentType()
    }

    const { fields } = await request.parseMultipart()

    // Simulate custom error
    if (fields.triggerError === 'true') {
      throw new Error('Simulated custom error for testing')
    }

    return {
      success: true,
      message: 'No errors triggered',
      hint: 'Add field "triggerError=true" to simulate an error'
    }
  })

  // ✅ Health check
  fastify.get('/health', async () => {
    return {
      status: 'healthy',
      limits: {
        fileSize: '1MB',
        maxFiles: 2,
        maxFields: 5
      },
      availableErrors: [
        'FileSizeLimit (413)',
        'FilesLimit (413)',
        'FieldsLimit (413)',
        'InvalidMultipartContentType (400)'
      ]
    }
  })

  await fastify.listen({ port: 3003, host: '0.0.0.0' })
  console.log('❌ Error handling example running at: http://localhost:3003')
  console.log('')
  console.log('🔧 Configured limits:')
  console.log('   📁 File size: 1MB')
  console.log('   📄 Max files: 2')
  console.log('   📝 Max fields: 5')
  console.log('   💾 Field size: 1KB')
  console.log('')
  console.log('🧪 Test error scenarios:')
  console.log('   curl -X POST http://localhost:3003/upload/size-test -F "file=@large-file" (>1MB)')
  console.log('   curl -X POST http://localhost:3003/upload/count-test -F "f1=@f1" -F "f2=@f2" -F "f3=@f3"')
  console.log('   curl -X POST http://localhost:3003/upload/trigger-error -F "triggerError=true"')
}

start().catch(err => {
  console.error('Error starting server:', err)
  process.exit(1)
})
