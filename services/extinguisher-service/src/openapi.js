/** OpenAPI 3.0 spec for the Fire Extinguisher Management service. */
module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'FEMS — Fire Extinguisher Management Service',
    version: '1.0.0',
    description: 'CRUD for fire extinguisher records (serial, location, type, size, dates, status).',
  },
  servers: [
    { url: 'http://localhost:8080/api', description: 'Via API gateway' },
    { url: 'http://localhost:4002', description: 'Direct' },
  ],
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas: {
      ErrorEnvelope: {
        type: 'object',
        properties: { error: { type: 'object', properties: { message: { type: 'string' }, details: { type: 'object', additionalProperties: { type: 'string' } } } } },
      },
      Extinguisher: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          serialNumber: { type: 'string' },
          location: { type: 'string' },
          type: { type: 'string', enum: ['water', 'co2', 'foam', 'dry_chemical'] },
          size: { type: 'string', enum: ['2.5lb', '5lb', '9lb', '12lb'] },
          installationDate: { type: 'string', format: 'date' },
          expiryDate: { type: 'string', format: 'date' },
          status: { type: 'string', enum: ['active', 'maintenance', 'expired', 'decommissioned'] },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/extinguishers': {
      get: {
        tags: ['Extinguishers'], summary: 'List extinguishers (filterable)',
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['active', 'maintenance', 'expired', 'decommissioned'] } },
          { name: 'type', in: 'query', schema: { type: 'string', enum: ['water', 'co2', 'foam', 'dry_chemical'] } },
          { name: 'q', in: 'query', description: 'Search serial/location', schema: { type: 'string' } },
          { name: 'expiringInDays', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
          { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
        ],
        responses: {
          200: { description: 'List', content: { 'application/json': { schema: { type: 'object', properties: { total: { type: 'integer' }, limit: { type: 'integer' }, offset: { type: 'integer' }, count: { type: 'integer' }, extinguishers: { type: 'array', items: { $ref: '#/components/schemas/Extinguisher' } } } } } } },
          400: { description: 'Bad request', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
        },
      },
      post: {
        tags: ['Extinguishers'], summary: 'Register a new extinguisher (admin/inspector)',
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object',
          required: ['serialNumber', 'location', 'type', 'size', 'installationDate', 'expiryDate'],
          properties: {
            serialNumber: { type: 'string', example: 'FE-2001' },
            location: { type: 'string', example: 'Building D — Lab' },
            type: { type: 'string', enum: ['water', 'co2', 'foam', 'dry_chemical'] },
            size: { type: 'string', enum: ['2.5lb', '5lb', '9lb', '12lb'] },
            installationDate: { type: 'string', format: 'date', example: '2026-01-01' },
            expiryDate: { type: 'string', format: 'date', example: '2031-01-01' },
            status: { type: 'string', enum: ['active', 'maintenance', 'expired', 'decommissioned'] },
          },
        } } } },
        responses: {
          201: { description: 'Created', content: { 'application/json': { schema: { type: 'object', properties: { extinguisher: { $ref: '#/components/schemas/Extinguisher' } } } } } },
          400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
          409: { description: 'Serial exists', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
        },
      },
    },
    '/extinguishers/{id}': {
      get: { tags: ['Extinguishers'], summary: 'Get extinguisher by id',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Extinguisher', content: { 'application/json': { schema: { type: 'object', properties: { extinguisher: { $ref: '#/components/schemas/Extinguisher' } } } } } }, 404: { description: 'Not found' } } },
      patch: { tags: ['Extinguishers'], summary: 'Update extinguisher (admin/inspector)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: {
          serialNumber: { type: 'string' }, location: { type: 'string' },
          type: { type: 'string', enum: ['water', 'co2', 'foam', 'dry_chemical'] },
          size: { type: 'string', enum: ['2.5lb', '5lb', '9lb', '12lb'] },
          installationDate: { type: 'string', format: 'date' }, expiryDate: { type: 'string', format: 'date' },
          status: { type: 'string', enum: ['active', 'maintenance', 'expired', 'decommissioned'] },
        } } } } },
        responses: { 200: { description: 'Updated', content: { 'application/json': { schema: { type: 'object', properties: { extinguisher: { $ref: '#/components/schemas/Extinguisher' } } } } } } } },
      delete: { tags: ['Extinguishers'], summary: 'Delete extinguisher (admin)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 204: { description: 'Deleted' } } },
    },
  },
};
