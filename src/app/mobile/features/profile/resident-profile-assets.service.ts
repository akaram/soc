import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, switchMap, map, catchError } from 'rxjs';
import { MobileAuthService, MobileUser } from '../../services/mobile-auth.service';
import { SessionContextService } from '../../../core/services/session-context.service';
import { PetService } from '../pets/services/pet.service';
import { PetSpecies, PetGender, RegistrationStatus } from '../pets/models/pet.model';

/** POC list row with optional link to backend record. */
export type PocPetRow = {
  id: string;
  backendId?: string;
  name: string;
  type: string;
  breed: string;
  status: string;
};

export type PocVehicleRow = {
  id: string;
  backendId?: string;
  registrationNumber: string;
  make: string;
  model: string;
  status: string;
};

/**
 * Syncs profile pets/vehicles to the backend so admin "Registered Assets" reflects real data.
 */
@Injectable({ providedIn: 'root' })
export class ResidentProfileAssetsService {
  constructor(
    private auth: MobileAuthService,
    private session: SessionContextService,
    private petService: PetService,
    private http: HttpClient
  ) {}

  /** Create or update a pet on the server; returns backend id when successful. */
  syncPet(row: PocPetRow): Observable<string | null> {
    const user = this.auth.getCurrentUser();
    const societyId = user?.societyId || this.session.getSocietyId();
    if (!user?.id || !societyId) {
      return of(null);
    }

    return this.petService
      .resolveFlatForRegistration({
        flatId: user.flatId,
        flatNumber: user.flatNumber,
        userId: user.id,
        societyId
      })
      .pipe(
      switchMap(flat => {
        if (!flat?.id) {
          return of(null);
        }
        const species = this.mapTypeToSpecies(row.type);
        const ownerId = flat.ownerId || user.id;
        if (row.backendId) {
          return this.http
            .put<Record<string, unknown>>(`/pets/${encodeURIComponent(row.backendId)}`, {
              name: row.name,
              species,
              breed: row.breed
            })
            .pipe(
              map(() => row.backendId!),
              catchError(() => of(null))
            );
        }
        return this.petService
          .addPet({
            name: row.name,
            species,
            breed: row.breed,
            gender: PetGender.MALE,
            dateOfBirth: new Date(),
            color: '',
            flatId: flat.id,
            flatNumber: flat.flatNumber || user.flatNumber || '',
            ownerId,
            ownerName: user.name,
            ownerPhone: user.phone || '',
            societyId,
            registrationNumber: `REG-${Date.now()}`,
            registrationDate: new Date(),
            registrationStatus: RegistrationStatus.PENDING,
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: user.id
          })
          .pipe(
            map(p => p.id || null),
            catchError(() => of(null))
          );
      })
    );
  }

  /** Create or update a vehicle on the server; returns backend id when successful. */
  syncVehicle(row: PocVehicleRow): Observable<string | null> {
    const user = this.auth.getCurrentUser();
    const societyId = user?.societyId || this.session.getSocietyId();
    if (!user?.id || !societyId) {
      return of(null);
    }

    if (row.backendId) {
      return this.http
        .put<Record<string, unknown>>(`/vehicles/${encodeURIComponent(row.backendId)}`, {
          registrationNumber: row.registrationNumber.toUpperCase(),
          make: row.make,
          model: row.model,
          status: row.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE'
        })
        .pipe(
          map(() => row.backendId!),
          catchError(() => of(null))
        );
    }

    const today = new Date().toISOString().split('T')[0];
    const body: Record<string, unknown> = {
      societyId,
      ownerId: user.id,
      flatId: user.flatId || undefined,
      registrationNumber: row.registrationNumber.toUpperCase(),
      vehicleType: 'FOUR_WHEELER',
      make: row.make,
      model: row.model,
      color: 'N/A',
      year: new Date().getFullYear(),
      ownerType: 'RESIDENT',
      status: 'ACTIVE',
      approvalStatus: 'PENDING',
      registrationDate: today,
      createdBy: user.id,
      remarks: 'Registered from mobile profile'
    };

    return this.http.post<Record<string, unknown>>('/vehicles', body).pipe(
      map(raw => {
        const id = String(raw['id'] ?? '').trim();
        return id || null;
      }),
      catchError(() => of(null))
    );
  }

  private mapTypeToSpecies(type: string): PetSpecies {
    const t = (type || '').trim().toLowerCase();
    if (t.includes('dog')) return PetSpecies.DOG;
    if (t.includes('cat')) return PetSpecies.CAT;
    if (t.includes('bird')) return PetSpecies.BIRD;
    if (t.includes('rabbit')) return PetSpecies.RABBIT;
    if (t.includes('fish')) return PetSpecies.FISH;
    return PetSpecies.OTHER;
  }
}
