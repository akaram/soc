import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

/** Row from GET /module-records/society/:id?moduleCode= */
export interface SocietyModuleRecordRow {
  id: string;
  societyId: string;
  moduleCode: string;
  title: string;
  body?: string;
  status?: string;
  createdAt?: string;
}

@Injectable({ providedIn: 'root' })
export class ModuleRecordService {
  constructor(private http: HttpClient) {}

  list(societyId: string, moduleCode: string): Observable<SocietyModuleRecordRow[]> {
    const params = new HttpParams().set('moduleCode', moduleCode);
    return this.http.get<SocietyModuleRecordRow[]>(
      `/module-records/society/${encodeURIComponent(societyId)}`,
      { params }
    );
  }

  create(row: {
    societyId: string;
    moduleCode: string;
    title: string;
    body?: string;
    status?: string;
  }): Observable<SocietyModuleRecordRow> {
    return this.http.post<SocietyModuleRecordRow>('/module-records', row);
  }

  update(
    id: string,
    patch: { title?: string; body?: string; status?: string }
  ): Observable<SocietyModuleRecordRow> {
    return this.http.put<SocietyModuleRecordRow>(`/module-records/${encodeURIComponent(id)}`, patch);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`/module-records/${encodeURIComponent(id)}`);
  }
}
