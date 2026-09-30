import { describe, expect, it } from 'vitest'
import { detectDocumentMediaType } from '../src/modules/documents/document.constants.js'
import { createDocumentMetaSchema } from '../src/modules/documents/document.schemas.js'
import { sanitizeAuditMetadata } from '../src/modules/audit/audit.sanitize.js'
import { listAuditQuerySchema } from '../src/modules/audit/audit.schemas.js'
import { createUserBodySchema } from '../src/modules/users/user.schemas.js'

describe('document media detection', () => {
  it('detects PDF, JPEG, and PNG magic bytes and rejects others', () => {
    expect(detectDocumentMediaType(Buffer.from('%PDF-1.4\n'))).toBe('application/pdf')
    expect(detectDocumentMediaType(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe(
      'image/jpeg',
    )
    expect(
      detectDocumentMediaType(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      ),
    ).toBe('image/png')
    expect(detectDocumentMediaType(Buffer.from('not-a-document'))).toBeNull()
  })

  it('rejects unknown document categories', () => {
    expect(() =>
      createDocumentMetaSchema.parse({ title: 'Scan', category: 'xray' }),
    ).toThrow()
    expect(
      createDocumentMetaSchema.parse({
        title: ' Scan ',
        category: 'medical_report',
      }),
    ).toMatchObject({ title: 'Scan' })
  })
})

describe('audit sanitization and filters', () => {
  it('drops sensitive metadata keys', () => {
    expect(
      sanitizeAuditMetadata({
        fields: ['status'],
        password: 'secret',
        signedUrl: 'https://example/secret',
        resultValue: '12.4',
        from: 'pending',
        to: 'approved',
      }),
    ).toEqual({
      fields: ['status'],
      from: 'pending',
      to: 'approved',
    })
  })

  it('requires a bounded datetime range', () => {
    expect(() => listAuditQuerySchema.parse({})).toThrow()
    expect(
      listAuditQuerySchema.parse({
        occurredFrom: '2026-09-01T00:00:00.000Z',
        occurredTo: '2026-09-08T00:00:00.000Z',
        outcome: 'success',
      }),
    ).toMatchObject({ outcome: 'success', page: 1 })
  })
})

describe('user administration schemas', () => {
  it('requires a catalog role and password policy', () => {
    expect(() =>
      createUserBodySchema.parse({
        username: 'new.user',
        password: 'short',
        roleCode: 'administrator',
      }),
    ).toThrow()
    expect(() =>
      createUserBodySchema.parse({
        username: 'new.user',
        password: 'Valid password 42',
        roleCode: 'superuser',
      }),
    ).toThrow()
    expect(
      createUserBodySchema.parse({
        username: ' new.user ',
        password: 'Valid password 42',
        roleCode: 'receptionist',
      }),
    ).toMatchObject({ username: 'new.user', roleCode: 'receptionist' })
  })
})
