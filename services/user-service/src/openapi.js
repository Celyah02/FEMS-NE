/** OpenAPI 3.0 spec for the User Management & Authentication service. */
module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'FEMS — User Management & Authentication Service',
    version: '1.0.0',
    description:
      'Registration, JWT authentication, role-based access control, profile management and password recovery for the Fire Extinguisher Management System.',
  },
  servers: [
    // The gateway exposes multiple prefixes for this service: /api/auth and /api/users.
    { url: 'http://localhost:8080/api', description: 'Via API gateway' },
    { url: 'http://localhost:4001', description: 'Direct' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
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
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          email: { type: 'string', format: 'email' },
          role: { type: 'string', enum: ['admin', 'inspector', 'user'] },
          isActive: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      AuthTokens: {
        type: 'object',
        properties: {
          accessToken: { type: 'string' },
          refreshToken: { type: 'string' },
        },
      },
      Message: { type: 'object', properties: { message: { type: 'string' } } },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/auth/register': {
      post: {
        tags: ['Auth'], summary: 'Register a new account (role = user)',
        security: [],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: {
            type: 'object', required: ['firstName', 'lastName', 'email', 'password'],
            properties: {
              firstName: { type: 'string' }, lastName: { type: 'string' },
              email: { type: 'string', format: 'email' },
              password: { type: 'string', example: 'Password123!' },
            },
          } } },
        },
        responses: {
          201: { description: 'Created', content: { 'application/json': { schema: { type: 'object', properties: { user: { $ref: '#/components/schemas/User' } } } } } },
          400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
          409: { description: 'Email exists', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'], summary: 'Log in and receive access + refresh tokens',
        security: [],
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object', required: ['email', 'password'],
          properties: { email: { type: 'string' }, password: { type: 'string' } },
        } } } },
        responses: {
          200: {
            description: 'Tokens + user',
            content: { 'application/json': { schema: {
              type: 'object',
              properties: {
                accessToken: { type: 'string' },
                refreshToken: { type: 'string' },
                user: { $ref: '#/components/schemas/User' },
              },
            } } },
          },
          400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
          401: { description: 'Invalid credentials', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'], summary: 'Exchange a refresh token for a new access token',
        security: [],
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object', required: ['refreshToken'], properties: { refreshToken: { type: 'string' } },
        } } } },
        responses: {
          200: { description: 'New access token', content: { 'application/json': { schema: { type: 'object', properties: { accessToken: { type: 'string' } } } } } },
          400: { description: 'Bad request', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
          401: { description: 'Invalid refresh token', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Revoke a refresh token',
        security: [],
        requestBody: { required: false, content: { 'application/json': { schema: { type: 'object', properties: { refreshToken: { type: 'string' } } } } } },
        responses: { 200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/Message' } } } } },
      },
    },
    '/auth/forgot-password': {
      post: {
        tags: ['Auth'],
        summary: 'Request a password reset token (demo returns token in response)',
        security: [],
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object', required: ['email'], properties: { email: { type: 'string', format: 'email' } },
        } } } },
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' }, resetToken: { type: 'string', nullable: true } } } } } },
        },
      },
    },
    '/auth/reset-password': {
      post: {
        tags: ['Auth'],
        summary: 'Reset password using a token',
        security: [],
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object',
          required: ['token', 'newPassword'],
          properties: { token: { type: 'string' }, newPassword: { type: 'string' } },
        } } } },
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/Message' } } } },
          400: { description: 'Invalid / expired token', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
        },
      },
    },
    '/users/me': {
      get: { tags: ['Profile'], summary: 'Get my profile', security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'User', content: { 'application/json': { schema: { type: 'object', properties: { user: { $ref: '#/components/schemas/User' } } } } } } } },
      patch: { tags: ['Profile'], summary: 'Update my profile', security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object', properties: { firstName: { type: 'string' }, lastName: { type: 'string' }, email: { type: 'string', format: 'email' } },
        } } } },
        responses: { 200: { description: 'User', content: { 'application/json': { schema: { type: 'object', properties: { user: { $ref: '#/components/schemas/User' } } } } } } } },
    },
    '/users/me/change-password': {
      post: { tags: ['Profile'], summary: 'Change my password', security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object', required: ['currentPassword', 'newPassword'],
          properties: { currentPassword: { type: 'string' }, newPassword: { type: 'string' } },
        } } } },
        responses: { 200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/Message' } } } } } },
    },
    '/users': {
      get: { tags: ['Admin'], summary: 'List users (admin)', security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'role', in: 'query', schema: { type: 'string', enum: ['admin', 'inspector', 'user'] } },
          { name: 'q', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Users', content: { 'application/json': { schema: { type: 'object', properties: { users: { type: 'array', items: { $ref: '#/components/schemas/User' } } } } } } },
          403: { description: 'Forbidden', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
        } },
      post: { tags: ['Admin'], summary: 'Create a user with a role (admin)', security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object',
          required: ['firstName', 'lastName', 'email', 'password', 'role'],
          properties: {
            firstName: { type: 'string' }, lastName: { type: 'string' },
            email: { type: 'string', format: 'email' },
            password: { type: 'string' },
            role: { type: 'string', enum: ['admin', 'inspector', 'user'] },
          },
        } } } },
        responses: { 201: { description: 'Created', content: { 'application/json': { schema: { type: 'object', properties: { user: { $ref: '#/components/schemas/User' } } } } } } } },
    },
    '/users/{id}': {
      get: { tags: ['Admin'], summary: 'Get a user (admin)', security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'User', content: { 'application/json': { schema: { type: 'object', properties: { user: { $ref: '#/components/schemas/User' } } } } } } } },
      patch: { tags: ['Admin'], summary: 'Update a user (admin)', security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object',
          properties: {
            firstName: { type: 'string' }, lastName: { type: 'string' },
            role: { type: 'string', enum: ['admin', 'inspector', 'user'] },
            isActive: { type: 'boolean' },
          },
        } } } },
        responses: { 200: { description: 'User', content: { 'application/json': { schema: { type: 'object', properties: { user: { $ref: '#/components/schemas/User' } } } } } } } },
      delete: { tags: ['Admin'], summary: 'Delete a user (admin)', security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 204: { description: 'Deleted' } } },
    },
  },
};
