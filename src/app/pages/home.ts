import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Pwa } from '../core/pwa';
@Component({
  selector: 'app-home',
  imports: [RouterLink],
  template: `
    <section class="hero">
      <div class="hero-copy">
        <span class="eyebrow"
          ><span class="live-dot"></span> UNE APPLICATION. PLEIN DE POSSIBILITÉS.</span
        >
        <h1>Tout un monde.<br />Dans votre <em>poche.</em></h1>
        <p>
          Un lien suffit. Découvrez une application qui s’installe, prend des photos et vous
          accompagne même sans réseau.
        </p>
        <div class="actions">
          <a class="button primary" routerLink="/decouvrir"
            >C’est parti <span aria-hidden="true">↗</span></a
          ><a class="button ghost" href="#installation" (click)="showInstall($event)"
            >Comment l’installer ? <span aria-hidden="true">↓</span></a
          >
        </div>
        <div class="hero-proof">
          <span>✓ Sans store</span><span>✓ iPhone & Android</span><span>✓ Même hors ligne</span>
        </div>
      </div>
      <div class="hero-art" aria-hidden="true">
        <div class="orbit orbit-one"></div>
        <div class="orbit orbit-two"></div>
        <div class="float-tag tag-top"><span class="tiny-icon">↧</span> Prête à emporter</div>
        <div class="demo-phone">
          <div class="phone-notch"></div>
          <div class="phone-header">
            <span class="brand-symbol">p.</span><b>Bonjour, vous.</b
            ><small>Votre quotidien, en plus simple.</small>
          </div>
          <div class="phone-weather">
            <span>☀</span>
            <div><strong>24°</strong><small>Un air de liberté</small></div>
          </div>
          <div class="phone-tiles">
            <div>⌖<small>Explorer</small></div>
            <div>▣<small>Capturer</small></div>
          </div>
          <div class="phone-offline"><span class="live-dot"></span> Disponible hors ligne</div>
          <div class="phone-bar"></div>
        </div>
        <div class="float-tag tag-bottom">
          <span class="tiny-icon mint">✓</span>
          <div>100 % web<small>L’expérience d’une app.</small></div>
        </div>
        <span class="art-note">Une démo à toucher du doigt.</span>
      </div>
    </section>
    <section class="section-heading">
      <div>
        <span class="eyebrow">À VOUS DE JOUER</span>
        <h2>Votre téléphone a du talent.</h2>
      </div>
      <p>Testez ses possibilités, une à une.</p>
    </section>
    <div class="feature-grid">
      <a class="feature-card" routerLink="/capteurs"
        ><span class="feature-icon blue">⌖</span><span class="card-arrow">↗</span>
        <h3>Gardez le cap</h3>
        <p>Votre position et un niveau à bulle qui suit vos mouvements.</p>
        <span class="card-link">Explorer les capteurs</span></a
      >
      <a class="feature-card" routerLink="/photos"
        ><span class="feature-icon mint">▣</span><span class="card-arrow">↗</span>
        <h3>Capturez l’instant</h3>
        <p>Prenez une photo. Retrouvez-la ici, même en mode avion.</p>
        <span class="card-link">Ouvrir la caméra</span></a
      >
      <a class="feature-card" routerLink="/meteo"
        ><span class="feature-icon peach">☀</span><span class="card-arrow">↗</span>
        <h3>Prenez l’air</h3>
        <p>La météo là où vous êtes. Juste ce qu’il faut pour sortir.</p>
        <span class="card-link">Consulter la météo</span></a
      >
    </div>
    <section class="offline-callout">
      <span class="callout-icon" aria-hidden="true">↯</span>
      <div>
        <span class="eyebrow">LE RÉSEAU S’ARRÊTE. PAS VOTRE APPLICATION.</span>
        <h2>Et si vous passiez en mode avion ?</h2>
        <p>
          Après le premier chargement complet, les pages et vos photos restent disponibles. Faites
          le test !
        </p>
      </div>
      <span class="pill" [class.muted]="!pwa.offlineReady()">{{
        pwa.offlineReady() ? '✓ Prête hors ligne' : 'Préparation hors ligne…'
      }}</span>
    </section>
    <p class="capability-heading">Les possibilités de votre navigateur</p>
    <div class="capability-list">
      @for (cap of capabilities; track cap.label) {
        <span
          ><b>{{ cap.label }}</b> {{ cap.available ? 'À tester ✓' : 'Non disponible ici' }}</span
        >
      }
    </div>
    <section id="installation" class="install-section">
      <div class="section-heading">
        <div>
          <span class="eyebrow">UNE PLACE SUR VOTRE ÉCRAN</span>
          <h2>Installez-la en quelques gestes.</h2>
        </div>
        @if (pwa.installed()) {
          <span class="pill">✓ Application installée</span>
        }
      </div>
      @if (pwa.installPrompt()) {
        <button class="primary" (click)="pwa.install()">Installer PWA Pocket ↧</button>
      }
      <div class="two-col">
        <article class="card">
          <h3>Sur iPhone ou iPad</h3>
          <ol>
            <li>Ouvrez ce site dans Safari.</li>
            <li>Touchez <strong>Partager</strong>, puis <strong>Sur l’écran d’accueil</strong>.</li>
            <li>Confirmez l’ajout, puis ouvrez l’application depuis son icône.</li>
          </ol>
        </article>
        <article class="card">
          <h3>Sur Android</h3>
          <ol>
            <li>Ouvrez ce site dans Chrome.</li>
            <li>Touchez <strong>Installer</strong> si le bouton apparaît, ou le menu ⋮.</li>
            <li>
              Choisissez <strong>Installer l’application</strong> ou
              <strong>Ajouter à l’écran d’accueil</strong>.
            </li>
          </ol>
        </article>
      </div>
    </section>
    <p class="fine-print">
      Les fonctionnalités dépendent de votre appareil et de ses autorisations. Illustration météo
      fictive dans le téléphone ci-dessus.
    </p>
  `,
})
export class Home {
  pwa = inject(Pwa);
  capabilities = [
    { label: 'Position', available: 'geolocation' in navigator },
    { label: 'Caméra', available: !!navigator.mediaDevices?.getUserMedia },
    { label: 'Inclinaison', available: typeof DeviceOrientationEvent !== 'undefined' },
    { label: 'Notifications', available: 'Notification' in window && 'serviceWorker' in navigator },
  ];
  showInstall(e: Event) {
    e.preventDefault();
    document.getElementById('installation')?.scrollIntoView({ behavior: 'smooth' });
  }
}
