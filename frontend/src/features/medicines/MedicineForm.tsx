import { Alert, Button, Paper, Stack, TextField } from '@mui/material'
import { useState, type FormEvent } from 'react'
import { ApiError } from '../../api/client'
import { FormSection } from '../../shared/components/FormSection'
import type { Medicine, MedicineInput, MedicineUpdate } from './types'

type MedicineFormProps = {
  medicine?: Medicine
  isPending: boolean
  onSubmit: (input: MedicineInput | MedicineUpdate) => Promise<void>
  submitLabel: string
}

function optional(form: FormData, name: string): string | null {
  const value = String(form.get(name) ?? '').trim()
  return value || null
}

export function MedicineForm({
  medicine,
  isPending,
  onSubmit,
  submitLabel,
}: MedicineFormProps) {
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    const form = new FormData(event.currentTarget)
    const input: MedicineInput = {
      code: String(form.get('code') ?? '').trim(),
      genericName: String(form.get('genericName') ?? '').trim(),
      brandName: optional(form, 'brandName'),
      dosageForm: String(form.get('dosageForm') ?? '').trim(),
      strength: optional(form, 'strength'),
      inventoryUnit: String(form.get('inventoryUnit') ?? '').trim(),
      currency: String(form.get('currency') ?? '').trim().toUpperCase(),
      defaultSalePrice: String(form.get('defaultSalePrice') ?? '').trim() || undefined,
      lowStockThreshold: String(form.get('lowStockThreshold') ?? '').trim() || undefined,
    }
    try {
      await onSubmit(input)
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'The medicine could not be saved.',
      )
    }
  }

  return (
    <Paper sx={{ p: { xs: 2, md: 3 } }}>
      <Stack component="form" spacing={2.5} onSubmit={(event) => void handleSubmit(event)}>
        {error && <Alert severity="error">{error}</Alert>}
        <FormSection title="Medicine information">
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField
            defaultValue={medicine?.code ?? ''}
            fullWidth
            label="Code"
            name="code"
            required
            slotProps={{ htmlInput: { maxLength: 50 } }}
          />
          <TextField
            defaultValue={medicine?.genericName ?? ''}
            fullWidth
            label="Generic name"
            name="genericName"
            required
            slotProps={{ htmlInput: { maxLength: 200 } }}
          />
        </Stack>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField
            defaultValue={medicine?.brandName ?? ''}
            fullWidth
            label="Brand name"
            name="brandName"
            slotProps={{ htmlInput: { maxLength: 200 } }}
          />
          <TextField
            defaultValue={medicine?.strength ?? ''}
            fullWidth
            label="Strength"
            name="strength"
            slotProps={{ htmlInput: { maxLength: 100 } }}
          />
        </Stack>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField
            defaultValue={medicine?.dosageForm ?? ''}
            fullWidth
            label="Dosage form"
            name="dosageForm"
            required
            slotProps={{ htmlInput: { maxLength: 100 } }}
          />
          <TextField
            defaultValue={medicine?.inventoryUnit ?? ''}
            fullWidth
            label="Inventory unit"
            name="inventoryUnit"
            required
            slotProps={{ htmlInput: { maxLength: 30 } }}
          />
          <TextField
            defaultValue={medicine?.currency ?? 'LKR'}
            fullWidth
            label="Currency"
            name="currency"
            required
            slotProps={{ htmlInput: { maxLength: 3 } }}
          />
        </Stack>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField
            defaultValue={medicine?.defaultSalePrice ?? '0'}
            fullWidth
            label="Default sale price"
            name="defaultSalePrice"
          />
          <TextField
            defaultValue={medicine?.lowStockThreshold ?? '0'}
            fullWidth
            label="Low-stock threshold"
            name="lowStockThreshold"
          />
        </Stack>
        </FormSection>
        <Button disabled={isPending} type="submit" variant="contained">
          {isPending ? 'Saving…' : submitLabel}
        </Button>
      </Stack>
    </Paper>
  )
}
