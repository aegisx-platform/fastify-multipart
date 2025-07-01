'use strict'

const fastify = require('fastify')({ logger: true })

// === BEFORE: Using @fastify/multipart ===
// const multipart = require('@fastify/multipart')
//
// await fastify.register(multipart, {
//   attachFieldsToBody: true
// })
//
// fastify.post('/old-way', async (request, reply) => {
//   // Text fields are wrapped in objects
//   const name = request.body.name.value        // { value: "John", type: "field" }
//   const email = request.body.email.value      // { value: "john@email.com", type: "field" }
//
//   // Files need separate handling
//   const files = await request.files()
//
//   // Complex validation due to wrapped values
//   if (!request.body.name || !request.body.name.value) {
//     return reply.code(400).send({ error: 'Name required' })
//   }
// })

// === AFTER: Using @aegisx/fastify-multipart ===
const multipart = require('../index')

async function start () {
  await fastify.register(multipart)

  // Example 1: Simple migration
  fastify.post('/new-way', async (request, reply) => {
    const { files, fields } = await request.parseMultipart()

    // Text fields are plain strings!
    // const name = fields.name // "John"
    // const email = fields.email // "john@email.com"

    // Direct validation
    if (!fields.name) {
      return reply.code(400).send({ error: 'Name required' })
    }

    return {
      message: `Hello ${fields.name}!`,
      email: fields.email,
      filesCount: files.length
    }
  })

  // Example 2: Form with validation (comparing old vs new)
  fastify.post('/contact-form', {
    schema: {
      consumes: ['multipart/form-data'],
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          subject: { type: 'string' },
          message: { type: 'string' },
          attachment: { type: 'string', format: 'binary' }
        },
        required: ['name', 'email', 'subject', 'message']
      }
    }
  }, async (request, reply) => {
    const { files, fields } = await request.parseMultipart()

    // OLD WAY with @fastify/multipart:
    // const name = request.body.name.value
    // const email = request.body.email.value
    // const subject = request.body.subject.value
    // const message = request.body.message.value

    // NEW WAY with @aegisx/fastify-multipart:
    // Direct access to string values!
    console.log('Form data:', {
      name: fields.name,
      email: fields.email,
      subject: fields.subject,
      message: fields.message
    })

    // Handle attachment if present
    let attachmentInfo = null
    if (files.length > 0) {
      const attachment = files[0]
      attachmentInfo = {
        filename: attachment.filename,
        size: attachment.size,
        mimetype: attachment.mimetype
      }
    }

    return {
      success: true,
      data: {
        ...fields,
        attachment: attachmentInfo
      }
    }
  })

  // Example 3: Complex form with multiple file types
  fastify.post('/application-form', async (request, reply) => {
    const { files, fields } = await request.parseMultipart()

    // All fields are clean strings - no unwrapping needed!
    const application = {
      // Personal info
      firstName: fields.firstName,
      lastName: fields.lastName,
      email: fields.email,
      phone: fields.phone,

      // Application details
      position: fields.position,
      experience: fields.experience,
      salary: fields.salary ? parseInt(fields.salary) : null,
      startDate: fields.startDate,

      // Boolean handling
      remote: fields.remote === 'true',
      fullTime: fields.fullTime === 'true',

      // Array handling (comma-separated)
      skills: fields.skills ? fields.skills.split(',').map(s => s.trim()) : [],

      // Files
      resume: null,
      portfolio: [],
      coverLetter: null
    }

    // Process files by field name
    for (const file of files) {
      if (file.fieldname === 'resume') {
        application.resume = {
          filename: file.filename,
          size: file.size
        }
      } else if (file.fieldname === 'portfolio') {
        application.portfolio.push({
          filename: file.filename,
          size: file.size
        })
      } else if (file.fieldname === 'coverLetter') {
        application.coverLetter = {
          filename: file.filename,
          size: file.size
        }
      }
    }

    return {
      message: 'Application received',
      application
    }
  })

  // Example 4: Migrating error handling
  fastify.post('/upload-with-limits', async (request, reply) => {
    try {
      const { files, fields } = await request.parseMultipart()

      // Direct string access makes validation cleaner
      if (!fields.title || fields.title.length < 3) {
        return reply.code(400).send({
          error: 'Title must be at least 3 characters'
        })
      }

      return {
        title: fields.title,
        description: fields.description || 'No description',
        filesUploaded: files.length
      }
    } catch (err) {
      // Same error handling pattern
      if (err instanceof fastify.multipartErrors.FileSizeLimit) {
        return reply.code(413).send({ error: 'File too large' })
      }
      if (err instanceof fastify.multipartErrors.FilesLimit) {
        return reply.code(413).send({ error: 'Too many files' })
      }
      throw err
    }
  })

  // Example 5: Helper for migration period
  // You can create a compatibility layer during migration
  // function unwrapFields (fields) {
  //   // Convert our clean fields to @fastify/multipart format
  //   // (Only if you need backwards compatibility)
  //   const wrapped = {}
  //   for (const [key, value] of Object.entries(fields)) {
  //     wrapped[key] = { value, type: 'field' }
  //   }
  //   return wrapped
  // }

  await fastify.listen({ port: 3000, host: '0.0.0.0' })
  console.log('Migration examples running at http://localhost:3000')
  console.log('')
  console.log('Try these endpoints:')
  console.log('  POST /new-way - Simple example')
  console.log('  POST /contact-form - Form with validation')
  console.log('  POST /application-form - Complex form')
  console.log('  POST /upload-with-limits - Error handling')
}

start().catch(err => {
  console.error(err)
  process.exit(1)
})

/*
MIGRATION CHECKLIST:
1. Replace @fastify/multipart with @aegisx/fastify-multipart
2. Remove attachFieldsToBody option
3. Use request.parseMultipart() to get both files and fields
4. Access fields directly as strings (no .value needed)
5. Update validation logic to work with plain strings
6. Test with Swagger UI - it should work perfectly now!
*/
