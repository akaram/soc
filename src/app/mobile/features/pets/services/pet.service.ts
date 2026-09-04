import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, of, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import {
  Pet,
  PetSpecies,
  RegistrationStatus,
  VaccinationRecord,
  VaccineType,
  HealthRecord,
  HealthRecordType,
  PetActivityLog,
  PetActivityType,
  PetComplaint,
  ComplaintStatus,
  VaccinationReminder,
  PetStatistics
} from '../models/pet.model';
import {
  mapPetFromApi,
  buildPetCreateBody,
  mapVaccinationFromApi,
  buildVaccinationCreateBody,
  mapHealthFromApi,
  buildHealthCreateBody
} from './pet-api.mapper';
import { SessionContextService } from '../../../../core/services/session-context.service';

/** Flat row resolved for pet registration / profile sync. */
export type ResolvedFlat = {
  id: string;
  ownerId?: string;
  flatNumber: string;
  societyId?: string;
};

/** Normalize flat labels so A-2001, A 2001, and a2001 match society records. */
function normalizeFlatLabel(value: string): string {
  return value.trim().toLowerCase().replace(/[\s\-_.]/g, '');
}

function mapFlatRow(hit: Record<string, unknown>, fallbackNumber = ''): ResolvedFlat {
  return {
    id: String(hit['id'] ?? ''),
    ownerId:
      hit['ownerId'] != null
        ? String(hit['ownerId'])
        : hit['owner_id'] != null
          ? String(hit['owner_id'])
          : undefined,
    flatNumber: String(hit['flatNumber'] ?? hit['flat_number'] ?? fallbackNumber),
    societyId:
      hit['societyId'] != null
        ? String(hit['societyId'])
        : hit['society_id'] != null
          ? String(hit['society_id'])
          : undefined
  };
}

/**
 * Pet registration, vaccinations, and health records use REST. Pet complaints and activity logs remain local demo data until APIs exist.
 */
@Injectable({
  providedIn: 'root'
})
export class PetService {
  private petComplaints: PetComplaint[] = [];
  private petActivityLogs: PetActivityLog[] = [];

  constructor(
    private http: HttpClient,
    private session: SessionContextService
  ) {}

  getPetsByFlat(flatId: string): Observable<Pet[]> {
    if (!flatId) return of([]);
    return this.http.get<Record<string, unknown>[]>(`/pets/flat/${encodeURIComponent(flatId)}`).pipe(
      map(rows => (rows ?? []).map(r => mapPetFromApi(r))),
      catchError(() => of([]))
    );
  }

  getPetsBySociety(societyId: string): Observable<Pet[]> {
    if (!societyId) return of([]);
    return this.http.get<Record<string, unknown>[]>(`/pets/society/${encodeURIComponent(societyId)}`).pipe(
      map(rows => (rows ?? []).map(r => mapPetFromApi(r))),
      catchError(() => of([]))
    );
  }

  getPetsByOwner(ownerId: string): Observable<Pet[]> {
    if (!ownerId) return of([]);
    return this.http.get<Record<string, unknown>[]>(`/pets/owner/${encodeURIComponent(ownerId)}`).pipe(
      map(rows => (rows ?? []).map(r => mapPetFromApi(r))),
      catchError(() => of([]))
    );
  }

  getPetById(id: string): Observable<Pet | undefined> {
    return this.http.get<Record<string, unknown>>(`/pets/${encodeURIComponent(id)}`).pipe(
      map(r => mapPetFromApi(r)),
      catchError(() => of(undefined))
    );
  }

  addPet(pet: Partial<Pet>): Observable<Pet> {
    const societyId = pet.societyId || this.session.getSocietyId();
    const sessionUserId = this.session.getCurrentUserId();
    // Prefer explicit owner on the pet; fall back to logged-in user (never society id).
    const ownerId =
      pet.ownerId ||
      (sessionUserId && sessionUserId !== societyId ? sessionUserId : '');
    if (!ownerId) {
      return throwError(
        () =>
          new Error(
            'Owner could not be resolved. Assign an owner to the flat in Society Setup, or sign in as the resident.'
          )
      );
    }
    const createdBy = sessionUserId && sessionUserId !== societyId ? sessionUserId : ownerId;
    const reg = pet.registrationNumber || `REG-${Date.now()}`;
    const body = buildPetCreateBody({
      societyId,
      flatId: pet.flatId!,
      ownerId,
      createdBy,
      name: pet.name!,
      species: String(pet.species),
      breed: pet.breed!,
      gender: String(pet.gender),
      dateOfBirth: pet.dateOfBirth ? pet.dateOfBirth.toISOString().split('T')[0] : undefined,
      color: pet.color,
      weight: pet.weight,
      microchipNumber: pet.microchipNumber,
      registrationNumber: reg,
      isNeutered: pet.isNeutered,
      identificationMarks: pet.identificationMarks
    });
    return this.http.post<Record<string, unknown>>('/pets', body).pipe(map(r => mapPetFromApi(r)));
  }

