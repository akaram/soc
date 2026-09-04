import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, catchError, throwError, of } from 'rxjs';

export interface AmenityUi {
  id: string;
  name: string;
  description: string;
  category: string;
  capacity: number;
  slotTimes: string;
  slots: string[];
  icon: string;
}

export interface AmenityBookingUi {
  id: string;
  amenityId: string;
  amenityName?: string;
  societyId: string;
  flatId: string;
  flatNumber?: string;
  bookedBy: string;
  ownerName?: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  numberOfGuests: number;
  notes?: string;
  status: string;
  paymentStatus?: string;
}

type AmenityRaw = {
  id?: string;
  name?: string;
  description?: string;
  category?: string;
  capacity?: number;
  slotTimes?: string;
};

type BookingRaw = {
  id?: string;
  amenityId?: string;
  amenityName?: string;
  societyId?: string;
  flatId?: string;
  flatNumber?: string;
  bookedBy?: string;
  ownerName?: string;
  bookingDate?: string;
  startTime?: string;
  endTime?: string;
  numberOfGuests?: number;
  notes?: string;
  status?: string;
  paymentStatus?: string;
};

export interface BookAmenityPayload {
  societyId: string;
  flatId?: string;
  bookedBy: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  numberOfGuests: number;
  notes?: string;
  /** Admin bookings confirm immediately; owner self-book stays pending until approved. */
  autoConfirm?: boolean;
}

@Injectable({ providedIn: 'root' })
export class AmenityApiService {
  constructor(private http: HttpClient) {}

  /** Active amenity catalog for a society (pool, gym, clubhouse, etc.). */
  listAmenitiesBySociety(societyId: string): Observable<AmenityUi[]> {
    return this.http
      .get<AmenityRaw[]>(`/amenities/society/${encodeURIComponent(societyId)}`)
      .pipe(
        map(rows => (rows ?? []).map(r => this.normalizeAmenity(r))),
        catchError(err => throwError(() => this.errorMessage(err)))
      );
  }

  getById(id: string): Observable<AmenityUi> {
    return this.http.get<AmenityRaw>(`/amenities/${encodeURIComponent(id)}`).pipe(
      map(r => this.normalizeAmenity(r)),
      catchError(err => throwError(() => this.errorMessage(err)))
    );
  }

  getAvailableSlots(amenityId: string, date: string): Observable<string[]> {
    const params = new HttpParams().set('date', date);
    return this.http
      .get<string[]>(`/amenities/${encodeURIComponent(amenityId)}/slots`, { params })
      .pipe(catchError(err => throwError(() => this.errorMessage(err))));
  }

  book(amenityId: string, payload: BookAmenityPayload): Observable<AmenityBookingUi> {
    return this.http
      .post<BookingRaw>(`/amenities/${encodeURIComponent(amenityId)}/book`, payload)
      .pipe(
        map(r => this.normalizeBooking(r)),
        catchError(err => throwError(() => this.errorMessage(err)))
      );
  }

  listByUser(userId: string): Observable<AmenityBookingUi[]> {
    return this.http
      .get<BookingRaw[]>(`/amenity-bookings/booked-by/${encodeURIComponent(userId)}`)
      .pipe(
        map(rows => (rows ?? []).map(r => this.normalizeBooking(r))),
        catchError(err => throwError(() => this.errorMessage(err)))
      );
  }

  listBookingsBySociety(societyId: string): Observable<AmenityBookingUi[]> {
    return this.http
      .get<BookingRaw[]>(`/amenity-bookings/society/${encodeURIComponent(societyId)}`)
      .pipe(
        map(rows => (rows ?? []).map(r => this.normalizeBooking(r))),
        catchError(err => throwError(() => this.errorMessage(err)))
      );
  }

  listByFlat(flatId: string): Observable<AmenityBookingUi[]> {
    return this.http
      .get<BookingRaw[]>(`/amenity-bookings/flat/${encodeURIComponent(flatId)}`)
      .pipe(
        map(rows => (rows ?? []).map(r => this.normalizeBooking(r))),
        catchError(err => throwError(() => this.errorMessage(err)))
      );
  }

