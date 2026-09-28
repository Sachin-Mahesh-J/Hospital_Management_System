import type { Prisma } from '@prisma/client'
import { findPrescribingDoctorByUserId } from '../../auth/clinicalIdentity.js'
import { database } from '../../database/database.service.js'
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../errors/httpErrors.js'
import { writeAudit } from '../audit/audit.service.js'
import {
  cancelPrescription as cancelPrescriptionRecord,
  createPrescription as createPrescriptionRecord,
  findMedicalRecordForPrescription,
  findMedicineById,
  findPrescriptionById,
  listPrescriptions as listPrescriptionRows,
  lockPrescription,
} from './prescription.repository.js'
import type {
  CancelPrescriptionBody,
  CreatePrescriptionBody,
  ListPrescriptionsQuery,
} from './prescription.schemas.js'
import {
  toPrescriptionDetailDto,
  toPrescriptionListDto,
  type PrescriptionDetailDto,
  type PrescriptionListDto,
} from './prescription.types.js'

type MutationContext = {
  actorUserId: string
  requestId: string
}

async function requireActivePrescribingDoctor(
  userId: string,
  client: Prisma.TransactionClient,
): Promise<string> {
  const doctor = await findPrescribingDoctorByUserId(userId, client)
  if (!doctor) {
    throw new ConflictError(
      'The authenticated user is not linked to an active doctor profile.',
    )
  }
  if (doctor.status !== 'active') {
    throw new ConflictError('This doctor is not available for prescribing.')
  }
  if (doctor.employee.employmentStatus !== 'active') {
    throw new ConflictError('This doctor is not available for prescribing.')
  }
  return doctor.id
}

export async function getPrescriptions(query: ListPrescriptionsQuery): Promise<{
  data: PrescriptionListDto[]
  pagination: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
  }
}> {
  const result = await listPrescriptionRows(query)
  return {
    data: result.prescriptions.map(toPrescriptionListDto),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      totalItems: result.totalItems,
      totalPages: Math.ceil(result.totalItems / query.pageSize),
    },
  }
}

export async function getPrescription(
  id: string,
): Promise<PrescriptionDetailDto> {
  const prescription = await findPrescriptionById(id)
  if (!prescription) throw new NotFoundError('Prescription was not found.')
  return toPrescriptionDetailDto(prescription)
}

export async function registerPrescription(
  input: CreatePrescriptionBody,
  context: MutationContext,
): Promise<PrescriptionDetailDto> {
  const prescription = await database.client.$transaction(async (transaction) => {
    const prescribedByDoctorId = await requireActivePrescribingDoctor(
      context.actorUserId,
      transaction,
    )
    const medicalRecord = await findMedicalRecordForPrescription(
      input.medicalRecordId,
      transaction,
    )
    if (!medicalRecord) throw new NotFoundError('Medical record was not found.')
    if (medicalRecord.status !== 'final') {
      throw new ConflictError(
        'Prescriptions can only be created from a final medical record.',
      )
    }

    for (const [index, item] of input.items.entries()) {
      const medicine = await findMedicineById(item.medicineId, transaction)
      if (!medicine) {
        throw new NotFoundError('Medicine was not found.')
      }
      if (medicine.status !== 'active') {
        throw new ConflictError(
          'Inactive medicines cannot be selected for a new prescription.',
        )
      }
      if (item.unit !== medicine.inventoryUnit) {
        throw new ValidationError(
          'Prescription item unit must match the medicine inventory unit.',
          [
            {
              path: `items.${index}.unit`,
              message:
                'Prescription item unit must match the medicine inventory unit.',
            },
          ],
        )
      }
    }

    const created = await createPrescriptionRecord(
      input,
      medicalRecord.patientId,
      prescribedByDoctorId,
      transaction,
    )
    await writeAudit(
      {
        actorUserId: context.actorUserId,
        action: 'prescription.create',
        resourceType: 'prescription',
        resourceId: created.id,
        outcome: 'success',
        requestId: context.requestId,
        metadata: {
          fields: ['medicalRecordId', 'notes', 'items'].filter(
            (field) => field !== 'notes' || input.notes !== undefined,
          ),
          itemCount: input.items.length,
        },
      },
      transaction,
    )
    return created
  })
  return toPrescriptionDetailDto(prescription)
}

export async function cancelPrescription(
  id: string,
  input: CancelPrescriptionBody,
  context: MutationContext,
): Promise<PrescriptionDetailDto> {
  const prescription = await database.client.$transaction(async (transaction) => {
    const locked = await lockPrescription(id, transaction)
    if (!locked) throw new NotFoundError('Prescription was not found.')
    if (locked.status !== 'active') {
      throw new ConflictError('Only an active prescription can be cancelled.')
    }

    const updated = await cancelPrescriptionRecord(id, transaction)
    await writeAudit(
      {
        actorUserId: context.actorUserId,
        action: 'prescription.cancel',
        resourceType: 'prescription',
        resourceId: id,
        outcome: 'success',
        requestId: context.requestId,
        metadata: {
          fields: ['status'],
          cancellationReason: input.cancellationReason,
        },
      },
      transaction,
    )
    return updated
  })
  return toPrescriptionDetailDto(prescription)
}
