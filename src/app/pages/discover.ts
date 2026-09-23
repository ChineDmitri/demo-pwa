import { Component, signal } from '@angular/core';
import { testNotification } from '../core/pwa';
import { t } from '../core/i18n';
@Component({
  selector: 'app-discover',
  template: `
    <header class="page-heading">
      <span class="eyebrow">{{ t('discover.eyebrow') }}</span>
      <h1>{{ t('discover.title.line1') }}<br /><em>{{ t('discover.title.emphasis') }}</em></h1>
      <p>{{ t('discover.intro') }}</p>
    </header>
    <div class="two-col three-col">
      <section class="card interactive-card">
        <span class="feature-icon blue">▤</span>
        <h2>{{ t('discover.modalCard.title') }}</h2>
        <p>{{ t('discover.modalCard.text') }}</p>
        <button class="primary" (click)="modal.showModal()">{{ t('discover.modalCard.button') }}</button>
      </section>
      <section class="card interactive-card">
        <span class="feature-icon mint">♧</span>
        <h2>{{ t('discover.notifyCard.title') }}</h2>
        <p>{{ t('discover.notifyCard.text') }}</p>
        <button class="primary" (click)="notify()" [disabled]="busy()">
          {{ busy() ? t('discover.notifyCard.buttonBusy') : t('discover.notifyCard.buttonIdle') }}
        </button>
        <p class="status" role="status">{{ status() }}</p>
        <button class="text-button" (click)="preview.set(true)">
          {{ t('discover.notifyCard.previewLink') }}
        </button>
      </section>
      <section class="card interactive-card">
        <span class="feature-icon peach">✎</span>
        <h2>{{ t('discover.composeCard.title') }}</h2>
        <p>{{ t('discover.composeCard.text') }}</p>
        <button class="primary" (click)="composeStatus.set(''); compose.showModal()">
          {{ t('discover.composeCard.button') }}
        </button>
      </section>
    </div>
    @if (preview()) {
      <aside class="notification-preview" role="status">
        <span class="brand-symbol">p.</span>
        <div>
          <strong>{{ t('discover.preview.title') }}</strong>
          <p>{{ t('discover.preview.text') }}</p>
        </div>
        <button
          class="icon-button"
          [attr.aria-label]="t('discover.preview.closeAria')"
          (click)="preview.set(false)"
        >
          ×
        </button>
      </aside>
    }
    <div class="section-heading">
      <div>
        <span class="eyebrow">{{ t('discover.reading.eyebrow') }}</span>
        <h2>{{ t('discover.reading.title') }}</h2>
      </div>
      <span class="pill">{{ t('discover.reading.pill') }}</span>
    </div>
    <div class="editorial-grid">
      <article class="story story-blue">
        <span class="story-number">01</span><span class="eyebrow">{{ t('discover.story1.eyebrow') }}</span>
        <h2>{{ t('discover.story1.titleLine1') }}<br />{{ t('discover.story1.titleLine2') }}</h2>
        <p>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus vitae sem vel urna
          volutpat tincidunt. Donec vel justo ut lorem consequat commodo.
        </p>
      </article>
      <article class="story story-mint">
        <span class="story-number">02</span><span class="eyebrow">{{ t('discover.story2.eyebrow') }}</span>
        <h2>{{ t('discover.story2.titleLine1') }}<br />{{ t('discover.story2.titleLine2') }}</h2>
        <p>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris porttitor, justo vitae
          facilisis viverra, tellus nibh posuere augue, a placerat ante erat vel nibh.
        </p>
      </article>
      <article class="story story-cream">
        <span class="story-number">03</span><span class="eyebrow">{{ t('discover.story3.eyebrow') }}</span>
        <h2>{{ t('discover.story3.titleLine1') }}<br />{{ t('discover.story3.titleLine2') }}</h2>
        <p>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse potenti. Integer at
          purus sed nibh fermentum interdum. Nulla facilisi.
        </p>
      </article>
    </div>
    <dialog #modal aria-labelledby="modal-title">
      <div class="dialog-heading">
        <span class="feature-icon mint">✦</span
        ><button
          class="icon-button"
          (click)="modal.close()"
          [attr.aria-label]="t('discover.modal.closeAria')"
        >
          ×
        </button>
      </div>
      <span class="eyebrow">{{ t('discover.modal.eyebrow') }}</span>
      <h2 id="modal-title">{{ t('discover.modal.title') }}</h2>
      <p>{{ t('discover.modal.text1') }}</p>
      <p>{{ t('discover.modal.text2') }}</p>
      <button class="primary" (click)="modal.close()">{{ t('discover.modal.button') }}</button>
    </dialog>
    <dialog #compose aria-labelledby="compose-title">
      <div class="dialog-heading">
        <span class="feature-icon peach">✎</span
        ><button
          class="icon-button"
          (click)="compose.close()"
          [attr.aria-label]="t('discover.compose.closeAria')"
        >
          ×
        </button>
      </div>
      <span class="eyebrow">{{ t('discover.compose.eyebrow') }}</span>
      <h2 id="compose-title">{{ t('discover.compose.title') }}</h2>
      <p>{{ t('discover.compose.intro') }}</p>
      <label class="field">
        <span>{{ t('discover.compose.label') }}</span>
        <textarea
          rows="4"
          autofocus
          autocorrect="on"
          autocapitalize="sentences"
          spellcheck="true"
          [placeholder]="t('discover.compose.placeholder')"
          [value]="composeMessage()"
          (input)="onComposeInput($event)"
          (focus)="keepInView($event)"
        ></textarea>
      </label>
      <button class="primary" (click)="sendCompose()" [disabled]="!composeMessage().trim()">
        {{ t('discover.compose.send') }}
      </button>
      <p class="status" role="status">{{ composeStatus() }}</p>
    </dialog>
  `,
})
export class Discover {
  t = t;
  busy = signal(false);
  status = signal('');
  preview = signal(false);
  composeMessage = signal('');
  composeStatus = signal('');
  onComposeInput(event: Event) {
    this.composeMessage.set((event.target as HTMLTextAreaElement).value);
  }
  // Native keyboard-avoidance can miss elements inside a <dialog>; nudge it into view ourselves.
  keepInView(event: Event) {
    (event.target as HTMLElement).scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
  sendCompose() {
    this.composeStatus.set(t('discover.compose.sentStatus'));
    this.composeMessage.set('');
  }
  async notify() {
    this.busy.set(true);
    this.status.set(await testNotification());
    this.busy.set(false);
  }
}
