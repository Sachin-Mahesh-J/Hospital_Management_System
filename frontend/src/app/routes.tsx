import {
  createBrowserRouter,
  type RouteObject,
} from 'react-router-dom'
import { ProtectedRoute } from '../auth/ProtectedRoute'
import { PermissionRoute } from '../auth/PermissionRoute'
import { PatientDetailPage } from '../features/patients/PatientDetailPage'
import { PatientEditPage } from '../features/patients/PatientEditPage'
import { PatientListPage } from '../features/patients/PatientListPage'
import { PatientRegisterPage } from '../features/patients/PatientRegisterPage'
import { ChangePasswordPage } from '../pages/ChangePasswordPage'
import { HomePage } from '../pages/HomePage'
import { LoginPage } from '../pages/LoginPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { RouteErrorPage } from '../pages/RouteErrorPage'
import { AppShell } from './AppShell'

export const appRoutes: RouteObject[] = [
  {
    errorElement: <RouteErrorPage />,
    children: [
      { path: 'login', element: <LoginPage /> },
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <AppShell />,
            children: [
              { index: true, element: <HomePage /> },
              {
                path: 'change-password',
                element: <ChangePasswordPage />,
              },
              {
                path: 'patients',
                children: [
                  {
                    element: <PermissionRoute permission="patient.read" />,
                    children: [
                      { index: true, element: <PatientListPage /> },
                      { path: ':patientId', element: <PatientDetailPage /> },
                    ],
                  },
                  {
                    element: <PermissionRoute permission="patient.create" />,
                    children: [
                      { path: 'new', element: <PatientRegisterPage /> },
                    ],
                  },
                  {
                    element: <PermissionRoute permission="patient.update" />,
                    children: [
                      { path: ':patientId/edit', element: <PatientEditPage /> },
                    ],
                  },
                ],
              },
              { path: '*', element: <NotFoundPage /> },
            ],
          },
        ],
      },
    ],
  },
]

export function createAppRouter() {
  return createBrowserRouter(appRoutes)
}
