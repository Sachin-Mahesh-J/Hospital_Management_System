import cors from 'cors'
import cookieParser from 'cookie-parser'
import express from 'express'
import helmet from 'helmet'
import { pinoHttp } from 'pino-http'
import swaggerUi from 'swagger-ui-express'
import { env } from './config/env.js'
import { logger } from './config/logger.js'
import { openApiDocument } from './docs/openApi.js'
import { AppError } from './errors/AppError.js'
import {
  errorHandler,
  notFoundHandler,
} from './middleware/errorHandler.js'
import { requestContext } from './middleware/requestContext.js'
import { authRouter } from './modules/auth/auth.routes.js'
import { departmentRouter } from './modules/departments/department.routes.js'
import { appointmentRouter } from './modules/appointments/appointment.routes.js'
import { doctorRouter } from './modules/doctors/doctor.routes.js'
import { employeeRouter } from './modules/employees/employee.routes.js'
import { healthRouter } from './modules/health/health.routes.js'
import { medicalRecordRouter } from './modules/medical-records/medical-record.routes.js'
import { laboratoryRouter } from './modules/laboratory/laboratory.routes.js'
import { medicineRouter } from './modules/medicines/medicine.routes.js'
import { patientRouter } from './modules/patients/patient.routes.js'
import { pharmacyRouter } from './modules/pharmacy/pharmacy.routes.js'
import { prescriptionRouter } from './modules/prescriptions/prescription.routes.js'
import {
  billingLookupRouter,
  invoiceRouter,
  paymentRouter,
} from './modules/billing/billing.routes.js'

export function createApp() {
  const app = express()

  app.disable('x-powered-by')
  if (env.auth.trustProxy) {
    app.set('trust proxy', 1)
  }
  app.use(requestContext)
  app.use(
    pinoHttp({
      logger,
      customProps: (_request, response) => ({
        requestId: response.locals.requestId,
      }),
    }),
  )
  app.use(
    '/api/docs',
    helmet({ contentSecurityPolicy: false }),
    swaggerUi.serve,
    swaggerUi.setup(openApiDocument),
  )
  app.use(helmet())
  app.use(
    cors({
      credentials: true,
      origin(origin, callback) {
        if (!origin || env.cors.allowedOrigins.includes(origin)) {
          callback(null, true)
          return
        }

        callback(new AppError(403, 'ORIGIN_NOT_ALLOWED', 'Origin is not allowed.'))
      },
    }),
  )
  app.use(express.json({ limit: '1mb' }))
  app.use(cookieParser())

  app.use('/api/v1/health', healthRouter)
  app.use('/api/v1/auth', authRouter)
  app.use('/api/v1/patients', patientRouter)
  app.use('/api/v1/departments', departmentRouter)
  app.use('/api/v1/employees', employeeRouter)
  app.use('/api/v1/doctors', doctorRouter)
  app.use('/api/v1/appointments', appointmentRouter)
  app.use('/api/v1/medical-records', medicalRecordRouter)
  app.use('/api/v1/prescriptions', prescriptionRouter)
  app.use('/api/v1/medicines', medicineRouter)
  app.use('/api/v1/lab', laboratoryRouter)
  app.use('/api/v1/pharmacy', pharmacyRouter)
  app.use('/api/v1/billing', billingLookupRouter)
  app.use('/api/v1/invoices', invoiceRouter)
  app.use('/api/v1/payments', paymentRouter)
  app.get('/api/v1/openapi.json', (_request, response) => {
    response.json(openApiDocument)
  })

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
