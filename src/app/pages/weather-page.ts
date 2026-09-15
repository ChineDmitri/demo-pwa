import { Component, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { Network } from '../core/network';
import { WeatherApi, WeatherData, weatherLabel } from '../core/weather';
import { locate, errorMessage } from '../core/device';
@Component({
  selector: 'app-weather',
  imports: [DatePipe, DecimalPipe],
  template: `
    <header class="page-heading">
      <span class="eyebrow">04 / MÉTÉO</span>
      <h1>Et dehors,<br /><em>ça donne quoi ?</em></h1>
      <p>Un aperçu du temps, exactement là où vous êtes.</p>
    </header>
    <section class="weather-panel">
      @if (!network.online()) {
        <div class="empty-state">
          <span class="large-symbol">☁</span>
          <h2>La météo fait une pause.</h2>
          <p>Connectez-vous à Internet pour consulter la météo.</p>
          <button class="secondary" (click)="network.check()">Vérifier la connexion</button>
        </div>
      } @else {
        @if (data(); as w) {
          <div class="weather-result">
            <div>
              <span class="eyebrow">AUTOUR DE VOUS</span>
              <h2>{{ label(w.weather_code) }}</h2>
              <p>{{ positionLabel() }}</p>
              <p class="temperature">{{ w.temperature_2m | number: '1.0-1' }}<span>°C</span></p>
              <p>Données du {{ w.time * 1000 | date: 'dd/MM à HH:mm' }}</p>
            </div>
            <div class="weather-sun" aria-hidden="true">{{ w.weather_code === 0 ? '☀' : '☁' }}</div>
          </div>
          <dl class="weather-metrics">
            <div>
              <dt>Ressenti</dt>
              <dd>{{ w.apparent_temperature | number: '1.0-1' }} °C</dd>
            </div>
            <div>
              <dt>Humidité</dt>
              <dd>{{ w.relative_humidity_2m }} %</dd>
            </div>
            <div>
              <dt>Vent</dt>
              <dd>{{ w.wind_speed_10m | number: '1.0-1' }} km/h</dd>
            </div>
          </dl>
        } @else {
          <div class="empty-state">
            <span class="large-symbol">☀</span>
            <h2>Une petite fenêtre sur le ciel.</h2>
            <p>Autorisez votre position pour découvrir la météo locale.</p>
          </div>
        }
        <div class="weather-action">
          <button class="primary" (click)="refresh()" [disabled]="busy()">
            {{
              busy()
                ? 'Recherche en cours…'
                : data()
                  ? 'Actualiser la météo ↻'
                  : 'Voir la météo ici ↗'
            }}
          </button>
          <p class="status" role="status">{{ message() }}</p>
        </div>
      }
    </section>
    <p class="hint">
      Votre position est transmise à Open-Meteo uniquement lorsque vous demandez la météo. Aucune
      position n’est enregistrée.
    </p>
    <p class="fine-print">
      Données :
      <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo</a> ·
      <a
        href="https://creativecommons.org/licenses/by/4.0/"
        target="_blank"
        rel="noopener noreferrer"
        >CC BY 4.0</a
      >
      · Démonstration non commerciale.
    </p>
  `,
})
export class WeatherPage {
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
            ? 'Le service météo ne répond pas. Réessayez dans un instant.'
            : errorMessage(e),
        );
    } finally {
      this.busy.set(false);
    }
  }
}
