import {
  Alert,
  Button,
  Checkbox,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { Page } from '../../shared/components/Page'
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../shared/components/StateViews'
import { useNotification } from '../../shared/notifications/notificationContext'
import { useBillableSources, useBillingPatients, useCreateInvoice } from './hooks'
import {
  patientLabel,
  type BillingPatient,
  type InvoiceItemInput,
} from './types'

export function InvoiceCreatePage() {
  const navigate = useNavigate()
  const { notify } = useNotification()
  const createInvoice = useCreateInvoice()
  const [search, setSearch] = useState('')
  const [submittedSearch, setSubmittedSearch] = useState('')
  const [patient, setPatient] = useState<BillingPatient | null>(null)
  const [consultationPrices, setConsultationPrices] = useState<Record<string, string>>({})
  const [selectedConsultations, setSelectedConsultations] = useState<string[]>([])
  const [selectedLabItems, setSelectedLabItems] = useState<string[]>([])
  const [selectedDispenses, setSelectedDispenses] = useState<string[]>([])
  const [formError, setFormError] = useState<string | null>(null)

  const patientsQuery = useBillingPatients({
    page: 1,
    pageSize: 20,
    ...(submittedSearch ? { search: submittedSearch } : {}),
  })
  const sourcesQuery = useBillableSources(patient?.id ?? '', Boolean(patient))

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmittedSearch(search.trim())
  }

  const items = useMemo<InvoiceItemInput[]>(() => {
    const next: InvoiceItemInput[] = []
    for (const appointmentId of selectedConsultations) {
      next.push({
        category: 'consultation',
        appointmentId,
        unitPrice: consultationPrices[appointmentId] ?? '',
      })
    }
    for (const labRequestItemId of selectedLabItems) {
      next.push({ category: 'laboratory', labRequestItemId })
    }
    for (const dispenseRecordId of selectedDispenses) {
      next.push({ category: 'pharmacy', dispenseRecordId })
    }
    return next
  }, [consultationPrices, selectedConsultations, selectedDispenses, selectedLabItems])

  const handleCreate = async () => {
    if (!patient) {
      setFormError('Select a patient before creating an invoice.')
      return
    }
    if (items.length === 0) {
      setFormError('Select at least one billable source.')
      return
    }
    setFormError(null)
    try {
      const invoice = await createInvoice.mutateAsync({
        patientId: patient.id,
        items,
      })
      notify('Draft invoice created. Server totals are authoritative.', 'success')
      navigate(`/billing/${invoice.id}`, { replace: true })
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : 'Invoice could not be created.')
    }
  }

  return (
    <Page
      title="Create invoice"
      description="Select a patient and eligible billable sources. Laboratory and pharmacy prices are server-derived. Consultation unit price is entered here and validated by the server."
      actions={<Button component={Link} to="/billing">Cancel</Button>}
    >
      <Paper sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Typography variant="h6">Patient</Typography>
          <Stack component="form" direction={{ xs: 'column', sm: 'row' }} spacing={1} onSubmit={submitSearch}>
            <TextField
              fullWidth
              label="Search by patient number or name"
              onChange={(event) => setSearch(event.target.value)}
              value={search}
            />
            <Button type="submit" variant="outlined">Search</Button>
          </Stack>
          {patientsQuery.isLoading && <LoadingState label="Searching patients" />}
          {patientsQuery.isError && (
            <ErrorState
              message={patientsQuery.error instanceof ApiError ? patientsQuery.error.message : 'Patients could not be loaded.'}
              onRetry={() => void patientsQuery.refetch()}
            />
          )}
          {patientsQuery.data && patientsQuery.data.data.length === 0 && (
            <EmptyState title="No billing patients found" description="Search by patient number or name." />
          )}
          {patientsQuery.data && patientsQuery.data.data.length > 0 && (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Patient number</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {patientsQuery.data.data.map((row) => (
                    <TableRow key={row.id} selected={patient?.id === row.id} hover>
                      <TableCell>{row.patientNumber}</TableCell>
                      <TableCell>{row.displayName}</TableCell>
                      <TableCell>
                        <Button
                          onClick={() => {
                            setPatient(row)
                            setSelectedConsultations([])
                            setSelectedLabItems([])
                            setSelectedDispenses([])
                          }}
                          size="small"
                        >
                          {patient?.id === row.id ? 'Selected' : 'Select'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          {patient && <Alert severity="info">Selected patient: {patientLabel(patient)}</Alert>}
        </Stack>
      </Paper>

      {patient && sourcesQuery.isLoading && <LoadingState label="Loading billable sources" />}
      {patient && sourcesQuery.isError && (
        <ErrorState
          message={sourcesQuery.error instanceof ApiError ? sourcesQuery.error.message : 'Billable sources could not be loaded.'}
          onRetry={() => void sourcesQuery.refetch()}
        />
      )}
      {patient && sourcesQuery.data && (
        <Stack spacing={2}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6">Consultations</Typography>
            {sourcesQuery.data.consultations.length === 0 && (
              <EmptyState title="No completed appointments" description="Only completed appointments can be billed." />
            )}
            {sourcesQuery.data.consultations.map((source) => (
              <Stack key={source.appointmentId} direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ py: 1 }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flex: 1 }}>
                  <Checkbox
                    checked={selectedConsultations.includes(source.appointmentId)}
                    onChange={(event) => {
                      setSelectedConsultations((current) =>
                        event.target.checked
                          ? [...current, source.appointmentId]
                          : current.filter((id) => id !== source.appointmentId),
                      )
                    }}
                  />
                  <Typography>
                    {new Date(source.startsAt).toLocaleString()} — {source.doctorDisplayName}
                    {source.billed ? ` (already on ${source.billedInvoiceNumber})` : ''}
                  </Typography>
                </Stack>
                <TextField
                  label="Unit price"
                  onChange={(event) => {
                    setConsultationPrices((current) => ({
                      ...current,
                      [source.appointmentId]: event.target.value,
                    }))
                  }}
                  sx={{ maxWidth: 200 }}
                  value={consultationPrices[source.appointmentId] ?? ''}
                />
              </Stack>
            ))}
          </Paper>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6">Laboratory</Typography>
            {sourcesQuery.data.laboratoryItems.length === 0 && (
              <EmptyState title="No billable laboratory items" description="Completed tests with a catalog price can be billed once." />
            )}
            {sourcesQuery.data.laboratoryItems.map((source) => (
              <Stack key={source.labRequestItemId} direction="row" spacing={1} sx={{ alignItems: 'center', py: 1 }}>
                <Checkbox
                  checked={selectedLabItems.includes(source.labRequestItemId)}
                  disabled={source.billed}
                  onChange={(event) => {
                    setSelectedLabItems((current) =>
                      event.target.checked
                        ? [...current, source.labRequestItemId]
                        : current.filter((id) => id !== source.labRequestItemId),
                    )
                  }}
                />
                <Typography>
                  {source.testCode} {source.testName} — {source.unitPrice} {source.currency}
                  {source.billed ? ` (billed on ${source.billedInvoiceNumber})` : ''}
                </Typography>
              </Stack>
            ))}
          </Paper>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6">Pharmacy</Typography>
            {sourcesQuery.data.dispenses.length === 0 && (
              <EmptyState title="No billable dispenses" description="Unreversed completed dispenses can be billed once." />
            )}
            {sourcesQuery.data.dispenses.map((source) => (
              <Stack key={source.dispenseRecordId} direction="row" spacing={1} sx={{ alignItems: 'center', py: 1 }}>
                <Checkbox
                  checked={selectedDispenses.includes(source.dispenseRecordId)}
                  disabled={source.billed}
                  onChange={(event) => {
                    setSelectedDispenses((current) =>
                      event.target.checked
                        ? [...current, source.dispenseRecordId]
                        : current.filter((id) => id !== source.dispenseRecordId),
                    )
                  }}
                />
                <Typography>
                  {source.medicineCode} {source.medicineName} × {source.quantity} {source.unit} — {source.unitPrice} {source.currency}
                  {source.billed ? ` (billed on ${source.billedInvoiceNumber})` : ''}
                </Typography>
              </Stack>
            ))}
          </Paper>
        </Stack>
      )}

      {formError && <Alert severity="error">{formError}</Alert>}
      <Stack direction="row" spacing={1}>
        <Button
          disabled={createInvoice.isPending}
          onClick={() => void handleCreate()}
          variant="contained"
        >
          {createInvoice.isPending ? 'Creating…' : 'Create draft invoice'}
        </Button>
      </Stack>
    </Page>
  )
}