  updatePet(id: string, updates: Partial<Pet>): Observable<Pet> {
    return this.http
      .put<Record<string, unknown>>(`/pets/${encodeURIComponent(id)}`, updates as Record<string, unknown>)
      .pipe(
        map(r => mapPetFromApi(r)),
        catchError(err => throwError(() => err))
      );
  }

  deletePet(id: string): Observable<boolean> {
    return this.http.delete<void>(`/pets/${encodeURIComponent(id)}`).pipe(
      map(() => true),
      catchError(err => throwError(() => err))
    );
  }

  /** List vaccinations for one pet (newest first on server). */
  getVaccinationRecords(petId: string, petName = ''): Observable<VaccinationRecord[]> {
    if (!petId) return of([]);
    return this.http.get<Record<string, unknown>[]>(`/pets/${encodeURIComponent(petId)}/vaccinations`).pipe(
      map(rows => (rows ?? []).map(r => mapVaccinationFromApi(r, petName))),
      catchError(() => of([]))
    );
  }

  addVaccinationRecord(record: Partial<VaccinationRecord>): Observable<VaccinationRecord> {
    const petId = record.petId!;
    const administered = record.administeredDate!;
    const body = buildVaccinationCreateBody({
      vaccineName: record.vaccineName!,
      vaccineType: String(record.vaccineType),
      administeredDate: administered.toISOString().split('T')[0],
      nextDueDate: record.nextDueDate ? record.nextDueDate.toISOString().split('T')[0] : undefined,
      batchNumber: record.batchNumber,
      veterinarianName: record.veterinarianName!,
      clinicName: record.veterinaryClinic!,
      certificateUrl: record.certificateUrl,
      notes: record.notes
    });
    const pname = record.petName ?? '';
    return this.http
      .post<Record<string, unknown>>(`/pets/${encodeURIComponent(petId)}/vaccinations`, body)
      .pipe(map(r => mapVaccinationFromApi(r, pname)));
  }

  deleteVaccinationRecord(petId: string, vaccinationId: string): Observable<boolean> {
    return this.http
      .delete<void>(`/pets/${encodeURIComponent(petId)}/vaccinations/${encodeURIComponent(vaccinationId)}`)
      .pipe(
        map(() => true),
        catchError(() => of(false))
      );
  }

  getUpcomingVaccinations(daysAhead: number = 30): Observable<VaccinationRecord[]> {
    const sid = this.session.getSocietyId();
    if (!sid) return of([]);
    const params = new HttpParams().set('days', String(daysAhead));
    return this.http
      .get<Record<string, unknown>[]>(`/pets/society/${encodeURIComponent(sid)}/vaccinations/upcoming`, { params })
      .pipe(
        map(rows => (rows ?? []).map(r => mapVaccinationFromApi(r, String(r['petName'] ?? '')))),
        catchError(() => of([]))
      );
  }

  getOverdueVaccinations(): Observable<VaccinationRecord[]> {
    const sid = this.session.getSocietyId();
    if (!sid) return of([]);
    return this.http
      .get<Record<string, unknown>[]>(`/pets/society/${encodeURIComponent(sid)}/vaccinations/overdue`)
      .pipe(
        map(rows => (rows ?? []).map(r => mapVaccinationFromApi(r, String(r['petName'] ?? '')))),
        catchError(() => of([]))
      );
  }

  /** Health visits for one pet (newest first on server). */
  getHealthRecords(petId: string, petName = ''): Observable<HealthRecord[]> {
    if (!petId) return of([]);
    return this.http.get<Record<string, unknown>[]>(`/pets/${encodeURIComponent(petId)}/health-records`).pipe(
      map(rows => (rows ?? []).map(r => mapHealthFromApi(r, petName))),
      catchError(() => of([]))
    );
  }

  addHealthRecord(record: Partial<HealthRecord>): Observable<HealthRecord> {
    const petId = record.petId!;
    const visitDate = record.date!;
    const medPayload = (record.medications ?? []).map(m => ({
      name: m.name,
      dosage: m.dosage,
      frequency: m.frequency,
      startDate: m.startDate.toISOString().split('T')[0],
      endDate: m.endDate ? m.endDate.toISOString().split('T')[0] : undefined
    }));
    const body = buildHealthCreateBody({
      recordType: String(record.recordType),
      recordDate: visitDate.toISOString().split('T')[0],
      veterinarianName: record.veterinarianName!,
      clinicName: record.veterinaryClinic!,
      diagnosis: record.diagnosis,
      treatment: record.treatment,
      followUpDate: record.followUpDate ? record.followUpDate.toISOString().split('T')[0] : undefined,
      documentUrl: record.documentUrl,
      notes: record.notes,
      medications: medPayload
    });
    const pname = record.petName ?? '';
    return this.http
      .post<Record<string, unknown>>(`/pets/${encodeURIComponent(petId)}/health-records`, body)
      .pipe(map(r => mapHealthFromApi(r, pname)));
  }

