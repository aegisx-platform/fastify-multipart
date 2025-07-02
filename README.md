# @aegisx/fastify-multipart

Production-ready Fastify plugin for handling `multipart/form-data` with a clean API and full Swagger UI support. This plugin solves the common issue where text fields become objects with `{ value: "string" }` instead of plain strings, ensuring perfect compatibility with Swagger UI forms.

## Features

- ✅ **Clean API**: Text fields are plain strings, not wrapped objects
- ✅ **Full Swagger UI Support**: Works perfectly with Swagger UI form submissions
- ✅ **Compatible API**: Drop-in replacement for @fastify/multipart
- ✅ **Automatic Cleanup**: Temporary files are cleaned up automatically
- ✅ **TypeScript Support**: Full TypeScript definitions included
- ✅ **Streaming Support**: Efficient file handling with streams
- ✅ **Configurable Limits**: Control file sizes, field counts, and more

## Installation

```bash
npm install @aegisx/fastify-multipart
```

## Quick Start

```javascript
const fastify = require('fastify')()
const multipart = require('@aegisx/fastify-multipart')

// Register the plugin
await fastify.register(multipart)

// Create an upload route
fastify.post('/upload', async (request, reply) => {
  const { files, fields } = await request.parseMultipart()
  
  // fields.name is a plain string, not { value: "string" }
  console.log('Name:', fields.name)
  console.log('Description:', fields.description)
  
  // Handle uploaded files
  for (const file of files) {
    console.log('File:', file.filename, file.size, 'bytes')
    // Save file or process it
    const buffer = await file.toBuffer()
  }
  
  return { success: true }
})
```

## API Documentation

### Plugin Options

```javascript
await fastify.register(multipart, {
  limits: {
    fileSize: 1024 * 1024 * 10,  // 10MB (default)
    files: 10,                    // Max number of files (default: 10)
    fields: 20,                   // Max number of fields (default: 20)
    fieldNameSize: 100,           // Max field name length (default: 100)
    fieldSize: 1024 * 1024,       // Max field value size (default: 1MB)
    headerPairs: 2000             // Max header pairs (default: 2000)
  },
  tempDir: '/tmp',                // Temp directory (default: os.tmpdir())
  autoContentTypeParser: true     // Auto-register parser (default: true)
})
```

### Request Methods

#### `request.parseMultipart()`

Parse multipart form data. Returns a promise with files and fields.

```javascript
const { files, fields, _tempFiles } = await request.parseMultipart()

// fields are plain strings
console.log(fields.category)     // "electronics"
console.log(fields.description)  // "Product description"

// files array contains file objects
for (const file of files) {
  console.log(file.filename)
  console.log(file.mimetype)
  console.log(file.size)
}
```

#### `request.file()`

Get the first uploaded file or null.

```javascript
const file = request.file()
if (file) {
  const buffer = await file.toBuffer()
}
```

#### `request.files()`

Get all uploaded files as an array.

```javascript
const files = request.files()
for (const file of files) {
  const stream = file.createReadStream()
  // Process stream...
}
```

#### `request.parts()`

Get an async iterator for streaming multipart parts.

```javascript
for await (const part of request.parts()) {
  if (part.type === 'file') {
    // Handle file stream
    console.log('File:', part.filename)
    // part.stream is a readable stream
  } else {
    // Handle field
    console.log('Field:', part.fieldname, part.value)
  }
}
```

#### `request.cleanupTempFiles()`

Manually cleanup temporary files (automatic cleanup happens on response).

```javascript
await request.cleanupTempFiles()
```

### File Object

Each file object has the following properties and methods:

```javascript
{
  filename: 'image.jpg',           // Original filename
  encoding: '7bit',                // File encoding
  mimetype: 'image/jpeg',          // MIME type
  size: 102400,                    // Size in bytes (getter)
  toBuffer(): Promise<Buffer>,     // Read file into buffer
  createReadStream(): Readable,    // Create read stream
  _tempPath: '/tmp/upload_xxx'     // Temp file path (internal)
}
```

### Error Handling

The plugin exports error constructors via `fastify.multipartErrors`:

