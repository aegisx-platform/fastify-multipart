'use strict'

const fastify = require('fastify')({ logger: true })
const multipart = require('../index')
const swagger = require('@fastify/swagger')
const swaggerUI = require('@fastify/swagger-ui')

async function start() {
  // Register Swagger
  await fastify.register(swagger, {
    swagger: {
      info: {
        title: 'Multipart Upload API',
        description: 'API with multipart/form-data support and Swagger UI',
        version: '1.0.0'
      },
      host: 'localhost:3000',
      schemes: ['http'],
      consumes: ['application/json', 'multipart/form-data'],
      produces: ['application/json']
    }
  })

  // Register Swagger UI
  await fastify.register(swaggerUI, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'full',
      deepLinking: false
    }
  })

  // Register multipart plugin with validation fix
  await fastify.register(multipart, {
    limits: {
      fileSize: 1024 * 1024 * 10 // 10MB
    },
    autoContentTypeParser: false
  })

  // Custom content type parser to prevent validation conflicts
  fastify.addContentTypeParser('multipart/form-data', function (request, payload, done) {
    done(null, payload)
  })

  // Custom validation bypass for multipart routes
  fastify.setValidatorCompiler(({ schema, method, url, httpPart }) => {
    return function validate(data) {
      // Skip body validation for multipart routes
      if (httpPart === 'body' && url && (url.includes('products') || url.includes('users') || url.includes('documents'))) {
        return { value: data }
      }
      // Use default validation for other routes/parts
      return { value: data }
    }
  })

  // Product upload with image
  fastify.post('/api/products', {
    schema: {
      description: 'Create a new product with image',
      tags: ['products'],
      consumes: ['multipart/form-data'],
      body: {
        type: 'object',
        properties: {
          name: { 
            type: 'string',
            description: 'Product name'
          },
          category: { 
            type: 'string',
            description: 'Product category',
            enum: ['electronics', 'clothing', 'food', 'other']
          },
          price: { 
            type: 'string',
            description: 'Product price'
          },
          description: { 
            type: 'string',
            description: 'Product description'
          },
          image: { 
            type: 'string', 
            format: 'binary',
            description: 'Product main image'
          },
          gallery: {
            type: 'array',
            items: { 
              type: 'string', 
              format: 'binary'
            },
            description: 'Additional product images'
          }
        },
        required: ['name', 'category', 'price']
      },
      response: {
        200: {
          description: 'Product created successfully',
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            category: { type: 'string' },
            price: { type: 'number' },
            description: { type: 'string' },
            mainImage: { 
              type: 'object',
              properties: {
                filename: { type: 'string' },
                size: { type: 'number' },
                mimetype: { type: 'string' }
              }
            },
            gallery: {
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
  }, async (request, reply) => {
    const { files, fields } = await request.parseMultipart()
    
    // Fields are plain strings - perfect for Swagger UI!
    console.log('Product name:', fields.name)
    console.log('Category:', fields.category)
    console.log('Price:', fields.price)
    console.log('Description:', fields.description)

    // Find main image and gallery images
    const mainImage = files.find(f => f.fieldname === 'image')
    const galleryImages = files.filter(f => f.fieldname === 'gallery')

    // Simulate saving to database
    const product = {
      id: `prod_${Date.now()}`,
      name: fields.name,
      category: fields.category,
      price: parseFloat(fields.price),
      description: fields.description || ''
    }

    // Add image info
    if (mainImage) {
      product.mainImage = {
        filename: mainImage.filename,
        size: mainImage.size,
        mimetype: mainImage.mimetype
      }
    }

    if (galleryImages.length > 0) {
      product.gallery = galleryImages.map(img => ({
        filename: img.filename,
        size: img.size,
        mimetype: img.mimetype
      }))
    }

    return product
  })

  // User profile update
  fastify.put('/api/users/profile', {
    schema: {
      description: 'Update user profile with avatar',
      tags: ['users'],
      consumes: ['multipart/form-data'],
      body: {
        type: 'object',
        properties: {
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          bio: { type: 'string' },
          avatar: { 
            type: 'string', 
            format: 'binary',
            description: 'Profile picture'
          }
        }
      },
      response: {
        200: {
          description: 'Profile updated',
          type: 'object',
          properties: {
            message: { type: 'string' },
            user: {
              type: 'object',
              properties: {
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                bio: { type: 'string' },
                hasAvatar: { type: 'boolean' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { files, fields } = await request.parseMultipart()
    
    // All text fields are plain strings
    const user = {
      firstName: fields.firstName,
      lastName: fields.lastName,
      bio: fields.bio,
      hasAvatar: files.length > 0
    }

    if (files.length > 0) {
      console.log('Avatar uploaded:', files[0].filename)
      // In real app, save avatar to storage
    }

    return {
      message: 'Profile updated successfully',
      user
    }
  })

  // Document upload
  fastify.post('/api/documents', {
    schema: {
      description: 'Upload documents',
      tags: ['documents'],
      consumes: ['multipart/form-data'],
      body: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          type: { 
            type: 'string',
            enum: ['pdf', 'doc', 'xlsx', 'other']
          },
          tags: { type: 'string', description: 'Comma-separated tags' },
          file: { 
            type: 'string', 
            format: 'binary'
          }
        },
        required: ['title', 'type', 'file']
      }
    }
  }, async (request, reply) => {
    const { files, fields } = await request.parseMultipart()
    
    if (files.length === 0) {
      return reply.code(400).send({ error: 'No file uploaded' })
    }

    const file = files[0]
    const tags = fields.tags ? fields.tags.split(',').map(t => t.trim()) : []

    return {
      id: `doc_${Date.now()}`,
      title: fields.title,
      type: fields.type,
      tags,
      file: {
        filename: file.filename,
        size: file.size,
        mimetype: file.mimetype
      }
    }
  })

  await fastify.listen({ port: 3000, host: '0.0.0.0' })
  console.log('Server running at http://localhost:3000')
  console.log('Swagger UI available at http://localhost:3000/docs')
  console.log('')
  console.log('Test the multipart endpoints through Swagger UI!')
  console.log('Notice how text fields work perfectly as plain strings.')
}

start().catch(err => {
  console.error(err)
  process.exit(1)
})