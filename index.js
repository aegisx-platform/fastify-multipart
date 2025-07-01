'use strict'

const fp = require('fastify-plugin')
const busboy = require('busboy')
const fs = require('fs')
const path = require('path')
const os = require('os')
const createError = require('@fastify/error')

const kMultipart = Symbol('multipart')
const kTempFiles = Symbol('tempFiles')

const FileSizeLimit = createError('FST_MULTIPART_FILE_SIZE_LIMIT', 'File size limit exceeded: %s', 413)
const FilesLimit = createError('FST_MULTIPART_FILES_LIMIT', 'Too many files', 413)
const FieldsLimit = createError('FST_MULTIPART_FIELDS_LIMIT', 'Too many fields', 413)
const InvalidMultipartContentType = createError('FST_MULTIPART_INVALID_CONTENT_TYPE', 'Invalid multipart content type', 400)
const InvalidPart = createError('FST_MULTIPART_INVALID_PART', 'Invalid multipart part', 400)

async function multipartPlugin (fastify, options) {
  const defaults = {
    limits: {
      fileSize: 1024 * 1024 * 10, // 10MB
      files: 10,
      fields: 20,
      fieldNameSize: 100,
      fieldSize: 1024 * 1024, // 1MB
      headerPairs: 2000
    },
    tempDir: os.tmpdir(),
    autoContentTypeParser: true
  }

  const config = {
    ...defaults,
    ...options,
    limits: {
      ...defaults.limits,
      ...(options.limits || {})
    }
  }

  fastify.decorateRequest(kMultipart, null)
  fastify.decorateRequest(kTempFiles, null)

  fastify.decorateRequest('parseMultipart', function () {
    const request = this

    return new Promise((resolve, reject) => {
      if (!request.headers['content-type']?.includes('multipart/form-data')) {
        return reject(new InvalidMultipartContentType())
      }

      const bb = busboy({
        headers: request.headers,
        limits: config.limits
      })

      const files = []
      const fields = {}
      const tempFiles = []
      let pendingFiles = 0

      // Handle file fields
      bb.on('file', (fieldname, file, info) => {
        pendingFiles++

        // Extract filename, encoding, mimeType from info object
        const filename = info.filename || 'unnamed'
        const encoding = info.encoding || '7bit'
        const mimetype = info.mimeType || 'application/octet-stream'

        // Create temp directory if it doesn't exist
        if (!fs.existsSync(config.tempDir)) {
          fs.mkdirSync(config.tempDir, { recursive: true })
        }

        const tempFilePath = path.join(config.tempDir, `upload_${Date.now()}_${Math.random().toString(36).substring(7)}`)
        const writeStream = fs.createWriteStream(tempFilePath)

        tempFiles.push(tempFilePath)

        // Pipe file to writeStream
        file.pipe(writeStream)

        writeStream.on('finish', () => {
          const fileObj = {
            fieldname,
            filename,
            encoding,
            mimetype,

            // Method to read file as buffer
            async toBuffer () {
              return fs.promises.readFile(tempFilePath)
            },

            // Method to create read stream
            createReadStream () {
              return fs.createReadStream(tempFilePath)
            },

            // File size getter
            get size () {
              try {
                return fs.statSync(tempFilePath).size
              } catch {
                return 0
              }
            },

            // Temporary file path (for cleanup)
            _tempPath: tempFilePath
          }

          files.push(fileObj)
          pendingFiles--

          // If all files are done and busboy is finished, resolve
          if (pendingFiles === 0 && bb.finished) {
            const result = { files, fields, _tempFiles: tempFiles }
            request[kMultipart] = result
            request[kTempFiles] = tempFiles
            resolve(result)
          }
        })

        writeStream.on('error', reject)
      })

      // Handle text fields - store as plain strings
      bb.on('field', (fieldname, value) => {
        if (fields[fieldname]) {
          // Handle multiple values for same field name
          if (!Array.isArray(fields[fieldname])) {
            fields[fieldname] = [fields[fieldname]]
          }
          fields[fieldname].push(value)
        } else {
          fields[fieldname] = value
        }
      })

      bb.on('finish', () => {
        bb.finished = true

        // If no pending files, resolve immediately
        if (pendingFiles === 0) {
          const result = { files, fields, _tempFiles: tempFiles }
          request[kMultipart] = result
          request[kTempFiles] = tempFiles
          resolve(result)
        }
      })

      bb.on('filesLimit', () => {
        reject(new FilesLimit())
      })

      bb.on('fieldsLimit', () => {
        reject(new FieldsLimit())
      })

      bb.on('error', reject)

      // Pipe request to busboy
      request.raw.pipe(bb)
    })
  })

  fastify.decorateRequest('file', async function (options = {}) {
    const { files } = await this.parseMultipart()
    return files[0] || null
  })

  fastify.decorateRequest('files', async function (options = {}) {
    const { files } = await this.parseMultipart()
    return files
  })

  fastify.decorateRequest('parts', async function * () {
    const contentType = this.headers['content-type']
    if (!contentType || !contentType.includes('multipart/form-data')) {
      throw new InvalidMultipartContentType()
    }

    const bb = busboy({
      headers: this.headers,
      limits: config.limits
    })

    const parts = []
    let finished = false

    bb.on('file', (fieldname, stream, info) => {
      parts.push({
        type: 'file',
        fieldname,
        filename: info.filename || 'unnamed',
        encoding: info.encoding || '7bit',
        mimetype: info.mimeType || 'application/octet-stream',
        stream
      })
    })

    bb.on('field', (fieldname, value) => {
      parts.push({
        type: 'field',
        fieldname,
        value
      })
    })

    bb.on('finish', () => {
      finished = true
    })

    bb.on('error', (err) => {
      parts.push({ type: 'error', error: err })
    })

    this.raw.pipe(bb)

    while (!finished || parts.length > 0) {
      if (parts.length > 0) {
        const part = parts.shift()
        if (part.type === 'error') {
          throw part.error
        }
        yield part
      } else {
        await new Promise(resolve => setImmediate(resolve))
      }
    }
  })

  fastify.decorateRequest('cleanupTempFiles', async function (tempFiles) {
    const filesToClean = tempFiles || this[kTempFiles]
    const cleanupPromises = filesToClean.map(tempPath => 
      fs.promises.unlink(tempPath).catch(() => {})
    )
    await Promise.all(cleanupPromises)
  })

  fastify.decorate('multipartErrors', {
    FileSizeLimit,
    FilesLimit,
    FieldsLimit,
    InvalidMultipartContentType,
    InvalidPart
  })

  // Auto cleanup temp files on response
  fastify.addHook('onResponse', async (request) => {
    const tempFiles = request[kTempFiles]
    if (tempFiles && Array.isArray(tempFiles) && tempFiles.length > 0) {
      await request.cleanupTempFiles()
    }
  })

  // Auto register content type parser
  if (config.autoContentTypeParser) {
    fastify.addContentTypeParser('multipart/form-data', function (request, payload, done) {
      done(null, payload)
    })
  }
}

module.exports = fp(multipartPlugin, {
  fastify: '4.x',
  name: '@aegisx/fastify-multipart'
})