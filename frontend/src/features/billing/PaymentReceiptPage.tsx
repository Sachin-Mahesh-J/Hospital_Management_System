import { Button, Divider, Paper, Stack, Typography } from '@mui/material'
import { Link, useParams } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { Page } from '../../shared/components/Page'
import { ErrorState, LoadingState } from '../../shared/components/StateViews'
import { useInvoice } from './hooks'
import { moneyLabel, patientLabel } from './types'

function Line({ label, value }: { label: string; value: string | null }) {
  return (
    <Stack spacing={0.25}>
      <Typography color="text.secondary" variant="body2">{label}</Typography>
      <Typography>{value || 'Not recorded'}</Typography>
    </Stack>
  )
}

export function PaymentReceiptPage() {
  const { invoiceId = '', paymentId = '' } = useParams()
  const query = useInvoice(invoiceId)

  if (query.isLoading) return <LoadingState label="Loading receipt" />
  if (query.isError) {
    return (
      <ErrorState
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
      <ErrorState
        message="Payment was not found on this invoice."
        onRetry={() => void query.refetch()}
      />
    )
  }

  return (
    <Page
      title="Payment receipt"
      description="On-screen receipt using the payment number. This is not a stored PDF."
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
          <Line label="Method" value={payment.method} />
          <Line label="Status" value={payment.status} />
          <Line label="Paid at" value={new Date(payment.paidAt).toLocaleString()} />
          <Line label="Received by" value={payment.receivedBy.username} />
          <Line label="External reference" value={payment.externalReference} />
          {payment.note && <Line label="Note" value={payment.note} />}
        </Stack>
      </Paper>
    </Page>
  )
}
