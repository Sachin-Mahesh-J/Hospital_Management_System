import { formatHospitalDateTime } from '../../shared/datetime/hospitalTime'
import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
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
  Typography,
} from '@mui/material'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { Can } from '../../auth/Can'
import { ContextHelp } from '../../shared/components/ContextHelp'
import { FormSection } from '../../shared/components/FormSection'
import { Page, PageError, PageLoading } from '../../shared/components/Page'
import { StatusChip } from '../../shared/components/StatusChip'
import { LoadingState } from '../../shared/components/StateViews'
import { useNotification } from '../../shared/notifications/notificationContext'
import {
  useCreatePayment,
  useInvoice,
  useIssueInvoice,
  useReversePayment,
  useUpdateInvoice,
  useVoidInvoice,
  useBillableSources,
} from './hooks'
import {
  moneyLabel,
  patientLabel,
  paymentMethods,
  type InvoiceItemInput,
  type PaymentMethod,
} from './types'

export function InvoiceDetailPage() {
  const { invoiceId = '' } = useParams()
  const query = useInvoice(invoiceId)
  const issue = useIssueInvoice()
  const voidInvoice = useVoidInvoice()
  const createPayment = useCreatePayment(invoiceId)
  const reverse = useReversePayment(invoiceId)
  const updateInvoice = useUpdateInvoice(invoiceId)
  const sourcesQuery = useBillableSources(query.data?.patient.id ?? '', query.data?.status === 'draft')
  const { notify } = useNotification()
  const [voidReason, setVoidReason] = useState('')
  const [voidOpen, setVoidOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [externalReference, setExternalReference] = useState('')
  const [reverseReason, setReverseReason] = useState('')
  const [reversePaymentId, setReversePaymentId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [consultationPrices, setConsultationPrices] = useState<Record<string, string>>({})
  const [selectedConsultations, setSelectedConsultations] = useState<string[]>([])
  const [selectedLabItems, setSelectedLabItems] = useState<string[]>([])
  const [selectedDispenses, setSelectedDispenses] = useState<string[]>([])

  if (query.isLoading) {
    return <PageLoading title="Invoice" label="Loading invoice information..." />
  }
  if (query.isError) {
    return (
      <PageError
        title="Invoice"
        message={query.error instanceof ApiError ? query.error.message : 'Invoice could not be loaded.'}
        onRetry={() => void query.refetch()}
      />
    )
  }
  if (!query.data) return null
  const invoice = query.data
  const isDraft = invoice.status === 'draft'
  const isVoid = invoice.status === 'void'
  const canPay = invoice.status === 'issued' || invoice.status === 'partially_paid'

  const run = async (work: () => Promise<unknown>, success: string) => {
    setActionError(null)
    try {
      await work()
      notify(success, 'success')
      await query.refetch()
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : success.replace('successfully.', 'failed.'))
    }
  }

  return (
    <Page
      help="Voiding marks the invoice void with a reason; it does not delete line items. Issued invoices cannot be edited—create a new invoice after void if needed."
      helpLabel="Invoice voiding"
      title={invoice.invoiceNumber}
      description="Issued invoices cannot be edited."
      actions={
        <Stack className="no-print" direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
          <Button component={Link} to="/billing">Back to invoices</Button>
          <Can permission="invoice.issue">
            {isDraft && (
              <Button
                disabled={issue.isPending}
                onClick={() => void run(() => issue.mutateAsync(invoice.id), 'Invoice issued.')}
                variant="contained"
              >
                Issue invoice
              </Button>
            )}
          </Can>
          <Can permission="invoice.void">
            {!isVoid && (
              <Button color="error" onClick={() => setVoidOpen(true)} variant="outlined">
                Void invoice
              </Button>
            )}
          </Can>
        </Stack>
      }
    >
      {actionError && <Alert severity="error">{actionError}</Alert>}
      <Paper sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Typography><strong>Patient:</strong> {patientLabel(invoice.patient)}</Typography>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Typography><strong>Status:</strong></Typography>
            <StatusChip value={invoice.status} />
          </Stack>
          <Typography><strong>Currency:</strong> {invoice.currency}</Typography>
          <Typography><strong>Created by:</strong> {invoice.createdBy.username}</Typography>
          <Typography><strong>Created:</strong> {formatHospitalDateTime(invoice.createdAt)}</Typography>
        </Stack>
      </Paper>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Category</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Quantity</TableCell>
              <TableCell>Unit price</TableCell>
              <TableCell>Line total</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {invoice.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.category}</TableCell>
                <TableCell>{item.description}</TableCell>
                <TableCell>{item.quantity}</TableCell>
                <TableCell>{item.unitPrice}</TableCell>
                <TableCell>{item.lineTotal}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Paper sx={{ p: 3 }}>
        <Stack spacing={1}>
          <Typography>Subtotal: {moneyLabel(invoice.subtotal, invoice.currency)}</Typography>
          <Typography>Discount: {moneyLabel(invoice.discountAmount, invoice.currency)}</Typography>
          <Typography>Tax: {moneyLabel(invoice.taxAmount, invoice.currency)}</Typography>
          <Typography variant="h6">Total: {moneyLabel(invoice.totalAmount, invoice.currency)}</Typography>
          <Typography>Paid: {moneyLabel(invoice.amountPaid, invoice.currency)}</Typography>
          <Typography>Balance: {moneyLabel(invoice.balanceAmount, invoice.currency)}</Typography>
        </Stack>
      </Paper>
      <Can permission="invoice.update">
        {isDraft && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Edit draft items</Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              Replace draft lines and save. Issued invoices cannot be edited.
            </Typography>
            {sourcesQuery.isLoading && <LoadingState label="Loading billable sources" />}
            {sourcesQuery.data?.consultations.map((source) => (
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
                    {formatHospitalDateTime(source.startsAt)} — {source.doctorDisplayName}
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
            {sourcesQuery.data?.laboratoryItems.map((source) => (
              <Stack key={source.labRequestItemId} direction="row" spacing={1} sx={{ alignItems: 'center', py: 1 }}>
                <Checkbox
                  checked={selectedLabItems.includes(source.labRequestItemId)}
                  disabled={source.billed && source.billedInvoiceId !== invoice.id}
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
                </Typography>
              </Stack>
            ))}
            {sourcesQuery.data?.dispenses.map((source) => (
              <Stack key={source.dispenseRecordId} direction="row" spacing={1} sx={{ alignItems: 'center', py: 1 }}>
                <Checkbox
                  checked={selectedDispenses.includes(source.dispenseRecordId)}
                  disabled={source.billed && source.billedInvoiceId !== invoice.id}
                  onChange={(event) => {
                    setSelectedDispenses((current) =>
                      event.target.checked
                        ? [...current, source.dispenseRecordId]
                        : current.filter((id) => id !== source.dispenseRecordId),
                    )
                  }}
                />
                <Typography>
                  {source.medicineCode} {source.medicineName} × {source.quantity} {source.unit}
                </Typography>
              </Stack>
            ))}
            <Button
              disabled={updateInvoice.isPending}
              onClick={() => {
                const items: InvoiceItemInput[] = [
                  ...selectedConsultations.map((appointmentId) => ({
                    category: 'consultation' as const,
                    appointmentId,
                    unitPrice: consultationPrices[appointmentId] ?? '',
                  })),
                  ...selectedLabItems.map((labRequestItemId) => ({
                    category: 'laboratory' as const,
                    labRequestItemId,
                  })),
                  ...selectedDispenses.map((dispenseRecordId) => ({
                    category: 'pharmacy' as const,
                    dispenseRecordId,
                  })),
                ]
                void run(() => updateInvoice.mutateAsync(items), 'Draft invoice updated.')
              }}
              sx={{ mt: 2 }}
              variant="outlined"
            >
              Save draft items
            </Button>
          </Paper>
        )}
      </Can>
      <Can permission="payment.create">
        {canPay && (
          <Paper sx={{ p: 3 }}>
            <FormSection title="Record payment">
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: { md: 'flex-end' } }}>
              <TextField
                label="Amount"
                onChange={(event) => setAmount(event.target.value)}
                value={amount}
              />
              <FormControl sx={{ minWidth: 180 }}>
                <InputLabel id="payment-method">Method</InputLabel>
                <Select
                  label="Method"
                  labelId="payment-method"
                  onChange={(event) => setMethod(event.target.value as PaymentMethod)}
                  value={method}
                >
                  {paymentMethods.map((value) => (
                    <MenuItem key={value} value={value}>{value}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="External reference"
                onChange={(event) => setExternalReference(event.target.value)}
                value={externalReference}
              />
              <Button
                disabled={createPayment.isPending}
                onClick={() =>
                  void run(
                    () => createPayment.mutateAsync({
                      amount,
                      method,
                      ...(externalReference.trim()
                        ? { externalReference: externalReference.trim() }
                        : {}),
                    }),
                    'Payment recorded.',
                  )
                }
                variant="contained"
              >
                Record payment
              </Button>
            </Stack>
            </FormSection>
          </Paper>
        )}
      </Can>
      <Paper sx={{ p: 3 }}>
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', mb: 1 }}>
          <Typography component="h2" variant="h6">Payments</Typography>
          <ContextHelp
            description="Each payment can be reversed while recorded and not already a reversal. Reversal requires a reason and updates invoice balances. Reversals create a compensating row; they do not delete the original payment."
            label="Payment reversal"
          />
        </Stack>
        {invoice.payments.length === 0 && (
          <Typography color="text.secondary">No payments recorded.</Typography>
        )}
        {invoice.payments.map((payment) => (
          <Stack key={payment.id} spacing={1} sx={{ py: 1 }}>
            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
              <Typography>
                {payment.paymentNumber} — {moneyLabel(payment.amount, payment.currency)}
              </Typography>
              <StatusChip value={payment.method} />
              <StatusChip value={payment.status} />
            </Stack>
            <Typography color="text.secondary" variant="body2">
              {formatHospitalDateTime(payment.paidAt)} by {payment.receivedBy.username}
              {payment.reversesPaymentId ? ' (reversal)' : ''}
            </Typography>
            <Stack direction="row" spacing={1}>
              <Can permission="payment.read">
                <Button
                  component={Link}
                  size="small"
                  to={`/billing/${invoice.id}/payments/${payment.id}`}
                >
                  Receipt
                </Button>
              </Can>
              <Can permission="payment.reverse">
                {payment.status === 'recorded' && !payment.reversesPaymentId && !isVoid && (
                  <Button
                    color="error"
                    onClick={() => setReversePaymentId(payment.id)}
                    size="small"
                    variant="outlined"
                  >
                    Reverse
                  </Button>
                )}
              </Can>
            </Stack>
            <Divider />
          </Stack>
        ))}
      </Paper>

      <Dialog open={voidOpen} onClose={() => setVoidOpen(false)}>
        <DialogTitle>Void invoice</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Reason"
            margin="normal"
            multiline
            onChange={(event) => setVoidReason(event.target.value)}
            value={voidReason}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVoidOpen(false)}>Cancel</Button>
          <Button
            color="error"
            disabled={voidInvoice.isPending}
            onClick={() => {
              void run(async () => {
                await voidInvoice.mutateAsync({ id: invoice.id, reason: voidReason })
                setVoidOpen(false)
                setVoidReason('')
              }, 'Invoice voided.')
            }}
          >
            Void
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(reversePaymentId)} onClose={() => setReversePaymentId(null)}>
        <DialogTitle>Reverse payment</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Reason"
            margin="normal"
            multiline
            onChange={(event) => setReverseReason(event.target.value)}
            value={reverseReason}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReversePaymentId(null)}>Cancel</Button>
          <Button
            color="error"
            disabled={reverse.isPending || !reversePaymentId}
            onClick={() => {
              const paymentId = reversePaymentId
              if (!paymentId) return
              void run(async () => {
                await reverse.mutateAsync({ paymentId, reason: reverseReason })
                setReversePaymentId(null)
                setReverseReason('')
              }, 'Payment reversed.')
            }}
          >
            Reverse
          </Button>
        </DialogActions>
      </Dialog>
    </Page>
  )
}
