import { Component, OnDestroy, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { locate, errorMessage } from '../core/device';
import { t } from '../core/i18n';
type OrientationAPI = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<string> };
@Component({
  selector: 'app-sensors',
  imports: [DecimalPipe],
  template: `
    <header class="page-heading">
      <span class="eyebrow">{{ t('sensors.eyebrow') }}</span>
      <h1>{{ t('sensors.title.line1') }}<br /><em>{{ t('sensors.title.emphasis') }}</em></h1>
      <p>{{ t('sensors.intro') }}</p>
    </header>
    <div class="two-col">
      <section class="card">
        <span class="feature-icon blue">⌖</span>
        <h2>{{ t('sensors.location.title') }}</h2>
        <p>{{ t('sensors.location.text') }}</p>
        <button class="primary" (click)="position()" [disabled]="locating()">
          {{ locating() ? t('sensors.location.buttonBusy') : t('sensors.location.buttonIdle') }}
        </button>
        <p role="status" class="status">{{ locationMessage() }}</p>
        @if (coords(); as c) {
          <dl class="metrics">
            <div>
              <dt>{{ t('sensors.location.latitude') }}</dt>
              <dd>{{ c.latitude | number: '1.5-5' }}°</dd>
            </div>
            <div>
              <dt>{{ t('sensors.location.longitude') }}</dt>
              <dd>{{ c.longitude | number: '1.5-5' }}°</dd>
            </div>
            <div>
              <dt>{{ t('sensors.location.accuracy') }}</dt>
              <dd>± {{ c.accuracy | number: '1.0-0' }} m</dd>
            </div>
            <div>
              <dt>{{ t('sensors.location.altitude') }}</dt>
              <dd>
                {{
                  c.altitude === null
                    ? t('sensors.location.altitudeUnavailable')
                    : (c.altitude | number: '1.0-0') + ' m'
                }}
              </dd>
            </div>
          </dl>
        }
        <p class="hint">{{ t('sensors.location.hint') }}</p>
      </section>
      <section class="card">
        <span class="feature-icon mint">⊕</span>
        <h2>{{ t('sensors.tilt.title') }}</h2>
        <p>{{ t('sensors.tilt.text') }}</p>
        <div class="bubble-level" aria-hidden="true">
          <div class="level-ring"></div>
          <div
            class="bubble"
            [style.transform]="'translate(' + bubbleX() + 'px,' + bubbleY() + 'px)'"
          ></div>
        </div>
        <div class="angle-values">
          <span
            >{{ t('sensors.tilt.frontBack') }}
            <strong>{{ beta() === null ? '—' : (beta() | number: '1.0-0') + '°' }}</strong></span
          ><span
            >{{ t('sensors.tilt.leftRight') }}
            <strong>{{ gamma() === null ? '—' : (gamma() | number: '1.0-0') + '°' }}</strong></span
          >
        </div>
        <button class="primary" (click)="active() ? stop() : start()" [disabled]="requesting()">
          {{ active() ? t('sensors.tilt.buttonStop') : t('sensors.tilt.buttonStart') }}
        </button>
        <p role="status" class="status">{{ orientationMessage() }}</p>
      </section>
    </div>
  `,
})
export class Sensors implements OnDestroy {
  t = t;
  coords = signal<GeolocationCoordinates | null>(null);
  locating = signal(false);
  locationMessage = signal('');
  beta = signal<number | null>(null);
  gamma = signal<number | null>(null);
  active = signal(false);
  requesting = signal(false);
  orientationMessage = signal('');
  private timer?: ReturnType<typeof setTimeout>;
  private destroyed = false;
  bubbleX() {
    return Math.max(-75, Math.min(75, (this.gamma() ?? 0) * 2));
  }
  bubbleY() {
    return Math.max(-75, Math.min(75, (this.beta() ?? 0) * 2));
  }
  async position() {
    this.locating.set(true);
    this.locationMessage.set('');
    try {
      const p = await locate();
      if (!this.destroyed) this.coords.set(p.coords);
    } catch (e) {
      this.locationMessage.set(errorMessage(e));
    } finally {
      this.locating.set(false);
    }
  }
  private handler = (e: DeviceOrientationEvent) => {
    if (
      e.beta === null ||
      e.gamma === null ||
      !Number.isFinite(e.beta) ||
      !Number.isFinite(e.gamma)
    )
      return;
    clearTimeout(this.timer);
    this.beta.set(e.beta);
    this.gamma.set(e.gamma);
    this.orientationMessage.set(t('sensors.status.active'));
  };
  async start() {
    if (typeof DeviceOrientationEvent === 'undefined') {
      this.orientationMessage.set(t('sensors.status.unsupported'));
      return;
    }
    this.requesting.set(true);
    try {
      const api = DeviceOrientationEvent as OrientationAPI;
      if (api.requestPermission && (await api.requestPermission()) !== 'granted') {
        this.orientationMessage.set(t('sensors.status.permissionDenied'));
        return;
      }
      if (this.destroyed) return;
      this.active.set(true);
      this.beta.set(null);
      this.gamma.set(null);
      this.orientationMessage.set(t('sensors.status.waiting'));
      window.addEventListener('deviceorientation', this.handler);
      this.timer = setTimeout(() => {
        this.stop();
        this.orientationMessage.set(t('sensors.status.timeout'));
      }, 5000);
    } catch {
      this.orientationMessage.set(t('sensors.status.activationError'));
    } finally {
      this.requesting.set(false);
    }
  }
  stop() {
    clearTimeout(this.timer);
    window.removeEventListener('deviceorientation', this.handler);
    this.active.set(false);
    this.orientationMessage.set(t('sensors.status.stopped'));
  }
  ngOnDestroy() {
    this.destroyed = true;
    this.stop();
  }
}
