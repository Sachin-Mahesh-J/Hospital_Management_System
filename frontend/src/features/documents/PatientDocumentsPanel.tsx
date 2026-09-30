import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
  Typography,
} from '@mui/material'
import { useState, type FormEvent } from 'react'
import { ApiError } from '../../api/client'
import { Can } from '../../auth/Can'
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../shared/components/StateViews'
import { useNotification } from '../../shared/notifications/notificationContext'
import {
  useAccessDocument,
  useDeleteDocument,
  useDocuments,
  useUpdateDocument,
  useUploadDocument,
} from './hooks'
import {
  documentCategories,
  documentCategoryLabels,
  type DocumentCategory,
  type PatientDocument,
} from './types'

const MAX_BYTES = 10 * 1024 * 1024

export function PatientDocumentsPanel({ patientId }: { patientId: string }) {
  const [page, setPage] = useState(1)
  const [category, setCategory] = useState<DocumentCategory | ''>('')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [editing, setEditing] = useState<PatientDocument | null>(null)
  const query = useDocuments(patientId, {
    page,
    pageSize: 20,
    ...(category ? { category } : {}),
  })
  const upload = useUploadDocument(patientId)
  const update = useUpdateDocument(patientId)
  const remove = useDeleteDocument(patientId)
  const access = useAccessDocument(patientId)
  const { notify } = useNotification()

  const submitUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const file = data.get('file')
    if (!(file instanceof File) || file.size === 0) {
      notify('Select a PDF, JPEG, or PNG file.', 'error')
      return
    }
    if (file.size > MAX_BYTES) {
      notify('Files larger than 10 MB are not accepted.', 'error')
      return
    }
    try {
      await upload.mutateAsync(data)
      notify('Document uploaded. The stored file cannot be replaced; upload a new document if needed.', 'success')
      setUploadOpen(false)
      form.reset()
    } catch (error) {
      notify(error instanceof ApiError ? error.message : 'Upload failed.', 'error')
    }
  }

  const submitMetadata = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editing) return
    const form = new FormData(event.currentTarget)
    try {
      await update.mutateAsync({
        documentId: editing.id,
        input: {
          title: String(form.get('title') ?? '').trim(),
          category: String(form.get('category')) as DocumentCategory,
          description: String(form.get('description') || '').trim() || null,
        },
      })
      notify('Document metadata updated.', 'success')
      setEditing(null)
    } catch (error) {
      notify(error instanceof ApiError ? error.message : 'Metadata could not be saved.', 'error')
    }
  }

  const openDocument = async (document: PatientDocument) => {
    try {
      const result = await access.mutateAsync(document.id)
      window.open(result.url, '_blank', 'noopener,noreferrer')
    } catch (error) {
      notify(error instanceof ApiError ? error.message : 'Document access failed.', 'error')
    }
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', mb: 2 }}>
        <Stack spacing={0.5}>
          <Typography component="h2" variant="h6">Patient documents</Typography>
          <Typography color="text.secondary" variant="body2">
            PDF, JPEG, and PNG up to 10 MB. Duplicate files are allowed. Soft-delete only.
            Malware scanning is not implemented.
          </Typography>
        </Stack>
        <Can permission="patient_document.create">
          <Button onClick={() => setUploadOpen(true)} variant="contained">Upload document</Button>
        </Can>
      </Stack>
      <FormControl size="small" sx={{ minWidth: 220, mb: 2 }}>
        <InputLabel id="document-category">Category</InputLabel>
        <Select
          label="Category"
          labelId="document-category"
          onChange={(event) => {
            setCategory(event.target.value as DocumentCategory | '')
            setPage(1)
          }}
          value={category}
        >
          <MenuItem value="">All categories</MenuItem>
          {documentCategories.map((value) => (
            <MenuItem key={value} value={value}>{documentCategoryLabels[value]}</MenuItem>
          ))}
        </Select>
      </FormControl>
      {query.isLoading && <LoadingState label="Loading documents" />}
      {query.isError && (
        <ErrorState
          message={query.error instanceof ApiError ? query.error.message : 'Documents could not be loaded.'}
          onRetry={() => void query.refetch()}
        />
      )}
      {query.data && query.data.data.length === 0 && (
        <EmptyState title="No documents" description="Upload a PDF, JPEG, or PNG, or change the category filter." />
      )}
      {query.data && query.data.data.length > 0 && (
        <>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Title</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Size</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {query.data.data.map((document) => (
                  <TableRow hover key={document.id}>
                    <TableCell>{document.title}</TableCell>
                    <TableCell>
                      {documentCategoryLabels[document.category as DocumentCategory] ?? document.category}
                    </TableCell>
                    <TableCell>{document.detectedMediaType}</TableCell>
                    <TableCell>{document.sizeBytes} bytes</TableCell>
                    <TableCell align="right">
                      <Button onClick={() => void openDocument(document)} size="small">Open</Button>
                      <Can permission="patient_document.update">
                        <Button onClick={() => setEditing(document)} size="small">Metadata</Button>
                      </Can>
                      <Can permission="patient_document.delete">
                        <Button
                          onClick={() => void remove.mutateAsync(document.id).then(
                            () => notify('Document soft-deleted.', 'success'),
                            (error: unknown) => notify(error instanceof ApiError ? error.message : 'Delete failed.', 'error'),
                          )}
                          size="small"
                        >
                          Delete
                        </Button>
                      </Can>
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
            sx={{ alignSelf: 'center', mt: 2 }}
          />
        </>
      )}
      <Dialog fullWidth maxWidth="sm" onClose={() => setUploadOpen(false)} open={uploadOpen}>
        <DialogTitle>Upload document</DialogTitle>
        <Stack component="form" onSubmit={(event) => void submitUpload(event)}>
          <DialogContent>
            <Stack spacing={2}>
              <Alert severity="info">
                The stored file is immutable. Upload a new document to replace a file.
                Browser file type is not trusted; the server inspects the file signature.
              </Alert>
              <TextField label="Title" name="title" required slotProps={{ htmlInput: { maxLength: 200 } }} />
              <FormControl fullWidth required>
                <InputLabel id="upload-category">Category</InputLabel>
                <Select defaultValue="other" label="Category" labelId="upload-category" name="category">
                  {documentCategories.map((value) => (
                    <MenuItem key={value} value={value}>{documentCategoryLabels[value]}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField label="Description" name="description" slotProps={{ htmlInput: { maxLength: 500 } }} />
              <Button component="label" variant="outlined">
                Choose file
                <input hidden name="file" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" />
              </Button>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setUploadOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">Upload</Button>
          </DialogActions>
        </Stack>
      </Dialog>
      <Dialog fullWidth maxWidth="sm" onClose={() => setEditing(null)} open={editing !== null}>
        <DialogTitle>Edit metadata</DialogTitle>
        <Stack component="form" onSubmit={(event) => void submitMetadata(event)}>
          <DialogContent>
            <Stack spacing={2}>
              <TextField
                defaultValue={editing?.title ?? ''}
                label="Title"
                name="title"
                required
                slotProps={{ htmlInput: { maxLength: 200 } }}
              />
              <FormControl fullWidth required>
                <InputLabel id="edit-category">Category</InputLabel>
                <Select
                  defaultValue={editing?.category ?? 'other'}
                  label="Category"
                  labelId="edit-category"
                  name="category"
                >
                  {documentCategories.map((value) => (
                    <MenuItem key={value} value={value}>{documentCategoryLabels[value]}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                defaultValue={editing?.description ?? ''}
                label="Description"
                name="description"
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditing(null)}>Cancel</Button>
            <Button type="submit" variant="contained">Save</Button>
          </DialogActions>
        </Stack>
      </Dialog>
    </Paper>
  )
}
