import {
  createBrowserRouter,
  type RouteObject,
} from 'react-router-dom'
import { ProtectedRoute } from '../auth/ProtectedRoute'
import { AnyPermissionRoute, PermissionRoute } from '../auth/PermissionRoute'
import { AppointmentCalendarPage } from '../features/appointments/AppointmentCalendarPage'
import { AppointmentCreatePage } from '../features/appointments/AppointmentCreatePage'
import { AppointmentDetailPage } from '../features/appointments/AppointmentDetailPage'
import { AppointmentEditPage } from '../features/appointments/AppointmentEditPage'
import { AppointmentListPage } from '../features/appointments/AppointmentListPage'
import { AdmissionCreatePage } from '../features/admissions/AdmissionCreatePage'
import { AdmissionDetailPage } from '../features/admissions/AdmissionDetailPage'
import { AdmissionListPage } from '../features/admissions/AdmissionListPage'
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
import { MedicalRecordAmendPage } from '../features/medical-records/MedicalRecordAmendPage'
import { MedicalRecordCreatePage } from '../features/medical-records/MedicalRecordCreatePage'
import { MedicalRecordDetailPage } from '../features/medical-records/MedicalRecordDetailPage'
import { MedicalRecordEditPage } from '../features/medical-records/MedicalRecordEditPage'
import { MedicalRecordListPage } from '../features/medical-records/MedicalRecordListPage'
import { PatientDetailPage } from '../features/patients/PatientDetailPage'
import { PatientEditPage } from '../features/patients/PatientEditPage'
import { PatientListPage } from '../features/patients/PatientListPage'
import { PatientRegisterPage } from '../features/patients/PatientRegisterPage'
import { PrescriptionCreatePage } from '../features/prescriptions/PrescriptionCreatePage'
import { PrescriptionDetailPage } from '../features/prescriptions/PrescriptionDetailPage'
import { PrescriptionListPage } from '../features/prescriptions/PrescriptionListPage'
import { LaboratoryCreatePage } from '../features/laboratory/LaboratoryCreatePage'
import { LaboratoryDetailPage } from '../features/laboratory/LaboratoryDetailPage'
import { LaboratoryListPage } from '../features/laboratory/LaboratoryListPage'
import { LaboratoryReportPage } from '../features/laboratory/LaboratoryReportPage'
import { MedicineCreatePage } from '../features/medicines/MedicineCreatePage'
import { MedicineDetailPage } from '../features/medicines/MedicineDetailPage'
import { MedicineEditPage } from '../features/medicines/MedicineEditPage'
import { MedicineListPage } from '../features/medicines/MedicineListPage'
import { InventoryListPage } from '../features/pharmacy/InventoryListPage'
import { StockAdjustPage } from '../features/pharmacy/StockAdjustPage'
import { StockMovementListPage } from '../features/pharmacy/StockMovementListPage'
import { StockReceivePage } from '../features/pharmacy/StockReceivePage'
import { InvoiceCreatePage } from '../features/billing/InvoiceCreatePage'
import { InvoiceDetailPage } from '../features/billing/InvoiceDetailPage'
import { InvoiceListPage } from '../features/billing/InvoiceListPage'
import { PaymentReceiptPage } from '../features/billing/PaymentReceiptPage'
import { ReportsHomePage } from '../features/reports/ReportsHomePage'
import { PatientReportPage } from '../features/reports/PatientReportPage'
import { AppointmentReportPage } from '../features/reports/AppointmentReportPage'
import { RevenueReportPage } from '../features/reports/RevenueReportPage'
import { PharmacyReportPage } from '../features/reports/PharmacyReportPage'
import { LaboratoryReportPage as LaboratoryAnalyticsReportPage } from '../features/reports/LaboratoryReportPage'
import { StaffReportPage } from '../features/reports/StaffReportPage'
import { AttendanceListPage } from '../features/attendance/AttendanceListPage'
import { LeaveListPage } from '../features/leave/LeaveListPage'
import { UserListPage } from '../features/users/UserListPage'
import { AuditListPage } from '../features/audit/AuditListPage'
import { REPORT_PERMISSIONS } from '../features/reports/permissions'
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
                      { path: 'calendar', element: <AppointmentCalendarPage /> },
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
              {
                path: 'admissions',
                children: [
                  {
                    element: <PermissionRoute permission="admission.read" />,
                    children: [
                      { index: true, element: <AdmissionListPage /> },
                      { path: ':admissionId', element: <AdmissionDetailPage /> },
                    ],
                  },
                  {
                    element: <PermissionRoute permission="admission.create" />,
                    children: [
                      { path: 'new', element: <AdmissionCreatePage /> },
                    ],
                  },
                ],
              },
              {
                path: 'medical-records',
                children: [
                  {
                    element: <PermissionRoute permission="medical_record.read" />,
                    children: [
                      { index: true, element: <MedicalRecordListPage /> },
                      { path: ':medicalRecordId', element: <MedicalRecordDetailPage /> },
                    ],
                  },
                  {
                    element: <PermissionRoute permission="medical_record.create" />,
                    children: [
                      { path: 'new', element: <MedicalRecordCreatePage /> },
                    ],
                  },
                  {
                    element: <PermissionRoute permission="medical_record.update" />,
                    children: [
                      { path: ':medicalRecordId/edit', element: <MedicalRecordEditPage /> },
                    ],
                  },
                  {
                    element: <PermissionRoute permission="medical_record.amend" />,
                    children: [
                      { path: ':medicalRecordId/amend', element: <MedicalRecordAmendPage /> },
                    ],
                  },
                  {
                    element: <PermissionRoute permission="prescription.create" />,
                    children: [
                      { path: ':medicalRecordId/prescriptions/new', element: <PrescriptionCreatePage /> },
                    ],
                  },
                ],
              },
              {
                path: 'prescriptions',
                children: [
                  {
                    element: <PermissionRoute permission="prescription.read" />,
                    children: [
                      { index: true, element: <PrescriptionListPage /> },
                      { path: ':prescriptionId', element: <PrescriptionDetailPage /> },
                    ],
                  },
                ],
              },
              {
                path: 'laboratory',
                children: [
                  {
                    element: <PermissionRoute permission="lab_request.read" />,
                    children: [
                      { index: true, element: <LaboratoryListPage /> },
                      { path: ':requestId', element: <LaboratoryDetailPage /> },
                      { path: ':requestId/report', element: <LaboratoryReportPage /> },
                    ],
                  },
                  {
                    element: <PermissionRoute permission="lab_request.create" />,
                    children: [
                      { path: 'new', element: <LaboratoryCreatePage /> },
                    ],
                  },
                ],
              },
              {
                path: 'medicines',
                children: [
                  {
                    element: <PermissionRoute permission="medicine.read" />,
                    children: [
                      { index: true, element: <MedicineListPage /> },
                      { path: ':medicineId', element: <MedicineDetailPage /> },
                    ],
                  },
                  {
                    element: <PermissionRoute permission="medicine.create" />,
                    children: [
                      { path: 'new', element: <MedicineCreatePage /> },
                    ],
                  },
                  {
                    element: <PermissionRoute permission="medicine.update" />,
                    children: [
                      { path: ':medicineId/edit', element: <MedicineEditPage /> },
                    ],
                  },
                ],
              },
              {
                path: 'pharmacy',
                children: [
                  {
                    element: <PermissionRoute permission="inventory.read" />,
                    children: [
                      { path: 'inventory', element: <InventoryListPage /> },
                    ],
                  },
                  {
                    element: <PermissionRoute permission="stock.receive" />,
                    children: [
                      { path: 'inventory/receive', element: <StockReceivePage /> },
                    ],
                  },
                  {
                    element: <PermissionRoute permission="stock.adjust" />,
                    children: [
                      { path: 'inventory/adjust', element: <StockAdjustPage /> },
                    ],
                  },
                  {
                    element: <PermissionRoute permission="stock.movement.read" />,
                    children: [
                      { path: 'movements', element: <StockMovementListPage /> },
                    ],
                  },
                ],
              },
              {
                path: 'billing',
                children: [
                  {
                    element: <PermissionRoute permission="invoice.read" />,
                    children: [
                      { index: true, element: <InvoiceListPage /> },
                      { path: ':invoiceId', element: <InvoiceDetailPage /> },
                    ],
                  },
                  {
                    element: <PermissionRoute permission="invoice.create" />,
                    children: [
                      { path: 'new', element: <InvoiceCreatePage /> },
                    ],
                  },
                  {
                    element: <PermissionRoute permission="payment.read" />,
                    children: [
                      { path: ':invoiceId/payments/:paymentId', element: <PaymentReceiptPage /> },
                    ],
                  },
                ],
              },
              {
                path: 'reports',
                element: <AnyPermissionRoute permissions={REPORT_PERMISSIONS} />,
                children: [
                  { index: true, element: <ReportsHomePage /> },
                  {
                    element: <PermissionRoute permission="report.patient.read" />,
                    children: [{ path: 'patients', element: <PatientReportPage /> }],
                  },
                  {
                    element: <PermissionRoute permission="report.appointment.read" />,
                    children: [{ path: 'appointments', element: <AppointmentReportPage /> }],
                  },
                  {
                    element: <PermissionRoute permission="report.revenue.read" />,
                    children: [{ path: 'revenue', element: <RevenueReportPage /> }],
                  },
                  {
                    element: <PermissionRoute permission="report.pharmacy.read" />,
                    children: [{ path: 'pharmacy', element: <PharmacyReportPage /> }],
                  },
                  {
                    element: <PermissionRoute permission="report.laboratory.read" />,
                    children: [{ path: 'laboratory', element: <LaboratoryAnalyticsReportPage /> }],
                  },
                  {
                    element: <PermissionRoute permission="report.staff.read" />,
                    children: [{ path: 'staff', element: <StaffReportPage /> }],
                  },
                ],
              },
              {
                path: 'attendance',
                element: <PermissionRoute permission="attendance.read" />,
                children: [{ index: true, element: <AttendanceListPage /> }],
              },
              {
                path: 'leave',
                element: <PermissionRoute permission="leave.read" />,
                children: [{ index: true, element: <LeaveListPage /> }],
              },
              {
                path: 'users',
                element: <PermissionRoute permission="user.read" />,
                children: [{ index: true, element: <UserListPage /> }],
              },
              {
                path: 'audit',
                element: <PermissionRoute permission="audit.read" />,
                children: [{ index: true, element: <AuditListPage /> }],
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
