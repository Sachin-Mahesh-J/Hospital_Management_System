export const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'Hospital Management System API',
    version: '0.4.0',
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
        description: 'Requires doctor_schedule.read. Recurrence, overlap policy, and appointment booking are not implemented.',
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
