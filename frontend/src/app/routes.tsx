import {
  createBrowserRouter,
  type RouteObject,
} from 'react-router-dom'
import { ProtectedRoute } from '../auth/ProtectedRoute'
import { PermissionRoute } from '../auth/PermissionRoute'
import { AppointmentCreatePage } from '../features/appointments/AppointmentCreatePage'
import { AppointmentDetailPage } from '../features/appointments/AppointmentDetailPage'
import { AppointmentEditPage } from '../features/appointments/AppointmentEditPage'
import { AppointmentListPage } from '../features/appointments/AppointmentListPage'
import { DepartmentCreatePage } from '../features/departments/DepartmentCreatePage'
import { DepartmentDetailPage } from '../features/departments/DepartmentDetailPage'
import { DepartmentEditPage } from '../features/departments/DepartmentEditPage'
import { DepartmentListPage } from '../features/departments/DepartmentListPage'
import { DoctorCreatePage } from '../features/doctors/DoctorCreatePage'
import { DoctorDetailPage } from '../features/doctors/DoctorDetailPage'
import { DoctorEditPage } from '../features/doctors/DoctorEditPage'
import { DoctorListPage } from '../features/doctors/DoctorListPage'
import { EmployeeDetailPage } from '../features/employees/EmployeeDetailPage'
import { EmployeeEditPage } from '../features/employees/EmployeeEditPage'
import { EmployeeListPage } from '../features/employees/EmployeeListPage'
import { EmployeeRegisterPage } from '../features/employees/EmployeeRegisterPage'
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
              {
                path: 'departments',
                children: [
                  {
                    element: <PermissionRoute permission="department.read" />,
                    children: [
                      { index: true, element: <DepartmentListPage /> },
                      { path: ':departmentId', element: <DepartmentDetailPage /> },
                    ],
                  },
                  {
                    element: <PermissionRoute permission="department.create" />,
                    children: [
                      { path: 'new', element: <DepartmentCreatePage /> },
                    ],
                  },
                  {
                    element: <PermissionRoute permission="department.update" />,
                    children: [
                      { path: ':departmentId/edit', element: <DepartmentEditPage /> },
                    ],
                  },
                ],
              },
              {
                path: 'employees',
                children: [
                  {
                    element: <PermissionRoute permission="employee.read" />,
                    children: [
                      { index: true, element: <EmployeeListPage /> },
                      { path: ':employeeId', element: <EmployeeDetailPage /> },
                    ],
                  },
                  {
                    element: <PermissionRoute permission="employee.create" />,
                    children: [
                      { path: 'new', element: <EmployeeRegisterPage /> },
                    ],
                  },
                  {
                    element: <PermissionRoute permission="employee.update" />,
                    children: [
                      { path: ':employeeId/edit', element: <EmployeeEditPage /> },
                    ],
                  },
                ],
              },
              {
                path: 'doctors',
                children: [
                  {
                    element: <PermissionRoute permission="doctor.read" />,
                    children: [
                      { index: true, element: <DoctorListPage /> },
                      { path: ':doctorId', element: <DoctorDetailPage /> },
                    ],
                  },
                  {
                    element: <PermissionRoute permission="doctor.create" />,
                    children: [
                      { path: 'new', element: <DoctorCreatePage /> },
                    ],
                  },
                  {
                    element: <PermissionRoute permission="doctor.update" />,
                    children: [
                      { path: ':doctorId/edit', element: <DoctorEditPage /> },
                    ],
                  },
                ],
              },
              {
                path: 'appointments',
                children: [
                  {
                    element: <PermissionRoute permission="appointment.read" />,
                    children: [
                      { index: true, element: <AppointmentListPage /> },
                      { path: ':appointmentId', element: <AppointmentDetailPage /> },
                    ],
                  },
                  {
                    element: <PermissionRoute permission="appointment.create" />,
                    children: [
                      { path: 'new', element: <AppointmentCreatePage /> },
                    ],
                  },
                  {
                    element: <PermissionRoute permission="appointment.update" />,
                    children: [
                      { path: ':appointmentId/edit', element: <AppointmentEditPage /> },
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
