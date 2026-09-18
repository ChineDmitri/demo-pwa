import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { PhotosStore, Photo } from '../core/photos-store';
import { t } from '../core/i18n';
type ViewPhoto = Photo & { url: string };
@Component({
  selector: 'app-photos',
  imports: [DatePipe],
  template: `
    <header class="page-heading">
      <span class="eyebrow">{{ t('photos.eyebrow') }}</span>
      <h1>{{ t('photos.title.line1') }}<br /><em>{{ t('photos.title.emphasis') }}</em></h1>
      <p>{{ t('photos.intro') }}</p>
    </header>
    <section class="card camera-card">
      @if (android) {
        <p class="hint">{{ t('photos.androidHint') }}</p>
      }
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
            <h2>{{ t('photos.placeholder.title') }}</h2>
            <p>{{ t('photos.placeholder.text') }}</p>
          </div>
        }
      </div>
      <div class="camera-controls">
        @if (!streaming()) {
          <button class="primary" (click)="startCamera()" [disabled]="busy()">
            {{ t('photos.button.startCamera') }}
          </button>
        } @else {
          <button class="primary" (click)="capture()" [disabled]="busy() || !videoReady()">
            {{ t('photos.button.capture') }}</button
          ><button class="secondary" (click)="stopCamera()">{{ t('photos.button.stopCamera') }}</button>
        }
        <label class="button secondary file-button"
          >{{ t('photos.button.chooseFile') }}<input
            type="file"
            accept="image/*"
            capture="environment"
            (change)="importPhoto($event)"
            [disabled]="busy()"
            [attr.aria-label]="t('photos.chooseFileAria')"
        /></label>
      </div>
      <p class="status" role="status">{{ message() }}</p>
    </section>
    @if (latest(); as photo) {
      <section class="card latest-photo">
        <div>
          <span class="eyebrow">{{ t('photos.latest.eyebrow') }}</span>
          <h2>{{ t('photos.latest.title') }}</h2>
          <p>
            {{ saved() ? t('photos.latest.savedText') : t('photos.latest.unsavedText') }}
          </p>
          <div class="actions">
            <button class="primary" (click)="download(photo)">
              {{ ios ? t('photos.latest.downloadIos') : t('photos.latest.downloadOther') }}</button
            ><button class="secondary" (click)="share(photo)">{{ t('photos.latest.share') }}</button>
          </div>
        </div>
        <img [src]="photo.url" [attr.alt]="t('photos.latest.imgAlt')" />
      </section>
    }
    @if (ios) {
      <p class="hint">{{ t('photos.iosHint') }}</p>
    }
    <div class="section-heading">
      <div>
        <span class="eyebrow">{{ t('photos.gallery.eyebrow') }}</span>
        <h2>
          {{ t('photos.gallery.title') }} <span class="count">{{ photos().length }}</span>
        </h2>
      </div>
      <span class="pill">{{ t('photos.gallery.pill') }}</span>
    </div>
    @if (!photos().length) {
      <div class="empty-gallery">
        <span class="feature-icon mint">▧</span>
        <h3>{{ t('photos.empty.title') }}</h3>
        <p>{{ t('photos.empty.text') }}</p>
      </div>
    }
    <div class="gallery">
      @for (photo of photos(); track photo.id) {
        <article class="gallery-item">
          <button
            class="photo-open"
            (click)="selected.set(photo); viewer.showModal()"
            [attr.aria-label]="t('photos.item.openAria')"
          >
            <img [src]="photo.url" [attr.alt]="t('photos.item.imgAlt')" loading="lazy" />
          </button>
          <div class="gallery-meta">
            <time>{{ photo.created | date: 'dd/MM/yyyy · HH:mm' }}</time>
            <div class="gallery-actions">
              <button
                class="icon-button"
                (click)="download(photo)"
                [attr.aria-label]="
                  ios ? t('photos.item.downloadIosAria') : t('photos.item.downloadOtherAria')
                "
              >
                ↓</button
              ><button
                class="icon-button"
                (click)="share(photo)"
                [attr.aria-label]="t('photos.item.shareAria')"
              >
                ↗</button
              ><button
                class="icon-button"
                (click)="pendingDelete.set(photo); confirmation.showModal()"
                [attr.aria-label]="t('photos.item.deleteAria')"
              >
                ×
              </button>
            </div>
          </div>
        </article>
      }
    </div>
    <p class="hint">{{ t('photos.storageHint') }}</p>
    <dialog #viewer class="photo-dialog" [attr.aria-label]="t('photos.viewer.aria')">
      <button
        class="icon-button close-photo"
        [attr.aria-label]="t('photos.viewer.closeAria')"
        (click)="viewer.close()"
      >
        ×
      </button>
      @if (selected(); as p) {
        <img [src]="p.url" [attr.alt]="t('photos.viewer.imgAlt')" /><button
          class="primary"
          (click)="share(p)"
        >
          {{ t('photos.viewer.share') }}
        </button>
      }
    </dialog>
    <dialog #exportDialog aria-labelledby="export-title">
      <button
        class="icon-button"
        [attr.aria-label]="t('photos.export.closeAria')"
        (click)="exportDialog.close()"
      >
        ×
      </button>
      <h2 id="export-title">{{ t('photos.export.title') }}</h2>
      <p role="status">{{ t('photos.export.status') }}</p>
      @if (exportFallback(); as photo) {
        <img
          class="export-image"
          data-allow-save
          [src]="photo.url"
          [attr.alt]="t('photos.export.imgAlt')"
        />
      }
      <p class="hint">{{ t('photos.export.hint') }}</p>
    </dialog>
    <dialog #confirmation aria-labelledby="delete-title">
      <h2 id="delete-title">{{ t('photos.confirm.title') }}</h2>
      <p>{{ t('photos.confirm.text') }}</p>
      <div class="actions">
        <button class="secondary" autofocus (click)="confirmation.close()">
          {{ t('photos.confirm.cancel') }}</button
        ><button class="danger" (click)="remove(); confirmation.close()">
          {{ t('photos.confirm.delete') }}
        </button>
      </div>
    </dialog>
  `,
})
export class Photos implements OnInit, OnDestroy {
  t = t;
  readonly android = /Android/i.test(navigator.userAgent);
  @ViewChild('video', { static: true }) video!: ElementRef<HTMLVideoElement>;
  @ViewChild('exportDialog', { static: true }) exportDialog!: ElementRef<HTMLDialogElement>;
  readonly ios =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  exportFallback = signal<ViewPhoto | null>(null);
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
      this.message.set(t('photos.msg.storeUnavailable'));
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
          ? t('photos.msg.cameraDenied')
          : t('photos.msg.cameraUnavailable'),
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
      this.message.set(t('photos.msg.captureFailed'));
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
      this.message.set(t('photos.msg.importFailed'));
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
    // Request the export as soon as the JPEG is ready, before waiting for IndexedDB.
    let downloadRequested = false;
    if (this.android) {
      try {
        this.downloadFile(photo);
        downloadRequested = true;
      } catch {
        // Keep the local save and manual export available if the browser rejects the request.
      }
    }
    try {
      await this.store.save(photo);
      if (this.destroyed) return;
      this.photos.update((all) => [photo, ...all]);
      this.saved.set(true);
      this.message.set(
        downloadRequested
          ? t('photos.msg.savedWithDownload')
          : this.android
            ? t('photos.msg.savedAndroidNoDownload')
            : t('photos.msg.savedOk'),
      );
    } catch {
      this.message.set(
        downloadRequested
          ? t('photos.msg.saveFailedWithDownload')
          : t('photos.msg.saveFailedNoDownload'),
      );
    }
  }
  download(photo: ViewPhoto) {
    if (this.ios) {
      void this.share(photo);
      return;
    }
    this.downloadFile(photo);
  }
  private downloadFile(photo: ViewPhoto) {
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
    try {
      if (!navigator.share || !navigator.canShare?.({ files: [file] })) {
        if (this.ios) this.showExportFallback(photo);
        else {
          this.downloadFile(photo);
          this.message.set(t('photos.msg.shareUnavailable'));
        }
        return;
      }
      // Keep this call synchronous with the tap: iOS requires transient user activation.
      await navigator.share({ files: [file] });
      this.message.set(t('photos.msg.shareClosed'));
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        this.message.set(t('photos.msg.shareCancelled'));
        return;
      }
      if (this.ios) this.showExportFallback(photo);
      else this.message.set(t('photos.msg.shareFailed'));
    }
  }
  private showExportFallback(photo: ViewPhoto) {
    this.exportFallback.set(photo);
    this.exportDialog.nativeElement.showModal();
  }
  async remove() {
    const p = this.pendingDelete();
    if (!p) return;
    try {
      await this.store.remove(p.id);
      this.photos.update((all) => all.filter((photo) => photo.id !== p.id));
      if (this.latest()?.id === p.id) this.latest.set(null);
      this.release(p);
      this.message.set(t('photos.msg.removed'));
    } catch {
      this.message.set(t('photos.msg.removeFailed'));
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
