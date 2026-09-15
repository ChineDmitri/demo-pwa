import { Component, OnDestroy, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { locate, errorMessage } from '../core/device';
type OrientationAPI = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<string> };
@Component({
  selector: 'app-sensors',
  imports: [DecimalPipe],
  template: `
    <header class="page-heading">
      <span class="eyebrow">02 / CAPTEURS</span>
      <h1>À vous de<br /><em>faire bouger les choses.</em></h1>
      <p>Votre position, votre altitude et un niveau à bulle. Le monde réel rencontre le web.</p>
    </header>
    <div class="two-col">
      <section class="card">
        <span class="feature-icon blue">⌖</span>
        <h2>Vous êtes ici.</h2>
        <p>Votre position reste sur cet appareil. Aucun suivi en arrière-plan.</p>
        <button class="primary" (click)="position()" [disabled]="locating()">
          {{ locating() ? 'Recherche en cours…' : 'Obtenir ma position' }}
        </button>
        <p role="status" class="status">{{ locationMessage() }}</p>
        @if (coords(); as c) {
          <dl class="metrics">
            <div>
              <dt>Latitude</dt>
              <dd>{{ c.latitude | number: '1.5-5' }}°</dd>
            </div>
            <div>
              <dt>Longitude</dt>
              <dd>{{ c.longitude | number: '1.5-5' }}°</dd>
            </div>
            <div>
              <dt>Précision</dt>
              <dd>± {{ c.accuracy | number: '1.0-0' }} m</dd>
            </div>
            <div>
              <dt>Altitude</dt>
              <dd>
                {{ c.altitude === null ? 'Indisponible' : (c.altitude | number: '1.0-0') + ' m' }}
              </dd>
            </div>
          </dl>
        }
        <p class="hint">
          Le GPS peut fonctionner sans Internet, mais la recherche de position peut être plus lente
          ou indisponible.
        </p>
      </section>
      <section class="card">
        <span class="feature-icon mint">⊕</span>
        <h2>Trouvez l’équilibre.</h2>
        <p>Posez le téléphone à plat, puis inclinez-le doucement.</p>
        <div class="bubble-level" aria-hidden="true">
          <div class="level-ring"></div>
          <div
            class="bubble"
            [style.transform]="'translate(' + bubbleX() + 'px,' + bubbleY() + 'px)'"
          ></div>
        </div>
        <div class="angle-values">
          <span
            >Avant / arrière
            <strong>{{ beta() === null ? '—' : (beta() | number: '1.0-0') + '°' }}</strong></span
          ><span
            >Gauche / droite
            <strong>{{ gamma() === null ? '—' : (gamma() | number: '1.0-0') + '°' }}</strong></span
          >
        </div>
        <button class="primary" (click)="active() ? stop() : start()" [disabled]="requesting()">
          {{ active() ? 'Arrêter le capteur' : 'Activer l’inclinaison' }}
        </button>
        <p role="status" class="status">{{ orientationMessage() }}</p>
      </section>
    </div>
  `,
})
export class Sensors implements OnDestroy {
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
    this.orientationMessage.set('Capteur actif. À vous de bouger !');
  };
  async start() {
    if (typeof DeviceOrientationEvent === 'undefined') {
      this.orientationMessage.set(
        'Ce navigateur ne propose pas de capteur d’inclinaison. Essayez sur un téléphone.',
      );
      return;
    }
    this.requesting.set(true);
    try {
      const api = DeviceOrientationEvent as OrientationAPI;
      if (api.requestPermission && (await api.requestPermission()) !== 'granted') {
        this.orientationMessage.set(
          'Accès aux mouvements refusé. Vérifiez les autorisations du navigateur.',
        );
        return;
      }
      if (this.destroyed) return;
      this.active.set(true);
      this.beta.set(null);
      this.gamma.set(null);
      this.orientationMessage.set('En attente du capteur…');
      window.addEventListener('deviceorientation', this.handler);
      this.timer = setTimeout(() => {
        this.stop();
        this.orientationMessage.set(
          'Aucune mesure reçue. Le capteur peut être absent ou bloqué sur cet appareil.',
        );
      }, 5000);
    } catch {
      this.orientationMessage.set('Impossible d’activer le capteur. Vérifiez les autorisations.');
    } finally {
      this.requesting.set(false);
    }
  }
  stop() {
    clearTimeout(this.timer);
    window.removeEventListener('deviceorientation', this.handler);
    this.active.set(false);
    this.orientationMessage.set('Capteur arrêté.');
  }
  ngOnDestroy() {
    this.destroyed = true;
    this.stop();
  }
}
