import { Injectable } from '@angular/core';
import { t } from './i18n';
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
    if (!res.ok) throw new Error(t('weatherApi.serviceDown'));
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
      throw new Error(t('weatherApi.incompleteData'));
    }
    return data;
  }
}
export function weatherLabel(code: number): string {
  if (code === 0) return t('weather.code.clear');
  if (code <= 3) return t('weather.code.cloudy');
  if (code <= 48) return t('weather.code.fog');
  if (code <= 67) return t('weather.code.rain');
  if (code <= 77) return t('weather.code.snow');
  if (code <= 82) return t('weather.code.showers');
  if (code <= 86) return t('weather.code.snowShowers');
  return t('weather.code.storm');
}
