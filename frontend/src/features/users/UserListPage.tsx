import {
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
import { useAuth } from '../../auth/authContext'
import { hasPermission } from '../../auth/permission'
import { ConfirmDialog } from '../../shared/components/ConfirmDialog'
import { FormSection } from '../../shared/components/FormSection'
import { FilterBar } from '../../shared/components/FilterBar'
import { filterControlSx } from '../../shared/components/layoutSx'
import { Page } from '../../shared/components/Page'
import { StatusChip } from '../../shared/components/StatusChip'
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../shared/components/StateViews'
import { useNotification } from '../../shared/notifications/notificationContext'
import { useEmployees } from '../employees/hooks'
import {
  useChangeUserRole,
  useCreateUser,
  useDeactivateUser,
  useReactivateUser,
  useResetUserPassword,
  useUpdateUser,
  useUsers,
} from './hooks'
import {
  systemRoleCodes,
  userStatuses,
  type ManagedUser,
  type SystemRoleCode,
  type UserStatus,
} from './types'

type Editor =
  | { kind: 'create' }
  | { kind: 'edit'; user: ManagedUser }
  | { kind: 'role'; user: ManagedUser }
  | { kind: 'password'; user: ManagedUser }

export function UserListPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<UserStatus | ''>('')
  const [roleCode, setRoleCode] = useState<SystemRoleCode | ''>('')
  const [editor, setEditor] = useState<Editor | null>(null)
  const [confirm, setConfirm] = useState<{ id: string; action: 'deactivate' | 'reactivate' } | null>(null)
  const employees = useEmployees({ page: 1, pageSize: 100 })
  const query = useUsers({
    page,
    pageSize: 20,
    ...(search ? { search } : {}),
    ...(status ? { status } : {}),
    ...(roleCode ? { roleCode } : {}),
  })
  const create = useCreateUser()
  const update = useUpdateUser()
  const changeRole = useChangeUserRole()
  const deactivate = useDeactivateUser()
  const reactivate = useReactivateUser()
  const resetPassword = useResetUserPassword()
  const { notify } = useNotification()
  const { user } = useAuth()
  const canCreateUser = hasPermission(user, 'user.create')

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setSearch(String(form.get('search') ?? '').trim())
    setPage(1)
  }

  const handleError = (error: unknown, fallback: string) => {
    notify(error instanceof ApiError ? error.message : fallback, 'error')
  }

  const submitEditor = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editor) return
    const form = new FormData(event.currentTarget)
    try {
      if (editor.kind === 'create') {
        const employeeId = String(form.get('employeeId') ?? '')
        await create.mutateAsync({
          username: String(form.get('username') ?? '').trim(),
          password: String(form.get('password') ?? ''),
          roleCode: String(form.get('roleCode')) as SystemRoleCode,
          status: String(form.get('status') || 'active') as UserStatus,
          employeeId: employeeId || null,
        })
        notify('User created.', 'success')
      } else if (editor.kind === 'edit') {
        const employeeId = String(form.get('employeeId') ?? '')
        await update.mutateAsync({
          id: editor.user.id,
          input: {
            username: String(form.get('username') ?? '').trim(),
            employeeId: employeeId || null,
          },
        })
        notify('User updated.', 'success')
      } else if (editor.kind === 'role') {
        await changeRole.mutateAsync({
          id: editor.user.id,
          roleCode: String(form.get('roleCode')),
        })
        notify('Role updated.', 'success')
      } else {
        await resetPassword.mutateAsync({
          id: editor.user.id,
          newPassword: String(form.get('newPassword') ?? ''),
        })
        notify('Password reset. The new password is not displayed.', 'success')
      }
      setEditor(null)
    } catch (error) {
      handleError(error, 'The user change could not be saved.')
    }
  }

  return (
    <Page
      help="Deactivation revokes active sessions and blocks sign-in until reactivation. Users are not deleted. Role changes replace the current role. Password reset revokes that user's sessions and is never displayed after save."
      helpLabel="User administration"
      title="Users"
      description="Administrator-only operational accounts. There is no public registration."
      actions={
        <Can permission="user.create">
          <Button onClick={() => setEditor({ kind: 'create' })} variant="contained">
            Create user
          </Button>
        </Can>
      }
    >
      <FilterBar>
          <Stack component="form" direction="row" spacing={1} onSubmit={submitSearch} sx={{ ...filterControlSx, flex: '1 1 220px', maxWidth: { sm: 400 } }}>
            <TextField label="Search username" name="search" size="small" sx={{ flex: 1, minWidth: 0 }} />
            <Button type="submit" variant="outlined">Search</Button>
          </Stack>
            <FormControl size="small" sx={filterControlSx}>
              <InputLabel id="user-status">Status</InputLabel>
              <Select
                label="Status"
                labelId="user-status"
                onChange={(event) => {
                  setStatus(event.target.value as UserStatus | '')
                  setPage(1)
                }}
                value={status}
              >
                <MenuItem value="">All statuses</MenuItem>
                {userStatuses.map((value) => (
                  <MenuItem key={value} value={value}>{value}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={filterControlSx}>
              <InputLabel id="user-role">Role</InputLabel>
              <Select
                label="Role"
                labelId="user-role"
                onChange={(event) => {
                  setRoleCode(event.target.value as SystemRoleCode | '')
                  setPage(1)
                }}
                value={roleCode}
              >
                <MenuItem value="">All roles</MenuItem>
                {systemRoleCodes.map((value) => (
                  <MenuItem key={value} value={value}>{value}</MenuItem>
                ))}
              </Select>
            </FormControl>
      </FilterBar>
      {query.isLoading && <LoadingState label="Loading users" />}
      {query.isError && (
        <ErrorState
          message={query.error instanceof ApiError ? query.error.message : 'Users could not be loaded.'}
          onRetry={() => void query.refetch()}
        />
      )}
      {query.data && query.data.data.length === 0 && (
        <EmptyState
          action={
            canCreateUser ? (
              <Button onClick={() => setEditor({ kind: 'create' })} variant="contained">
                Create user
              </Button>
            ) : undefined
          }
          description={
            canCreateUser
              ? 'Adjust the filters or create an operational user account.'
              : 'No users match the current filters.'
          }
          title="No users found"
        />
      )}
      {query.data && query.data.data.length > 0 && (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Username</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Employee</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {query.data.data.map((user) => (
                  <TableRow hover key={user.id}>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{user.role.name || user.role.code}</TableCell>
                    <TableCell><StatusChip value={user.status} /></TableCell>
                    <TableCell>
                      {user.employee
                        ? `${user.employee.firstName} ${user.employee.lastName}`
                        : 'Unlinked'}
                    </TableCell>
                    <TableCell align="right">
                      <Can permission="user.update">
                        <Button onClick={() => setEditor({ kind: 'edit', user })} size="small">
                          Edit
                        </Button>
                      </Can>
                      <Can permission="user.role.update">
                        <Button onClick={() => setEditor({ kind: 'role', user })} size="small">
                          Role
                        </Button>
                      </Can>
                      <Can permission="user.deactivate">
                        {user.status === 'active' ? (
                          <Button
                            onClick={() => setConfirm({ id: user.id, action: 'deactivate' })}
                            size="small"
                          >
                            Deactivate
                          </Button>
                        ) : (
                          <Button
                            onClick={() => setConfirm({ id: user.id, action: 'reactivate' })}
                            size="small"
                          >
                            Reactivate
                          </Button>
                        )}
                      </Can>
                      <Can permission="user.password.reset">
                        <Button onClick={() => setEditor({ kind: 'password', user })} size="small">
                          Reset password
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
            sx={{ alignSelf: 'center' }}
          />
        </>
      )}
      <Dialog fullWidth maxWidth="sm" onClose={() => setEditor(null)} open={editor !== null}>
        <DialogTitle>
          {editor?.kind === 'create' && 'Create user'}
          {editor?.kind === 'edit' && 'Edit user'}
          {editor?.kind === 'role' && 'Change role'}
          {editor?.kind === 'password' && 'Reset password'}
        </DialogTitle>
        <Stack component="form" onSubmit={(event) => void submitEditor(event)}>
          <DialogContent>
            <Stack spacing={3}>
              {(editor?.kind === 'create' || editor?.kind === 'edit') && (
                <FormSection title="Account">
                  <Stack spacing={2}>
                    <TextField
                      defaultValue={editor.kind === 'edit' ? editor.user.username : ''}
                      label="Username"
                      name="username"
                      required
                      slotProps={{ htmlInput: { maxLength: 100 } }}
                    />
                    <FormControl fullWidth>
                      <InputLabel id="user-employee">Employee link</InputLabel>
                      <Select
                        defaultValue={editor.kind === 'edit' ? editor.user.employee?.id ?? '' : ''}
                        label="Employee link"
                        labelId="user-employee"
                        name="employeeId"
                      >
                        <MenuItem value="">Unlinked</MenuItem>
                        {(employees.data?.data ?? []).map((employee) => (
                          <MenuItem key={employee.id} value={employee.id}>
                            {employee.firstName} {employee.lastName} ({employee.employeeNumber})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Stack>
                </FormSection>
              )}
              {editor?.kind === 'create' && (
                <FormSection title="Access">
                  <Stack spacing={2}>
                    <TextField
                      helperText="12–128 characters, at least one letter and one number. The password is never displayed after save."
                      label="Initial password"
                      name="password"
                      required
                      type="password"
                    />
                    <FormControl fullWidth required>
                      <InputLabel id="create-role">Role</InputLabel>
                      <Select defaultValue="nurse" label="Role" labelId="create-role" name="roleCode">
                        {systemRoleCodes.map((value) => (
                          <MenuItem key={value} value={value}>{value}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl fullWidth>
                      <InputLabel id="create-status">Status</InputLabel>
                      <Select defaultValue="active" label="Status" labelId="create-status" name="status">
                        {userStatuses.map((value) => (
                          <MenuItem key={value} value={value}>{value}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Stack>
                </FormSection>
              )}
              {editor?.kind === 'role' && (
                <FormSection
                  description="The new role replaces the current role. Access updates on the next authenticated request."
                  title="Role"
                >
                  <FormControl fullWidth required>
                    <InputLabel id="change-role">Role</InputLabel>
                    <Select
                      defaultValue={editor.user.role.code}
                      label="Role"
                      labelId="change-role"
                      name="roleCode"
                    >
                      {systemRoleCodes.map((value) => (
                        <MenuItem key={value} value={value}>{value}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </FormSection>
              )}
              {editor?.kind === 'password' && (
                <FormSection title="New password">
                  <Stack spacing={2}>
                    <Typography variant="body2">
                      Enter a new password for {editor.user.username}. It will not be shown after save.
                      Existing sessions for that user are revoked.
                    </Typography>
                    <TextField label="New password" name="newPassword" required type="password" />
                  </Stack>
                </FormSection>
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditor(null)}>Cancel</Button>
            <Button type="submit" variant="contained">Save</Button>
          </DialogActions>
        </Stack>
      </Dialog>
      <ConfirmDialog
        confirmColor={confirm?.action === 'deactivate' ? 'warning' : 'primary'}
        confirmLabel={confirm?.action === 'deactivate' ? 'Deactivate user' : 'Reactivate user'}
        description={
          confirm?.action === 'deactivate'
            ? 'The user will be unable to sign in. This can be reversed by reactivation. Existing sessions are revoked.'
            : 'The user will be able to sign in again with their current credentials.'
        }
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          if (!confirm) return
          const { id, action } = confirm
          setConfirm(null)
          if (action === 'deactivate') {
            void deactivate.mutateAsync(id).then(
              () => notify('User deactivated.', 'success'),
              (error: unknown) => handleError(error, 'Deactivation failed.'),
            )
          } else {
            void reactivate.mutateAsync(id).then(
              () => notify('User reactivated.', 'success'),
              (error: unknown) => handleError(error, 'Reactivation failed.'),
            )
          }
        }}
        open={confirm !== null}
        pending={deactivate.isPending || reactivate.isPending}
        title={confirm?.action === 'deactivate' ? 'Deactivate user?' : 'Reactivate user?'}
      />
    </Page>
  )
}
