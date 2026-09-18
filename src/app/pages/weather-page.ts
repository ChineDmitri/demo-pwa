import { Component, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { Network } from '../core/network';
import { WeatherApi, WeatherData, weatherLabel } from '../core/weather';
import { locate, errorMessage } from '../core/device';
import { t } from '../core/i18n';
@Component({
  selector: 'app-weather',
  imports: [DatePipe, DecimalPipe],
  template: `
    <header class="page-heading">
      <span class="eyebrow">{{ t('weather.eyebrow') }}</span>
      <h1>{{ t('weather.title.line1') }}<br /><em>{{ t('weather.title.emphasis') }}</em></h1>
      <p>{{ t('weather.intro') }}</p>
    </header>
    <section class="weather-panel">
      @if (!network.online()) {
        <div class="empty-state">
          <span class="large-symbol">☁</span>
          <h2>{{ t('weather.offline.title') }}</h2>
          <p>{{ t('weather.offline.text') }}</p>
          <button class="secondary" (click)="network.check()">{{ t('weather.offline.button') }}</button>
        </div>
      } @else {
        @if (data(); as w) {
          <div class="weather-result">
            <div>
              <span class="eyebrow">{{ t('weather.result.eyebrow') }}</span>
              <h2>{{ label(w.weather_code) }}</h2>
              <p>{{ positionLabel() }}</p>
              <p class="temperature">{{ w.temperature_2m | number: '1.0-1' }}<span>°C</span></p>
              <p>{{ t('weather.result.dataDate') }} {{ w.time * 1000 | date: 'dd/MM · HH:mm' }}</p>
            </div>
            <div class="weather-sun" aria-hidden="true">{{ w.weather_code === 0 ? '☀' : '☁' }}</div>
          </div>
          <dl class="weather-metrics">
            <div>
              <dt>{{ t('weather.metrics.feelsLike') }}</dt>
              <dd>{{ w.apparent_temperature | number: '1.0-1' }} °C</dd>
            </div>
            <div>
              <dt>{{ t('weather.metrics.humidity') }}</dt>
              <dd>{{ w.relative_humidity_2m }} %</dd>
            </div>
            <div>
              <dt>{{ t('weather.metrics.wind') }}</dt>
              <dd>{{ w.wind_speed_10m | number: '1.0-1' }} km/h</dd>
            </div>
          </dl>
        } @else {
          <div class="empty-state">
            <span class="large-symbol">☀</span>
            <h2>{{ t('weather.empty.title') }}</h2>
            <p>{{ t('weather.empty.text') }}</p>
          </div>
        }
        <div class="weather-action">
          <button class="primary" (click)="refresh()" [disabled]="busy()">
            {{
              busy()
                ? t('weather.button.busy')
                : data()
                  ? t('weather.button.refresh')
                  : t('weather.button.view')
            }}
          </button>
          <p class="status" role="status">{{ message() }}</p>
        </div>
      }
    </section>
    <p class="hint">{{ t('weather.hint') }}</p>
    <p class="fine-print">
      {{ t('weather.finePrintPrefix') }}
      <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo</a> ·
      <a
        href="https://creativecommons.org/licenses/by/4.0/"
        target="_blank"
        rel="noopener noreferrer"
        >CC BY 4.0</a
      >
      {{ t('weather.finePrintSuffix') }}
    </p>
  `,
})
export class WeatherPage {
  t = t;
  network = inject(Network);
  api = inject(WeatherApi);
  data = signal<WeatherData | null>(null);
  busy = signal(false);
  message = signal('');
  positionLabel = signal('');
  label = weatherLabel;
  async refresh() {
    this.busy.set(true);
    this.message.set('');
    try {
      if (!(await this.network.check())) return;
      const p = await locate();
      if (!this.network.online()) return;
      this.data.set(await this.api.current(p.coords.latitude, p.coords.longitude));
      this.positionLabel.set(
        p.coords.latitude.toFixed(3) + '°, ' + p.coords.longitude.toFixed(3) + '°',
      );
    } catch (e) {
      if (await this.network.check())
        this.message.set(
          errorMessage(e).includes('fetch') ||
            (e instanceof DOMException && e.name === 'TimeoutError')
            ? t('weather.msg.serviceDown')
            : errorMessage(e),
        );
    } finally {
      this.busy.set(false);
    }
  }
}
