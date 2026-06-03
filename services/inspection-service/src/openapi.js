/** OpenAPI 3.0 spec for the Inspection & Maintenance service. */
module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'FEMS — Inspection & Maintenance Service',
    version: '1.0.0',
    description: 'Schedule inspections, record results, and log maintenance activities.',
  },
  servers: [
    // This service is exposed through multiple gateway prefixes: /api/inspections and /api/maintenance.
    { url: 'http://localhost:8080/api', description: 'Via API gateway' },
    { url: 'http://localhost:4003', description: 'Direct' },
  ],
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas: {
      ErrorEnvelope: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              details: { type: 'object', additionalProperties: { type: 'string' } },
            },
          },
        },
      },
      Inspection: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          extinguisherId: { type: 'string', format: 'uuid' },
          serialNumber: { type: 'string' },
          location: { type: 'string' },
          scheduledDate: { type: 'string', format: 'date' },
          scheduledTime: { type: 'string', nullable: true, example: '09:30' },
          status: { type: 'string', enum: ['pending', 'completed', 'overdue', 'cancelled'] },
          result: { type: 'string', nullable: true, enum: ['pass', 'fail', 'needs_maintenance'] },
          assignedTo: { type: 'string', format: 'uuid', nullable: true },
          scheduledBy: { type: 'string', format: 'uuid', nullable: true },
          notes: { type: 'string', nullable: true },
          completedAt: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      MaintenanceLog: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          extinguisherId: { type: 'string', format: 'uuid' },
          serialNumber: { type: 'string' },
          inspectionId: { type: 'string', format: 'uuid', nullable: true },
          actionTaken: { type: 'string' },
          maintenanceDate: { type: 'string', format: 'date' },
          issuesIdentified: { type: 'string', nullable: true },
          notes: { type: 'string', nullable: true },
          recommendations: { type: 'string', nullable: true },
          performedBy: { type: 'string', format: 'uuid', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/inspections': {
      get: {
        tags: ['Inspections'], summary: 'List inspections (filterable)',
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['pending', 'completed', 'overdue', 'cancelled'] } },
          { name: 'extinguisherId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'assignedTo', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'from', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'to', in: 'query', schema: { type: 'string', format: 'date' } },
        ],
        responses: {
          200: { description: 'List', content: { 'application/json': { schema: { type: 'object', properties: { count: { type: 'integer' }, inspections: { type: 'array', items: { $ref: '#/components/schemas/Inspection' } } } } } } },
        },
      },
      post: {
        tags: ['Inspections'], summary: 'Schedule an inspection',
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object', required: ['extinguisherId', 'scheduledDate'],
          properties: {
            extinguisherId: { type: 'string', format: 'uuid' },
            scheduledDate: { type: 'string', format: 'date' },
            scheduledTime: { type: 'string', example: '09:30' },
            assignedTo: { type: 'string', format: 'uuid', description: 'Inspector user id' },
            notes: { type: 'string' },
          },
        } } } },
        responses: {
          201: { description: 'Scheduled', content: { 'application/json': { schema: { type: 'object', properties: { inspection: { $ref: '#/components/schemas/Inspection' } } } } } },
          400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
        },
      },
    },
    '/inspections/{id}': {
      get: { tags: ['Inspections'], summary: 'Get inspection',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Inspection', content: { 'application/json': { schema: { type: 'object', properties: { inspection: { $ref: '#/components/schemas/Inspection' } } } } } } } },
      patch: { tags: ['Inspections'], summary: 'Reschedule / reassign (admin/inspector)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object',
          properties: {
            scheduledDate: { type: 'string', format: 'date' },
            scheduledTime: { type: 'string', example: '09:30' },
            assignedTo: { type: 'string', format: 'uuid' },
            status: { type: 'string', enum: ['pending', 'completed', 'overdue', 'cancelled'] },
            notes: { type: 'string' },
          },
        } } } },
        responses: { 200: { description: 'Updated', content: { 'application/json': { schema: { type: 'object', properties: { inspection: { $ref: '#/components/schemas/Inspection' } } } } } } } },
      delete: { tags: ['Inspections'], summary: 'Delete inspection (admin)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 204: { description: 'Deleted' } } },
    },
    '/inspections/{id}/complete': {
      post: {
        tags: ['Inspections'], summary: 'Record inspection result (admin/inspector)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object', required: ['result'],
          properties: { result: { type: 'string', enum: ['pass', 'fail', 'needs_maintenance'] }, notes: { type: 'string' } },
        } } } },
        responses: { 200: { description: 'Completed', content: { 'application/json': { schema: { type: 'object', properties: { inspection: { $ref: '#/components/schemas/Inspection' } } } } } } },
      },
    },
    '/maintenance': {
      get: { tags: ['Maintenance'], summary: 'List maintenance logs',
        parameters: [
          { name: 'extinguisherId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'from', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'to', in: 'query', schema: { type: 'string', format: 'date' } },
        ],
        responses: { 200: { description: 'List', content: { 'application/json': { schema: { type: 'object', properties: { count: { type: 'integer' }, maintenance: { type: 'array', items: { $ref: '#/components/schemas/MaintenanceLog' } } } } } } } } },
      post: {
        tags: ['Maintenance'], summary: 'Log maintenance activity (admin/inspector)',
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object', required: ['extinguisherId', 'actionTaken', 'maintenanceDate'],
          properties: {
            extinguisherId: { type: 'string', format: 'uuid' },
            inspectionId: { type: 'string', format: 'uuid' },
            actionTaken: { type: 'string', example: 'Recharged cylinder' },
            maintenanceDate: { type: 'string', format: 'date' },
            issuesIdentified: { type: 'string' },
            notes: { type: 'string' },
            recommendations: { type: 'string' },
          },
        } } } },
        responses: { 201: { description: 'Logged', content: { 'application/json': { schema: { type: 'object', properties: { maintenance: { $ref: '#/components/schemas/MaintenanceLog' } } } } } } },
      },
    },
    '/maintenance/{id}': {
      get: { tags: ['Maintenance'], summary: 'Get maintenance record',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Record', content: { 'application/json': { schema: { type: 'object', properties: { maintenance: { $ref: '#/components/schemas/MaintenanceLog' } } } } } } } },
    },
  },
};
