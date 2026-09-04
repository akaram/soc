import { Routes } from '@angular/router';
import { StaffAttendanceDashboardComponent } from './components/staff-attendance-dashboard.component';
import { FacialRecognitionAttendanceComponent } from './components/facial-recognition-attendance.component';
import { BiometricFingerprintAttendanceComponent } from './components/biometric-fingerprint-attendance.component';
import { ShiftManagementSchedulingComponent } from './components/shift-management-scheduling.component';
import { DoubleShiftDetectionComponent } from './components/double-shift-detection.component';
import { ProxyAttendanceDetectionComponent } from './components/proxy-attendance-detection.component';
import { LeaveManagementComponent } from './components/leave-management.component';
import { OvertimeTrackingComponent } from './components/overtime-tracking.component';
import { AttendanceReportsPayrollComponent } from './components/attendance-reports-payroll.component';

export const GUARD_MANAGEMENT_ROUTES: Routes = [
  {
    path: '',
    component: StaffAttendanceDashboardComponent,
    title: 'Staff Attendance Dashboard',
    pathMatch: 'full'
  },
  {
    path: 'facial-recognition',
    component: FacialRecognitionAttendanceComponent,
    title: 'Facial Recognition Attendance'
  },
  {
    path: 'biometric-fingerprint',
    component: BiometricFingerprintAttendanceComponent,
    title: 'Biometric Integration (Fingerprint)'
  },
  {
    path: 'shift-management',
    component: ShiftManagementSchedulingComponent,
    title: 'Shift Management & Scheduling'
  },
  {
    path: 'double-shift-detection',
    component: DoubleShiftDetectionComponent,
    title: 'Double Shift Detection'
  },
  {
    path: 'proxy-attendance-detection',
    component: ProxyAttendanceDetectionComponent,
    title: 'Proxy Attendance Detection'
  },
  {
    path: 'leave-management',
    component: LeaveManagementComponent,
    title: 'Leave Management'
  },
  {
    path: 'overtime-tracking',
    component: OvertimeTrackingComponent,
    title: 'Overtime Tracking'
  },
  {
    path: 'attendance-reports-payroll',
    component: AttendanceReportsPayrollComponent,
    title: 'Attendance Reports & Payroll Integration'
  }
];

