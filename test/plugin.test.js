'use strict'

const { test } = require('tap')
const Fastify = require('fastify')
const FormData = require('form-data')
const fs = require('fs')
const path = require('path')
const { promisify } = require('util')
const sleep = promisify(setTimeout)
const multipart = require('../index')

test('should parse single file and text fields', async t => {
  const fastify = Fastify()
  await fastify.register(multipart)

  fastify.post('/upload', async (request, reply) => {
    const { files, fields } = await request.parseMultipart()
    
    t.equal(fields.name, 'John Doe')
    t.equal(fields.email, 'john@example.com')
    t.equal(files.length, 1)
    t.equal(files[0].filename, 'test.txt')
    t.equal(files[0].mimetype, 'text/plain')
    
    const content = await files[0].toBuffer()
    t.equal(content.toString(), 'Hello World')
    
    return { success: true }
  })

  const form = new FormData()
  form.append('name', 'John Doe')
  form.append('email', 'john@example.com')
  form.append('file', Buffer.from('Hello World'), {
    filename: 'test.txt',
    contentType: 'text/plain'
  })

  const response = await fastify.inject({
    method: 'POST',
    url: '/upload',
    headers: form.getHeaders(),
    payload: form
  })

  t.equal(response.statusCode, 200)
  t.same(response.json(), { success: true })
})

test('should handle multiple files', async t => {
  const fastify = Fastify()
  await fastify.register(multipart)

  fastify.post('/upload', async (request, reply) => {
    const { files, fields } = await request.parseMultipart()
    
    t.equal(fields.title, 'Multiple Files Test')
    t.equal(files.length, 3)
    
    const filenames = files.map(f => f.filename).sort()
    t.same(filenames, ['file1.txt', 'file2.txt', 'file3.txt'])
    
    return { fileCount: files.length }
  })

  const form = new FormData()
  form.append('title', 'Multiple Files Test')
  form.append('files', Buffer.from('Content 1'), { filename: 'file1.txt' })
  form.append('files', Buffer.from('Content 2'), { filename: 'file2.txt' })
  form.append('files', Buffer.from('Content 3'), { filename: 'file3.txt' })

  const response = await fastify.inject({
    method: 'POST',
    url: '/upload',
    headers: form.getHeaders(),
    payload: form
  })

  t.equal(response.statusCode, 200)
  t.same(response.json(), { fileCount: 3 })
})

test('should return plain strings for text fields (not wrapped objects)', async t => {
  const fastify = Fastify()
  await fastify.register(multipart)

  fastify.post('/upload', async (request, reply) => {
    const { fields } = await request.parseMultipart()
    
    // Verify fields are plain strings, not { value: "string" }
    t.type(fields.category, 'string')
    t.type(fields.description, 'string')
    t.equal(fields.category, 'electronics')
    t.equal(fields.description, 'A great product')
    
    // Should not be objects
    t.equal(fields.category.value, undefined)
    t.equal(fields.description.value, undefined)
    
    return { fields }
  })

  const form = new FormData()
  form.append('category', 'electronics')
  form.append('description', 'A great product')

  const response = await fastify.inject({
    method: 'POST',
    url: '/upload',
    headers: form.getHeaders(),
    payload: form
  })

  t.equal(response.statusCode, 200)
  const result = response.json()
  t.equal(result.fields.category, 'electronics')
  t.equal(result.fields.description, 'A great product')
})

test('should handle file size limit', async t => {
  const fastify = Fastify()
  await fastify.register(multipart, {
    limits: { fileSize: 100 } // 100 bytes limit
  })

  fastify.post('/upload', async (request, reply) => {
    try {
      await request.parseMultipart()
      return { success: true }
    } catch (err) {
      return reply.code(413).send({ error: err.message })
    }
  })

  const form = new FormData()
  const largeContent = Buffer.alloc(200, 'x') // 200 bytes
  form.append('file', largeContent, { filename: 'large.txt' })

  const response = await fastify.inject({
    method: 'POST',
    url: '/upload',
    headers: form.getHeaders(),
    payload: form
  })

  t.equal(response.statusCode, 413)
  t.match(response.json().error, /File size limit exceeded/)
})

test('should handle files limit', async t => {
  const fastify = Fastify()
  await fastify.register(multipart, {
    limits: { files: 2 } // Max 2 files
  })

  fastify.post('/upload', async (request, reply) => {
    try {
      await request.parseMultipart()
      return { success: true }
    } catch (err) {
      return reply.code(413).send({ error: err.message })
    }
  })

  const form = new FormData()
  form.append('file1', Buffer.from('1'), { filename: 'f1.txt' })
  form.append('file2', Buffer.from('2'), { filename: 'f2.txt' })
  form.append('file3', Buffer.from('3'), { filename: 'f3.txt' })

  const response = await fastify.inject({
    method: 'POST',
    url: '/upload',
    headers: form.getHeaders(),
    payload: form
  })

  t.equal(response.statusCode, 413)
  t.match(response.json().error, /Too many files/)
})

