/**
 * Complete Usage Example for @aegisx/fastify-multipart
 *
 * This example demonstrates:
 * - Plugin registration with custom options
 * - Swagger UI integration with working browse buttons
 * - Single and multiple file uploads
 * - Proper validation bypass for multipart routes
 * - Text fields as plain strings (not wrapped objects)
 * - Automatic temp file cleanup
 * - Error handling
 *
 * Run this example:
 * node examples/complete-usage-example.js
 *
 * Then test at:
 * - http://localhost:3100 (API home)
 * - http://localhost:3100/docs (Swagger UI)
 * - http://localhost:3100/test-form (HTML forms)
 */

'use strict'

const fastify = require('fastify')({ logger: true })
const path = require('path')
const fs = require('fs')

async function start () {
  // ✅ Register Swagger for API documentation
  await fastify.register(require('@fastify/swagger'), {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'Test @aegisx/fastify-multipart Plugin',
        description: 'Testing the real plugin usage',
        version: '1.0.0'
      },
      servers: [{ url: 'http://localhost:3100' }]
    }
  })

  await fastify.register(require('@fastify/swagger-ui'), {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'full',
      deepLinking: false
    }
  })

  await fastify.register(require('@fastify/static'), {
    root: path.join(__dirname, 'uploads'),
    prefix: '/uploads/'
  })

  // ✅ Register OUR plugin
  await fastify.register(require('./index.js'), {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
      files: 10,
      fields: 20
    },
    tempDir: path.join(__dirname, 'temp')
  })

  // ✅ Bypass validation สำหรับ multipart routes
  fastify.setValidatorCompiler(({ schema, method, url, httpPart }) => {
    return function validate (data) {
      if (httpPart === 'body' && url && url.includes('/upload')) {
        return { value: data }
      }
      return { value: data }
    }
  })

  // Helper function สำหรับ save file
  async function saveFile (fileObj, uploadsDir) {
    const timestamp = Date.now()
    const fileExtension = path.extname(fileObj.filename || '')
    const safeFilename = `${timestamp}_${Math.random().toString(36).substring(7)}${fileExtension}`
    const finalPath = path.join(uploadsDir, safeFilename)

    const buffer = await fileObj.toBuffer()
    await fs.promises.writeFile(finalPath, buffer)

    return {
      fileId: `file_${timestamp}_${Math.random().toString(36).substring(7)}`,
      filename: safeFilename,
      originalName: fileObj.filename,
      size: buffer.length,
      mimetype: fileObj.mimetype,
      url: `http://localhost:3100/uploads/${safeFilename}`
    }
  }

  function ensureUploadsDir () {
    const uploadsDir = path.join(__dirname, 'uploads')
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true })
    }
    return uploadsDir
  }

  // 🏠 Home
  fastify.get('/', async () => {
    return {
      message: '🎉 Testing @aegisx/fastify-multipart Plugin',
      version: '1.0.0',
      plugin: '@aegisx/fastify-multipart',
      features: [
        '✅ Text fields เป็น string โดยตรง',
        '✅ ปุ่ม Browse ใน Swagger UI ทำงานได้',
        '✅ ไม่มี validation errors',
        '✅ รองรับ multiple files',
        '✅ Auto cleanup temp files'
      ],
      links: {
        docs: 'http://localhost:3100/docs',
        testForm: 'http://localhost:3100/test-form'
      }
    }
  })

  // 📄 Single file upload
  fastify.post('/upload/single', {
    schema: {
      summary: 'อัปโหลดไฟล์เดียว (ใช้ Plugin)',
      description: 'ทดสอบ plugin @aegisx/fastify-multipart',
      tags: ['Plugin Test'],
      consumes: ['multipart/form-data'],
      body: {
        type: 'object',
        properties: {
          file: {
            type: 'string',
            format: 'binary',
            description: 'ไฟล์ที่ต้องการอัปโหลด'
          },
          title: {
            type: 'string',
            description: 'ชื่อไฟล์'
          },
          description: {
            type: 'string',
            description: 'คำอธิบาย'
          }
        },
        required: ['file', 'title']
      },
      response: {
        200: {
          description: 'อัปโหลดสำเร็จ',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            pluginUsed: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                fileId: { type: 'string' },
                filename: { type: 'string' },
                originalName: { type: 'string' },
                size: { type: 'number' },
                mimetype: { type: 'string' },
                url: { type: 'string' },
                title: { type: 'string' },
                description: { type: 'string' },
                debug: {
                  type: 'object',
                  properties: {
                    fieldsReceived: { type: 'array', items: { type: 'string' } },
                    fileCount: { type: 'number' },
                    uploadTime: { type: 'string' }
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
      // ✅ ใช้ plugin method
      const { files, fields } = await request.parseMultipart()

      console.log('🔌 Using @aegisx/fastify-multipart plugin')
      console.log('📁 Files:', files.length)
      console.log('📝 Fields:', Object.keys(fields))

      if (!files || files.length === 0) {
        return reply.code(400).send({
          success: false,
          message: 'ไม่พบไฟล์ที่ต้องการอัปโหลด'
        })
      }

      if (!fields.title) {
        return reply.code(400).send({
          success: false,
          message: 'กรุณาใส่ชื่อไฟล์'
        })
      }

      const uploadsDir = ensureUploadsDir()
      const fileInfo = await saveFile(files[0], uploadsDir)

      return {
        success: true,
        message: 'อัปโหลดไฟล์สำเร็จ (ใช้ Plugin)',
        pluginUsed: '@aegisx/fastify-multipart',
        data: {
          fileId: fileInfo.fileId,
          filename: fileInfo.filename,
          originalName: fileInfo.originalName,
          size: fileInfo.size,
          mimetype: fileInfo.mimetype,
          url: fileInfo.url,

          // ✅ Text fields เป็น string โดยตรง!
          title: fields.title,
          description: fields.description || '',

          debug: {
            fieldsReceived: Object.keys(fields),
            fileCount: files.length,
            uploadTime: new Date().toISOString()
          }
        }
      }
    } catch (error) {
      fastify.log.error(error)
      return reply.code(500).send({
        success: false,
        message: 'เกิดข้อผิดพลาด: ' + error.message
      })
    }
  })

  // 📄📄 Multiple files upload
  fastify.post('/upload/multiple', {
    schema: {
      summary: 'อัปโหลดหลายไฟล์ (ใช้ Plugin)',
      description: 'ทดสอบ plugin กับหลายไฟล์',
      tags: ['Plugin Test'],
      consumes: ['multipart/form-data'],
      body: {
        type: 'object',
        properties: {
          files: {
            type: 'array',
            items: {
              type: 'string',
              format: 'binary'
            },
            description: 'หลายไฟล์ที่ต้องการอัปโหลด'
          },
          albumName: {
            type: 'string',
            description: 'ชื่ออัลบั้ม'
          },
          tags: {
            type: 'string',
            description: 'แท็ก (คั่นด้วย comma)'
          }
        },
        required: ['files', 'albumName']
      },
      response: {
        200: {
          description: 'อัปโหลดสำเร็จ',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            pluginUsed: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                uploadId: { type: 'string' },
                totalFiles: { type: 'number' },
                albumName: { type: 'string' },
                tags: { type: 'array', items: { type: 'string' } },
                files: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      fileId: { type: 'string' },
                      filename: { type: 'string' },
                      originalName: { type: 'string' },
                      size: { type: 'number' },
                      mimetype: { type: 'string' },
                      url: { type: 'string' }
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
      // ✅ ใช้ plugin method
      const { files, fields } = await request.parseMultipart()

      if (!files || files.length === 0) {
        return reply.code(400).send({
          success: false,
          message: 'ไม่พบไฟล์ที่ต้องการอัปโหลด'
        })
      }

      if (!fields.albumName) {
        return reply.code(400).send({
          success: false,
          message: 'กรุณาใส่ชื่ออัลบั้ม'
        })
      }

      const uploadsDir = ensureUploadsDir()
      const processedFiles = []

      for (const file of files) {
        const fileInfo = await saveFile(file, uploadsDir)
        processedFiles.push(fileInfo)
      }

      const tags = fields.tags ? fields.tags.split(',').map(t => t.trim()).filter(t => t) : []

      return {
        success: true,
        message: `อัปโหลด ${processedFiles.length} ไฟล์สำเร็จ (ใช้ Plugin)`,
        pluginUsed: '@aegisx/fastify-multipart',
        data: {
          uploadId: `upload_${Date.now()}`,
          totalFiles: processedFiles.length,
          albumName: fields.albumName,
          tags,
          files: processedFiles
        }
      }
    } catch (error) {
      fastify.log.error(error)
      return reply.code(500).send({
        success: false,
        message: 'เกิดข้อผิดพลาด: ' + error.message
      })
    }
  })

  // 📋 Test form page
  fastify.get('/test-form', async (request, reply) => {
    const html = `
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🔌 Test @aegisx/fastify-multipart Plugin</title>
    <style>
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            max-width: 1000px; 
            margin: 0 auto; 
            padding: 20px; 
            background: #f8f9fa;
        }
        .container { 
            background: white; 
            padding: 30px; 
            border-radius: 10px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
            margin-bottom: 20px;
        }
        h1 { color: #333; text-align: center; margin-bottom: 30px; }
        h3 { color: #495057; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
        .plugin-note { 
            background: #d4edda; 
            color: #155724; 
            padding: 20px; 
            border-radius: 8px; 
            margin: 20px 0; 
            border-left: 4px solid #28a745;
        }
        .form-group { margin: 15px 0; }
        label { display: block; margin-bottom: 8px; font-weight: 600; color: #495057; }
        input, textarea { 
            width: 100%; 
            padding: 12px; 
            border: 1px solid #ced4da; 
            border-radius: 6px; 
            font-size: 14px; 
            box-sizing: border-box;
        }
        button { 
            background: #007bff; 
            color: white; 
            padding: 12px 25px; 
            border: none; 
            border-radius: 6px; 
            cursor: pointer; 
            font-size: 16px; 
            width: 100%; 
            margin-top: 15px;
        }
        button:hover { background: #0056b3; }
        .links { text-align: center; margin: 25px 0; }
        .links a { 
            color: #007bff; 
            text-decoration: none; 
            margin: 0 15px; 
            font-weight: 600; 
            padding: 8px 15px; 
            border: 1px solid #007bff; 
            border-radius: 4px;
        }
        .links a:hover { background: #007bff; color: white; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔌 Test @aegisx/fastify-multipart Plugin</h1>
        
        <div class="plugin-note">
            <strong>✅ ใช้ Plugin จริง!</strong><br>
            • ไฟล์นี้เรียกใช้ <code>@aegisx/fastify-multipart</code> plugin จริง<br>
            • Text fields เป็น string โดยตรง<br>
            • ปุ่ม Browse ใน Swagger UI ทำงานได้<br>
            • Auto cleanup temp files<br>
            • Compatible กับ Fastify v5
        </div>

        <div class="links">
            <a href="/docs" target="_blank">📖 Swagger UI</a>
            <a href="/" target="_blank">🏠 API Home</a>
        </div>
    </div>

    <div class="container">
        <h3>📄 อัปโหลดไฟล์เดียว</h3>
        <form action="/upload/single" method="post" enctype="multipart/form-data">
            <div class="form-group">
                <label for="file1">เลือกไฟล์:</label>
                <input type="file" id="file1" name="file" required>
            </div>
            <div class="form-group">
                <label for="title1">ชื่อไฟล์:</label>
                <input type="text" id="title1" name="title" placeholder="ใส่ชื่อไฟล์" required>
            </div>
            <div class="form-group">
                <label for="desc1">คำอธิบาย:</label>
                <textarea id="desc1" name="description" placeholder="คำอธิบายไฟล์" rows="3"></textarea>
            </div>
            <button type="submit">📤 อัปโหลด (Plugin)</button>
        </form>
    </div>

    <div class="container">
        <h3>📄📄 อัปโหลดหลายไฟล์</h3>
        <form action="/upload/multiple" method="post" enctype="multipart/form-data">
            <div class="form-group">
                <label for="files2">เลือกหลายไฟล์:</label>
                <input type="file" id="files2" name="files" multiple required>
            </div>
            <div class="form-group">
                <label for="album2">ชื่ออัลบั้ม:</label>
                <input type="text" id="album2" name="albumName" placeholder="ชื่ออัลบั้ม" required>
            </div>
            <div class="form-group">
                <label for="tags2">แท็ก:</label>
                <input type="text" id="tags2" name="tags" placeholder="ท่องเที่ยว,ทะเล,ครอบครัว">
            </div>
            <button type="submit">📤 อัปโหลดทั้งหมด (Plugin)</button>
        </form>
    </div>
</body>
</html>`

    reply.type('text/html')
    return html
  })

  await fastify.listen({ port: 3100, host: '0.0.0.0' })
  console.log('🔌 Plugin Test Server running at:')
  console.log('   📱 Home: http://localhost:3100')
  console.log('   📋 Test Forms: http://localhost:3100/test-form')
  console.log('   📖 Swagger UI: http://localhost:3100/docs')
  console.log('')
  console.log('🎯 Testing @aegisx/fastify-multipart Plugin:')
  console.log('   • ใช้ plugin จริงแล้ว ไม่ใช่ helper function')
  console.log('   • ทดสอบได้ทั้ง single และ multiple files')
  console.log('   • Text fields เป็น string โดยตรง')
  console.log('   • ปุ่ม Browse ใน Swagger UI ทำงานได้')
}

start().catch(err => {
  console.error('❌ Error starting plugin test server:', err)
  process.exit(1)
})
