export const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'Hospital Management System API',
    version: '0.8.0',
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
    '/api/v1/departments': {
      get: {
        summary: 'List and search departments',
        description: 'Requires department.read.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 10000, default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
          { name: 'search', in: 'query', schema: { type: 'string', maxLength: 200 } },
          { name: 'status', in: 'query', schema: { $ref: '#/components/schemas/DepartmentStatus' } },
          { name: 'sortBy', in: 'query', schema: { type: 'string', enum: ['code', 'name', 'status', 'createdAt'], default: 'name' } },
          { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'asc' } },
        ],
        responses: {
          '200': { description: 'Paginated departments.', content: { 'application/json': { schema: { $ref: '#/components/schemas/DepartmentListResponse' } } } },
          '400': { description: 'Invalid query.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Authentication required.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'department.read is not granted.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
      post: {
        summary: 'Create a department',
        description: 'Requires department.create. Departments are deactivated rather than deleted.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateDepartmentRequest' } } },
        },
        responses: {
          '201': { description: 'Department created.', content: { 'application/json': { schema: { $ref: '#/components/schemas/DepartmentResponse' } } } },
          '400': { description: 'Invalid department data.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Authentication required.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'department.create is not granted.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '409': { description: 'Department code or name already exists.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/v1/departments/{id}': {
      get: {
        summary: 'Get a department',
        description: 'Requires department.read.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': { description: 'Current department record.', content: { 'application/json': { schema: { $ref: '#/components/schemas/DepartmentResponse' } } } },
          '400': { description: 'Invalid department ID.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Authentication required.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'department.read is not granted.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Department not found.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
      patch: {
        summary: 'Update a department',
        description: 'Requires department.update. ID and timestamps cannot be changed. Existing employee assignments are not rewritten when status changes.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateDepartmentRequest' } } },
        },
        responses: {
          '200': { description: 'Department updated.', content: { 'application/json': { schema: { $ref: '#/components/schemas/DepartmentResponse' } } } },
          '400': { description: 'Invalid department data.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Authentication required.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'department.update is not granted.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Department not found.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '409': { description: 'Department code or name already exists.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/v1/employees': {
      get: {
        summary: 'List and search employees',
        description: 'Requires employee.read.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 10000, default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
          { name: 'search', in: 'query', schema: { type: 'string', maxLength: 200, description: 'Matches employee number, name, email, or phone.' } },
          { name: 'departmentId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'employmentStatus', in: 'query', schema: { $ref: '#/components/schemas/EmploymentStatus' } },
          { name: 'hasDoctorProfile', in: 'query', schema: { type: 'string', enum: ['true', 'false'] } },
          { name: 'sortBy', in: 'query', schema: { type: 'string', enum: ['employeeNumber', 'firstName', 'lastName', 'hireDate', 'employmentStatus', 'createdAt'], default: 'lastName' } },
          { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'asc' } },
        ],
        responses: {
          '200': { description: 'Paginated employees.', content: { 'application/json': { schema: { $ref: '#/components/schemas/EmployeeListResponse' } } } },
          '400': { description: 'Invalid query.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Authentication required.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'employee.read is not granted.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
      post: {
        summary: 'Register an employee',
        description: 'Requires employee.create. The server allocates an interim unique employee number. Login accounts are not created automatically.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateEmployeeRequest' } } },
        },
        responses: {
          '201': { description: 'Employee registered.', content: { 'application/json': { schema: { $ref: '#/components/schemas/EmployeeResponse' } } } },
          '400': { description: 'Invalid employee data.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Authentication required.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'employee.create is not granted.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '409': { description: 'Unique employee-number or user-link conflict.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/v1/employees/{id}': {
      get: {
        summary: 'Get an employee',
        description: 'Requires employee.read.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': { description: 'Current employee record.', content: { 'application/json': { schema: { $ref: '#/components/schemas/EmployeeResponse' } } } },
          '400': { description: 'Invalid employee ID.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Authentication required.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'employee.read is not granted.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Employee not found.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
      patch: {
        summary: 'Update an employee',
        description: 'Requires employee.update. ID, employee number, and timestamps cannot be changed. There is no deletion endpoint.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateEmployeeRequest' } } },
        },
        responses: {
          '200': { description: 'Employee updated.', content: { 'application/json': { schema: { $ref: '#/components/schemas/EmployeeResponse' } } } },
          '400': { description: 'Invalid employee data.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Authentication required.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'employee.update is not granted.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Employee not found.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '409': { description: 'User already linked to another employee.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/v1/doctors': {
      get: {
        summary: 'List and search doctors',
        description: 'Requires doctor.read. Department is returned through the linked employee.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 10000, default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
          { name: 'search', in: 'query', schema: { type: 'string', maxLength: 200, description: 'Matches license, specialization, employee number, or name.' } },
          { name: 'status', in: 'query', schema: { $ref: '#/components/schemas/DoctorStatus' } },
          { name: 'departmentId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'employmentStatus', in: 'query', schema: { $ref: '#/components/schemas/EmploymentStatus' } },
          { name: 'sortBy', in: 'query', schema: { type: 'string', enum: ['licenseNumber', 'specialization', 'status', 'createdAt', 'lastName', 'firstName'], default: 'lastName' } },
          { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'asc' } },
        ],
        responses: {
          '200': { description: 'Paginated doctors.', content: { 'application/json': { schema: { $ref: '#/components/schemas/DoctorListResponse' } } } },
          '400': { description: 'Invalid query.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Authentication required.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'doctor.read is not granted.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
      post: {
        summary: 'Create a doctor profile',
        description: 'Requires doctor.create. The profile must reference an existing employee that does not already have a doctor profile.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateDoctorRequest' } } },
        },
        responses: {
          '201': { description: 'Doctor profile created.', content: { 'application/json': { schema: { $ref: '#/components/schemas/DoctorResponse' } } } },
          '400': { description: 'Invalid doctor data.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Authentication required.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'doctor.create is not granted.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '409': { description: 'Duplicate doctor profile or license number.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/v1/doctors/{id}': {
      get: {
        summary: 'Get a doctor',
        description: 'Requires doctor.read.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': { description: 'Current doctor profile.', content: { 'application/json': { schema: { $ref: '#/components/schemas/DoctorResponse' } } } },
          '400': { description: 'Invalid doctor ID.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Authentication required.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'doctor.read is not granted.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Doctor not found.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
      patch: {
        summary: 'Update a doctor profile',
        description: 'Requires doctor.update. Employee identity cannot be reassigned through this endpoint.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateDoctorRequest' } } },
        },
        responses: {
          '200': { description: 'Doctor updated.', content: { 'application/json': { schema: { $ref: '#/components/schemas/DoctorResponse' } } } },
          '400': { description: 'Invalid doctor data.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Authentication required.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'doctor.update is not granted.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Doctor not found.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '409': { description: 'License number already exists.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/v1/doctors/{doctorId}/schedules': {
      get: {
        summary: 'List explicit doctor schedules',
        description: 'Requires doctor_schedule.read. Recurrence, overlap policy, and schedule templates are not implemented.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'doctorId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 10000, default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
          { name: 'status', in: 'query', schema: { $ref: '#/components/schemas/ScheduleStatus' } },
          { name: 'sortBy', in: 'query', schema: { type: 'string', enum: ['startsAt', 'endsAt', 'status', 'createdAt'], default: 'startsAt' } },
          { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'asc' } },
        ],
        responses: {
          '200': { description: 'Paginated schedules.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ScheduleListResponse' } } } },
          '400': { description: 'Invalid query.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Authentication required.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'doctor_schedule.read is not granted.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Doctor not found.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
      post: {
        summary: 'Create an explicit doctor schedule interval',
        description: 'Requires doctor_schedule.create. Timestamps must include a timezone offset. endsAt must be after startsAt. Overlap policy is pending.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'doctorId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateScheduleRequest' } } },
        },
        responses: {
          '201': { description: 'Schedule created.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ScheduleResponse' } } } },
          '400': { description: 'Invalid schedule data.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Authentication required.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'doctor_schedule.create is not granted.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Doctor not found.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/v1/doctors/{doctorId}/schedules/{scheduleId}': {
      patch: {
        summary: 'Update an explicit doctor schedule interval',
        description: 'Requires doctor_schedule.update. The schedule must belong to the doctor in the path.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'doctorId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'scheduleId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateScheduleRequest' } } },
        },
        responses: {
          '200': { description: 'Schedule updated.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ScheduleResponse' } } } },
          '400': { description: 'Invalid schedule data.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Authentication required.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'doctor_schedule.update is not granted.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Doctor or schedule not found.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/v1/appointments': {
      get: {
        summary: 'List appointments',
        description: 'Requires appointment.read. Filters are controlled enums and UUIDs. startsAtFrom/startsAtTo are timezone-aware UTC bounds on startsAt.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 10000, default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
          { name: 'patientId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'doctorId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'status', in: 'query', schema: { $ref: '#/components/schemas/AppointmentStatus' } },
          { name: 'startsAtFrom', in: 'query', schema: { type: 'string', format: 'date-time', description: 'Timezone-aware ISO-8601 instant.' } },
          { name: 'startsAtTo', in: 'query', schema: { type: 'string', format: 'date-time', description: 'Exclusive upper bound on startsAt.' } },
          { name: 'sortBy', in: 'query', schema: { type: 'string', enum: ['startsAt', 'endsAt', 'status', 'createdAt'], default: 'startsAt' } },
          { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'asc' } },
        ],
        responses: {
          '200': { description: 'Paginated appointments.', content: { 'application/json': { schema: { $ref: '#/components/schemas/AppointmentListResponse' } } } },
          '400': { description: 'Invalid query.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Authentication required.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'appointment.read is not granted.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
      post: {
        summary: 'Book an appointment',
        description: 'Requires appointment.create. Status is scheduled. The interval must fit an available doctor schedule. Active doctor and patient overlaps are rejected by PostgreSQL exclusion constraints. createdByUserId is taken from the authenticated user.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateAppointmentRequest' } } },
        },
        responses: {
          '201': { description: 'Appointment created.', content: { 'application/json': { schema: { $ref: '#/components/schemas/AppointmentResponse' } } } },
          '400': { description: 'Invalid appointment data or naive timestamp.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Authentication required.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'appointment.create is not granted.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Patient or doctor not found.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '409': { description: 'Schedule unavailable, inactive doctor, or overlapping active appointment.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/v1/appointments/{id}': {
      get: {
        summary: 'Get an appointment',
        description: 'Requires appointment.read.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': { description: 'Current appointment.', content: { 'application/json': { schema: { $ref: '#/components/schemas/AppointmentResponse' } } } },
          '400': { description: 'Invalid appointment ID.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Authentication required.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'appointment.read is not granted.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Appointment not found.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
      patch: {
        summary: 'Update ordinary appointment fields',
        description: 'Requires appointment.update. Only reason may be changed. Status, times, patient, doctor, and cancellation fields are rejected.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateAppointmentRequest' } } },
        },
        responses: {
          '200': { description: 'Appointment updated.', content: { 'application/json': { schema: { $ref: '#/components/schemas/AppointmentResponse' } } } },
          '400': { description: 'Invalid appointment data.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Authentication required.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'appointment.update is not granted.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Appointment not found.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/v1/appointments/{id}/cancel': {
      post: {
        summary: 'Cancel an appointment',
        description: 'Requires appointment.cancel. Allowed only from scheduled or checked_in. cancellationReason is required. cancelledAt and cancelledByUserId are set by the server. The appointment is retained.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CancelAppointmentRequest' } } },
        },
        responses: {
          '200': { description: 'Appointment cancelled.', content: { 'application/json': { schema: { $ref: '#/components/schemas/AppointmentResponse' } } } },
          '400': { description: 'Invalid cancellation data.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Authentication required.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'appointment.cancel is not granted.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Appointment not found.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '409': { description: 'Appointment is not eligible for cancellation.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/v1/appointments/{id}/reschedule': {
      post: {
        summary: 'Reschedule an appointment',
        description: 'Requires appointment.reschedule. Allowed only from scheduled or checked_in. The original is cancelled and a replacement is created in one transaction. The replacement must belong to the same patient and independently satisfy booking rules. A rescheduling chain cannot form a cycle.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/RescheduleAppointmentRequest' } } },
        },
        responses: {
          '200': { description: 'Replacement appointment created; original cancelled.', content: { 'application/json': { schema: { $ref: '#/components/schemas/AppointmentResponse' } } } },
          '400': { description: 'Invalid replacement data or naive timestamp.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Authentication required.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'appointment.reschedule is not granted.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Original appointment, patient, or doctor not found.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '409': { description: 'Ineligible original, patient mismatch, schedule unavailable, inactive doctor, overlap, or cycle.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/v1/appointments/{id}/status': {
      patch: {
        summary: 'Apply an approved appointment status transition',
        description: 'Requires appointment.status.update. Allowed: scheduled→checked_in|no_show; checked_in→completed. Cancellation uses POST /cancel. completed, cancelled, and no_show are terminal.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateAppointmentStatusRequest' } } },
        },
        responses: {
          '200': { description: 'Status updated.', content: { 'application/json': { schema: { $ref: '#/components/schemas/AppointmentResponse' } } } },
          '400': { description: 'Invalid status payload.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Authentication required.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'appointment.status.update is not granted.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Appointment not found.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '409': { description: 'Status transition is not allowed.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/v1/medical-records': {
      get: {
        summary: 'List medical records',
        description: 'Requires medical_record.read. List responses omit diagnosis, treatment, and report bodies.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 10000, default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
          { name: 'patientId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'authorEmployeeId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'status', in: 'query', schema: { $ref: '#/components/schemas/MedicalRecordStatus' } },
          { name: 'occurredAtFrom', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'occurredAtTo', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'sortBy', in: 'query', schema: { type: 'string', enum: ['occurredAt', 'createdAt', 'status'], default: 'occurredAt' } },
          { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' } },
        ],
        responses: {
          '200': { description: 'Paginated medical records.', content: { 'application/json': { schema: { $ref: '#/components/schemas/MedicalRecordListResponse' } } } },
          '400': { description: 'Invalid query.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Authentication required.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'medical_record.read is not granted.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
      post: {
        summary: 'Create a draft medical record',
        description: 'Requires medical_record.create. authorEmployeeId is derived from the authenticated user employee link and cannot be supplied by the client. Status is draft.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateMedicalRecordRequest' } } },
        },
        responses: {
          '201': { description: 'Draft medical record created.', content: { 'application/json': { schema: { $ref: '#/components/schemas/MedicalRecordDetailResponse' } } } },
          '400': { description: 'Invalid medical record data.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Authentication required.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'medical_record.create is not granted.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Patient, appointment, or admission not found.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '409': { description: 'Missing employee mapping or care-context patient mismatch.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/v1/medical-records/{id}': {
      get: {
        summary: 'Get a medical record',
        description: 'Requires medical_record.read. patient.read is not sufficient.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': { description: 'Medical record detail including clinical children.', content: { 'application/json': { schema: { $ref: '#/components/schemas/MedicalRecordDetailResponse' } } } },
          '400': { description: 'Invalid medical record ID.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Authentication required.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'medical_record.read is not granted.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Medical record not found.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
      patch: {
        summary: 'Update a draft medical record',
        description: 'Requires medical_record.update. Allowed only while status is draft. Patient and author cannot be changed. Clinical children are replaced when supplied. Final and amended records cannot be patched.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateMedicalRecordRequest' } } },
        },
        responses: {
          '200': { description: 'Draft medical record updated.', content: { 'application/json': { schema: { $ref: '#/components/schemas/MedicalRecordDetailResponse' } } } },
          '400': { description: 'Invalid medical record data.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Authentication required.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'medical_record.update is not granted.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Medical record, appointment, or admission not found.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '409': { description: 'Record is not draft or care-context patient mismatch.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/v1/medical-records/{id}/finalize': {
      post: {
        summary: 'Finalize a draft medical record',
        description: 'Requires medical_record.finalize. Allowed only from draft. At least one diagnosis, treatment, or medical report is required. finalizedAt is set by the server.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': { description: 'Medical record finalized.', content: { 'application/json': { schema: { $ref: '#/components/schemas/MedicalRecordDetailResponse' } } } },
          '401': { description: 'Authentication required.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'medical_record.finalize is not granted.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Medical record not found.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '409': { description: 'Not draft, empty clinical content, or missing employee mapping.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/v1/medical-records/{id}/amend': {
      post: {
        summary: 'Amend a finalized medical record',
        description: 'Requires medical_record.amend. The predecessor becomes amended and a finalized successor is created in one transaction. Amendment reason is stored in audit metadata only.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AmendMedicalRecordRequest' } } },
        },
        responses: {
          '201': { description: 'Successor medical record created and finalized.', content: { 'application/json': { schema: { $ref: '#/components/schemas/MedicalRecordDetailResponse' } } } },
          '400': { description: 'Invalid amendment data or occurredAt not later than the predecessor.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Authentication required.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'medical_record.amend is not granted.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Medical record, appointment, or admission not found.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '409': { description: 'Not final, duplicate successor, empty clinical content, cycle, patient mismatch, or missing employee mapping.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/v1/prescriptions': {
      get: {
        summary: 'List prescriptions',
        description: 'Requires prescription.read. List responses omit item directions.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 10000, default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
          { name: 'patientId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'medicalRecordId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'status', in: 'query', schema: { $ref: '#/components/schemas/PrescriptionStatus' } },
          { name: 'sortBy', in: 'query', schema: { type: 'string', enum: ['prescribedAt', 'createdAt', 'status'], default: 'prescribedAt' } },
          { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' } },
        ],
        responses: {
          '200': { description: 'Paginated prescriptions.', content: { 'application/json': { schema: { $ref: '#/components/schemas/PrescriptionListResponse' } } } },
          '400': { description: 'Invalid query.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Authentication required.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'prescription.read is not granted.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
      post: {
        summary: 'Create a prescription',
        description: 'Requires prescription.create. The medical record must be final. prescribedByDoctorId and patientId are derived server-side. Parent and at least one item are created atomically. Status is active. There is no item PATCH.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreatePrescriptionRequest' } } },
        },
        responses: {
          '201': { description: 'Prescription created.', content: { 'application/json': { schema: { $ref: '#/components/schemas/PrescriptionDetailResponse' } } } },
          '400': { description: 'Invalid prescription data or unit mismatch.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Authentication required.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'prescription.create is not granted.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Medical record or medicine not found.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '409': { description: 'Medical record is not final, medicine inactive, or doctor identity mapping missing/inactive.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/v1/prescriptions/{id}': {
      get: {
        summary: 'Get a prescription',
        description: 'Requires prescription.read.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': { description: 'Prescription detail including items.', content: { 'application/json': { schema: { $ref: '#/components/schemas/PrescriptionDetailResponse' } } } },
          '400': { description: 'Invalid prescription ID.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Authentication required.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'prescription.read is not granted.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Prescription not found.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/v1/prescriptions/{id}/cancel': {
      post: {
        summary: 'Cancel an active prescription',
        description: 'Requires prescription.cancel. Allowed only from active. Partially or fully dispensed prescriptions cannot be cancelled. The prescription is retained. Cancellation reason is stored in audit metadata.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CancelPrescriptionRequest' } } },
        },
        responses: {
          '200': { description: 'Prescription cancelled.', content: { 'application/json': { schema: { $ref: '#/components/schemas/PrescriptionDetailResponse' } } } },
          '400': { description: 'Invalid cancellation data.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Authentication required.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'prescription.cancel is not granted.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Prescription not found.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '409': { description: 'Prescription is not active.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/v1/medicines': {
      get: {
        summary: 'List active medicines for prescribing',
        description: 'Requires medicine.read. Returns only active medicines. This is catalog read, not inventory management.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 10000, default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
          { name: 'search', in: 'query', schema: { type: 'string', maxLength: 200 } },
          { name: 'sortBy', in: 'query', schema: { type: 'string', enum: ['code', 'genericName'], default: 'genericName' } },
          { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'asc' } },
        ],
        responses: {
          '200': { description: 'Paginated active medicines.', content: { 'application/json': { schema: { $ref: '#/components/schemas/MedicineListResponse' } } } },
          '400': { description: 'Invalid query.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Authentication required.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'medicine.read is not granted.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/v1/lab/tests': {
      get: {
        summary: 'List active laboratory tests',
        description: 'Requires lab_test.read. Returns only active catalog rows for request creation. Catalog write is not implemented.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 10000, default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
          { name: 'search', in: 'query', schema: { type: 'string', maxLength: 200 } },
          { name: 'sortBy', in: 'query', schema: { type: 'string', enum: ['code', 'name'], default: 'name' } },
          { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'asc' } },
        ],
        responses: {
          '200': { description: 'Paginated active laboratory tests.', content: { 'application/json': { schema: { $ref: '#/components/schemas/LabTestListResponse' } } } },
          '400': { description: 'Invalid query.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Authentication required.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'lab_test.read is not granted.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/v1/lab/requests': {
      get: {
        summary: 'List laboratory requests',
        description: 'Requires lab_request.read. Visibility is permission-wide. Nested test names on a request are part of this permission.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 10000, default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
          { name: 'patientId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'requestedByDoctorId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'status', in: 'query', schema: { $ref: '#/components/schemas/LabRequestStatus' } },
          { name: 'requestedAtFrom', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'requestedAtTo', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'sortBy', in: 'query', schema: { type: 'string', enum: ['requestedAt', 'createdAt', 'status'], default: 'requestedAt' } },
          { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' } },
        ],
        responses: {
          '200': { description: 'Paginated laboratory requests.', content: { 'application/json': { schema: { $ref: '#/components/schemas/LabRequestListResponse' } } } },
          '400': { description: 'Invalid query.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Authentication required.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'lab_request.read is not granted.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
      post: {
        summary: 'Create a laboratory request',
        description: 'Requires lab_request.create. The requesting doctor is derived from the authenticated user. Duplicate tests on one request are allowed. Inactive tests are rejected. Client-supplied actor IDs and status are rejected.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateLabRequestRequest' } } },
        },
        responses: {
          '201': { description: 'Laboratory request created.', content: { 'application/json': { schema: { $ref: '#/components/schemas/LabRequestDetailResponse' } } } },
          '400': { description: 'Invalid request body.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Authentication required.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'lab_request.create is not granted.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Patient, medical record, or laboratory test was not found.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '409': { description: 'Doctor identity mapping missing/inactive, inactive test selected, or medical-record patient mismatch.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/v1/lab/requests/{id}': {
      get: {
        summary: 'Get a laboratory request',
        description: 'Requires lab_request.read. Includes items, collection metadata, and entered results used by the on-screen report.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': { description: 'Laboratory request detail.', content: { 'application/json': { schema: { $ref: '#/components/schemas/LabRequestDetailResponse' } } } },
          '400': { description: 'Invalid laboratory request ID.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Authentication required.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'lab_request.read is not granted.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Laboratory request not found.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/v1/lab/requests/{id}/items/{itemId}/sample': {
      post: {
        summary: 'Record sample collection for a request item',
        description: 'Requires lab_sample.collect. Allowed only from requested. Collector identity is derived from the authenticated employee. The request body must be an empty object.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'itemId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CollectLabSampleRequest' } } },
        },
        responses: {
          '200': { description: 'Sample collection recorded and parent status recomputed.', content: { 'application/json': { schema: { $ref: '#/components/schemas/LabRequestDetailResponse' } } } },
          '400': { description: 'Invalid identifiers or unexpected body fields.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Authentication required.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'lab_sample.collect is not granted.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Laboratory request or item not found.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '409': { description: 'Item is not in requested status, or employee identity is missing/inactive.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/v1/lab/requests/{id}/items/{itemId}/results': {
      post: {
        summary: 'Enter a laboratory result for a collected item',
        description: 'Requires lab_result.enter. Allowed only from sample_collected. Enterer identity is derived from the authenticated employee. Results are not edited, finalized, or superseded in this milestone.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'itemId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/EnterLabResultRequest' } } },
        },
        responses: {
          '200': { description: 'Result entered as version 1 and parent status recomputed.', content: { 'application/json': { schema: { $ref: '#/components/schemas/LabRequestDetailResponse' } } } },
          '400': { description: 'Invalid result data or unexpected body fields.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Authentication required.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'lab_result.enter is not granted.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Laboratory request or item not found.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '409': { description: 'Item is not collected, a result already exists, or employee identity is missing/inactive.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/v1/pharmacy/inventory': {
      get: {
        summary: 'List pharmacy inventory batches',
        description: 'Requires inventory.read. Available quantity is derived from append-only stock movements. Unit costs are not returned.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 10000, default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
          { name: 'medicineId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'search', in: 'query', schema: { type: 'string', maxLength: 200 } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['active', 'depleted', 'expired', 'quarantined'] } },
          { name: 'sortBy', in: 'query', schema: { type: 'string', enum: ['genericName', 'expiryDate', 'batchNumber', 'receivedAt'], default: 'expiryDate' } },
          { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'asc' } },
        ],
        responses: {
          '200': { description: 'Paginated inventory batches.', content: { 'application/json': { schema: { $ref: '#/components/schemas/InventoryListResponse' } } } },
          '400': { description: 'Invalid query.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Authentication required.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'inventory.read is not granted.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/v1/pharmacy/movements': {
      get: {
        summary: 'List append-only stock movements',
        description: 'Requires stock.movement.read. Movements cannot be updated or deleted.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 10000, default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
          { name: 'medicineId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'medicineBatchId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'movementType', in: 'query', schema: { type: 'string', enum: ['receipt', 'dispense', 'adjustment', 'return', 'disposal'] } },
          { name: 'occurredAtFrom', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'occurredAtTo', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'sortBy', in: 'query', schema: { type: 'string', enum: ['occurredAt', 'movementType'], default: 'occurredAt' } },
          { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' } },
        ],
        responses: {
          '200': { description: 'Paginated stock movements.', content: { 'application/json': { schema: { $ref: '#/components/schemas/StockMovementListResponse' } } } },
          '400': { description: 'Invalid query.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Authentication required.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'stock.movement.read is not granted.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/v1/pharmacy/receipts': {
      post: {
        summary: 'Receive a medicine batch',
        description: 'Requires stock.receive. Creates a new batch and an equal receipt movement atomically. Duplicate (medicineId, batchNumber) is rejected. Inactive medicines are rejected. Client-supplied actor IDs are rejected.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ReceiveStockRequest' } } },
        },
        responses: {
          '201': { description: 'Batch received.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ReceiveStockResponse' } } } },
          '400': { description: 'Invalid receiving data or unexpected actor fields.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Authentication required.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'stock.receive is not granted.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Medicine was not found.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '409': { description: 'Inactive medicine or duplicate batch number.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/v1/pharmacy/adjustments': {
      post: {
        summary: 'Append a stock adjustment',
        description: 'Requires stock.adjust. A reason is required. Negative adjustments cannot reduce available stock below zero. Existing movements are not updated or deleted.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AdjustStockRequest' } } },
        },
        responses: {
          '201': { description: 'Adjustment movement created.', content: { 'application/json': { schema: { $ref: '#/components/schemas/StockMovementResponse' } } } },
          '400': { description: 'Invalid adjustment data.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Authentication required.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'stock.adjust is not granted.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Medicine batch was not found.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '409': { description: 'Adjustment would reduce available stock below zero.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/v1/prescriptions/{id}/items/{itemId}/dispense': {
      post: {
        summary: 'Dispense a prescription item',
        description: 'Requires prescription.dispense. Actor identity is derived from the authenticated user to an active employee. Batches are selected automatically. Partial dispensing is allowed. Client-supplied actor or batch IDs are rejected.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'itemId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/DispenseItemRequest' } } },
        },
        responses: {
          '200': { description: 'Dispense recorded and prescription status recalculated.', content: { 'application/json': { schema: { $ref: '#/components/schemas/PrescriptionDetailResponse' } } } },
          '400': { description: 'Invalid quantity or unexpected actor/batch fields.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Authentication required.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'prescription.dispense is not granted.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Prescription, item, or medicine was not found.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '409': { description: 'Cancelled or fully dispensed prescription, remaining quantity exceeded, insufficient or expired stock, inactive medicine, missing employee mapping, or concurrent conflict.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/v1/prescriptions/{id}/dispenses/{dispenseId}/reverse': {
      post: {
        summary: 'Fully reverse a completed dispense',
        description: 'Requires prescription.reverse. Reverses the complete dispense once, appends return movements, restores stock, and recalculates prescription status. Invoices and payments are not reversed. Partial reversal is not allowed.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'dispenseId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ReverseDispenseRequest' } } },
        },
        responses: {
          '200': { description: 'Dispense reversed and prescription status recalculated.', content: { 'application/json': { schema: { $ref: '#/components/schemas/PrescriptionDetailResponse' } } } },
          '400': { description: 'Invalid reversal data or unexpected actor fields.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Authentication required.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'prescription.reverse is not granted.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Prescription or dispense was not found.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '409': { description: 'Dispense already reversed or concurrent conflict.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
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
      DepartmentStatus: {
        type: 'string',
        enum: ['active', 'inactive'],
      },
      EmploymentStatus: {
        type: 'string',
        enum: ['active', 'inactive', 'terminated'],
      },
      DoctorStatus: {
        type: 'string',
        enum: ['active', 'inactive'],
      },
      ScheduleStatus: {
        type: 'string',
        enum: ['available', 'unavailable', 'cancelled'],
      },
      Department: {
        type: 'object',
        required: ['id', 'code', 'name', 'description', 'status', 'createdAt', 'updatedAt'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          code: { type: 'string', maxLength: 30 },
          name: { type: 'string', maxLength: 150 },
          description: { type: ['string', 'null'], maxLength: 2000 },
          status: { $ref: '#/components/schemas/DepartmentStatus' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      CreateDepartmentRequest: {
        type: 'object',
        additionalProperties: false,
        required: ['code', 'name'],
        properties: {
          code: { type: 'string', minLength: 1, maxLength: 30 },
          name: { type: 'string', minLength: 1, maxLength: 150 },
          description: { type: ['string', 'null'], maxLength: 2000 },
          status: { $ref: '#/components/schemas/DepartmentStatus' },
        },
      },
      UpdateDepartmentRequest: {
        type: 'object',
        additionalProperties: false,
        minProperties: 1,
        properties: {
          code: { type: 'string', minLength: 1, maxLength: 30 },
          name: { type: 'string', minLength: 1, maxLength: 150 },
          description: { type: ['string', 'null'], maxLength: 2000 },
          status: { $ref: '#/components/schemas/DepartmentStatus' },
        },
      },
      DepartmentResponse: {
        type: 'object',
        required: ['data'],
        properties: { data: { $ref: '#/components/schemas/Department' } },
      },
      DepartmentListResponse: {
        type: 'object',
        required: ['data', 'meta'],
        properties: {
          data: { type: 'array', items: { $ref: '#/components/schemas/Department' } },
          meta: { $ref: '#/components/schemas/PatientListResponse/properties/meta' },
        },
      },
      Employee: {
        type: 'object',
        required: ['id', 'employeeNumber', 'userId', 'departmentId', 'department', 'firstName', 'lastName', 'phone', 'email', 'jobTitle', 'employmentStatus', 'hireDate', 'endDate', 'createdAt', 'updatedAt'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          employeeNumber: { type: 'string', maxLength: 50 },
          userId: { type: ['string', 'null'], format: 'uuid' },
          departmentId: { type: 'string', format: 'uuid' },
          department: { $ref: '#/components/schemas/Department' },
          firstName: { type: 'string', maxLength: 100 },
          lastName: { type: 'string', maxLength: 100 },
          phone: { type: ['string', 'null'], maxLength: 30 },
          email: { type: ['string', 'null'], format: 'email', maxLength: 254 },
          jobTitle: { type: 'string', maxLength: 100 },
          employmentStatus: { $ref: '#/components/schemas/EmploymentStatus' },
          hireDate: { type: 'string', format: 'date' },
          endDate: { type: ['string', 'null'], format: 'date' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      CreateEmployeeRequest: {
        type: 'object',
        additionalProperties: false,
        required: ['firstName', 'lastName', 'jobTitle', 'departmentId', 'hireDate'],
        properties: {
          firstName: { type: 'string', minLength: 1, maxLength: 100 },
          lastName: { type: 'string', minLength: 1, maxLength: 100 },
          phone: { type: ['string', 'null'], maxLength: 30 },
          email: { type: ['string', 'null'], format: 'email', maxLength: 254 },
          jobTitle: { type: 'string', minLength: 1, maxLength: 100 },
          departmentId: { type: 'string', format: 'uuid' },
          userId: { type: ['string', 'null'], format: 'uuid' },
          employmentStatus: { $ref: '#/components/schemas/EmploymentStatus' },
          hireDate: { type: 'string', format: 'date' },
          endDate: { type: ['string', 'null'], format: 'date' },
        },
      },
      UpdateEmployeeRequest: {
        type: 'object',
        additionalProperties: false,
        minProperties: 1,
        properties: {
          firstName: { type: 'string', minLength: 1, maxLength: 100 },
          lastName: { type: 'string', minLength: 1, maxLength: 100 },
          phone: { type: ['string', 'null'], maxLength: 30 },
          email: { type: ['string', 'null'], format: 'email', maxLength: 254 },
          jobTitle: { type: 'string', minLength: 1, maxLength: 100 },
          departmentId: { type: 'string', format: 'uuid' },
          userId: { type: ['string', 'null'], format: 'uuid' },
          employmentStatus: { $ref: '#/components/schemas/EmploymentStatus' },
          hireDate: { type: 'string', format: 'date' },
          endDate: { type: ['string', 'null'], format: 'date' },
        },
      },
      EmployeeResponse: {
        type: 'object',
        required: ['data'],
        properties: { data: { $ref: '#/components/schemas/Employee' } },
      },
      EmployeeListResponse: {
        type: 'object',
        required: ['data', 'meta'],
        properties: {
          data: { type: 'array', items: { $ref: '#/components/schemas/Employee' } },
          meta: { $ref: '#/components/schemas/PatientListResponse/properties/meta' },
        },
      },
      Doctor: {
        type: 'object',
        required: ['id', 'employeeId', 'employee', 'licenseNumber', 'specialization', 'professionalSummary', 'contactExtension', 'status', 'createdAt', 'updatedAt'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          employeeId: { type: 'string', format: 'uuid' },
          employee: { $ref: '#/components/schemas/Employee' },
          licenseNumber: { type: 'string', maxLength: 100 },
          specialization: { type: 'string', maxLength: 150 },
          professionalSummary: { type: ['string', 'null'], maxLength: 5000 },
          contactExtension: { type: ['string', 'null'], maxLength: 20 },
          status: { $ref: '#/components/schemas/DoctorStatus' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      CreateDoctorRequest: {
        type: 'object',
        additionalProperties: false,
        required: ['employeeId', 'licenseNumber', 'specialization'],
        properties: {
          employeeId: { type: 'string', format: 'uuid' },
          licenseNumber: { type: 'string', minLength: 1, maxLength: 100 },
          specialization: { type: 'string', minLength: 1, maxLength: 150 },
          professionalSummary: { type: ['string', 'null'], maxLength: 5000 },
          contactExtension: { type: ['string', 'null'], maxLength: 20 },
          status: { $ref: '#/components/schemas/DoctorStatus' },
        },
      },
      UpdateDoctorRequest: {
        type: 'object',
        additionalProperties: false,
        minProperties: 1,
        properties: {
          licenseNumber: { type: 'string', minLength: 1, maxLength: 100 },
          specialization: { type: 'string', minLength: 1, maxLength: 150 },
          professionalSummary: { type: ['string', 'null'], maxLength: 5000 },
          contactExtension: { type: ['string', 'null'], maxLength: 20 },
          status: { $ref: '#/components/schemas/DoctorStatus' },
        },
      },
      DoctorResponse: {
        type: 'object',
        required: ['data'],
        properties: { data: { $ref: '#/components/schemas/Doctor' } },
      },
      DoctorListResponse: {
        type: 'object',
        required: ['data', 'meta'],
        properties: {
          data: { type: 'array', items: { $ref: '#/components/schemas/Doctor' } },
          meta: { $ref: '#/components/schemas/PatientListResponse/properties/meta' },
        },
      },
      Schedule: {
        type: 'object',
        required: ['id', 'doctorId', 'startsAt', 'endsAt', 'status', 'note', 'createdAt', 'updatedAt'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          doctorId: { type: 'string', format: 'uuid' },
          startsAt: { type: 'string', format: 'date-time' },
          endsAt: { type: 'string', format: 'date-time' },
          status: { $ref: '#/components/schemas/ScheduleStatus' },
          note: { type: ['string', 'null'], maxLength: 500 },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      CreateScheduleRequest: {
        type: 'object',
        additionalProperties: false,
        required: ['startsAt', 'endsAt'],
        properties: {
          startsAt: { type: 'string', format: 'date-time', description: 'Timezone-aware ISO-8601 instant.' },
          endsAt: { type: 'string', format: 'date-time', description: 'Timezone-aware ISO-8601 instant after startsAt.' },
          status: { $ref: '#/components/schemas/ScheduleStatus' },
          note: { type: ['string', 'null'], maxLength: 500 },
        },
      },
      UpdateScheduleRequest: {
        type: 'object',
        additionalProperties: false,
        minProperties: 1,
        properties: {
          startsAt: { type: 'string', format: 'date-time' },
          endsAt: { type: 'string', format: 'date-time' },
          status: { $ref: '#/components/schemas/ScheduleStatus' },
          note: { type: ['string', 'null'], maxLength: 500 },
        },
      },
      ScheduleResponse: {
        type: 'object',
        required: ['data'],
        properties: { data: { $ref: '#/components/schemas/Schedule' } },
      },
      ScheduleListResponse: {
        type: 'object',
        required: ['data', 'meta'],
        properties: {
          data: { type: 'array', items: { $ref: '#/components/schemas/Schedule' } },
          meta: { $ref: '#/components/schemas/PatientListResponse/properties/meta' },
        },
      },
      AppointmentStatus: {
        type: 'string',
        enum: ['scheduled', 'checked_in', 'completed', 'cancelled', 'no_show'],
      },
      AppointmentRelatedInterval: {
        type: 'object',
        required: ['id', 'status', 'startsAt', 'endsAt'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          status: { $ref: '#/components/schemas/AppointmentStatus' },
          startsAt: { type: 'string', format: 'date-time' },
          endsAt: { type: 'string', format: 'date-time' },
        },
      },
      Appointment: {
        type: 'object',
        required: ['id', 'patientId', 'doctorId', 'startsAt', 'endsAt', 'status', 'reason', 'cancellationReason', 'cancelledAt', 'cancelledByUserId', 'rescheduledFromAppointmentId', 'createdByUserId', 'createdAt', 'updatedAt', 'patient', 'doctor', 'cancelledBy', 'createdBy', 'rescheduledFrom', 'rescheduledTo'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          patientId: { type: 'string', format: 'uuid' },
          doctorId: { type: 'string', format: 'uuid' },
          startsAt: { type: 'string', format: 'date-time' },
          endsAt: { type: 'string', format: 'date-time' },
          status: { $ref: '#/components/schemas/AppointmentStatus' },
          reason: { type: ['string', 'null'], maxLength: 1000 },
          cancellationReason: { type: ['string', 'null'], maxLength: 500 },
          cancelledAt: { type: ['string', 'null'], format: 'date-time' },
          cancelledByUserId: { type: ['string', 'null'], format: 'uuid' },
          rescheduledFromAppointmentId: { type: ['string', 'null'], format: 'uuid' },
          createdByUserId: { type: 'string', format: 'uuid' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          patient: {
            type: 'object',
            required: ['id', 'patientNumber', 'firstName', 'lastName', 'status'],
            properties: {
              id: { type: 'string', format: 'uuid' },
              patientNumber: { type: 'string' },
              firstName: { type: 'string' },
              lastName: { type: 'string' },
              status: { $ref: '#/components/schemas/PatientStatus' },
            },
          },
          doctor: {
            type: 'object',
            required: ['id', 'licenseNumber', 'specialization', 'status', 'employee'],
            properties: {
              id: { type: 'string', format: 'uuid' },
              licenseNumber: { type: 'string' },
              specialization: { type: 'string' },
              status: { $ref: '#/components/schemas/DoctorStatus' },
              employee: {
                type: 'object',
                required: ['id', 'employeeNumber', 'firstName', 'lastName', 'employmentStatus'],
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  employeeNumber: { type: 'string' },
                  firstName: { type: 'string' },
                  lastName: { type: 'string' },
                  employmentStatus: { $ref: '#/components/schemas/EmploymentStatus' },
                },
              },
            },
          },
          cancelledBy: {
            type: ['object', 'null'],
            required: ['id', 'username'],
            properties: {
              id: { type: 'string', format: 'uuid' },
              username: { type: 'string' },
            },
          },
          createdBy: {
            type: 'object',
            required: ['id', 'username'],
            properties: {
              id: { type: 'string', format: 'uuid' },
              username: { type: 'string' },
            },
          },
          rescheduledFrom: { oneOf: [{ $ref: '#/components/schemas/AppointmentRelatedInterval' }, { type: 'null' }] },
          rescheduledTo: { oneOf: [{ $ref: '#/components/schemas/AppointmentRelatedInterval' }, { type: 'null' }] },
        },
      },
      CreateAppointmentRequest: {
        type: 'object',
        additionalProperties: false,
        required: ['patientId', 'doctorId', 'startsAt', 'endsAt'],
        properties: {
          patientId: { type: 'string', format: 'uuid' },
          doctorId: { type: 'string', format: 'uuid' },
          startsAt: { type: 'string', format: 'date-time', description: 'Timezone-aware ISO-8601 instant.' },
          endsAt: { type: 'string', format: 'date-time', description: 'Timezone-aware ISO-8601 instant after startsAt.' },
          reason: { type: ['string', 'null'], maxLength: 1000 },
        },
      },
      UpdateAppointmentRequest: {
        type: 'object',
        additionalProperties: false,
        required: ['reason'],
        properties: {
          reason: { type: ['string', 'null'], maxLength: 1000 },
        },
      },
      CancelAppointmentRequest: {
        type: 'object',
        additionalProperties: false,
        required: ['cancellationReason'],
        properties: {
          cancellationReason: { type: 'string', minLength: 1, maxLength: 500 },
        },
      },
      RescheduleAppointmentRequest: {
        type: 'object',
        additionalProperties: false,
        required: ['doctorId', 'startsAt', 'endsAt'],
        properties: {
          patientId: { type: 'string', format: 'uuid', description: 'Optional; must match the original patient when supplied.' },
          doctorId: { type: 'string', format: 'uuid' },
          startsAt: { type: 'string', format: 'date-time' },
          endsAt: { type: 'string', format: 'date-time' },
          reason: { type: ['string', 'null'], maxLength: 1000 },
        },
      },
      UpdateAppointmentStatusRequest: {
        type: 'object',
        additionalProperties: false,
        required: ['status'],
        properties: {
          status: { type: 'string', enum: ['checked_in', 'completed', 'no_show'] },
        },
      },
      AppointmentResponse: {
        type: 'object',
        required: ['data'],
        properties: { data: { $ref: '#/components/schemas/Appointment' } },
      },
      AppointmentListResponse: {
        type: 'object',
        required: ['data', 'meta'],
        properties: {
          data: { type: 'array', items: { $ref: '#/components/schemas/Appointment' } },
          meta: { $ref: '#/components/schemas/PatientListResponse/properties/meta' },
        },
      },
      MedicalRecordStatus: {
        type: 'string',
        enum: ['draft', 'final', 'amended'],
      },
      DiagnosisInput: {
        type: 'object',
        additionalProperties: false,
        required: ['diagnosisText'],
        properties: { diagnosisText: { type: 'string', minLength: 1, maxLength: 10000 } },
      },
      TreatmentInput: {
        type: 'object',
        additionalProperties: false,
        required: ['treatmentText'],
        properties: { treatmentText: { type: 'string', minLength: 1, maxLength: 10000 } },
      },
      MedicalReportInput: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'reportText'],
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 200 },
          reportText: { type: 'string', minLength: 1, maxLength: 20000 },
        },
      },
      MedicalRecordListItem: {
        type: 'object',
        required: ['id', 'patientId', 'authorEmployeeId', 'appointmentId', 'admissionId', 'occurredAt', 'status', 'finalizedAt', 'amendsMedicalRecordId', 'createdAt', 'updatedAt', 'patient', 'author'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          patientId: { type: 'string', format: 'uuid' },
          authorEmployeeId: { type: 'string', format: 'uuid' },
          appointmentId: { type: ['string', 'null'], format: 'uuid' },
          admissionId: { type: ['string', 'null'], format: 'uuid' },
          occurredAt: { type: 'string', format: 'date-time' },
          status: { $ref: '#/components/schemas/MedicalRecordStatus' },
          finalizedAt: { type: ['string', 'null'], format: 'date-time' },
          amendsMedicalRecordId: { type: ['string', 'null'], format: 'uuid' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          patient: {
            type: 'object',
            required: ['id', 'patientNumber', 'firstName', 'lastName', 'status'],
            properties: {
              id: { type: 'string', format: 'uuid' },
              patientNumber: { type: 'string' },
              firstName: { type: 'string' },
              lastName: { type: 'string' },
              status: { $ref: '#/components/schemas/PatientStatus' },
            },
          },
          author: {
            type: 'object',
            required: ['id', 'employeeNumber', 'firstName', 'lastName', 'employmentStatus'],
            properties: {
              id: { type: 'string', format: 'uuid' },
              employeeNumber: { type: 'string' },
              firstName: { type: 'string' },
              lastName: { type: 'string' },
              employmentStatus: { $ref: '#/components/schemas/EmploymentStatus' },
            },
          },
        },
      },
      MedicalRecordDetail: {
        allOf: [
          { $ref: '#/components/schemas/MedicalRecordListItem' },
          {
            type: 'object',
            required: ['diagnoses', 'treatments', 'reports', 'appointment', 'admission', 'amends', 'amendedBy'],
            properties: {
              diagnoses: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['id', 'diagnosisText', 'createdAt'],
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    diagnosisText: { type: 'string' },
                    createdAt: { type: 'string', format: 'date-time' },
                  },
                },
              },
              treatments: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['id', 'treatmentText', 'createdAt'],
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    treatmentText: { type: 'string' },
                    createdAt: { type: 'string', format: 'date-time' },
                  },
                },
              },
              reports: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['id', 'title', 'reportText', 'createdAt'],
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    title: { type: 'string' },
                    reportText: { type: 'string' },
                    createdAt: { type: 'string', format: 'date-time' },
                  },
                },
              },
              appointment: {
                type: ['object', 'null'],
                required: ['id', 'status', 'startsAt', 'endsAt'],
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  status: { $ref: '#/components/schemas/AppointmentStatus' },
                  startsAt: { type: 'string', format: 'date-time' },
                  endsAt: { type: 'string', format: 'date-time' },
                },
              },
              admission: {
                type: ['object', 'null'],
                required: ['id', 'admissionNumber', 'status', 'admittedAt'],
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  admissionNumber: { type: 'string' },
                  status: { type: 'string' },
                  admittedAt: { type: 'string', format: 'date-time' },
                },
              },
              amends: {
                type: ['object', 'null'],
                required: ['id', 'status', 'occurredAt'],
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  status: { $ref: '#/components/schemas/MedicalRecordStatus' },
                  occurredAt: { type: 'string', format: 'date-time' },
                },
              },
              amendedBy: {
                type: ['object', 'null'],
                required: ['id', 'status', 'occurredAt'],
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  status: { $ref: '#/components/schemas/MedicalRecordStatus' },
                  occurredAt: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        ],
      },
      CreateMedicalRecordRequest: {
        type: 'object',
        additionalProperties: false,
        required: ['patientId', 'occurredAt'],
        properties: {
          patientId: { type: 'string', format: 'uuid' },
          occurredAt: { type: 'string', format: 'date-time' },
          appointmentId: { type: ['string', 'null'], format: 'uuid' },
          admissionId: { type: ['string', 'null'], format: 'uuid' },
          diagnoses: { type: 'array', items: { $ref: '#/components/schemas/DiagnosisInput' } },
          treatments: { type: 'array', items: { $ref: '#/components/schemas/TreatmentInput' } },
          reports: { type: 'array', items: { $ref: '#/components/schemas/MedicalReportInput' } },
        },
      },
      UpdateMedicalRecordRequest: {
        type: 'object',
        additionalProperties: false,
        minProperties: 1,
        properties: {
          occurredAt: { type: 'string', format: 'date-time' },
          appointmentId: { type: ['string', 'null'], format: 'uuid' },
          admissionId: { type: ['string', 'null'], format: 'uuid' },
          diagnoses: { type: 'array', items: { $ref: '#/components/schemas/DiagnosisInput' } },
          treatments: { type: 'array', items: { $ref: '#/components/schemas/TreatmentInput' } },
          reports: { type: 'array', items: { $ref: '#/components/schemas/MedicalReportInput' } },
        },
      },
      AmendMedicalRecordRequest: {
        type: 'object',
        additionalProperties: false,
        required: ['occurredAt', 'reason'],
        properties: {
          occurredAt: { type: 'string', format: 'date-time' },
          appointmentId: { type: ['string', 'null'], format: 'uuid' },
          admissionId: { type: ['string', 'null'], format: 'uuid' },
          diagnoses: { type: 'array', items: { $ref: '#/components/schemas/DiagnosisInput' } },
          treatments: { type: 'array', items: { $ref: '#/components/schemas/TreatmentInput' } },
          reports: { type: 'array', items: { $ref: '#/components/schemas/MedicalReportInput' } },
          reason: { type: 'string', minLength: 1, maxLength: 500 },
        },
      },
      MedicalRecordDetailResponse: {
        type: 'object',
        required: ['data'],
        properties: { data: { $ref: '#/components/schemas/MedicalRecordDetail' } },
      },
      MedicalRecordListResponse: {
        type: 'object',
        required: ['data', 'meta'],
        properties: {
          data: { type: 'array', items: { $ref: '#/components/schemas/MedicalRecordListItem' } },
          meta: { $ref: '#/components/schemas/PatientListResponse/properties/meta' },
        },
      },
      PrescriptionStatus: {
        type: 'string',
        enum: ['active', 'partially_dispensed', 'dispensed', 'cancelled', 'expired'],
      },
      PrescriptionItemInput: {
        type: 'object',
        additionalProperties: false,
        required: ['medicineId', 'dosage', 'frequency', 'duration', 'quantityPrescribed', 'unit'],
        properties: {
          medicineId: { type: 'string', format: 'uuid' },
          dosage: { type: 'string', minLength: 1, maxLength: 100 },
          route: { type: ['string', 'null'], maxLength: 50 },
          frequency: { type: 'string', minLength: 1, maxLength: 100 },
          duration: { type: 'string', minLength: 1, maxLength: 100 },
          instructions: { type: ['string', 'null'], maxLength: 2000 },
          quantityPrescribed: { type: ['number', 'string'] },
          unit: { type: 'string', minLength: 1, maxLength: 30 },
        },
      },
      CreatePrescriptionRequest: {
        type: 'object',
        additionalProperties: false,
        required: ['medicalRecordId', 'items'],
        properties: {
          medicalRecordId: { type: 'string', format: 'uuid' },
          notes: { type: ['string', 'null'], maxLength: 2000 },
          items: { type: 'array', minItems: 1, items: { $ref: '#/components/schemas/PrescriptionItemInput' } },
        },
      },
      CancelPrescriptionRequest: {
        type: 'object',
        additionalProperties: false,
        required: ['cancellationReason'],
        properties: {
          cancellationReason: { type: 'string', minLength: 1, maxLength: 500 },
        },
      },
      PrescriptionListItem: {
        type: 'object',
        required: ['id', 'medicalRecordId', 'patientId', 'prescribedByDoctorId', 'prescribedAt', 'status', 'notes', 'createdAt', 'updatedAt', 'patient', 'prescribedBy', 'itemCount'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          medicalRecordId: { type: 'string', format: 'uuid' },
          patientId: { type: 'string', format: 'uuid' },
          prescribedByDoctorId: { type: 'string', format: 'uuid' },
          prescribedAt: { type: 'string', format: 'date-time' },
          status: { $ref: '#/components/schemas/PrescriptionStatus' },
          notes: { type: ['string', 'null'] },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          itemCount: { type: 'integer' },
          patient: { $ref: '#/components/schemas/MedicalRecordListItem/properties/patient' },
          prescribedBy: {
            type: 'object',
            required: ['id', 'licenseNumber', 'specialization', 'status', 'employee'],
            properties: {
              id: { type: 'string', format: 'uuid' },
              licenseNumber: { type: 'string' },
              specialization: { type: 'string' },
              status: { $ref: '#/components/schemas/DoctorStatus' },
              employee: { $ref: '#/components/schemas/MedicalRecordListItem/properties/author' },
            },
          },
        },
      },
      PrescriptionDetail: {
        allOf: [
          { $ref: '#/components/schemas/PrescriptionListItem' },
          {
            type: 'object',
            required: ['items'],
            properties: {
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['id', 'medicineId', 'dosage', 'route', 'frequency', 'duration', 'instructions', 'quantityPrescribed', 'quantityDispensed', 'quantityRemaining', 'unit', 'createdAt', 'updatedAt', 'medicine', 'dispenseRecords'],
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    medicineId: { type: 'string', format: 'uuid' },
                    dosage: { type: 'string' },
                    route: { type: ['string', 'null'] },
                    frequency: { type: 'string' },
                    duration: { type: 'string' },
                    instructions: { type: ['string', 'null'] },
                    quantityPrescribed: { type: 'string' },
                    quantityDispensed: { type: 'string' },
                    quantityRemaining: { type: 'string' },
                    unit: { type: 'string' },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' },
                    medicine: { $ref: '#/components/schemas/MedicineCatalogItem' },
                    dispenseRecords: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/PrescriptionDispenseRecord' },
                    },
                  },
                },
              },
            },
          },
        ],
      },
      PrescriptionDetailResponse: {
        type: 'object',
        required: ['data'],
        properties: { data: { $ref: '#/components/schemas/PrescriptionDetail' } },
      },
      PrescriptionListResponse: {
        type: 'object',
        required: ['data', 'meta'],
        properties: {
          data: { type: 'array', items: { $ref: '#/components/schemas/PrescriptionListItem' } },
          meta: { $ref: '#/components/schemas/PatientListResponse/properties/meta' },
        },
      },
      MedicineCatalogItem: {
        type: 'object',
        required: ['id', 'code', 'genericName', 'brandName', 'dosageForm', 'strength', 'inventoryUnit', 'status', 'currency'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          code: { type: 'string' },
          genericName: { type: 'string' },
          brandName: { type: ['string', 'null'] },
          dosageForm: { type: 'string' },
          strength: { type: ['string', 'null'] },
          inventoryUnit: { type: 'string' },
          status: { type: 'string', enum: ['active', 'inactive'] },
          currency: { type: 'string' },
        },
      },
      MedicineListResponse: {
        type: 'object',
        required: ['data', 'meta'],
        properties: {
          data: { type: 'array', items: { $ref: '#/components/schemas/MedicineCatalogItem' } },
          meta: { $ref: '#/components/schemas/PatientListResponse/properties/meta' },
        },
      },
      LabRequestStatus: {
        type: 'string',
        enum: ['requested', 'sample_collected', 'in_progress', 'completed', 'cancelled'],
      },
      LabTestCatalogItem: {
        type: 'object',
        required: ['id', 'code', 'name', 'status'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          code: { type: 'string' },
          name: { type: 'string' },
          status: { type: 'string', enum: ['active', 'inactive'] },
        },
      },
      LabTestListResponse: {
        type: 'object',
        required: ['data', 'meta'],
        properties: {
          data: { type: 'array', items: { $ref: '#/components/schemas/LabTestCatalogItem' } },
          meta: { $ref: '#/components/schemas/PatientListResponse/properties/meta' },
        },
      },
      CreateLabRequestItemInput: {
        type: 'object',
        additionalProperties: false,
        required: ['testDefinitionId'],
        properties: {
          testDefinitionId: { type: 'string', format: 'uuid' },
        },
      },
      CreateLabRequestRequest: {
        type: 'object',
        additionalProperties: false,
        required: ['patientId', 'items'],
        properties: {
          patientId: { type: 'string', format: 'uuid' },
          medicalRecordId: { type: ['string', 'null'], format: 'uuid' },
          clinicalNote: { type: ['string', 'null'], maxLength: 2000 },
          items: {
            type: 'array',
            minItems: 1,
            maxItems: 50,
            items: { $ref: '#/components/schemas/CreateLabRequestItemInput' },
          },
        },
      },
      CollectLabSampleRequest: {
        type: 'object',
        additionalProperties: false,
        properties: {},
      },
      EnterLabResultRequest: {
        type: 'object',
        additionalProperties: false,
        required: ['resultValue'],
        properties: {
          resultValue: { type: 'string', minLength: 1, maxLength: 10000 },
          resultUnit: { type: ['string', 'null'], maxLength: 50 },
          referenceRangeSnapshot: { type: ['string', 'null'], maxLength: 2000 },
          resultNote: { type: ['string', 'null'], maxLength: 2000 },
        },
      },
      LabEmployeeSummary: {
        type: 'object',
        required: ['id', 'employeeNumber', 'firstName', 'lastName', 'employmentStatus'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          employeeNumber: { type: 'string' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          employmentStatus: { type: 'string' },
        },
      },
      LabRequestListItem: {
        type: 'object',
        required: ['id', 'patientId', 'requestedByDoctorId', 'medicalRecordId', 'requestedAt', 'status', 'clinicalNote', 'createdAt', 'updatedAt', 'patient', 'requestedBy', 'itemCount'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          patientId: { type: 'string', format: 'uuid' },
          requestedByDoctorId: { type: 'string', format: 'uuid' },
          medicalRecordId: { type: ['string', 'null'], format: 'uuid' },
          requestedAt: { type: 'string', format: 'date-time' },
          status: { $ref: '#/components/schemas/LabRequestStatus' },
          clinicalNote: { type: ['string', 'null'] },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          itemCount: { type: 'integer' },
          patient: { $ref: '#/components/schemas/MedicalRecordListItem/properties/patient' },
          requestedBy: {
            type: 'object',
            required: ['id', 'licenseNumber', 'specialization', 'status', 'employee'],
            properties: {
              id: { type: 'string', format: 'uuid' },
              licenseNumber: { type: 'string' },
              specialization: { type: 'string' },
              status: { $ref: '#/components/schemas/DoctorStatus' },
              employee: { $ref: '#/components/schemas/LabEmployeeSummary' },
            },
          },
        },
      },
      LabRequestDetail: {
        allOf: [
          { $ref: '#/components/schemas/LabRequestListItem' },
          {
            type: 'object',
            required: ['items'],
            properties: {
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['id', 'testDefinitionId', 'status', 'sampleCollectedAt', 'sampleCollectedByEmployeeId', 'createdAt', 'updatedAt', 'testDefinition', 'sampleCollectedBy', 'results'],
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    testDefinitionId: { type: 'string', format: 'uuid' },
                    status: { $ref: '#/components/schemas/LabRequestStatus' },
                    sampleCollectedAt: { type: ['string', 'null'], format: 'date-time' },
                    sampleCollectedByEmployeeId: { type: ['string', 'null'], format: 'uuid' },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' },
                    testDefinition: { $ref: '#/components/schemas/LabTestCatalogItem' },
                    sampleCollectedBy: { type: ['object', 'null'], allOf: [{ $ref: '#/components/schemas/LabEmployeeSummary' }] },
                    results: {
                      type: 'array',
                      items: {
                        type: 'object',
                        required: ['id', 'versionNumber', 'resultValue', 'resultUnit', 'referenceRangeSnapshot', 'resultNote', 'enteredAt', 'enteredByEmployeeId', 'enteredBy'],
                        properties: {
                          id: { type: 'string', format: 'uuid' },
                          versionNumber: { type: 'integer' },
                          resultValue: { type: 'string' },
                          resultUnit: { type: ['string', 'null'] },
                          referenceRangeSnapshot: { type: ['string', 'null'] },
                          resultNote: { type: ['string', 'null'] },
                          enteredAt: { type: 'string', format: 'date-time' },
                          enteredByEmployeeId: { type: 'string', format: 'uuid' },
                          enteredBy: { $ref: '#/components/schemas/LabEmployeeSummary' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        ],
      },
      LabRequestDetailResponse: {
        type: 'object',
        required: ['data'],
        properties: { data: { $ref: '#/components/schemas/LabRequestDetail' } },
      },
      LabRequestListResponse: {
        type: 'object',
        required: ['data', 'meta'],
        properties: {
          data: { type: 'array', items: { $ref: '#/components/schemas/LabRequestListItem' } },
          meta: { $ref: '#/components/schemas/PatientListResponse/properties/meta' },
        },
      },
      ReceiveStockRequest: {
        type: 'object',
        additionalProperties: false,
        required: ['medicineId', 'batchNumber', 'expiryDate', 'quantity', 'unitCost', 'salePriceSnapshot', 'currency'],
        properties: {
          medicineId: { type: 'string', format: 'uuid' },
          batchNumber: { type: 'string', minLength: 1, maxLength: 100 },
          expiryDate: { type: 'string', format: 'date' },
          quantity: { type: ['number', 'string'] },
          unitCost: { type: ['number', 'string'] },
          salePriceSnapshot: { type: ['number', 'string'] },
          currency: { type: 'string', pattern: '^[A-Z]{3}$' },
        },
      },
      AdjustStockRequest: {
        type: 'object',
        additionalProperties: false,
        required: ['medicineBatchId', 'quantity', 'reason'],
        properties: {
          medicineBatchId: { type: 'string', format: 'uuid' },
          quantity: { type: ['number', 'string'] },
          reason: { type: 'string', minLength: 1, maxLength: 500 },
        },
      },
      DispenseItemRequest: {
        type: 'object',
        additionalProperties: false,
        required: ['quantity'],
        properties: {
          quantity: { type: ['number', 'string'] },
          note: { type: ['string', 'null'], maxLength: 500 },
        },
      },
      ReverseDispenseRequest: {
        type: 'object',
        additionalProperties: false,
        required: ['reason'],
        properties: {
          reason: { type: 'string', minLength: 1, maxLength: 500 },
        },
      },
      InventoryBatch: {
        type: 'object',
        required: ['id', 'medicineId', 'batchNumber', 'expiryDate', 'receivedQuantity', 'availableQuantity', 'status', 'receivedAt', 'createdAt', 'updatedAt', 'medicine'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          medicineId: { type: 'string', format: 'uuid' },
          batchNumber: { type: 'string' },
          expiryDate: { type: 'string', format: 'date' },
          receivedQuantity: { type: 'string' },
          availableQuantity: { type: 'string' },
          status: { type: 'string' },
          receivedAt: { type: 'string', format: 'date-time' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          medicine: { $ref: '#/components/schemas/MedicineCatalogItem' },
        },
      },
      InventoryListResponse: {
        type: 'object',
        required: ['data', 'meta'],
        properties: {
          data: { type: 'array', items: { $ref: '#/components/schemas/InventoryBatch' } },
          meta: { $ref: '#/components/schemas/PatientListResponse/properties/meta' },
        },
      },
      ReceiveStockResponse: {
        type: 'object',
        required: ['data'],
        properties: {
          data: {
            type: 'object',
            required: ['batch', 'movementId'],
            properties: {
              batch: { $ref: '#/components/schemas/InventoryBatch' },
              movementId: { type: 'string', format: 'uuid' },
            },
          },
        },
      },
      StockMovement: {
        type: 'object',
        required: ['id', 'medicineBatchId', 'movementType', 'quantity', 'occurredAt', 'reason', 'referenceIdentifier', 'dispenseRecordId', 'dispenseReversalId', 'medicineBatch', 'performedBy'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          medicineBatchId: { type: 'string', format: 'uuid' },
          movementType: { type: 'string', enum: ['receipt', 'dispense', 'adjustment', 'return', 'disposal'] },
          quantity: { type: 'string' },
          occurredAt: { type: 'string', format: 'date-time' },
          reason: { type: 'string' },
          referenceIdentifier: { type: ['string', 'null'] },
          dispenseRecordId: { type: ['string', 'null'], format: 'uuid' },
          dispenseReversalId: { type: ['string', 'null'], format: 'uuid' },
          medicineBatch: {
            type: 'object',
            required: ['id', 'batchNumber', 'expiryDate', 'status', 'medicine'],
            properties: {
              id: { type: 'string', format: 'uuid' },
              batchNumber: { type: 'string' },
              expiryDate: { type: 'string', format: 'date' },
              status: { type: 'string' },
              medicine: { $ref: '#/components/schemas/MedicineCatalogItem' },
            },
          },
          performedBy: {
            type: 'object',
            required: ['id', 'username'],
            properties: {
              id: { type: 'string', format: 'uuid' },
              username: { type: 'string' },
            },
          },
        },
      },
      StockMovementResponse: {
        type: 'object',
        required: ['data'],
        properties: { data: { $ref: '#/components/schemas/StockMovement' } },
      },
      StockMovementListResponse: {
        type: 'object',
        required: ['data', 'meta'],
        properties: {
          data: { type: 'array', items: { $ref: '#/components/schemas/StockMovement' } },
          meta: { $ref: '#/components/schemas/PatientListResponse/properties/meta' },
        },
      },
      PrescriptionDispenseRecord: {
        type: 'object',
        required: ['id', 'quantityDispensed', 'unit', 'dispensedAt', 'dispensedByEmployeeId', 'status', 'note', 'reversed', 'reversal', 'dispensedBy'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          quantityDispensed: { type: 'string' },
          unit: { type: 'string' },
          dispensedAt: { type: 'string', format: 'date-time' },
          dispensedByEmployeeId: { type: 'string', format: 'uuid' },
          status: { type: 'string', const: 'completed' },
          note: { type: ['string', 'null'] },
          reversed: { type: 'boolean' },
          reversal: {
            type: ['object', 'null'],
            required: ['id', 'quantityReversed', 'reversedAt'],
            properties: {
              id: { type: 'string', format: 'uuid' },
              quantityReversed: { type: 'string' },
              reversedAt: { type: 'string', format: 'date-time' },
            },
          },
          dispensedBy: { $ref: '#/components/schemas/LabEmployeeSummary' },
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
