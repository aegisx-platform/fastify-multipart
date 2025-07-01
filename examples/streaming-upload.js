/**
 * Streaming Upload Example for @aegisx/fastify-multipart
 * 
 * Demonstrates how to handle large files efficiently using streams
 * instead of loading everything into memory.
 * 
 * Run: node examples/streaming-upload.js
 * Test: curl -X POST http://localhost:3002/upload/stream -F "file=@large-file.zip"
 */

'use strict'

const fastify = require('fastify')({ logger: true })
const path = require('path')
const fs = require('fs')
const { pipeline } = require('stream/promises')

async function start() {
    // Register plugin with larger limits for streaming
    await fastify.register(require('../index.js'), {
        limits: {
            fileSize: 100 * 1024 * 1024, // 100MB
            files: 3,
            fields: 5
        }
    })

    function ensureUploadsDir() {
        const uploadsDir = path.join(__dirname, '../uploads')
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true })
        }
        return uploadsDir
    }

    // Home
    fastify.get('/', async () => {
        return {
            message: 'Streaming Upload Example',
            endpoints: [
                'POST /upload/stream - Stream large files',
                'POST /upload/memory - Load files into memory (comparison)'
            ],
            test: 'curl -X POST http://localhost:3002/upload/stream -F "file=@large-file.zip"'
        }
    })

    // ✅ Streaming upload - efficient for large files
    fastify.post('/upload/stream', async (request, reply) => {
        try {
            const uploadsDir = ensureUploadsDir()
            const uploadedFiles = []

            console.log('🌊 Starting streaming upload...')
            const startTime = Date.now()

            // Use streaming approach with parts() iterator
            for await (const part of request.parts()) {
                if (part.type === 'file') {
                    const filename = `stream_${Date.now()}_${part.filename}`
                    const filepath = path.join(uploadsDir, filename)
                    const writeStream = fs.createWriteStream(filepath)

                    console.log(`📁 Streaming file: ${part.filename}`)
                    
                    // Stream directly to disk without loading into memory
                    await pipeline(part.stream, writeStream)
                    
                    const stats = fs.statSync(filepath)
                    uploadedFiles.push({
                        originalName: part.filename,
                        savedAs: filename,
                        size: stats.size,
                        mimetype: part.mimetype
                    })

                    console.log(`✅ Streamed ${part.filename} (${stats.size} bytes)`)
                } else if (part.type === 'field') {
                    console.log(`📝 Field: ${part.fieldname} = ${part.value}`)
                }
            }

            const endTime = Date.now()
            const duration = endTime - startTime

            return {
                success: true,
                method: 'streaming',
                message: `Streamed ${uploadedFiles.length} files in ${duration}ms`,
                files: uploadedFiles,
                performance: {
                    duration: `${duration}ms`,
                    memoryEfficient: true,
                    note: 'Files streamed directly to disk without loading into memory'
                }
            }
        } catch (error) {
            console.error('Streaming upload error:', error)
            return reply.code(500).send({
                error: 'Streaming upload failed',
                message: error.message
            })
        }
    })

    // ✅ Memory upload - loads files into memory (for comparison)
    fastify.post('/upload/memory', async (request, reply) => {
        try {
            const uploadsDir = ensureUploadsDir()
            const startTime = Date.now()

            console.log('💾 Starting memory upload...')
            
            // Parse all files into memory first
            const { files, fields } = await request.parseMultipart()
            const uploadedFiles = []

            for (const file of files) {
                console.log(`📁 Processing file: ${file.filename}`)
                
                // Load entire file into memory
                const buffer = await file.toBuffer()
                
                const filename = `memory_${Date.now()}_${file.filename}`
                const filepath = path.join(uploadsDir, filename)
                await fs.promises.writeFile(filepath, buffer)

                uploadedFiles.push({
                    originalName: file.filename,
                    savedAs: filename,
                    size: buffer.length,
                    mimetype: file.mimetype
                })

                console.log(`✅ Saved ${file.filename} (${buffer.length} bytes)`)
            }

            const endTime = Date.now()
            const duration = endTime - startTime

            return {
                success: true,
                method: 'memory',
                message: `Processed ${uploadedFiles.length} files in ${duration}ms`,
                files: uploadedFiles,
                fields,
                performance: {
                    duration: `${duration}ms`,
                    memoryEfficient: false,
                    note: 'Files loaded entirely into memory before saving'
                }
            }
        } catch (error) {
            console.error('Memory upload error:', error)
            return reply.code(500).send({
                error: 'Memory upload failed',
                message: error.message
            })
        }
    })

    // ✅ Image processing with streaming
    fastify.post('/upload/images/process', async (request, reply) => {
        try {
            const uploadsDir = ensureUploadsDir()
            const processedImages = []

            for await (const part of request.parts()) {
                if (part.type === 'file' && part.mimetype.startsWith('image/')) {
                    const filename = `processed_${Date.now()}_${part.filename}`
                    const filepath = path.join(uploadsDir, filename)
                    
                    // For real image processing, you could pipe through image processing streams here
                    // Example: part.stream.pipe(sharp().resize(800, 600)).pipe(writeStream)
                    const writeStream = fs.createWriteStream(filepath)
                    await pipeline(part.stream, writeStream)
                    
                    const stats = fs.statSync(filepath)
                    processedImages.push({
                        originalName: part.filename,
                        processedName: filename,
                        size: stats.size,
                        mimetype: part.mimetype,
                        note: 'Image processed via streaming (add sharp/jimp for real processing)'
                    })
                }
            }

            return {
                success: true,
                message: `Processed ${processedImages.length} images`,
                images: processedImages
            }
        } catch (error) {
            console.error('Image processing error:', error)
            return reply.code(500).send({
                error: 'Image processing failed',
                message: error.message
            })
        }
    })

    // Health check with memory usage
    fastify.get('/health', async () => {
        const memoryUsage = process.memoryUsage()
        return {
            status: 'healthy',
            uptime: process.uptime(),
            memory: {
                rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
                heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
                heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`
            }
        }
    })

    await fastify.listen({ port: 3002, host: '0.0.0.0' })
    console.log('🌊 Streaming upload example running at: http://localhost:3002')
    console.log('')
    console.log('📋 Available endpoints:')
    console.log('   POST /upload/stream - Efficient streaming upload')
    console.log('   POST /upload/memory - Memory-based upload (comparison)')
    console.log('   POST /upload/images/process - Image processing with streaming')
    console.log('   GET /health - Memory usage info')
    console.log('')
    console.log('🧪 Test commands:')
    console.log('   curl -X POST http://localhost:3002/upload/stream -F "file=@package.json"')
    console.log('   curl -X POST http://localhost:3002/upload/memory -F "file=@package.json"')
}

start().catch(err => {
    console.error('Error starting server:', err)
    process.exit(1)
})