  deleteHealthRecord(petId: string, healthRecordId: string): Observable<boolean> {
    return this.http
      .delete<void>(`/pets/${encodeURIComponent(petId)}/health-records/${encodeURIComponent(healthRecordId)}`)
      .pipe(
        map(() => true),
        catchError(() => of(false))
      );
  }

  /** Society-wide vet follow-ups in the next N days (for dashboards). */
  getHealthFollowUps(daysAhead: number = 30): Observable<HealthRecord[]> {
    const sid = this.session.getSocietyId();
    if (!sid) return of([]);
    const params = new HttpParams().set('days', String(daysAhead));
    return this.http
      .get<Record<string, unknown>[]>(`/pets/society/${encodeURIComponent(sid)}/health-records/follow-ups`, {
        params
      })
      .pipe(
        map(rows => (rows ?? []).map(r => mapHealthFromApi(r, String(r['petName'] ?? '')))),
        catchError(() => of([]))
      );
  }

  getPetComplaints(petId: string): Observable<PetComplaint[]> {
    return of(this.petComplaints.filter(c => c.petId === petId));
  }

  addPetComplaint(complaint: Partial<PetComplaint>): Observable<PetComplaint> {
    const newComplaint: PetComplaint = {
      id: `PC-${Date.now()}`,
      petId: complaint.petId!,
      petName: complaint.petName!,
      flatNumber: complaint.flatNumber!,
      complaintType: complaint.complaintType!,
      description: complaint.description!,
      incidentDate: complaint.incidentDate!,
      reportedBy: complaint.reportedBy!,
      reportedDate: new Date(),
      status: ComplaintStatus.OPEN,
      attachments: complaint.attachments
    };
    this.petComplaints.unshift(newComplaint);
    return of(newComplaint);
  }

  getPetActivityLogs(petId: string): Observable<PetActivityLog[]> {
    return of(this.petActivityLogs.filter(log => log.petId === petId));
  }

  addActivityLog(log: Partial<PetActivityLog>): Observable<PetActivityLog> {
    const newLog: PetActivityLog = {
      id: `ACT-${Date.now()}`,
      petId: log.petId!,
      petName: log.petName!,
      activityType: log.activityType!,
      activityDate: log.activityDate!,
      description: log.description!,
      performedBy: log.performedBy!,
      notes: log.notes
    };
    this.petActivityLogs.unshift(newLog);
    return of(newLog);
  }

  getPetStatistics(societyId: string): Observable<PetStatistics> {
    return forkJoin({
      pets: this.getPetsBySociety(societyId),
      upcoming: this.getUpcomingVaccinations(60).pipe(catchError(() => of([] as VaccinationRecord[]))),
      overdue: this.getOverdueVaccinations().pipe(catchError(() => of([] as VaccinationRecord[])))
    }).pipe(
      map(({ pets, upcoming, overdue }) => ({
        totalPets: pets.length,
        totalDogs: pets.filter(p => p.species === PetSpecies.DOG).length,
        totalCats: pets.filter(p => p.species === PetSpecies.CAT).length,
        totalOther: pets.filter(p => p.species !== PetSpecies.DOG && p.species !== PetSpecies.CAT).length,
        pendingRegistrations: pets.filter(p => p.registrationStatus === RegistrationStatus.PENDING).length,
        upcomingVaccinations: upcoming.length,
        expiredVaccinations: overdue.length,
        activeComplaints: this.petComplaints.filter(
          c => c.status === ComplaintStatus.OPEN || c.status === ComplaintStatus.UNDER_REVIEW
        ).length
      }))
    );
  }

  updateRegistrationStatus(petId: string, status: RegistrationStatus, approvedBy?: string): Observable<Pet> {
    const uid = approvedBy || this.session.getCurrentUserId();
    if (status === RegistrationStatus.APPROVED) {
      const params = new HttpParams().set('approvedBy', uid || 'system');
      return this.http
        .post<Record<string, unknown>>(`/pets/${encodeURIComponent(petId)}/approve`, null, { params })
        .pipe(map(r => mapPetFromApi(r)));
    }
    if (status === RegistrationStatus.REJECTED) {
      return this.http
        .post<Record<string, unknown>>(`/pets/${encodeURIComponent(petId)}/reject`, null)
        .pipe(map(r => mapPetFromApi(r)));
    }
    return this.updatePet(petId, { registrationStatus: status, approvedBy });
  }