```javascript
fastify.post('/upload', async (request, reply) => {
  try {
    const { files, fields } = await request.parseMultipart()
    // Process upload...
  } catch (err) {
    if (err instanceof fastify.multipartErrors.FileSizeLimit) {
      return reply.code(413).send({ error: 'File too large' })
    }
    if (err instanceof fastify.multipartErrors.FilesLimit) {
      return reply.code(413).send({ error: 'Too many files' })
    }
    throw err
  }
})
```

## Swagger UI Integration

This plugin works perfectly with Swagger UI form submissions. Here's the recommended setup:

```javascript
const fastify = require('fastify')()
const multipart = require('@aegisx/fastify-multipart')
const swagger = require('@fastify/swagger')
const swaggerUI = require('@fastify/swagger-ui')

// Register Swagger first
await fastify.register(swagger, { /* options */ })
await fastify.register(swaggerUI, { /* options */ })

// Register multipart plugin with validation bypass
await fastify.register(multipart, {
  autoContentTypeParser: false // Important!
})

// Custom content type parser
fastify.addContentTypeParser('multipart/form-data', function (request, payload, done) {
  done(null, payload)
})

// Bypass validation for multipart routes (prevents validation errors)
fastify.setValidatorCompiler(({ schema, method, url, httpPart }) => {
  return function validate(data) {
    // Skip body validation for upload routes
    if (httpPart === 'body' && url && url.includes('/upload')) {
      return { value: data }
    }
    return { value: data }
  }
})

fastify.post('/upload/products', {
  schema: {
    summary: 'Create product with image',
    consumes: ['multipart/form-data'],
    body: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        category: { type: 'string' },
        description: { type: 'string' },
        image: { type: 'string', format: 'binary' }
      },
      required: ['name', 'category']
    }
  }
}, async (request, reply) => {
  const { files, fields } = await request.parseMultipart()
  
  // Manual validation since schema validation is bypassed
  if (!fields.name || !fields.category) {
    return reply.code(400).send({ error: 'Name and category are required' })
  }
  
  // Text fields are plain strings - works perfectly with Swagger UI!
  console.log('Name:', fields.name)          // "Product Name"
  console.log('Category:', fields.category)  // "Electronics"
  
  return { success: true, data: fields }
})
```

### Why This Setup?

The custom validator bypass prevents Fastify from trying to validate multipart form data against JSON schemas, which causes the "Value must be a string" errors you might have seen. With this setup:

✅ Swagger UI displays the form correctly  
✅ No validation errors  
✅ Text fields are plain strings  
✅ Perfect user experience

## Migration from @fastify/multipart

Migrating from `@fastify/multipart` is straightforward:

### Before (with @fastify/multipart):
```javascript
const multipart = require('@fastify/multipart')
await fastify.register(multipart, { attachFieldsToBody: true })

fastify.post('/upload', async (request, reply) => {
  // Fields are wrapped objects
  const name = request.body.name.value        // { value: "John" }
  const email = request.body.email.value      // { value: "john@email.com" }
  
  // Files need separate handling
  const files = request.files()
})
```

### After (with @aegisx/fastify-multipart):
```javascript
const multipart = require('@aegisx/fastify-multipart')
await fastify.register(multipart)

fastify.post('/upload', async (request, reply) => {
  const { files, fields } = await request.parseMultipart()
  
  // Fields are plain strings!
  const name = fields.name      // "John"
  const email = fields.email    // "john@email.com"
  
  // Files are included in the same result
})
```

## Comparison with @fastify/multipart

| Feature | @aegisx/fastify-multipart | @fastify/multipart |
|---------|---------------------------|-------------------|
| Text fields format | Plain strings ✅ | Wrapped objects `{ value }` |
| Swagger UI compatibility | Full support ✅ | Requires workarounds |
| API simplicity | Single method returns all ✅ | Multiple methods needed |
| TypeScript support | Full definitions ✅ | Full definitions ✅ |
| Automatic cleanup | Yes ✅ | Yes ✅ |
| Streaming support | Yes ✅ | Yes ✅ |
| Field validation | Direct validation ✅ | Complex validation |

## TypeScript Usage

