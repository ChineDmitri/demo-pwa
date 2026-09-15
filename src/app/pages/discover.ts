import { Component, signal } from '@angular/core';
import { testNotification } from '../core/pwa';
@Component({
  selector: 'app-discover',
  template: `
    <header class="page-heading">
      <span class="eyebrow">01 / DÉCOUVRIR</span>
      <h1>Un site ?<br /><em>Une vraie expérience.</em></h1>
      <p>Naviguez, interagissez, recevez un petit signe. Tout se passe ici.</p>
    </header>
    <div class="two-col">
      <section class="card interactive-card">
        <span class="feature-icon blue">▤</span>
        <h2>Ouvrez la conversation</h2>
        <p>Une fenêtre pour raconter, confirmer ou simplement vous surprendre.</p>
        <button class="primary" (click)="modal.showModal()">Ouvrir une pop-up ↗</button>
      </section>
      <section class="card interactive-card">
        <span class="feature-icon mint">♧</span>
        <h2>Un petit bonjour</h2>
        <p>
          Testez une notification immédiate. L’autorisation vous sera demandée au premier essai.
        </p>
        <button class="primary" (click)="notify()" [disabled]="busy()">
          {{ busy() ? 'Un instant…' : 'Tester une notification' }}
        </button>
        <p class="status" role="status">{{ status() }}</p>
        <button class="text-button" (click)="preview.set(true)">
          Voir une notification de démonstration
        </button>
      </section>
    </div>
    @if (preview()) {
      <aside class="notification-preview" role="status">
        <span class="brand-symbol">p.</span>
        <div>
          <strong>Bonjour depuis votre poche 👋</strong>
          <p>Démonstration dans l’application · ceci n’est pas une notification système.</p>
        </div>
        <button
          class="icon-button"
          aria-label="Fermer la démonstration"
          (click)="preview.set(false)"
        >
          ×
        </button>
      </aside>
    }
    <div class="section-heading">
      <div>
        <span class="eyebrow">UN PEU DE LECTURE</span>
        <h2>Du contenu à emporter.</h2>
      </div>
      <span class="pill">Disponible hors ligne</span>
    </div>
    <div class="editorial-grid">
      <article class="story story-blue">
        <span class="story-number">01</span><span class="eyebrow">L’ENVIE D’EXPLORER</span>
        <h2>Les belles idées<br />voyagent léger.</h2>
        <p>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus vitae sem vel urna
          volutpat tincidunt. Donec vel justo ut lorem consequat commodo.
        </p>
      </article>
      <article class="story story-mint">
        <span class="story-number">02</span><span class="eyebrow">LE PLAISIR DE LA SIMPLICITÉ</span>
        <h2>Moins d’étapes.<br />Plus de possibilités.</h2>
        <p>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris porttitor, justo vitae
          facilisis viverra, tellus nibh posuere augue, a placerat ante erat vel nibh.
        </p>
      </article>
      <article class="story story-cream">
        <span class="story-number">03</span><span class="eyebrow">TOUJOURS À PORTÉE</span>
        <h2>Votre quotidien,<br />sans interruption.</h2>
        <p>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse potenti. Integer at
          purus sed nibh fermentum interdum. Nulla facilisi.
        </p>
      </article>
    </div>
    <dialog #modal aria-labelledby="modal-title">
      <div class="dialog-heading">
        <span class="feature-icon mint">✦</span
        ><button class="icon-button" (click)="modal.close()" aria-label="Fermer la fenêtre">
          ×
        </button>
      </div>
      <span class="eyebrow">PETITE FENÊTRE, GRANDES IDÉES</span>
      <h2 id="modal-title">Bonjour, vous !</h2>
      <p>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Cette fenêtre fonctionne aussi sans
        connexion.
      </p>
      <p>
        Une PWA peut offrir des interactions fluides, directement depuis votre navigateur ou votre
        écran d’accueil.
      </p>
      <button class="primary" (click)="modal.close()">C’est compris ✓</button>
    </dialog>
  `,
})
export class Discover {
  busy = signal(false);
  status = signal('');
  preview = signal(false);
  async notify() {
    this.busy.set(true);
    this.status.set(await testNotification());
    this.busy.set(false);
  }
}
