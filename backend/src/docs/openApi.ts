export const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'Hospital Management System API',
    version: '0.3.0',
    description: 'Implemented HMS REST API contracts.',
  },
  paths: {
    '/api/v1/health': {
      get: {
        summary: 'Check API process health',
        responses: {
          '200': {
            description: 'The API process is healthy.',
            headers: {
              'x-request-id': {
                description: 'Request correlation identifier.',
                schema: { type: 'string' },
              },
            },
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['status', 'service', 'timestamp'],
                  properties: {
                    status: { type: 'string', const: 'ok' },
                    service: { type: 'string', const: 'hms-api' },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'The request query is invalid.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/v1/auth/login': {
      post: {
        summary: 'Authenticate with username and password',
        description:
          'Requires an allowlisted Origin and X-HMS-CSRF: 1. Sets a rotating HttpOnly refresh cookie.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Authenticated.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthResponse' },
              },
            },
          },
          '401': {
            description: 'Generic authentication failure.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/v1/auth/refresh': {
      post: {
        summary: 'Rotate the refresh session',
        description:
          'Uses the HttpOnly refresh cookie and requires X-HMS-CSRF: 1.',
        responses: {
          '200': {
            description: 'Session rotated and a new access token issued.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TokenResponse' },
              },
            },
          },
          '401': {
            description: 'Session invalid, expired, revoked, or replayed.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/v1/auth/logout': {
      post: {
        summary: 'Revoke the current refresh session',
        responses: {
          '204': { description: 'Session revoked and cookie cleared.' },
        },
      },
    },
    '/api/v1/auth/me': {
      get: {
        summary: 'Get the authenticated identity and resolved access',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Current authenticated user.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['data'],
                  properties: {
                    data: { $ref: '#/components/schemas/CurrentUser' },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Access token missing or invalid.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '403': {
            description: 'Required permission is not granted.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/v1/auth/change-password': {
      post: {
        summary: 'Change the authenticated user password',
        description:
          'Verifies the current password and revokes every refresh session.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ChangePasswordRequest' },
            },
          },
        },
        responses: {
          '204': {
            description: 'Password changed; a fresh login is required.',
          },
          '400': {
            description: 'Password policy or current-password failure.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/v1/patients': {
      get: {
        summary: 'List and search patients',
        description: 'Requires patient.read.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 10000, default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
          { name: 'search', in: 'query', schema: { type: 'string', maxLength: 200 } },
          { name: 'status', in: 'query', schema: { $ref: '#/components/schemas/PatientStatus' } },
          { name: 'sortBy', in: 'query', schema: { type: 'string', enum: ['patientNumber', 'firstName', 'lastName', 'dateOfBirth', 'status', 'createdAt'], default: 'lastName' } },
          { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'asc' } },
        ],
        responses: {
          '200': {
            description: 'Paginated patient records.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/PatientListResponse' } } },
          },
          '400': { description: 'Invalid query.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Authentication required.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'patient.read is not granted.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
      post: {
        summary: 'Register a patient',
        description: 'Requires patient.create. The server allocates the patient number.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreatePatientRequest' } } },
        },
        responses: {
          '201': { description: 'Patient registered.', content: { 'application/json': { schema: { $ref: '#/components/schemas/PatientResponse' } } } },
          '400': { description: 'Invalid patient data.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Authentication required.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'patient.create is not granted.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '409': { description: 'Unique patient number allocation conflict.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/v1/patients/{id}': {
      get: {
        summary: 'Get a patient',
        description: 'Requires patient.read.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': { description: 'Current patient record.', content: { 'application/json': { schema: { $ref: '#/components/schemas/PatientResponse' } } } },
          '400': { description: 'Invalid patient ID.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Authentication required.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'patient.read is not granted.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Patient not found.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
      patch: {
        summary: 'Update a patient',
        description: 'Requires patient.update. ID, patient number, and timestamps cannot be changed.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdatePatientRequest' } } },
        },
        responses: {
          '200': { description: 'Patient updated.', content: { 'application/json': { schema: { $ref: '#/components/schemas/PatientResponse' } } } },
          '400': { description: 'Invalid patient data.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Authentication required.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'patient.update is not granted.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Patient not found.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      LoginRequest: {
        type: 'object',
        additionalProperties: false,
        required: ['username', 'password'],
        properties: {
          username: { type: 'string', minLength: 1, maxLength: 100 },
          password: { type: 'string', minLength: 1, maxLength: 128 },
        },
      },
      ChangePasswordRequest: {
        type: 'object',
        additionalProperties: false,
        required: ['currentPassword', 'newPassword'],
        properties: {
          currentPassword: { type: 'string', minLength: 1, maxLength: 128 },
          newPassword: { type: 'string', minLength: 12, maxLength: 128 },
        },
      },
      CurrentUser: {
        type: 'object',
        required: ['id', 'username', 'roles', 'permissions'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          username: { type: 'string' },
          roles: { type: 'array', items: { type: 'string' } },
          permissions: { type: 'array', items: { type: 'string' } },
        },
      },
      AuthResponse: {
        type: 'object',
        required: ['data'],
        properties: {
          data: {
            type: 'object',
            required: ['accessToken', 'user'],
            properties: {
              accessToken: { type: 'string' },
              user: { $ref: '#/components/schemas/CurrentUser' },
            },
          },
        },
      },
      TokenResponse: {
        type: 'object',
        required: ['data'],
        properties: {
          data: {
            type: 'object',
            required: ['accessToken'],
            properties: { accessToken: { type: 'string' } },
          },
        },
      },
      PatientStatus: {
        type: 'string',
        enum: ['active', 'inactive', 'deceased'],
      },
      Patient: {
        type: 'object',
        required: ['id', 'patientNumber', 'firstName', 'lastName', 'dateOfBirth', 'dateOfBirthPrecision', 'sexAtRegistration', 'phone', 'email', 'addressText', 'emergencyContactName', 'emergencyContactPhone', 'status', 'createdAt', 'updatedAt'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          patientNumber: { type: 'string', maxLength: 50 },
          firstName: { type: 'string', minLength: 1, maxLength: 100 },
          lastName: { type: 'string', minLength: 1, maxLength: 100 },
          dateOfBirth: { type: ['string', 'null'], format: 'date' },
          dateOfBirthPrecision: { type: 'string', enum: ['exact', 'month', 'year', 'unknown'] },
          sexAtRegistration: { type: ['string', 'null'], enum: ['female', 'male', 'intersex', 'unknown', 'not_disclosed', null] },
          phone: { type: ['string', 'null'], maxLength: 30 },
          email: { type: ['string', 'null'], format: 'email', maxLength: 254 },
          addressText: { type: ['string', 'null'], maxLength: 2000 },
          emergencyContactName: { type: ['string', 'null'], maxLength: 200 },
          emergencyContactPhone: { type: ['string', 'null'], maxLength: 30 },
          status: { $ref: '#/components/schemas/PatientStatus' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      CreatePatientRequest: {
        type: 'object',
        additionalProperties: false,
        required: ['firstName', 'lastName', 'dateOfBirth', 'dateOfBirthPrecision'],
        properties: {
          firstName: { type: 'string', minLength: 1, maxLength: 100 },
          lastName: { type: 'string', minLength: 1, maxLength: 100 },
          dateOfBirth: { type: ['string', 'null'], format: 'date' },
          dateOfBirthPrecision: { type: 'string', enum: ['exact', 'month', 'year', 'unknown'] },
          sexAtRegistration: { type: ['string', 'null'], enum: ['female', 'male', 'intersex', 'unknown', 'not_disclosed', null] },
          phone: { type: ['string', 'null'], maxLength: 30 },
          email: { type: ['string', 'null'], format: 'email', maxLength: 254 },
          addressText: { type: ['string', 'null'], maxLength: 2000 },
          emergencyContactName: { type: ['string', 'null'], maxLength: 200 },
          emergencyContactPhone: { type: ['string', 'null'], maxLength: 30 },
        },
      },
      UpdatePatientRequest: {
        type: 'object',
        additionalProperties: false,
        minProperties: 1,
        properties: {
          firstName: { type: 'string', minLength: 1, maxLength: 100 },
          lastName: { type: 'string', minLength: 1, maxLength: 100 },
          dateOfBirth: { type: ['string', 'null'], format: 'date' },
          dateOfBirthPrecision: { type: 'string', enum: ['exact', 'month', 'year', 'unknown'] },
          sexAtRegistration: { type: ['string', 'null'], enum: ['female', 'male', 'intersex', 'unknown', 'not_disclosed', null] },
          phone: { type: ['string', 'null'], maxLength: 30 },
          email: { type: ['string', 'null'], format: 'email', maxLength: 254 },
          addressText: { type: ['string', 'null'], maxLength: 2000 },
          emergencyContactName: { type: ['string', 'null'], maxLength: 200 },
          emergencyContactPhone: { type: ['string', 'null'], maxLength: 30 },
          status: { $ref: '#/components/schemas/PatientStatus' },
        },
      },
      PatientResponse: {
        type: 'object',
        required: ['data'],
        properties: { data: { $ref: '#/components/schemas/Patient' } },
      },
      PatientListResponse: {
        type: 'object',
        required: ['data', 'meta'],
        properties: {
          data: { type: 'array', items: { $ref: '#/components/schemas/Patient' } },
          meta: {
            type: 'object',
            required: ['pagination'],
            properties: {
              pagination: {
                type: 'object',
                required: ['page', 'pageSize', 'totalItems', 'totalPages'],
                properties: {
                  page: { type: 'integer' },
                  pageSize: { type: 'integer' },
                  totalItems: { type: 'integer' },
                  totalPages: { type: 'integer' },
                },
              },
            },
          },
        },
      },
      ErrorResponse: {
        type: 'object',
        required: ['error'],
        properties: {
          error: {
            type: 'object',
            required: ['code', 'message', 'requestId'],
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              requestId: { type: 'string' },
              fields: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['path', 'message'],
                  properties: {
                    path: { type: 'string' },
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
} as const