test('request.file() should return first file', async t => {
  const fastify = Fastify()
  await fastify.register(multipart)

  fastify.post('/upload', async (request, reply) => {
    await request.parseMultipart()
    const file = request.file()
    
    t.ok(file)
    t.ok(['first.txt', 'second.txt'].includes(file.filename))
    
    return { filename: file.filename }
  })

  const form = new FormData()
  form.append('file', Buffer.from('First'), { filename: 'first.txt' })
  form.append('file', Buffer.from('Second'), { filename: 'second.txt' })

  const response = await fastify.inject({
    method: 'POST',
    url: '/upload',
    headers: form.getHeaders(),
    payload: form
  })

  t.equal(response.statusCode, 200)
  t.ok(['first.txt', 'second.txt'].includes(response.json().filename))
})

test('request.files() should return all files', async t => {
  const fastify = Fastify()
  await fastify.register(multipart)

  fastify.post('/upload', async (request, reply) => {
    await request.parseMultipart()
    const files = request.files()
    
    t.equal(files.length, 2)
    const filenames = files.map(f => f.filename)
    
    return { filenames }
  })

  const form = new FormData()
  form.append('file', Buffer.from('First'), { filename: 'first.txt' })
  form.append('file', Buffer.from('Second'), { filename: 'second.txt' })

  const response = await fastify.inject({
    method: 'POST',
    url: '/upload',
    headers: form.getHeaders(),
    payload: form
  })

  t.equal(response.statusCode, 200)
  t.ok(response.json().filenames.includes('first.txt'))
  t.ok(response.json().filenames.includes('second.txt'))
})

test('should cleanup temp files automatically', async t => {
  const fastify = Fastify()
  await fastify.register(multipart)

  let tempPaths = []

  fastify.post('/upload', async (request, reply) => {
    const { files, _tempFiles } = await request.parseMultipart()
    tempPaths = [..._tempFiles]
    
    // Verify temp files exist
    for (const path of tempPaths) {
      t.ok(fs.existsSync(path))
    }
    
    return { success: true }
  })

  const form = new FormData()
  form.append('file', Buffer.from('Test content'), { filename: 'test.txt' })

  const response = await fastify.inject({
    method: 'POST',
    url: '/upload',
    headers: form.getHeaders(),
    payload: form
  })

  t.equal(response.statusCode, 200)

  // Wait a bit for cleanup hook
  await sleep(100)

  // Verify temp files are cleaned up
  for (const path of tempPaths) {
    t.notOk(fs.existsSync(path))
  }
})

test('should handle parts iterator', async t => {
  const fastify = Fastify()
  await fastify.register(multipart)

  fastify.post('/upload', async (request, reply) => {
    const parts = []
    
    for await (const part of request.parts()) {
      if (part.type === 'field') {
        parts.push({ type: 'field', name: part.fieldname, value: part.value })
      } else if (part.type === 'file') {
        const chunks = []
        for await (const chunk of part.stream) {
          chunks.push(chunk)
        }
        const content = Buffer.concat(chunks).toString()
        parts.push({ type: 'file', name: part.filename, content })
      }
    }
    
    return { parts }
  })

  const form = new FormData()
  form.append('name', 'Test User')
  form.append('file', Buffer.from('File content'), { filename: 'test.txt' })
  form.append('email', 'test@example.com')

  const response = await fastify.inject({
    method: 'POST',
    url: '/upload',
    headers: form.getHeaders(),
    payload: form
  })

  t.equal(response.statusCode, 200)
  const { parts } = response.json()
  
  t.equal(parts.length, 3)
  const fieldParts = parts.filter(p => p.type === 'field')
  const fileParts = parts.filter(p => p.type === 'file')
  
  t.equal(fieldParts.length, 2)
  t.equal(fileParts.length, 1)
  t.equal(fileParts[0].content, 'File content')
})

test('should work with swagger schema', async t => {
  const fastify = Fastify()
  await fastify.register(multipart)

  const schema = {
    consumes: ['multipart/form-data'],
    body: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        category: { type: 'string' },
        image: { type: 'string', format: 'binary' }
      }
      // Note: required fields validation should be done manually for multipart
    }
  }

  fastify.post('/products', { schema }, async (request, reply) => {
    const { files, fields } = await request.parseMultipart()
    
    // Validate that fields are plain strings (Swagger compatibility)
    t.type(fields.name, 'string')
    t.type(fields.category, 'string')
    
    return {
      name: fields.name,
      category: fields.category,
      hasImage: files.length > 0
    }
  })

  const form = new FormData()
  form.append('name', 'Product Name')
  form.append('category', 'Electronics')
  form.append('image', Buffer.from('fake image'), { filename: 'product.jpg' })

  const response = await fastify.inject({
    method: 'POST',
    url: '/products',
    headers: form.getHeaders(),
    payload: form
  })

  t.equal(response.statusCode, 200)
  t.same(response.json(), {
    name: 'Product Name',
    category: 'Electronics',
    hasImage: true
  })
})

test('should handle invalid content type', async t => {
  const fastify = Fastify()
  await fastify.register(multipart)

  fastify.post('/upload', async (request, reply) => {
    try {
      await request.parseMultipart()
      return { success: true }
    } catch (err) {
      return reply.code(400).send({ error: err.message })
    }
  })

  const response = await fastify.inject({
    method: 'POST',
    url: '/upload',
    headers: { 'content-type': 'application/json' },
    payload: JSON.stringify({ test: true })
  })

  t.equal(response.statusCode, 400)
  t.match(response.json().error, /Invalid multipart content type/)
})