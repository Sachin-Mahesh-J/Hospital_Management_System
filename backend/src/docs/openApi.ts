export const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'Hospital Management System API',
    version: '0.6.0',
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
        description: 'Requires prescription.cancel. Allowed only from active. The prescription is retained. Cancellation reason is stored in audit metadata. Pharmacy dispense states are not changed by this module.',
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
        description: 'Requires medicine.read. Returns only active medicines. This is not pharmacy inventory management.',
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
                  required: ['id', 'medicineId', 'dosage', 'route', 'frequency', 'duration', 'instructions', 'quantityPrescribed', 'unit', 'createdAt', 'updatedAt', 'medicine'],
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    medicineId: { type: 'string', format: 'uuid' },
                    dosage: { type: 'string' },
                    route: { type: ['string', 'null'] },
                    frequency: { type: 'string' },
                    duration: { type: 'string' },
                    instructions: { type: ['string', 'null'] },
                    quantityPrescribed: { type: 'string' },
                    unit: { type: 'string' },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' },
                    medicine: { $ref: '#/components/schemas/MedicineCatalogItem' },
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
        required: ['id', 'code', 'genericName', 'brandName', 'dosageForm', 'strength', 'inventoryUnit', 'status'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          code: { type: 'string' },
          genericName: { type: 'string' },
          brandName: { type: ['string', 'null'] },
          dosageForm: { type: 'string' },
          strength: { type: ['string', 'null'] },
          inventoryUnit: { type: 'string' },
          status: { type: 'string', enum: ['active', 'inactive'] },
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
