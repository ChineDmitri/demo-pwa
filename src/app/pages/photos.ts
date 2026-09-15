import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { PhotosStore, Photo } from '../core/photos-store';
type ViewPhoto = Photo & { url: string };
@Component({
  selector: 'app-photos',
  imports: [DatePipe],
  template: `
    <header class="page-heading">
      <span class="eyebrow">03 / PHOTOS</span>
      <h1>Les petits instants.<br /><em>Gardez-les ici.</em></h1>
      <p>
        Chaque photo est automatiquement enregistrée dans la galerie de l’application, même sans
        Internet.
      </p>
    </header>
    <section class="card camera-card">
      <div class="camera-preview">
        <video
          #video
          autoplay
          playsinline
          muted
          [hidden]="!streaming()"
          (loadedmetadata)="videoReady.set(true)"
        ></video>
        @if (!streaming()) {
          <div class="camera-placeholder">
            <span class="large-symbol">▣</span>
            <h2>À vous de cadrer.</h2>
            <p>Activez la caméra pour prendre votre première photo.</p>
          </div>
        }
      </div>
      <div class="camera-controls">
        @if (!streaming()) {
          <button class="primary" (click)="startCamera()" [disabled]="busy()">
            Activer la caméra
          </button>
        } @else {
          <button class="primary" (click)="capture()" [disabled]="busy() || !videoReady()">
            Prendre une photo</button
          ><button class="secondary" (click)="stopCamera()">Arrêter la caméra</button>
        }
        <label class="button secondary file-button"
          >Choisir / prendre une photo<input
            type="file"
            accept="image/*"
            capture="environment"
            (change)="importPhoto($event)"
            [disabled]="busy()"
            aria-label="Choisir ou prendre une photo"
        /></label>
      </div>
      <p class="status" role="status">{{ message() }}</p>
    </section>
    @if (latest(); as photo) {
      <section class="card latest-photo">
        <div>
          <span class="eyebrow">VOTRE DERNIÈRE PHOTO</span>
          <h2>Bien capturé.</h2>
          <p>
            {{
              saved()
                ? 'Enregistrée automatiquement dans la galerie de cette application.'
                : 'Photo non enregistrée : exportez-la pour la conserver.'
            }}
          </p>
          <div class="actions">
            <button class="primary" (click)="download(photo)">Télécharger</button
            ><button class="secondary" (click)="share(photo)">Partager / enregistrer</button>
          </div>
        </div>
        <img [src]="photo.url" alt="Dernière photo capturée" />
      </section>
    }
    <div class="section-heading">
      <div>
        <span class="eyebrow">VOS SOUVENIRS DE POCHE</span>
        <h2>
          Ma galerie <span class="count">{{ photos().length }}</span>
        </h2>
      </div>
      <span class="pill">Sur cet appareil</span>
    </div>
    @if (!photos().length) {
      <div class="empty-gallery">
        <span class="feature-icon mint">▧</span>
        <h3>Tout commence par une photo.</h3>
        <p>Vos images apparaîtront ici et resteront accessibles hors ligne.</p>
      </div>
    }
    <div class="gallery">
      @for (photo of photos(); track photo.id) {
        <article class="gallery-item">
          <button
            class="photo-open"
            (click)="selected.set(photo); viewer.showModal()"
            aria-label="Agrandir la photo"
          >
            <img [src]="photo.url" alt="Photo de votre galerie" loading="lazy" />
          </button>
          <div class="gallery-meta">
            <time>{{ photo.created | date: 'dd/MM/yyyy · HH:mm' }}</time>
            <div class="gallery-actions">
              <button
                class="icon-button"
                (click)="download(photo)"
                aria-label="Télécharger cette photo"
              >
                ↓</button
              ><button class="icon-button" (click)="share(photo)" aria-label="Partager cette photo">
                ↗</button
              ><button
                class="icon-button"
                (click)="pendingDelete.set(photo); confirmation.showModal()"
                aria-label="Supprimer cette photo"
              >
                ×
              </button>
            </div>
          </div>
        </article>
      }
    </div>
    <p class="hint">
      Vos photos restent dans le stockage de ce navigateur. Celui-ci peut être effacé par le système
      ou dans vos réglages. Exportez les images à conserver ; l’enregistrement dans Photos ou
      Fichiers dépend de votre téléphone.
    </p>
    <dialog #viewer class="photo-dialog" aria-label="Aperçu de la photo">
      <button class="icon-button close-photo" aria-label="Fermer l’aperçu" (click)="viewer.close()">
        ×
      </button>
      @if (selected(); as p) {
        <img [src]="p.url" alt="Photo agrandie" /><button class="primary" (click)="share(p)">
          Partager / enregistrer
        </button>
      }
    </dialog>
    <dialog #confirmation aria-labelledby="delete-title">
      <h2 id="delete-title">Supprimer cette photo ?</h2>
      <p>
        Elle sera retirée de la galerie de cette application. Les copies déjà exportées seront
        conservées.
      </p>
      <div class="actions">
        <button class="secondary" autofocus (click)="confirmation.close()">Annuler</button
        ><button class="danger" (click)="remove(); confirmation.close()">Supprimer</button>
      </div>
    </dialog>
  `,
})
export class Photos implements OnInit, OnDestroy {
  @ViewChild('video', { static: true }) video!: ElementRef<HTMLVideoElement>;
  store = inject(PhotosStore);
  photos = signal<ViewPhoto[]>([]);
  latest = signal<ViewPhoto | null>(null);
  selected = signal<ViewPhoto | null>(null);
  pendingDelete = signal<ViewPhoto | null>(null);
  streaming = signal(false);
  videoReady = signal(false);
  busy = signal(false);
  saved = signal(false);
  message = signal('');
  private stream?: MediaStream;
  private destroyed = false;
  private urls = new Set<string>();
  private visibility = () => {
    if (document.hidden) this.stopCamera();
  };
  private view(p: Photo): ViewPhoto {
    const url = URL.createObjectURL(p.blob);
    this.urls.add(url);
    return { ...p, url };
  }
  async ngOnInit() {
    document.addEventListener('visibilitychange', this.visibility);
    try {
      const all = await this.store.list();
      if (!this.destroyed)
        this.photos.set(all.sort((a, b) => b.created - a.created).map((p) => this.view(p)));
    } catch {
      this.message.set(
        'Le stockage local est indisponible. Vous pouvez tout de même prendre et exporter une photo.',
      );
    }
  }
  async startCamera() {
    this.busy.set(true);
    this.message.set('');
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('unsupported');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      if (this.destroyed || document.hidden) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      this.stream = stream;
      this.streaming.set(true);
      this.video.nativeElement.srcObject = stream;
      await this.video.nativeElement.play();
    } catch (e) {
      this.stopCamera();
      this.message.set(
        e instanceof DOMException && e.name === 'NotAllowedError'
          ? 'Accès caméra refusé. Modifiez les autorisations ou utilisez « Choisir / prendre une photo ».'
          : 'Caméra indisponible. Utilisez « Choisir / prendre une photo ».',
      );
    } finally {
      this.busy.set(false);
    }
  }
  stopCamera() {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = undefined;
    this.streaming.set(false);
    this.videoReady.set(false);
    if (this.video) this.video.nativeElement.srcObject = null;
  }
  private jpeg(source: CanvasImageSource, width: number, height: number): Promise<Blob> {
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 1920 / Math.max(width, height));
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx || !width || !height) return Promise.reject(new Error('Image invalide'));
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    return new Promise((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Conversion impossible'))),
        'image/jpeg',
        0.85,
      ),
    );
  }
  async capture() {
    this.busy.set(true);
    try {
      const v = this.video.nativeElement;
      await this.save(await this.jpeg(v, v.videoWidth, v.videoHeight));
    } catch {
      this.message.set('La photo n’a pas pu être prise. Réessayez.');
    } finally {
      this.busy.set(false);
    }
  }
  async importPhoto(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.busy.set(true);
    this.message.set('');
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      await this.save(await this.jpeg(img, img.naturalWidth, img.naturalHeight));
    } catch {
      this.message.set('Cette image ne peut pas être ouverte. Essayez une photo JPEG ou PNG.');
    } finally {
      URL.revokeObjectURL(url);
      input.value = '';
      this.busy.set(false);
    }
  }
  private async save(blob: Blob) {
    if (this.destroyed) return;
    const photo = this.view({ id: crypto.randomUUID(), created: Date.now(), blob });
    const previous = this.latest();
    if (previous && !this.photos().some((p) => p.id === previous.id)) this.release(previous);
    this.latest.set(photo);
    this.saved.set(false);
    try {
      await this.store.save(photo);
      if (this.destroyed) return;
      this.photos.update((all) => [photo, ...all]);
      this.saved.set(true);
      this.message.set('Photo enregistrée sur cet appareil ✓');
    } catch {
      this.message.set(
        'Stockage plein ou indisponible. La photo reste visible ci-dessous : téléchargez-la pour la conserver.',
      );
    }
  }
  download(photo: ViewPhoto) {
    const a = document.createElement('a');
    a.href = photo.url;
    a.download = 'pwa-pocket-' + photo.created + '.jpg';
    document.body.append(a);
    a.click();
    a.remove();
  }
  async share(photo: ViewPhoto) {
    const file = new File([photo.blob], 'pwa-pocket-' + photo.created + '.jpg', {
      type: 'image/jpeg',
    });
    if (!navigator.canShare?.({ files: [file] })) {
      this.download(photo);
      this.message.set('Le partage est indisponible ici. Téléchargement proposé à la place.');
      return;
    }
    try {
      await navigator.share({ files: [file], title: 'Mon instant PWA Pocket' });
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError'))
        this.message.set('Partage impossible. Utilisez le bouton Télécharger.');
    }
  }
  async remove() {
    const p = this.pendingDelete();
    if (!p) return;
    try {
      await this.store.remove(p.id);
      this.photos.update((all) => all.filter((photo) => photo.id !== p.id));
      if (this.latest()?.id === p.id) this.latest.set(null);
      this.release(p);
      this.message.set('Photo supprimée.');
    } catch {
      this.message.set('Impossible de supprimer cette photo. Réessayez.');
    }
    this.pendingDelete.set(null);
  }
  private release(p: ViewPhoto) {
    URL.revokeObjectURL(p.url);
    this.urls.delete(p.url);
  }
  ngOnDestroy() {
    this.destroyed = true;
    this.stopCamera();
    document.removeEventListener('visibilitychange', this.visibility);
    this.urls.forEach((url) => URL.revokeObjectURL(url));
  }
}