```typescript
import fastify from 'fastify'
import multipart, { MultipartFile, MultipartParseResult } from '@aegisx/fastify-multipart'

const app = fastify()
await app.register(multipart)

app.post('/upload', async (request, reply) => {
  const { files, fields }: MultipartParseResult = await request.parseMultipart()
  
  // TypeScript knows fields are Record<string, string>
  const name: string = fields.name
  
  // TypeScript knows files array structure
  files.forEach((file: MultipartFile) => {
    console.log(file.filename)
  })
  
  return { success: true }
})
```

## Advanced Examples

### Handle Large Files with Streaming

```javascript
fastify.post('/upload-large', async (request, reply) => {
  for await (const part of request.parts()) {
    if (part.type === 'file') {
      // Stream directly to storage instead of loading into memory
      const writeStream = fs.createWriteStream(`./uploads/${part.filename}`)
      await pipeline(part.stream, writeStream)
    }
  }
  return { success: true }
})
```

### Custom Error Handling

```javascript
fastify.setErrorHandler((error, request, reply) => {
  if (error instanceof fastify.multipartErrors.FileSizeLimit) {
    reply.status(413).send({
      statusCode: 413,
      error: 'Payload Too Large',
      message: `File size limit exceeded: ${error.message}`
    })
  } else {
    reply.send(error)
  }
})
```

### Conditional File Processing

```javascript
fastify.post('/upload-images', async (request, reply) => {
  const { files, fields } = await request.parseMultipart()
  
  const imageFiles = files.filter(file => 
    file.mimetype.startsWith('image/')
  )
  
  if (imageFiles.length === 0) {
    return reply.code(400).send({ error: 'No images uploaded' })
  }
  
  // Process only image files
  for (const image of imageFiles) {
    const buffer = await image.toBuffer()
    // Process image...
  }
  
  return { processed: imageFiles.length }
})
```

## Troubleshooting

### Common Issues

1. **Swagger Validation Error: "Value must be a string"**
   
   This happens when Fastify tries to validate multipart form data against JSON schemas.
   
   **Solution:** Use the validation bypass setup shown in the Swagger Integration section:
   ```javascript
   await fastify.register(multipart, { autoContentTypeParser: false })
   
   fastify.addContentTypeParser('multipart/form-data', function (request, payload, done) {
     done(null, payload)
   })
   
   fastify.setValidatorCompiler(({ schema, method, url, httpPart }) => {
     return function validate(data) {
       if (httpPart === 'body' && url && url.includes('/upload')) {
         return { value: data }
       }
       return { value: data }
     }
   })
   ```

2. **"Unexpected end of form" Error**
   
   This can happen if the content type parser conflicts with the plugin.
   
   **Solution:** Set `autoContentTypeParser: false` and register manually:
   ```javascript
   await fastify.register(multipart, { autoContentTypeParser: false })
   ```

3. **File Size Limit Exceeded**
   ```javascript
   // Increase file size limit
   await fastify.register(multipart, {
     limits: { fileSize: 1024 * 1024 * 50 } // 50MB
   })
   ```

4. **Too Many Files**
   ```javascript
   // Increase file count limit
   await fastify.register(multipart, {
     limits: { files: 20 }
   })
   ```

5. **Field Value Too Large**
   ```javascript
   // Increase field size limit
   await fastify.register(multipart, {
     limits: { fieldSize: 1024 * 1024 * 5 } // 5MB
   })
   ```

### Debug Mode

Enable debug logging to troubleshoot issues:

```javascript
const fastify = require('fastify')({ logger: true })
```

### Quick Test

Use this simple test to verify the plugin works:

```javascript
const fastify = require('fastify')()
const multipart = require('@aegisx/fastify-multipart')

await fastify.register(multipart, { autoContentTypeParser: false })
fastify.addContentTypeParser('multipart/form-data', (req, payload, done) => done(null, payload))

fastify.post('/test', async (request) => {
  const { fields, files } = await request.parseMultipart()
  return { fieldsType: typeof fields.name, filesCount: files.length }
})

// Test with curl:
// curl -X POST http://localhost:3000/test -F "name=test" -F "file=@package.json"
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- 🐛 [Report bugs](https://github.com/aegisx/fastify-multipart/issues)
- 💡 [Request features](https://github.com/aegisx/fastify-multipart/issues)
- 📖 [Read documentation](https://github.com/aegisx/fastify-multipart#readme)

