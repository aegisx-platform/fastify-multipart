# Examples for @aegisx/fastify-multipart

This directory contains comprehensive examples demonstrating various use cases and features of the `@aegisx/fastify-multipart` plugin.

## 📋 Available Examples

### 1. **Basic Usage** (`basic-usage.js`)
The simplest way to get started with the plugin.

```bash
node examples/basic-usage.js
# Test: curl -X POST http://localhost:3000/upload -F "name=John" -F "file=@package.json"
```

**Features demonstrated:**
- Basic plugin registration
- Simple file upload handling
- Text fields as plain strings
- Error handling

---

### 2. **Swagger UI Integration** (`swagger-integration.js`)
Complete Swagger UI setup with working browse buttons and clean form handling.

```bash
node examples/swagger-integration.js
# Visit: http://localhost:3001/docs
```

**Features demonstrated:**
- Swagger UI with working file upload buttons
- Proper validation bypass for multipart routes
- Multiple endpoints with different schemas
- No validation errors
- Custom content type parser setup

---

### 3. **Complete Usage Example** (`complete-usage-example.js`)
Production-ready example with multiple endpoints and comprehensive features.

```bash
node examples/complete-usage-example.js
# Visit: http://localhost:3100/docs or http://localhost:3100/test-form
```

**Features demonstrated:**
- Single and multiple file uploads
- HTML forms for testing
- File saving with unique names
- Comprehensive response schemas
- Production-ready patterns

---

### 4. **Streaming Upload** (`streaming-upload.js`)
Efficient handling of large files using streaming instead of loading into memory.

```bash
node examples/streaming-upload.js
# Test: curl -X POST http://localhost:3002/upload/stream -F "file=@large-file.zip"
```

**Features demonstrated:**
- Memory-efficient streaming uploads
- Comparison between streaming vs memory approaches
- Image processing pipeline example
- Memory usage monitoring
- Performance optimization techniques

---

### 5. **Error Handling** (`error-handling.js`)
Comprehensive error handling for various failure scenarios.

```bash
node examples/error-handling.js
# Test various error scenarios
```

**Features demonstrated:**
- File size limit errors
- File count limit errors
- Field limit errors
- Custom validation errors
- Global error handler setup
- Proper error response formatting

## 🚀 Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run any example:**
   ```bash
   node examples/basic-usage.js
   ```

3. **Test the API:**
   ```bash
   # Basic upload test
   curl -X POST http://localhost:3000/upload \
     -F "name=John Doe" \
     -F "email=john@example.com" \
     -F "file=@package.json"
   ```

## 🎯 Common Patterns

### Plugin Registration with Custom Options
```javascript
await fastify.register(require('@aegisx/fastify-multipart'), {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 5,
    fields: 20
  },
  tempDir: path.join(__dirname, 'temp')
})
```

### Swagger UI Setup (Required for Browse Buttons)
```javascript
// 1. Register multipart with autoContentTypeParser: false
await fastify.register(multipart, { autoContentTypeParser: false })

// 2. Add custom content type parser
fastify.addContentTypeParser('multipart/form-data', (req, payload, done) => {
  done(null, payload)
})

// 3. Bypass validation for multipart routes
fastify.setValidatorCompiler(({ schema, method, url, httpPart }) => {
  return function validate(data) {
    if (httpPart === 'body' && url && url.includes('/upload')) {
      return { value: data }
    }
    return { value: data }
  }
})
```

### Route Schema for File Uploads
```javascript
fastify.post('/upload', {
  schema: {
    consumes: ['multipart/form-data'], // Required for browse buttons
    body: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary' // Required for browse buttons
        },
        name: { type: 'string' }
      }
    }
  }
}, async (request, reply) => {
  const { files, fields } = await request.parseMultipart()
  // Process upload...
})
```

### Error Handling
```javascript
fastify.setErrorHandler((error, request, reply) => {
  if (error instanceof fastify.multipartErrors.FileSizeLimit) {
    return reply.status(413).send({ error: 'File too large' })
  }
  // Handle other errors...
})
```

## 🔧 Testing Tips

### Using curl
```bash
# Single file upload
curl -X POST http://localhost:3000/upload \
  -F "title=My Document" \
  -F "file=@document.pdf"

# Multiple files
curl -X POST http://localhost:3000/upload/multiple \
  -F "albumName=Vacation Photos" \
  -F "files=@photo1.jpg" \
  -F "files=@photo2.jpg"

# Test file size limit
curl -X POST http://localhost:3003/upload/size-test \
  -F "file=@large-file.zip"
```

### Using Swagger UI
1. Run any example with Swagger integration
2. Visit `/docs` endpoint
3. Look for "Try it out" buttons
4. Upload files using the browse buttons
5. Submit and check responses

### Using HTML Forms
Run the complete usage example and visit `/test-form` for interactive HTML forms.

## ❗ Troubleshooting

### Browse Buttons Not Showing in Swagger UI
Make sure you have:
- `consumes: ['multipart/form-data']` in schema
- `format: 'binary'` for file fields
- Custom content type parser setup
- Validation bypass configured

### "Value must be a string" Errors
Use the validation bypass pattern:
```javascript
fastify.setValidatorCompiler(({ schema, method, url, httpPart }) => {
  return function validate(data) {
    if (httpPart === 'body' && url && url.includes('/upload')) {
      return { value: data }
    }
    return { value: data }
  }
})
```

### File Size/Count Limit Errors
Adjust limits in plugin options:
```javascript
await fastify.register(multipart, {
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 10
  }
})
```

## 📖 Further Reading

- [Main README](../README.md) - Complete plugin documentation
- [TypeScript Definitions](../index.d.ts) - Type definitions
- [Package.json](../package.json) - Dependencies and scripts

## 💡 Contributing

Have an example idea? Feel free to contribute by:
1. Creating a new example file
2. Adding it to this README
3. Submitting a pull request

Examples should be:
- Self-contained and runnable
- Well-documented with comments
- Focused on specific use cases
- Include test commands