  approve(bookingId: string): Observable<AmenityBookingUi> {
    return this.http
      .put<BookingRaw>(`/amenity-bookings/${encodeURIComponent(bookingId)}/approve`, null)
      .pipe(
        map(r => this.normalizeBooking(r)),
        catchError(err => throwError(() => this.errorMessage(err)))
      );
  }

  reject(bookingId: string): Observable<AmenityBookingUi> {
    return this.http
      .put<BookingRaw>(`/amenity-bookings/${encodeURIComponent(bookingId)}/reject`, null)
      .pipe(
        map(r => this.normalizeBooking(r)),
        catchError(err => throwError(() => this.errorMessage(err)))
      );
  }

  cancel(bookingId: string): Observable<AmenityBookingUi> {
    return this.http
      .put<BookingRaw>(`/amenity-bookings/${encodeURIComponent(bookingId)}/cancel`, null)
      .pipe(
        map(r => this.normalizeBooking(r)),
        catchError(err => throwError(() => this.errorMessage(err)))
      );
  }

  /** Upcoming confirmed bookings for profile badge / header pill. */
  countUpcoming(userId: string): Observable<number> {
    return this.listByUser(userId).pipe(
      map(list => {
        const today = new Date().toISOString().slice(0, 10);
        return list.filter(
          b => (b.status === 'CONFIRMED' || b.status === 'PENDING') && b.bookingDate >= today
        ).length;
      }),
      catchError(() => of(0))
    );
  }

  categoryIcon(category: string): string {
    const map: Record<string, string> = {
      POOL: 'pool',
      FITNESS: 'fitness_center',
      EVENT_HALL: 'celebration',
      SPORTS: 'sports_tennis',
      GARDEN: 'outdoor_grill',
      RECREATION: 'park',
      PARK: 'park',
      OTHER: 'event_available'
    };
    return map[String(category || '').toUpperCase()] || 'event_available';
  }

  private normalizeAmenity(raw: AmenityRaw): AmenityUi {
    const slotTimes = String(raw.slotTimes ?? '');
    const slots = slotTimes
      ? slotTimes.split(',').map(s => s.trim()).filter(Boolean)
      : [];
    const category = String(raw.category ?? 'OTHER');
    return {
      id: String(raw.id ?? ''),
      name: String(raw.name ?? ''),
      description: String(raw.description ?? ''),
      category,
      capacity: Number(raw.capacity ?? 0),
      slotTimes,
      slots,
      icon: this.categoryIcon(category)
    };
  }

  private normalizeBooking(raw: BookingRaw): AmenityBookingUi {
    return {
      id: String(raw.id ?? ''),
      amenityId: String(raw.amenityId ?? ''),
      amenityName: raw.amenityName ? String(raw.amenityName) : undefined,
      societyId: String(raw.societyId ?? ''),
      flatId: String(raw.flatId ?? ''),
      flatNumber: raw.flatNumber ? String(raw.flatNumber) : undefined,
      bookedBy: String(raw.bookedBy ?? ''),
      ownerName: raw.ownerName ? String(raw.ownerName) : undefined,
      bookingDate: String(raw.bookingDate ?? '').slice(0, 10),
      startTime: String(raw.startTime ?? '').slice(0, 5),
      endTime: String(raw.endTime ?? '').slice(0, 5),
      numberOfGuests: Number(raw.numberOfGuests ?? 1),
      notes: raw.notes || undefined,
      status: String(raw.status ?? 'CONFIRMED'),
      paymentStatus: raw.paymentStatus
    };
  }

  private errorMessage(err: { error?: { message?: string }; message?: string; status?: number }): string {
    const msg = err?.message ?? '';
    if (msg.includes('Http failure during parsing') || msg.includes('Unexpected token')) {
      return 'Amenities API returned invalid data. Redeploy nginx with /amenities proxied to the backend (port 9999).';
    }
    return err?.error?.message || msg || 'Request failed';
  }
}
