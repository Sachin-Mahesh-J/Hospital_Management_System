import { formatHospitalDateTime } from '../../shared/datetime/hospitalTime'
import { Button, Divider, Paper, Stack, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { Page, PageError, PageLoading } from '../../shared/components/Page'
import { StatusChip } from '../../shared/components/StatusChip'
import { useInvoice } from './hooks'
import { moneyLabel, patientLabel } from './types'

function Line({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Stack spacing={0.25}>
      <Typography color="text.secondary" variant="body2">{label}</Typography>
      {typeof value === 'string' || value == null ? (
        <Typography>{value || 'Not recorded'}</Typography>
      ) : (
        value
      )}
    </Stack>
  )
}

export function PaymentReceiptPage() {
  const { invoiceId = '', paymentId = '' } = useParams()
  const query = useInvoice(invoiceId)

  if (query.isLoading) {
    return <PageLoading title="Payment receipt" label="Loading receipt information..." />
  }
  if (query.isError) {
    return (
      <PageError
        title="Payment receipt"
        message={query.error instanceof ApiError ? query.error.message : 'Receipt could not be loaded.'}
        onRetry={() => void query.refetch()}
      />
    )
  }
  if (!query.data) return null

  const invoice = query.data
  const payment = invoice.payments.find((item) => item.id === paymentId)
  if (!payment) {
    return (
      <PageError
        title="Payment receipt"
        message="Payment was not found on this invoice."
        onRetry={() => void query.refetch()}
      />
    )
  }

  return (
    <Page
      title="Payment receipt"
      description="On-screen receipt using the payment number. This view is read-only. Reverse a payment from the invoice detail page."
      actions={
        <Stack className="no-print" direction="row" spacing={1}>
          <Button onClick={() => window.print()} variant="contained">
            Print receipt
          </Button>
          <Button component={Link} to={`/billing/${invoice.id}`}>
            Back to invoice
          </Button>
        </Stack>
      }
    >
      <style>
        {`
          @media print {
            header, nav, .no-print { display: none !important; }
            main { padding: 0 !important; max-width: none !important; }
          }
        `}
      </style>
      <Paper sx={{ p: 4 }}>
        <Stack spacing={2}>
          <Typography variant="h5">Payment receipt</Typography>
          <Line label="Receipt / payment number" value={payment.paymentNumber} />
          <Line label="Invoice number" value={invoice.invoiceNumber} />
          <Line label="Patient" value={patientLabel(invoice.patient)} />
          <Divider />
          <Line label="Amount" value={moneyLabel(payment.amount, payment.currency)} />
          <Line label="Method" value={<StatusChip value={payment.method} />} />
          <Line label="Status" value={<StatusChip value={payment.status} />} />
          <Line label="Paid at" value={formatHospitalDateTime(payment.paidAt)} />
          <Line label="Received by" value={payment.receivedBy.username} />
          <Line label="External reference" value={payment.externalReference} />
          {payment.note && <Line label="Note" value={payment.note} />}
        </Stack>
      </Paper>
    </Page>
  )
}
