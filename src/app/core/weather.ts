import { Injectable } from '@angular/core';
export interface WeatherData {
  temperature_2m: number;
  apparent_temperature: number;
  relative_humidity_2m: number;
  wind_speed_10m: number;
  weather_code: number;
  time: number;
}
@Injectable({ providedIn: 'root' })
export class WeatherApi {
  async current(latitude: number, longitude: number): Promise<WeatherData> {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.search = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      current:
        'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code',
      timeformat: 'unixtime',
    }).toString();
    const res = await fetch(url, { signal: AbortSignal.timeout(12000), cache: 'no-store' });
    if (!res.ok) throw new Error('Le service météo est momentanément indisponible. Réessayez.');
    const data = (await res.json()).current;
    if (
      !data ||
      ![
        'temperature_2m',
        'apparent_temperature',
        'relative_humidity_2m',
        'wind_speed_10m',
        'weather_code',
        'time',
      ].every((k) => typeof data[k] === 'number' && Number.isFinite(data[k]))
    ) {
      throw new Error('Le service météo a renvoyé des données incomplètes.');
    }
    return data;
  }
}
export function weatherLabel(code: number): string {
  if (code === 0) return 'Ciel dégagé';
  if (code <= 3) return 'Passages nuageux';
  if (code <= 48) return 'Brouillard';
  if (code <= 67) return 'Pluie et bruine';
  if (code <= 77) return 'Neige';
  if (code <= 82) return 'Averses';
  if (code <= 86) return 'Averses de neige';
  return 'Orages';
}
