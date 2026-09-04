import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { SessionContextService } from '../../../core/services/session-context.service';
import {
  AttendanceReport,
  PayrollIntegration,
  PayrollData,
  ReportStatistics,
  GenerateReportRequest,
  CreateIntegrationRequest,
  ActionResponse,
  ReportFilter,
  PayrollDataFilter
} from '../models/attendance-reports-payroll.model';
import {
  apiToAttendanceReport,
  apiToPayrollIntegration,
  apiToPayrollData,
  apiToStatistics,
  uiReportTypeToApi,
  uiReportStatusToApi,
  uiPayrollSystemToApi,
  uiSyncFrequencyToApi,
  uiPayrollDataStatusToApi
} from './attendance-reports-payroll-api.mapper';

@Injectable({ providedIn: 'root' })
export class AttendanceReportsPayrollService {
  constructor(
    private http: HttpClient,
    private session: SessionContextService
  ) {}

  getReports(filter?: ReportFilter): Observable<AttendanceReport[]> {
    const societyId = this.session.getSocietyId();
    if (!societyId) return of([]);

    let params = new HttpParams();
    if (filter?.reportType) params = params.set('reportType', uiReportTypeToApi(filter.reportType));
    if (filter?.status) params = params.set('status', uiReportStatusToApi(filter.status));
    if (filter?.searchTerm) params = params.set('searchTerm', filter.searchTerm);

    return this.http
      .get<Record<string, unknown>[]>(
        `/attendance-reports-payroll/society/${encodeURIComponent(societyId)}/reports`,
        { params }
      )
      .pipe(
        map(rows => (rows ?? []).map(r => apiToAttendanceReport(r))),
        catchError(err => {
          console.error('Failed to load attendance reports', err);
          return of([]);
        })
      );
  }

  getStatistics(): Observable<ReportStatistics> {
    const societyId = this.session.getSocietyId();
    if (!societyId) {
      return of({ totalReports: 0, thisMonth: 0, payrollSynced: 0, pendingSync: 0 });
    }

    return this.http
      .get<Record<string, unknown>>(
        `/attendance-reports-payroll/society/${encodeURIComponent(societyId)}/statistics`
      )
      .pipe(
        map(raw => apiToStatistics(raw)),
        catchError(err => {
          console.error('Failed to load report statistics', err);
          return of({ totalReports: 0, thisMonth: 0, payrollSynced: 0, pendingSync: 0 });
        })
      );
  }

  generateReport(request: GenerateReportRequest): Observable<AttendanceReport | ActionResponse> {
    const societyId = this.session.getSocietyId();
    if (!societyId) return of({ success: false, message: 'No society selected' });

    const body: Record<string, unknown> = {
      societyId,
      reportType: uiReportTypeToApi(request.reportType),
      generatedBy: this.session.getCurrentUserId(),
      createdBy: this.session.getCurrentUserId()
    };
    if (request.startDate) body['startDate'] = request.startDate;
    if (request.endDate) body['endDate'] = request.endDate;
    if (request.title) body['title'] = request.title;

    return this.http
      .post<Record<string, unknown>>('/attendance-reports-payroll/reports', body)
      .pipe(
        map(raw => apiToAttendanceReport(raw)),
        catchError(err => {
          const message = err.error?.message || 'Failed to generate report';
          return of({ success: false, message });
        })
      );
  }

  syncReportToPayroll(reportId: string, integrationId?: string): Observable<AttendanceReport | ActionResponse> {
    const body = integrationId ? { integrationId } : {};
    return this.http
      .put<Record<string, unknown>>(
        `/attendance-reports-payroll/reports/${encodeURIComponent(reportId)}/sync-payroll`,
        body
      )
      .pipe(
        map(raw => apiToAttendanceReport(raw)),
        catchError(err => {
          const message = err.error?.message || 'Failed to sync report to payroll';
          return of({ success: false, message });
        })
      );
  }

  deleteReport(id: string): Observable<ActionResponse> {
    return this.http
      .delete<Record<string, unknown>>(`/attendance-reports-payroll/reports/${encodeURIComponent(id)}`)
      .pipe(
        map(raw => ({ success: true, message: String(raw['message'] ?? 'Report deleted') })),
        catchError(err => {
          const message = err.error?.message || 'Failed to delete report';
          return of({ success: false, message });
        })
      );
  }

