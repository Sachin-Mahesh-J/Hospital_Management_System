import {
  Alert,
  Button,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { Can } from '../../auth/Can'
import { Page } from '../../shared/components/Page'
import { ErrorState, LoadingState } from '../../shared/components/StateViews'
import { useNotification } from '../../shared/notifications/notificationContext'
import {
  useCollectLabSample,
  useEnterLabResult,
  useLabRequest,
} from './hooks'
import {
  canCollectSample,
  canEnterResult,
  labEmployeeLabel,
  labPatientLabel,
  labTestLabel,
  type LabRequestItem,
} from './types'

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <Stack spacing={0.5}>
      <Typography color="text.secondary" variant="body2">{label}</Typography>
      <Typography>{value || 'Not recorded'}</Typography>
    </Stack>
  )
}

function ItemActions({
  item,
  requestId,
}: {
  item: LabRequestItem
  requestId: string
}) {
  const collect = useCollectLabSample(requestId)
  const enter = useEnterLabResult(requestId)
  const { notify } = useNotification()
  const [collectError, setCollectError] = useState<string | null>(null)
  const [resultError, setResultError] = useState<string | null>(null)

  const handleCollect = async () => {
    setCollectError(null)
    try {
      await collect.mutateAsync(item.id)
      notify('Sample collection recorded.', 'success')
    } catch (caught) {
      setCollectError(
        caught instanceof ApiError
          ? caught.message
          : 'Sample collection could not be recorded.',
      )
    }
  }

  const handleResult = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setResultError(null)
    const form = new FormData(event.currentTarget)
    const resultValue = String(form.get('resultValue') ?? '').trim()
    if (!resultValue) {
      setResultError('A result value is required.')
      return
    }
    try {
      await enter.mutateAsync({
        itemId: item.id,
        input: {
          resultValue,
          resultUnit: String(form.get('resultUnit') ?? '').trim() || null,
          referenceRangeSnapshot: String(form.get('referenceRangeSnapshot') ?? '').trim() || null,
          resultNote: String(form.get('resultNote') ?? '').trim() || null,
        },
      })
      notify('Laboratory result entered.', 'success')
    } catch (caught) {
      setResultError(
        caught instanceof ApiError
          ? caught.message
          : 'The laboratory result could not be entered.',
      )
    }
  }

  const latest = item.results[item.results.length - 1]

  return (
    <Stack spacing={2}>
      <Detail label="Item status" value={item.status} />
      <Detail
        label="Collected"
        value={
          item.sampleCollectedAt
            ? `${new Date(item.sampleCollectedAt).toLocaleString()}${
              item.sampleCollectedBy
                ? ` by ${labEmployeeLabel(item.sampleCollectedBy)}`
                : ''
            }`
            : null
        }
      />
      {latest && (
        <>
          <Detail label="Result" value={latest.resultValue} />
          <Detail label="Unit" value={latest.resultUnit} />
          <Detail label="Reference range snapshot" value={latest.referenceRangeSnapshot} />
          <Detail label="Result note" value={latest.resultNote} />
          <Detail
            label="Entered"
            value={`${new Date(latest.enteredAt).toLocaleString()} by ${labEmployeeLabel(latest.enteredBy)}`}
          />
        </>
      )}
      <Can permission="lab_sample.collect">
        {canCollectSample(item.status) && (
          <Stack spacing={1}>
            {collectError && <Alert severity="error">{collectError}</Alert>}
            <Button
              disabled={collect.isPending}
              onClick={() => void handleCollect()}
              variant="outlined"
            >
              {collect.isPending ? 'Recording…' : 'Collect sample'}
            </Button>
          </Stack>
        )}
      </Can>
      <Can permission="lab_result.enter">
        {canEnterResult(item.status) && (
          <Stack component="form" spacing={1.5} onSubmit={(event) => void handleResult(event)}>
            {resultError && <Alert severity="error">{resultError}</Alert>}
            <TextField label="Result value" name="resultValue" required />
            <TextField label="Unit" name="resultUnit" />
            <TextField label="Reference range snapshot" name="referenceRangeSnapshot" />
            <TextField label="Result note" multiline name="resultNote" />
            <Button disabled={enter.isPending} type="submit" variant="contained">
              {enter.isPending ? 'Saving…' : 'Enter result'}
            </Button>
          </Stack>
        )}
      </Can>
    </Stack>
  )
}

export function LaboratoryDetailPage() {
  const { requestId = '' } = useParams()
  const query = useLabRequest(requestId)

  if (query.isLoading) return <LoadingState label="Loading laboratory request" />
  if (query.isError) {
    return (
      <ErrorState
        message={query.error instanceof ApiError ? query.error.message : 'Laboratory request could not be loaded.'}
        onRetry={() => void query.refetch()}
      />
    )
  }
  if (!query.data) return null
  const request = query.data

  return (
    <Page
      title={`Laboratory request (${request.status})`}
      description={labPatientLabel(request.patient)}
      actions={
        <Stack direction="row" spacing={1}>
          <Button component={Link} to={`/laboratory/${request.id}/report`}>
            View report
          </Button>
          <Button component={Link} to="/laboratory">All requests</Button>
        </Stack>
      }
    >
      <Paper sx={{ p: 3 }}>
        <Stack spacing={2.5}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={4}>
            <Detail label="Status" value={request.status} />
            <Detail label="Requested" value={new Date(request.requestedAt).toLocaleString()} />
          </Stack>
          <Divider />
          <Detail
            label="Requested by"
            value={`${labEmployeeLabel(request.requestedBy.employee)} (${request.requestedBy.licenseNumber})`}
          />
          <Detail label="Medical record" value={request.medicalRecordId} />
          <Detail label="Clinical note" value={request.clinicalNote} />
        </Stack>
      </Paper>
      {request.items.map((item) => (
        <Paper key={item.id} sx={{ p: 3 }}>
          <Typography component="h2" variant="h6" gutterBottom>
            {labTestLabel(item.testDefinition)}
          </Typography>
          <ItemActions item={item} requestId={request.id} />
        </Paper>
      ))}
    </Page>
  )
}