  /**
   * All flats in a society for registration dropdowns.
   */
  listFlatsBySociety(societyId?: string): Observable<ResolvedFlat[]> {
    const sid = (societyId || this.session.getSocietyId()).trim();
    if (!sid) {
      return of([]);
    }
    return this.http.get<Record<string, unknown>[]>(`/flats/society/${encodeURIComponent(sid)}`).pipe(
      map(rows =>
        (rows ?? [])
          .map(r => mapFlatRow(r))
          .filter(f => !!f.id)
          .sort((a, b) => a.flatNumber.localeCompare(b.flatNumber, undefined, { numeric: true }))
      ),
      catchError(() => of([]))
    );
  }

  /**
   * Load a flat by id (used when the resident profile already has flatId from admin link).
   */
  getFlatById(flatId: string): Observable<ResolvedFlat | null> {
    const id = flatId?.trim();
    if (!id) {
      return of(null);
    }
    return this.http.get<Record<string, unknown>>(`/flats/${encodeURIComponent(id)}`).pipe(
      map(hit => (hit?.['id'] ? mapFlatRow(hit) : null)),
      catchError(() => of(null))
    );
  }

  /**
   * Resolve flat UUID and owner by flat number within a society (tolerant label matching).
   */
  resolveFlatByNumber(
    flatNumber: string,
    societyId?: string
  ): Observable<ResolvedFlat | null> {
    const sid = (societyId || this.session.getSocietyId()).trim();
    const label = flatNumber?.trim();
    if (!sid || !label) {
      return of(null);
    }
    const target = normalizeFlatLabel(label);
    return this.http.get<Record<string, unknown>[]>(`/flats/society/${encodeURIComponent(sid)}`).pipe(
      map(flats => {
        const list = flats ?? [];
        let hit = list.find(
          f => normalizeFlatLabel(String(f['flatNumber'] ?? f['flat_number'] ?? '')) === target
        );
        if (!hit) {
          hit = list.find(f => {
            const n = normalizeFlatLabel(String(f['flatNumber'] ?? f['flat_number'] ?? ''));
            return n.endsWith(target) || target.endsWith(n);
          });
        }
        return hit ? mapFlatRow(hit, label) : null;
      }),
      catchError(() => of(null))
    );
  }

  /**
   * Best-effort flat resolution for mobile profile sync and pet registration:
   * linked flatId → user profile flatId → flat number in society.
   */
  resolveFlatForRegistration(opts: {
    flatId?: string;
    flatNumber?: string;
    userId?: string;
    societyId?: string;
  }): Observable<ResolvedFlat | null> {
    const societyId = (opts.societyId || this.session.getSocietyId()).trim();
    const linkedFlatId = opts.flatId?.trim();

    if (linkedFlatId) {
      return this.getFlatById(linkedFlatId).pipe(
        switchMap(flat => {
          if (flat?.id) {
            return of(flat);
          }
          return this.resolveFlatFromUserAndNumber(opts, societyId);
        })
      );
    }

    return this.resolveFlatFromUserAndNumber(opts, societyId);
  }

  private resolveFlatFromUserAndNumber(
    opts: { flatNumber?: string; userId?: string },
    societyId: string
  ): Observable<ResolvedFlat | null> {
    const userId = opts.userId?.trim();
    if (userId) {
      return this.http.get<Record<string, unknown>>(`/users/${encodeURIComponent(userId)}`).pipe(
        switchMap(profile => {
          const profileFlatId = String(profile['flatId'] ?? '').trim();
          if (profileFlatId) {
            return this.getFlatById(profileFlatId).pipe(
              switchMap(flat => {
                if (flat?.id) {
                  return of(flat);
                }
                const num =
                  opts.flatNumber?.trim() || String(profile['flatNumber'] ?? '').trim();
                return num ? this.resolveFlatByNumber(num, societyId) : of(null);
              })
            );
          }
          const num = opts.flatNumber?.trim() || String(profile['flatNumber'] ?? '').trim();
          return num ? this.resolveFlatByNumber(num, societyId) : of(null);
        }),
        catchError(() => {
          const num = opts.flatNumber?.trim();
          return num ? this.resolveFlatByNumber(num, societyId) : of(null);
        })
      );
    }

    const num = opts.flatNumber?.trim();
    return num ? this.resolveFlatByNumber(num, societyId) : of(null);
  }

  /** @deprecated Use {@link resolveFlatByNumber} */
  resolveFlatIdByNumber(flatNumber: string): Observable<string | null> {
    return this.resolveFlatByNumber(flatNumber).pipe(map(f => (f ? f.id : null)));
  }
}
