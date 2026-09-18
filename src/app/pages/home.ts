import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Pwa } from '../core/pwa';
import { t } from '../core/i18n';
@Component({
  selector: 'app-home',
  imports: [RouterLink],
  template: `
    <section class="hero">
      <div class="hero-copy">
        <span class="eyebrow"><span class="live-dot"></span> {{ t('home.eyebrow') }}</span>
        <h1>
          {{ t('home.title.line1') }}<br />{{ t('home.title.line2Pre') }}<em>{{
            t('home.title.line2Em')
          }}</em>
        </h1>
        <p>{{ t('home.intro') }}</p>
        <div class="actions">
          <a class="button primary" routerLink="/decouvrir"
            >{{ t('home.cta.start') }} <span aria-hidden="true">↗</span></a
          ><a class="button ghost" href="#installation" (click)="showInstall($event)"
            >{{ t('home.cta.install') }} <span aria-hidden="true">↓</span></a
          >
        </div>
        <div class="hero-proof">
          <span>{{ t('home.proof.noStore') }}</span><span>{{ t('home.proof.devices') }}</span
          ><span>{{ t('home.proof.offline') }}</span>
        </div>
      </div>
      <div class="hero-art" aria-hidden="true">
        <div class="orbit orbit-one"></div>
        <div class="orbit orbit-two"></div>
        <div class="float-tag tag-top">
          <span class="tiny-icon">↧</span> {{ t('home.phone.tagTop') }}
        </div>
        <div class="demo-phone">
          <div class="phone-notch"></div>
          <div class="phone-header">
            <span class="brand-symbol">p.</span><b>{{ t('home.phone.greeting') }}</b
            ><small>{{ t('home.phone.subtitle') }}</small>
          </div>
          <div class="phone-weather">
            <span>☀</span>
            <div><strong>24°</strong><small>{{ t('home.phone.weatherNote') }}</small></div>
          </div>
          <div class="phone-tiles">
            <div>⌖<small>{{ t('home.phone.tileExplore') }}</small></div>
            <div>▣<small>{{ t('home.phone.tileCapture') }}</small></div>
          </div>
          <div class="phone-offline">
            <span class="live-dot"></span> {{ t('home.phone.offline') }}
          </div>
          <div class="phone-bar"></div>
        </div>
        <div class="float-tag tag-bottom">
          <span class="tiny-icon mint">✓</span>
          <div>{{ t('home.phone.tagBottomTitle') }}<small>{{ t('home.phone.tagBottomNote') }}</small></div>
        </div>
        <span class="art-note">{{ t('home.phone.artNote') }}</span>
      </div>
    </section>
    <section class="section-heading">
      <div>
        <span class="eyebrow">{{ t('home.playSection.eyebrow') }}</span>
        <h2>{{ t('home.playSection.title') }}</h2>
      </div>
      <p>{{ t('home.playSection.subtitle') }}</p>
    </section>
    <div class="feature-grid">
      <a class="feature-card" routerLink="/capteurs"
        ><span class="feature-icon blue">⌖</span><span class="card-arrow">↗</span>
        <h3>{{ t('home.card.sensors.title') }}</h3>
        <p>{{ t('home.card.sensors.text') }}</p>
        <span class="card-link">{{ t('home.card.sensors.link') }}</span></a
      >
      <a class="feature-card" routerLink="/photos"
        ><span class="feature-icon mint">▣</span><span class="card-arrow">↗</span>
        <h3>{{ t('home.card.photos.title') }}</h3>
        <p>{{ t('home.card.photos.text') }}</p>
        <span class="card-link">{{ t('home.card.photos.link') }}</span></a
      >
      <a class="feature-card" routerLink="/meteo"
        ><span class="feature-icon peach">☀</span><span class="card-arrow">↗</span>
        <h3>{{ t('home.card.weather.title') }}</h3>
        <p>{{ t('home.card.weather.text') }}</p>
        <span class="card-link">{{ t('home.card.weather.link') }}</span></a
      >
    </div>
    <section class="offline-callout">
      <span class="callout-icon" aria-hidden="true">↯</span>
      <div>
        <span class="eyebrow">{{ t('home.offline.eyebrow') }}</span>
        <h2>{{ t('home.offline.title') }}</h2>
        <p>{{ t('home.offline.text') }}</p>
      </div>
      <span class="pill" [class.muted]="!pwa.offlineReady()">{{
        pwa.offlineReady() ? t('home.offline.ready') : t('home.offline.preparing')
      }}</span>
    </section>
    <p class="capability-heading">{{ t('home.capabilityHeading') }}</p>
    <div class="capability-list">
      @for (cap of capabilities; track cap.key) {
        <span
          ><b>{{ t('home.capability.' + cap.key) }}</b>
          {{ cap.available ? t('home.capability.available') : t('home.capability.unavailable') }}</span
        >
      }
    </div>
    <section id="installation" class="install-section">
      <div class="section-heading">
        <div>
          <span class="eyebrow">{{ t('home.install.eyebrow') }}</span>
          <h2>{{ t('home.install.title') }}</h2>
        </div>
        @if (pwa.installed()) {
          <span class="pill">{{ t('home.install.installedPill') }}</span>
        }
      </div>
      @if (pwa.installPrompt()) {
        <button class="primary" (click)="pwa.install()">{{ t('home.install.installButton') }}</button>
      }
      <div class="two-col">
        <article class="card">
          <h3>{{ t('home.install.ios.title') }}</h3>
          <ol>
            <li>{{ t('home.install.ios.step1') }}</li>
            <li [innerHTML]="t('home.install.ios.step2')"></li>
            <li>{{ t('home.install.ios.step3') }}</li>
          </ol>
        </article>
        <article class="card">
          <h3>{{ t('home.install.android.title') }}</h3>
          <ol>
            <li>{{ t('home.install.android.step1') }}</li>
            <li [innerHTML]="t('home.install.android.step2')"></li>
            <li [innerHTML]="t('home.install.android.step3')"></li>
          </ol>
        </article>
      </div>
    </section>
    <p class="fine-print">{{ t('home.finePrint') }}</p>
  `,
})
export class Home {
  t = t;
  pwa = inject(Pwa);
  capabilities = [
    { key: 'position', available: 'geolocation' in navigator },
    { key: 'camera', available: !!navigator.mediaDevices?.getUserMedia },
    { key: 'orientation', available: typeof DeviceOrientationEvent !== 'undefined' },
    { key: 'notifications', available: 'Notification' in window && 'serviceWorker' in navigator },
  ];
  showInstall(e: Event) {
    e.preventDefault();
    document.getElementById('installation')?.scrollIntoView({ behavior: 'smooth' });
  }
}
