import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

/** Live weather snapshot for the dashboard widget. */
export interface WeatherSnapshot {
  tempC: number;
  icon: string;
  label: string;
}

/**
 * Fetches current weather via Open-Meteo (free, no API key, browser CORS OK).
 * City comes from the society record in our backend.
 */
@Injectable({ providedIn: 'root' })
export class MobileWeatherService {
  private readonly cache = new Map<string, WeatherSnapshot>();

  constructor(private http: HttpClient) {}

  /** Resolve society city then load current temperature + icon. */
  getWeatherForSociety(societyId: string): Observable<WeatherSnapshot | null> {
    if (!societyId) {
      return of(null);
    }
    return this.http.get<{ city?: string; name?: string }>(`/societies/${encodeURIComponent(societyId)}`).pipe(
      switchMap(society => {
        const city = society?.city?.trim() || society?.name?.trim();
        if (!city) {
          return of(null);
        }
        return this.getWeatherForCity(city);
      }),
      catchError(() => of(null))
    );
  }

  getWeatherForCity(city: string): Observable<WeatherSnapshot | null> {
    const key = city.toLowerCase();
    const cached = this.cache.get(key);
    if (cached) {
      return of(cached);
    }

    const geoParams = new HttpParams().set('name', city).set('count', '1').set('language', 'en').set('format', 'json');

    return this.http
      .get<{ results?: Array<{ latitude: number; longitude: number; name: string }> }>(
        'https://geocoding-api.open-meteo.com/v1/search',
        { params: geoParams }
      )
      .pipe(
        switchMap(geo => {
          const hit = geo.results?.[0];
          if (!hit) {
            return of(null);
          }
          const wxParams = new HttpParams()
            .set('latitude', String(hit.latitude))
            .set('longitude', String(hit.longitude))
            .set('current', 'temperature_2m,weather_code')
            .set('timezone', 'auto');
          return this.http.get<{
            current?: { temperature_2m?: number; weather_code?: number };
          }>('https://api.open-meteo.com/v1/forecast', { params: wxParams });
        }),
        map(wx => {
          const temp = wx?.current?.temperature_2m;
          if (temp == null) {
            return null;
          }
          const code = wx?.current?.weather_code ?? 0;
          const snapshot: WeatherSnapshot = {
            tempC: Math.round(temp),
            icon: this.iconForWeatherCode(code),
            label: this.labelForWeatherCode(code)
          };
          this.cache.set(key, snapshot);
          return snapshot;
        }),
        catchError(() => of(null))
      );
  }

  /** WMO weather code → Material icon (https://open-meteo.com/en/docs). */
  private iconForWeatherCode(code: number): string {
    if (code === 0) return 'wb_sunny';
    if (code <= 3) return 'wb_cloudy';
    if (code <= 48) return 'foggy';
    if (code <= 67) return 'rainy';
    if (code <= 77) return 'ac_unit';
    if (code <= 82) return 'rainy';
    if (code <= 86) return 'ac_unit';
    if (code >= 95) return 'thunderstorm';
    return 'wb_cloudy';
  }

  private labelForWeatherCode(code: number): string {
    if (code === 0) return 'Clear';
    if (code <= 3) return 'Cloudy';
    if (code <= 48) return 'Fog';
    if (code <= 67) return 'Rain';
    if (code <= 77) return 'Snow';
    if (code >= 95) return 'Storm';
    return 'Cloudy';
  }
}