  syncAllPending(): Observable<ActionResponse> {
    const societyId = this.session.getSocietyId();
    if (!societyId) return of({ success: false, message: 'No society selected' });

    const params = new HttpParams().set('societyId', societyId);
    return this.http
      .post<Record<string, unknown>>('/attendance-reports-payroll/payroll-data/sync-all', {}, { params })
      .pipe(
        map(raw => ({
          success: Boolean(raw['success'] ?? true),
          message: String(raw['message'] ?? 'Payroll sync completed')
        })),
        catchError(err => {
          const message = err.error?.message || 'Failed to sync payroll';
          return of({ success: false, message });
        })
      );
  }

  getIntegrations(): Observable<PayrollIntegration[]> {
    const societyId = this.session.getSocietyId();
    if (!societyId) return of([]);

    return this.http
      .get<Record<string, unknown>[]>(
        `/attendance-reports-payroll/society/${encodeURIComponent(societyId)}/integrations`
      )
      .pipe(
        map(rows => (rows ?? []).map(r => apiToPayrollIntegration(r))),
        catchError(err => {
          console.error('Failed to load payroll integrations', err);
          return of([]);
        })
      );
  }

  createIntegration(request: CreateIntegrationRequest): Observable<PayrollIntegration | ActionResponse> {
    const societyId = this.session.getSocietyId();
    if (!societyId) return of({ success: false, message: 'No society selected' });

    const body = {
      societyId,
      payrollSystem: uiPayrollSystemToApi(request.payrollSystem),
      systemName: request.systemName,
      syncFrequency: uiSyncFrequencyToApi(request.syncFrequency),
      apiEndpoint: request.apiEndpoint,
      apiKey: request.apiKey,
      createdBy: this.session.getCurrentUserId()
    };

    return this.http
      .post<Record<string, unknown>>('/attendance-reports-payroll/integrations', body)
      .pipe(
        map(raw => apiToPayrollIntegration(raw)),
        catchError(err => {
          const message = err.error?.message || 'Failed to create integration';
          return of({ success: false, message });
        })
      );
  }

  testConnection(id: string): Observable<PayrollIntegration | ActionResponse> {
    return this.http
      .put<Record<string, unknown>>(
        `/attendance-reports-payroll/integrations/${encodeURIComponent(id)}/test`,
        {}
      )
      .pipe(
        map(raw => apiToPayrollIntegration(raw)),
        catchError(err => {
          const message = err.error?.message || 'Connection test failed';
          return of({ success: false, message });
        })
      );
  }

  syncIntegration(id: string): Observable<PayrollIntegration | ActionResponse> {
    return this.http
      .put<Record<string, unknown>>(
        `/attendance-reports-payroll/integrations/${encodeURIComponent(id)}/sync`,
        {}
      )
      .pipe(
        map(raw => apiToPayrollIntegration(raw)),
        catchError(err => {
          const message = err.error?.message || 'Integration sync failed';
          return of({ success: false, message });
        })
      );
  }

  disconnectIntegration(id: string): Observable<PayrollIntegration | ActionResponse> {
    return this.http
      .put<Record<string, unknown>>(
        `/attendance-reports-payroll/integrations/${encodeURIComponent(id)}/disconnect`,
        {}
      )
      .pipe(
        map(raw => apiToPayrollIntegration(raw)),
        catchError(err => {
          const message = err.error?.message || 'Failed to disconnect integration';
          return of({ success: false, message });
        })
      );
  }

  getPayrollData(filter?: PayrollDataFilter): Observable<PayrollData[]> {
    const societyId = this.session.getSocietyId();
    if (!societyId) return of([]);

    let params = new HttpParams();
    if (filter?.status) params = params.set('status', uiPayrollDataStatusToApi(filter.status));
    if (filter?.searchTerm) params = params.set('searchTerm', filter.searchTerm);
    if (filter?.period) params = params.set('period', filter.period);

    return this.http
      .get<Record<string, unknown>[]>(
        `/attendance-reports-payroll/society/${encodeURIComponent(societyId)}/payroll-data`,
        { params }
      )
      .pipe(
        map(rows => (rows ?? []).map(r => apiToPayrollData(r))),
        catchError(err => {
          console.error('Failed to load payroll data', err);
          return of([]);
        })
      );
  }

  exportPayrollData(id: string): Observable<Record<string, unknown>> {
    return this.http
      .get<Record<string, unknown>>(
        `/attendance-reports-payroll/payroll-data/${encodeURIComponent(id)}/export`
      )
      .pipe(
        catchError(err => {
          console.error('Failed to export payroll data', err);
          return of({});
        })
      );
  }
}
