import {
  addCalendarDays,
  formatHospitalDateTime,
  hospitalDateTimeToOffsetIso,
  hospitalToday,
} from '../../shared/datetime/hospitalTime'
import {
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Pagination,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
} from '@mui/material'
import { useMemo, useState, type FormEvent } from 'react'
import { ApiError } from '../../api/client'
import { FilterBar } from '../../shared/components/FilterBar'
import { filterControlSx } from '../../shared/components/layoutSx'
import { Page } from '../../shared/components/Page'
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../shared/components/StateViews'
import { useNotification } from '../../shared/notifications/notificationContext'
import { useAudit, useExportAudit } from './hooks'
import { auditOutcomes, type AuditOutcome } from './types'

function defaultRange(): { from: string; to: string } {
  const today = hospitalToday()
  const from = addCalendarDays(today, -7)
  return {
    from: hospitalDateTimeToOffsetIso(`${from}T00:00`),
    to: hospitalDateTimeToOffsetIso(`${today}T23:59`),
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function AuditListPage() {
  const initial = useMemo(() => defaultRange(), [])
  const [page, setPage] = useState(1)
  const [occurredFrom, setOccurredFrom] = useState(initial.from)
  const [occurredTo, setOccurredTo] = useState(initial.to)
  const [actorUserId, setActorUserId] = useState('')
  const [action, setAction] = useState('')
  const [resourceType, setResourceType] = useState('')
  const [outcome, setOutcome] = useState<AuditOutcome | ''>('')
  const [requestId, setRequestId] = useState('')
  const { notify } = useNotification()
  const exporter = useExportAudit()
  const filters = {
    page,
    pageSize: 20,
    occurredFrom,
    occurredTo,
    ...(actorUserId ? { actorUserId } : {}),
    ...(action ? { action } : {}),
    ...(resourceType ? { resourceType } : {}),
    ...(outcome ? { outcome } : {}),
    ...(requestId ? { requestId } : {}),
  }
  const query = useAudit(filters)

  const submitFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const fromLocal = String(form.get('occurredFrom') ?? '')
    const toLocal = String(form.get('occurredTo') ?? '')
    if (!fromLocal || !toLocal) {
      notify('A bounded date/time range is required.', 'error')
      return
    }
    setOccurredFrom(hospitalDateTimeToOffsetIso(fromLocal))
    setOccurredTo(hospitalDateTimeToOffsetIso(toLocal))
    setActorUserId(String(form.get('actorUserId') ?? '').trim())
    setAction(String(form.get('action') ?? '').trim())
    setResourceType(String(form.get('resourceType') ?? '').trim())
    setOutcome(String(form.get('outcome') ?? '') as AuditOutcome | '')
    setRequestId(String(form.get('requestId') ?? '').trim())
    setPage(1)
  }

  const exportFilters = {
    occurredFrom,
    occurredTo,
    ...(actorUserId ? { actorUserId } : {}),
    ...(action ? { action } : {}),
    ...(resourceType ? { resourceType } : {}),
    ...(outcome ? { outcome } : {}),
    ...(requestId ? { requestId } : {}),
  }

  const runExport = async (format: 'csv' | 'pdf') => {
    try {
      const blob = await exporter.mutateAsync({ filters: exportFilters, format })
      downloadBlob(blob, `audit-export.${format}`)
      notify('Audit export generated.', 'success')
    } catch (error) {
      notify(error instanceof ApiError ? error.message : 'Export failed.', 'error')
    }
  }

  return (
    <Page
      help="CSV and PDF exports use the current filters, including the required date range. Files are generated on demand and are not stored."
      helpLabel="Audit export"
      title="Audit records"
      description="Read-only audit log."
      actions={
        <Stack direction="row" spacing={1}>
          <Button disabled={exporter.isPending} onClick={() => void runExport('csv')} variant="outlined">
            Export CSV
          </Button>
          <Button disabled={exporter.isPending} onClick={() => void runExport('pdf')} variant="outlined">
            Export PDF
          </Button>
        </Stack>
      }
    >
      <FilterBar>
        <Stack component="form" spacing={2} onSubmit={submitFilters} sx={{ flex: '1 1 100%', minWidth: 0, width: '100%' }}>
          <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: 'wrap', width: '100%' }}>
            <TextField
              label="From"
              name="occurredFrom"
              required
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
              sx={filterControlSx}
              type="datetime-local"
            />
            <TextField
              label="To"
              name="occurredTo"
              required
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
              sx={filterControlSx}
              type="datetime-local"
            />
            <FormControl size="small" sx={filterControlSx}>
              <InputLabel id="audit-outcome">Outcome</InputLabel>
              <Select defaultValue="" label="Outcome" labelId="audit-outcome" name="outcome">
                <MenuItem value="">All outcomes</MenuItem>
                {auditOutcomes.map((value) => (
                  <MenuItem key={value} value={value}>{value}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
          <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: 'wrap', width: '100%' }}>
            <TextField label="Actor user ID" name="actorUserId" size="small" sx={filterControlSx} />
            <TextField label="Action" name="action" size="small" sx={filterControlSx} />
            <TextField label="Resource type" name="resourceType" size="small" sx={filterControlSx} />
            <TextField label="Request ID" name="requestId" size="small" sx={filterControlSx} />
            <Button type="submit" variant="contained">Apply filters</Button>
          </Stack>
        </Stack>
      </FilterBar>
      {query.isLoading && <LoadingState label="Loading audit records" />}
      {query.isError && (
        <ErrorState
          message={query.error instanceof ApiError ? query.error.message : 'Audit records could not be loaded.'}
          onRetry={() => void query.refetch()}
        />
      )}
      {query.data && query.data.data.length === 0 && (
        <EmptyState
          description="No audit events match the required date range and filters. Widen the range or clear optional filters."
          title="No audit records"
        />
      )}
      {query.data && query.data.data.length > 0 && (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>Actor</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>Resource</TableCell>
                  <TableCell>Request ID</TableCell>
                  <TableCell>Outcome</TableCell>
                  <TableCell>Metadata</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {query.data.data.map((row) => (
                  <TableRow hover key={row.id}>
                    <TableCell>{formatHospitalDateTime(row.occurredAt)}</TableCell>
                    <TableCell>{row.actorUsername ?? row.actorUserId ?? '—'}</TableCell>
                    <TableCell>{row.action}</TableCell>
                    <TableCell>
                      {row.resourceType}
                      {row.resourceId ? ` ${row.resourceId}` : ''}
                    </TableCell>
                    <TableCell>{row.requestId ?? '—'}</TableCell>
                    <TableCell>{row.outcome}</TableCell>
                    <TableCell>
                      {Object.keys(row.metadata).length === 0
                        ? '—'
                        : Object.entries(row.metadata)
                          .map(([key, value]) => `${key}=${Array.isArray(value) ? value.join(',') : String(value)}`)
                          .join('; ')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Pagination
            count={Math.max(query.data.pagination.totalPages, 1)}
            onChange={(_event, value) => setPage(value)}
            page={page}
            sx={{ alignSelf: 'center' }}
          />
        </>
      )}
    </Page>
  )
}
