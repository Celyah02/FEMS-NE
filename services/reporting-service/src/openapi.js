/** OpenAPI 3.0 spec for the Reporting service. */
module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'FEMS — Reporting Service',
    version: '1.0.0',
    description: 'Real-time inventory, inspection, compliance and maintenance reports with PDF/CSV export.',
  },
  servers: [
    { url: 'http://localhost:8080/api', description: 'Via API gateway' },
    { url: 'http://localhost:4004', description: 'Direct' },
  ],
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas: {
      ErrorEnvelope: {
        type: 'object',
        properties: { error: { type: 'object', properties: { message: { type: 'string' }, details: { type: 'object', additionalProperties: { type: 'string' } } } } },
      },
      DashboardSummary: {
        type: 'object',
        properties: {
          totalExtinguishers: { type: 'integer' },
          activeExtinguishers: { type: 'integer' },
          expiredExtinguishers: { type: 'integer' },
          upcomingExpirations: { type: 'integer' },
          pendingInspections: { type: 'integer' },
          overdueInspections: { type: 'integer' },
          maintenanceRecords: { type: 'integer' },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/reports/summary': {
      get: {
        tags: ['Reports'],
        summary: 'Dashboard summary (aggregate)',
        responses: { 200: { description: 'Summary', content: { 'application/json': { schema: { $ref: '#/components/schemas/DashboardSummary' } } } } },
      },
    },
    '/reports/inventory': {
      get: {
        tags: ['Reports'],
        summary: 'Inventory report (totals + breakdowns + monthly summary)',
        responses: { 200: { description: 'Inventory', content: { 'application/json': { schema: { type: 'object' } } } } },
      },
    },
    '/reports/inspections': {
      get: {
        tags: ['Reports'],
        summary: 'Inspection report (counts + detailed rows)',
        responses: { 200: { description: 'Inspections', content: { 'application/json': { schema: { type: 'object' } } } } },
      },
    },
    '/reports/compliance': {
      get: {
        tags: ['Reports'],
        summary: 'Compliance report (expired, upcoming, %)',
        parameters: [{ name: 'upcomingDays', in: 'query', schema: { type: 'integer', default: 30 } }],
        responses: {
          200: { description: 'Compliance', content: { 'application/json': { schema: { type: 'object' } } } },
          400: { description: 'Bad request', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
        },
      },
    },
    '/reports/maintenance': {
      get: {
        tags: ['Reports'],
        summary: 'Maintenance report (history, frequency, recent)',
        responses: { 200: { description: 'Maintenance', content: { 'application/json': { schema: { type: 'object' } } } } },
      },
    },
    '/reports/{type}/export': {
      get: {
        tags: ['Export'], summary: 'Export a report as PDF or CSV',
        parameters: [
          { name: 'type', in: 'path', required: true, schema: { type: 'string', enum: ['inventory', 'inspections', 'compliance', 'maintenance'] } },
          { name: 'format', in: 'query', schema: { type: 'string', enum: ['pdf', 'csv'], default: 'pdf' } },
        ],
        responses: { 200: { description: 'Binary file (application/pdf or text/csv)' }, 400: { description: 'Bad request' } },
      },
    },
  },
};
