import { FastifyPluginCallback, FastifyRequest } from 'fastify'
import { Readable } from 'stream'

declare module 'fastify' {
  interface FastifyRequest {
    /**
     * Parse multipart form data
     * @returns Promise containing files and fields
     */
    parseMultipart(): Promise<MultipartParseResult>

    /**
     * Get the first uploaded file
     * @returns First file or null
     */
    file(): MultipartFile | null

    /**
     * Get all uploaded files
     * @returns Array of files
     */
    files(): MultipartFile[]

    /**
     * Get async iterator for multipart parts
     * @returns Async generator of parts
     */
    parts(): AsyncGenerator<MultipartPart, void, unknown>

    /**
     * Clean up temporary files
     * @param tempFiles Optional array of temp file paths
     */
    cleanupTempFiles(tempFiles?: string[]): Promise<void>
  }

  interface FastifyInstance {
    /**
     * Multipart error constructors
     */
    multipartErrors: {
      FileSizeLimit: (filename: string) => Error
      FilesLimit: () => Error
      FieldsLimit: () => Error
      InvalidMultipartContentType: () => Error
      InvalidPart: () => Error
    }
  }
}

export interface MultipartFile {
  /**
   * Field name from the form
   */
  fieldname?: string

  /**
   * Original filename
   */
  filename: string

  /**
   * File encoding
   */
  encoding: string

  /**
   * File MIME type
   */
  mimetype: string

  /**
   * File size in bytes
   */
  readonly size: number

  /**
   * Read file into buffer
   */
  toBuffer(): Promise<Buffer>

  /**
   * Create read stream for the file
   */
  createReadStream(): Readable

  /**
   * Internal temp file path
   */
  _tempPath: string
}

export interface MultipartParseResult {
  /**
   * Array of uploaded files
   */
  files: MultipartFile[]

  /**
   * Object containing field names and their string values
   */
  fields: Record<string, string>

  /**
   * Array of temporary file paths for cleanup
   */
  _tempFiles: string[]
}

export interface MultipartFieldPart {
  type: 'field'
  fieldname: string
  value: string
}

export interface MultipartFilePart {
  type: 'file'
  fieldname: string
  filename: string
  encoding: string
  mimetype: string
  stream: Readable
}

export type MultipartPart = MultipartFieldPart | MultipartFilePart

export interface MultipartOptions {
  /**
   * Limits configuration
   */
  limits?: {
    /**
     * Max file size in bytes (default: 10MB)
     */
    fileSize?: number

    /**
     * Max number of files (default: 10)
     */
    files?: number

    /**
     * Max number of fields (default: 20)
     */
    fields?: number

    /**
     * Max field name size (default: 100)
     */
    fieldNameSize?: number

    /**
     * Max field value size (default: 1MB)
     */
    fieldSize?: number

    /**
     * Max header pairs (default: 2000)
     */
    headerPairs?: number
  }

  /**
   * Temporary directory for file uploads (default: os.tmpdir())
   */
  tempDir?: string

  /**
   * Auto register content type parser (default: true)
   */
  autoContentTypeParser?: boolean
}

declare const fastifyMultipart: FastifyPluginCallback<MultipartOptions>

export default fastifyMultipart
export { fastifyMultipart }