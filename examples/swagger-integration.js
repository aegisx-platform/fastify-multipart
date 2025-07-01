/**
 * Swagger UI Integration Example for @aegisx/fastify-multipart
 * 
 * Demonstrates how to properly integrate with Swagger UI to get:
 * - Working browse buttons for file uploads
 * - No validation errors
 * - Clean text field handling
 * 
 * Run: node examples/swagger-integration.js
 * Visit: http://localhost:3001/docs
 */

'use strict'

const fastify = require('fastify')({ logger: true })
const path = require('path')
const fs = require('fs')

async function start() {
    // ✅ Step 1: Register Swagger first
    await fastify.register(require('@fastify/swagger'), {
        openapi: {
            openapi: '3.0.0',
            info: {
                title: 'Multipart Plugin with Swagger UI',
                description: 'Working browse buttons and clean field handling',
                version: '1.0.0'
            },
            servers: [{ url: 'http://localhost:3001' }]
        }
    })

    await fastify.register(require('@fastify/swagger-ui'), {
        routePrefix: '/docs',
        uiConfig: {
            docExpansion: 'full',
            deepLinking: false
        }
    })

    // ✅ Step 2: Register multipart plugin with validation bypass
    await fastify.register(require('../index.js'), {
        autoContentTypeParser: false, // Important for Swagger integration!
        limits: {
            fileSize: 10 * 1024 * 1024,
            files: 5,
            fields: 20
        }
    })

    // ✅ Step 3: Custom content type parser (required for Swagger)
    fastify.addContentTypeParser('multipart/form-data', function (request, payload, done) {
        done(null, payload)
    })

    // ✅ Step 4: Bypass validation for multipart routes (prevents "Value must be a string" errors)
    fastify.setValidatorCompiler(({ schema, method, url, httpPart }) => {
        return function validate(data) {
            // Skip body validation for upload routes
            if (httpPart === 'body' && url && url.includes('/upload')) {
                return { value: data }
            }
            return { value: data }
        }
    })

    // Helper function
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
            message: 'Swagger UI Integration Example',
            documentation: 'http://localhost:3001/docs',
            features: [
                '✅ Working browse buttons in Swagger UI',
                '✅ No validation errors',
                '✅ Text fields as plain strings',
                '✅ Multiple file support'
            ]
        }
    })

    // ✅ Product upload with proper Swagger schema
    fastify.post('/upload/product', {
        schema: {
            summary: 'Create product with images',
            description: 'Upload product with name, description, and images',
            tags: ['Products'],
            consumes: ['multipart/form-data'], // ✅ Required for browse buttons
            body: {
                type: 'object',
                properties: {
                    name: {
                        type: 'string',
                        description: 'Product name'
                    },
                    description: {
                        type: 'string',
                        description: 'Product description'
                    },
                    category: {
                        type: 'string',
                        enum: ['electronics', 'clothing', 'books', 'home'],
                        description: 'Product category'
                    },
                    price: {
                        type: 'string',
                        description: 'Product price (as string from form)'
                    },
                    images: {
                        type: 'array',
                        items: {
                            type: 'string',
                            format: 'binary' // ✅ Required for browse buttons
                        },
                        description: 'Product images'
                    }
                },
                required: ['name', 'category']
            },
            response: {
                200: {
                    description: 'Product created successfully',
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' },
                        product: {
                            type: 'object',
                            properties: {
                                id: { type: 'string' },
                                name: { type: 'string' },
                                description: { type: 'string' },
                                category: { type: 'string' },
                                price: { type: 'number' },
                                imageCount: { type: 'number' },
                                images: {
                                    type: 'array',
                                    items: {
                                        type: 'object',
                                        properties: {
                                            filename: { type: 'string' },
                                            size: { type: 'number' },
                                            mimetype: { type: 'string' }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }, async (request, reply) => {
        try {
            const { files, fields } = await request.parseMultipart()

            // Manual validation (since schema validation is bypassed)
            if (!fields.name || !fields.category) {
                return reply.code(400).send({
                    error: 'Name and category are required'
                })
            }

            console.log('📝 Product fields:', fields)
            console.log('📁 Images uploaded:', files.length)

            const uploadsDir = ensureUploadsDir()
            const images = []

            // Process uploaded images
            for (const file of files) {
                const buffer = await file.toBuffer()
                const filename = `${Date.now()}_${file.filename}`
                const filepath = path.join(uploadsDir, filename)
                await fs.promises.writeFile(filepath, buffer)

                images.push({
                    filename: file.filename,
                    size: file.size,
                    mimetype: file.mimetype,
                    savedAs: filename
                })
            }

            const product = {
                id: `product_${Date.now()}`,
                // ✅ Text fields are plain strings - works perfectly with Swagger UI!
                name: fields.name,
                description: fields.description || '',
                category: fields.category,
                price: parseFloat(fields.price) || 0,
                imageCount: images.length,
                images
            }

            return {
                success: true,
                message: 'Product created successfully',
                product
            }
        } catch (error) {
            console.error('Error creating product:', error)
            return reply.code(500).send({
                error: 'Failed to create product',
                message: error.message
            })
        }
    })

    // ✅ User avatar upload
    fastify.post('/upload/avatar', {
        schema: {
            summary: 'Upload user avatar',
            description: 'Update user profile with avatar image',
            tags: ['Users'],
            consumes: ['multipart/form-data'],
            body: {
                type: 'object',
                properties: {
                    userId: {
                        type: 'string',
                        description: 'User ID'
                    },
                    avatar: {
                        type: 'string',
                        format: 'binary',
                        description: 'Avatar image file'
                    }
                },
                required: ['userId', 'avatar']
            },
            response: {
                200: {
                    description: 'Avatar uploaded successfully',
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' },
                        avatar: {
                            type: 'object',
                            properties: {
                                filename: { type: 'string' },
                                size: { type: 'number' },
                                mimetype: { type: 'string' },
                                url: { type: 'string' }
                            }
                        }
                    }
                }
            }
        }
    }, async (request, reply) => {
        try {
            const { files, fields } = await request.parseMultipart()

            if (!fields.userId) {
                return reply.code(400).send({ error: 'User ID is required' })
            }

            if (!files || files.length === 0) {
                return reply.code(400).send({ error: 'Avatar image is required' })
            }

            const avatarFile = files[0]
            
            // Validate image type
            if (!avatarFile.mimetype.startsWith('image/')) {
                return reply.code(400).send({ error: 'File must be an image' })
            }

            const uploadsDir = ensureUploadsDir()
            const buffer = await avatarFile.toBuffer()
            const filename = `avatar_${fields.userId}_${Date.now()}_${avatarFile.filename}`
            const filepath = path.join(uploadsDir, filename)
            await fs.promises.writeFile(filepath, buffer)

            return {
                success: true,
                message: 'Avatar uploaded successfully',
                avatar: {
                    filename: avatarFile.filename,
                    size: avatarFile.size,
                    mimetype: avatarFile.mimetype,
                    url: `http://localhost:3001/uploads/${filename}`
                }
            }
        } catch (error) {
            console.error('Error uploading avatar:', error)
            return reply.code(500).send({
                error: 'Failed to upload avatar',
                message: error.message
            })
        }
    })

    await fastify.listen({ port: 3001, host: '0.0.0.0' })
    console.log('🚀 Swagger integration example running at:')
    console.log('   📱 API: http://localhost:3001')
    console.log('   📖 Swagger UI: http://localhost:3001/docs')
    console.log('')
    console.log('✅ Test the Swagger UI to see:')
    console.log('   • Working browse buttons for file uploads')
    console.log('   • No validation errors')
    console.log('   • Clean form submissions')
}

start().catch(err => {
    console.error('Error starting server:', err)
    process.exit(1)
})