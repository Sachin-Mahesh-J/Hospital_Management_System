import { Router } from 'express'
import multer from 'multer'
import { PERMISSIONS } from '../../auth/auth.constants.js'
import { requirePermission } from '../../middleware/accessControl.js'
import { authenticate } from '../../middleware/authenticate.js'
import { validate } from '../../middleware/validate.js'
import { MAX_DOCUMENT_BYTES } from './document.constants.js'
import {
  accessDocumentController,
  deleteDocumentController,
  getDocumentController,
  listDocumentsController,
  updateDocumentController,
  uploadDocumentController,
} from './document.controller.js'
import {
  listDocumentsQuerySchema,
  patientDocumentParamsSchema,
  updateDocumentBodySchema,
} from './document.schemas.js'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_DOCUMENT_BYTES, files: 1 },
})

export const documentRouter = Router({ mergeParams: true })

documentRouter.use(authenticate)

documentRouter.get(
  '/',
  requirePermission(PERMISSIONS.patientDocumentRead),
  validate({
    params: patientDocumentParamsSchema,
    query: listDocumentsQuerySchema,
  }),
  listDocumentsController,
)
documentRouter.post(
  '/',
  requirePermission(PERMISSIONS.patientDocumentCreate),
  validate({ params: patientDocumentParamsSchema }),
  upload.single('file'),
  uploadDocumentController,
)
documentRouter.get(
  '/:documentId',
  requirePermission(PERMISSIONS.patientDocumentRead),
  validate({ params: patientDocumentParamsSchema }),
  getDocumentController,
)
documentRouter.patch(
  '/:documentId',
  requirePermission(PERMISSIONS.patientDocumentUpdate),
  validate({
    params: patientDocumentParamsSchema,
    body: updateDocumentBodySchema,
  }),
  updateDocumentController,
)
documentRouter.delete(
  '/:documentId',
  requirePermission(PERMISSIONS.patientDocumentDelete),
  validate({ params: patientDocumentParamsSchema }),
  deleteDocumentController,
)
documentRouter.post(
  '/:documentId/access',
  requirePermission(PERMISSIONS.patientDocumentRead),
  validate({ params: patientDocumentParamsSchema }),
  accessDocumentController,
)
