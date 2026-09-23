import { Component, OnDestroy, computed, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { locate, errorMessage } from '../core/device';
import { t } from '../core/i18n';

type OrientationAPI = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<string> };

export type DictationLocale = 'en' | 'fr' | 'es' | 'it';
export type DictationEngine = 'webspeech' | 'vosk';

export const DICTATION_LANGUAGES: {
  code: DictationLocale;
  label: string;
  /** Path (relative to the app's own origin) to the pre-packaged Vosk model archive. */
  voskModelUrl: string;
  /** Approximate download size, used for the install button label and as a progress fallback. */
  approxSizeMB: number;
}[] = [
  { code: 'fr', label: '🇫🇷 Français', voskModelUrl: 'vosk-models/fr.tar.gz', approxSizeMB: 40 },
  { code: 'en', label: '🇬🇧 English', voskModelUrl: 'vosk-models/en.tar.gz', approxSizeMB: 39 },
  { code: 'es', label: '🇪🇸 Español', voskModelUrl: 'vosk-models/es.tar.gz', approxSizeMB: 38 },
  { code: 'it', label: '🇮🇹 Italiano', voskModelUrl: 'vosk-models/it.tar.gz', approxSizeMB: 47 },
];

const WEB_SPEECH_LOCALES: Record<DictationLocale, string> = {
  en: 'en-US',
  fr: 'fr-FR',
  es: 'es-ES',
  it: 'it-IT',
};

@Component({
  selector: 'app-sensors',
  imports: [DecimalPipe],
  template: `
    <header class="page-heading">
      <span class="eyebrow">{{ t('sensors.eyebrow') }}</span>
      <h1>
        {{ t('sensors.title.line1') }}<br /><em>{{ t('sensors.title.emphasis') }}</em>
      </h1>
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

    <!-- Section Dictée vocale (Web Speech native ou Vosk local hors-ligne) -->
    <section class="card dictation-card">
      <div class="dictation-card-header">
        <span class="feature-icon peach">🎙</span>
        @if (recording()) {
          <span class="recording-badge" aria-live="assertive">
            <span class="live-dot pulse"></span> {{ t('sensors.dictation.recordingBadge') }}
          </span>
        }
      </div>

      <h2>{{ t('sensors.dictation.title') }}</h2>
      <p>{{ t('sensors.dictation.intro') }}</p>

      <div class="dictation-controls">
        <div class="field engine-field">
          <span>{{ t('sensors.dictation.engine.label') }}</span>
          <div class="actions engine-toggle">
            <button
              type="button"
              [class.primary]="sttEngine() === 'webspeech'"
              [class.secondary]="sttEngine() !== 'webspeech'"
              (click)="onEngineChange('webspeech')"
              [disabled]="recording() || voskInstalling()"
            >
              {{ t('sensors.dictation.engine.webspeech') }}
            </button>
            <button
              type="button"
              [class.primary]="sttEngine() === 'vosk'"
              [class.secondary]="sttEngine() !== 'vosk'"
              (click)="onEngineChange('vosk')"
              [disabled]="recording() || voskInstalling()"
            >
              {{ t('sensors.dictation.engine.vosk') }}
            </button>
          </div>
        </div>

        <label class="field language-field">
          <span>{{ t('sensors.dictation.language.label') }}</span>
          <select
            class="language-select"
            [value]="selectedLanguage()"
            (change)="onLanguageChange($event)"
            [disabled]="recording() || loadingModel() || voskInstalling()"
          >
            @for (lang of languages; track lang.code) {
              <option [value]="lang.code">{{ lang.label }}</option>
            }
          </select>
        </label>
      </div>

      @if (sttEngine() === 'vosk' && !voskReadyForCurrentLanguage()) {
        <div class="vosk-install">
          <button
            class="secondary"
            type="button"
            (click)="installVoskModel()"
            [disabled]="voskInstalling()"
          >
            {{
              voskInstalling()
                ? t('sensors.dictation.vosk.install.installing', { percent: voskInstallProgress() })
                : t('sensors.dictation.vosk.install.button', {
                    size: currentLanguageConfig().approxSizeMB,
                  })
            }}
          </button>
          @if (voskInstalling()) {
            <div
              class="progress-track"
              role="progressbar"
              [attr.aria-valuenow]="voskInstallProgress()"
              aria-valuemin="0"
              aria-valuemax="100"
            >
              <div class="progress-fill" [style.width.%]="voskInstallProgress()"></div>
            </div>
          }
          @if (voskInstallError()) {
            <p role="status" class="status">{{ voskInstallError() }}</p>
          }
        </div>
      }

      <div class="actions dictation-actions">
        <button
          [class.primary]="!recording()"
          [class.danger]="recording()"
          (click)="recording() ? stopDictation() : startDictation()"
          [disabled]="
            loadingModel() ||
            voskInstalling() ||
            (sttEngine() === 'vosk' && !voskReadyForCurrentLanguage())
          "
        >
          <span class="mic-icon" [class.recording-pulse]="recording()">🎤</span>
          {{
            loadingModel()
              ? t('sensors.dictation.button.loadingModel')
              : recording()
                ? t('sensors.dictation.button.stop')
                : t('sensors.dictation.button.start')
          }}
        </button>
        @if (transcriptText()) {
          <button
            class="secondary"
            type="button"
            (click)="clearTranscript()"
            [disabled]="recording()"
          >
            {{ t('sensors.dictation.button.clear') }}
          </button>
        }
      </div>

      <div class="field">
        <span>{{ t('sensors.dictation.textarea.label') }}</span>
        <textarea
          class="dictation-textarea"
          [value]="transcriptText()"
          (input)="onTranscriptChange($event)"
          spellcheck="true"
          autocomplete="on"
          autocorrect="on"
          autocapitalize="sentences"
          inputmode="text"
          rows="5"
          [placeholder]="t('sensors.dictation.textarea.placeholder')"
          [attr.aria-label]="t('sensors.dictation.textarea.label')"
        ></textarea>
      </div>

      @if (dictationStatus()) {
        <p role="status" class="status">{{ dictationStatus() }}</p>
      }
      <p class="hint">{{ t('sensors.dictation.hint') }}</p>
    </section>
  `,
  styles: [
    `
      .dictation-card {
        margin-top: 24px;
      }
      .dictation-card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;
      }
      .dictation-controls {
        display: flex;
        flex-wrap: wrap;
        align-items: flex-end;
        gap: 16px;
        margin: 16px 0;
      }
      .engine-field,
      .language-field {
        flex: 1 1 220px;
        margin: 0 !important;
      }
      .engine-toggle {
        margin: 0;
        flex-wrap: nowrap;
      }
      .engine-toggle button {
        flex: 1;
        white-space: nowrap;
      }
      .language-select {
        font: inherit;
        font-size: 14px;
        color: var(--ink);
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: 11px;
        padding: 10px 14px;
        width: 100%;
        box-sizing: border-box;
        cursor: pointer;
      }
      .language-select:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      .dictation-actions {
        display: flex;
        align-items: center;
        gap: 10px;
        margin: 0 !important;
      }
      .dictation-textarea {
        font: inherit;
        font-size: 15px;
        line-height: 1.5;
        color: var(--ink);
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: 11px;
        padding: 12px 14px;
        width: 100%;
        box-sizing: border-box;
        resize: vertical;
        min-height: 120px;
      }
      .recording-badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        font-weight: 700;
        color: #ef4444;
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid rgba(239, 68, 68, 0.3);
        border-radius: 999px;
        padding: 4px 12px;
      }
      .recording-pulse {
        display: inline-block;
        animation: mic-pulse 1s infinite alternate ease-in-out;
      }
      @keyframes mic-pulse {
        0% {
          transform: scale(1);
          opacity: 0.8;
        }
        100% {
          transform: scale(1.3);
          opacity: 1;
        }
      }
      .vosk-install {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin: 0 0 16px;
      }
      .progress-track {
        width: 100%;
        height: 8px;
        border-radius: 999px;
        background: var(--line);
        overflow: hidden;
      }
      .progress-fill {
        height: 100%;
        background: var(--blue);
        transition: width 0.2s ease;
      }
    `,
  ],
})
export class Sensors implements OnDestroy {
  t = t;
  languages = DICTATION_LANGUAGES;

  // Signaux du capteur de géolocalisation
  coords = signal<GeolocationCoordinates | null>(null);
  locating = signal(false);
  locationMessage = signal('');

  // Signaux du capteur d'inclinaison (orientation)
  beta = signal<number | null>(null);
  gamma = signal<number | null>(null);
  active = signal(false);
  requesting = signal(false);
  orientationMessage = signal('');
  private timer?: ReturnType<typeof setTimeout>;
  private destroyed = false;

  // Signaux communs à la dictée vocale (partagés entre les deux moteurs)
  sttEngine = signal<DictationEngine>('webspeech');
  selectedLanguage = signal<DictationLocale>('fr');
  recording = signal(false);
  loadingModel = signal(false);
  transcriptText = signal('');
  dictationStatus = signal('');
  private finalTranscript = signal('');
  private partialTranscript = signal('');

  // --- Web Speech API (moteur natif du navigateur) ---
  private speechRecognition: any = null;
  private manualStopRequested = false;

  // --- Vosk (moteur local hors-ligne) ---
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private recognizer: any = null;
  private loadedModels: Partial<Record<DictationLocale, any>> = {};
  private voskModelObjectUrls: Partial<Record<DictationLocale, string>> = {};
  private readonly voskModelCacheName = 'vosk-models-v1';

  voskInstalled = signal<Set<DictationLocale>>(new Set());
  voskInstalling = signal(false);
  voskInstallProgress = signal(0);
  voskInstallError = signal('');

  voskReadyForCurrentLanguage = computed(() => this.voskInstalled().has(this.selectedLanguage()));
  currentLanguageConfig = computed(
    () =>
      DICTATION_LANGUAGES.find((l) => l.code === this.selectedLanguage()) ?? DICTATION_LANGUAGES[0],
  );

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
    if (typeof window !== 'undefined') {
      window.removeEventListener('deviceorientation', this.handler);
    }
    this.active.set(false);
    this.orientationMessage.set(t('sensors.status.stopped'));
  }

  // --- Dictée vocale : sélecteurs communs ---

  onEngineChange(engine: DictationEngine) {
    if (this.recording() || this.voskInstalling() || this.sttEngine() === engine) return;
    this.sttEngine.set(engine);
    this.dictationStatus.set('');
    this.voskInstallError.set('');
    if (engine === 'vosk') void this.refreshVoskInstallState(this.selectedLanguage());
  }

  onLanguageChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    if (!select?.value) return;
    const lang = select.value as DictationLocale;
    this.selectedLanguage.set(lang);
    this.dictationStatus.set('');
    this.voskInstallError.set('');
    if (this.sttEngine() === 'vosk') void this.refreshVoskInstallState(lang);
  }

  onTranscriptChange(event: Event) {
    const textarea = event.target as HTMLTextAreaElement;
    const val = textarea.value;
    this.transcriptText.set(val);
    this.finalTranscript.set(val);
    this.partialTranscript.set('');
  }

  clearTranscript() {
    this.transcriptText.set('');
    this.finalTranscript.set('');
    this.partialTranscript.set('');
    this.dictationStatus.set(t('sensors.dictation.status.cleared'));
  }

  async startDictation() {
    if (this.recording()) return;
    this.dictationStatus.set('');
    if (this.sttEngine() === 'webspeech') {
      this.startWebSpeechEngine();
    } else {
      await this.startVoskEngine();
    }
  }

  stopDictation() {
    if (this.sttEngine() === 'webspeech') {
      this.stopWebSpeechEngine('user');
    } else {
      this.stopVoskEngine('user');
    }
  }

  // --- Moteur Web Speech API ---

  private startWebSpeechEngine() {
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      this.dictationStatus.set(t('sensors.dictation.status.webspeechUnsupported'));
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = WEB_SPEECH_LOCALES[this.selectedLanguage()];
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let finalChunk = '';
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0]?.transcript ?? '';
        if (result.isFinal) finalChunk += transcript;
        else interim += transcript;
      }
      if (finalChunk.trim()) {
        const current = this.finalTranscript();
        const updated = current ? `${current} ${finalChunk.trim()}` : finalChunk.trim();
        this.finalTranscript.set(updated);
        this.partialTranscript.set('');
        this.transcriptText.set(interim.trim() ? `${updated} ${interim.trim()}` : updated);
      } else {
        this.partialTranscript.set(interim);
        const current = this.finalTranscript();
        this.transcriptText.set(
          interim.trim() ? (current ? `${current} ${interim.trim()}` : interim.trim()) : current,
        );
      }
    };

    recognition.onerror = (event: any) => {
      const code = event?.error;
      console.error('Erreur dictée vocale (Web Speech):', code);
      if (code === 'no-speech') {
        // Silence détecté : le navigateur relance automatiquement via onend ci-dessous.
        return;
      }
      this.manualStopRequested = true;
      this.stopWebSpeechEngine('internal');
      switch (code) {
        case 'not-allowed':
        case 'permission-denied':
          this.dictationStatus.set(t('sensors.dictation.status.micDenied'));
          break;
        case 'audio-capture':
          this.dictationStatus.set(t('sensors.dictation.status.micNotFound'));
          break;
        case 'network':
          this.dictationStatus.set(t('sensors.dictation.status.voskDownloadError'));
          break;
        default:
          this.dictationStatus.set(t('sensors.dictation.status.genericError'));
      }
    };

    recognition.onend = () => {
      if (this.recording() && this.sttEngine() === 'webspeech' && !this.manualStopRequested) {
        try {
          recognition.start();
        } catch {
          this.stopWebSpeechEngine('internal');
        }
      }
    };

    this.manualStopRequested = false;
    this.speechRecognition = recognition;
    try {
      recognition.start();
      this.recording.set(true);
      this.dictationStatus.set(t('sensors.dictation.status.listening'));
    } catch {
      this.speechRecognition = null;
      this.dictationStatus.set(t('sensors.dictation.status.genericError'));
    }
  }

  private stopWebSpeechEngine(reason: 'user' | 'internal') {
    this.manualStopRequested = true;
    if (this.speechRecognition) {
      try {
        this.speechRecognition.stop();
      } catch {
        // Le moteur peut déjà être arrêté.
      }
      this.speechRecognition = null;
    }
    this.recording.set(false);
    if (reason === 'user') {
      this.dictationStatus.set(t('sensors.dictation.status.stopped'));
    }
  }

  // --- Installation à la demande du modèle Vosk ---

  private resolveVoskModelUrl(lang: DictationLocale): string {
    const config = DICTATION_LANGUAGES.find((l) => l.code === lang) ?? DICTATION_LANGUAGES[0];
    return new URL(config.voskModelUrl, document.baseURI).toString();
  }

  private async refreshVoskInstallState(lang: DictationLocale) {
    if (this.voskInstalled().has(lang) || typeof caches === 'undefined') return;
    try {
      const cache = await caches.open(this.voskModelCacheName);
      const match = await cache.match(this.resolveVoskModelUrl(lang));
      if (match && !this.destroyed) {
        const next = new Set(this.voskInstalled());
        next.add(lang);
        this.voskInstalled.set(next);
      }
    } catch {
      // Cache Storage indisponible (ex. navigation privée) : l'installation restera à la demande.
    }
  }

  async installVoskModel() {
    const lang = this.selectedLanguage();
    if (this.voskInstalling() || this.voskInstalled().has(lang)) return;

    const config = this.currentLanguageConfig();
    const url = this.resolveVoskModelUrl(lang);

    this.voskInstalling.set(true);
    this.voskInstallProgress.set(0);
    this.voskInstallError.set('');

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(
          response.status === 404
            ? t('sensors.dictation.status.voskModelMissing')
            : t('sensors.dictation.status.voskDownloadError'),
        );
      }

      const totalBytes =
        Number(response.headers.get('content-length')) || config.approxSizeMB * 1024 * 1024;
      const reader = response.body?.getReader();
      let buffer: ArrayBuffer;

      if (!reader) {
        buffer = await response.arrayBuffer();
        this.voskInstallProgress.set(100);
      } else {
        const chunks: Uint8Array[] = [];
        let received = 0;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            chunks.push(value);
            received += value.byteLength;
            this.voskInstallProgress.set(
              Math.max(1, Math.min(99, Math.round((received / totalBytes) * 100))),
            );
          }
        }
        const merged = new Uint8Array(received);
        let offset = 0;
        for (const chunk of chunks) {
          merged.set(chunk, offset);
          offset += chunk.byteLength;
        }
        buffer = merged.buffer;
        this.voskInstallProgress.set(100);
      }

      if (this.destroyed) return;

      try {
        const cache = await caches.open(this.voskModelCacheName);
        await cache.put(url, new Response(buffer));
      } catch {
        // Le modèle reste utilisable pour cette session mais ne sera pas mis en cache hors-ligne.
      }

      const blob = new Blob([buffer], { type: 'application/gzip' });
      this.voskModelObjectUrls[lang] = URL.createObjectURL(blob);
      const next = new Set(this.voskInstalled());
      next.add(lang);
      this.voskInstalled.set(next);
    } catch (err: any) {
      this.voskInstallError.set(err?.message || t('sensors.dictation.status.voskDownloadError'));
    } finally {
      this.voskInstalling.set(false);
    }
  }

  private async getVoskModelObjectUrl(lang: DictationLocale): Promise<string | null> {
    if (this.voskModelObjectUrls[lang]) return this.voskModelObjectUrls[lang]!;
    try {
      const cache = await caches.open(this.voskModelCacheName);
      const match = await cache.match(this.resolveVoskModelUrl(lang));
      if (match) {
        const buffer = await match.arrayBuffer();
        const blob = new Blob([buffer], { type: 'application/gzip' });
        const url = URL.createObjectURL(blob);
        this.voskModelObjectUrls[lang] = url;
        return url;
      }
    } catch {
      // Cache Storage indisponible.
    }
    return null;
  }

  // --- Moteur Vosk (reconnaissance locale hors-ligne) ---

  /**
   * Charge dynamiquement la bibliothèque Vosk WebAssembly depuis le CDN si absente
   */
  private loadVoskLibrary(): Promise<any> {
    const win = window as any;
    if (win.Vosk) {
      return Promise.resolve(win.Vosk);
    }
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(
        'script[data-vosk-script="true"]',
      ) as HTMLScriptElement;
      if (existing) {
        if (win.Vosk) return resolve(win.Vosk);
        existing.addEventListener('load', () => resolve(win.Vosk));
        existing.addEventListener('error', () => reject(new Error('Impossible de charger Vosk')));
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/vosk-browser@0.0.8/dist/vosk.js';
      script.async = true;
      script.dataset['voskScript'] = 'true';
      script.onload = () => {
        if (win.Vosk) {
          resolve(win.Vosk);
        } else {
          reject(new Error('Bibliothèque Vosk introuvable après chargement du script'));
        }
      };
      script.onerror = () =>
        reject(new Error('Erreur réseau lors du téléchargement de la bibliothèque Vosk'));
      document.head.appendChild(script);
    });
  }

  private async startVoskEngine() {
    if (!navigator?.mediaDevices?.getUserMedia) {
      this.dictationStatus.set(t('sensors.dictation.status.micUnsupported'));
      return;
    }

    const lang = this.selectedLanguage();
    if (!this.voskInstalled().has(lang)) {
      this.dictationStatus.set(t('sensors.dictation.status.voskNotInstalled'));
      return;
    }

    try {
      this.dictationStatus.set(t('sensors.dictation.status.requestingMic'));
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          channelCount: 1,
          sampleRate: 16000,
        },
      });

      if (this.destroyed) {
        this.stopVoskEngine('internal');
        return;
      }

      this.dictationStatus.set(t('sensors.dictation.status.loadingVoskEngine'));
      const Vosk = await this.loadVoskLibrary();

      if (this.destroyed) {
        this.stopVoskEngine('internal');
        return;
      }

      let model = this.loadedModels[lang];
      if (!model) {
        this.loadingModel.set(true);
        this.dictationStatus.set(t('sensors.dictation.status.loadingVoskModel'));
        try {
          const modelObjectUrl = await this.getVoskModelObjectUrl(lang);
          if (!modelObjectUrl) throw new Error(t('sensors.dictation.status.voskNotInstalled'));
          model = await Vosk.createModel(modelObjectUrl);
          this.loadedModels[lang] = model;
        } catch (err: any) {
          throw new Error(err?.message || t('sensors.dictation.status.voskDownloadError'));
        } finally {
          this.loadingModel.set(false);
        }
      }

      if (this.destroyed) {
        this.stopVoskEngine('internal');
        return;
      }

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtx({ sampleRate: 16000 });
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.recognizer = new model.KaldiRecognizer(this.audioContext.sampleRate);

      this.recognizer.on('result', (message: any) => {
        const text = message?.result?.text;
        if (text && text.trim()) {
          const current = this.finalTranscript();
          const updated = current ? `${current} ${text.trim()}` : text.trim();
          this.finalTranscript.set(updated);
          this.partialTranscript.set('');
          this.transcriptText.set(updated);
        }
      });

      this.recognizer.on('partialresult', (message: any) => {
        const partial = message?.result?.partial;
        this.partialTranscript.set(partial || '');
        const current = this.finalTranscript();
        if (partial && partial.trim()) {
          this.transcriptText.set(current ? `${current} ${partial.trim()}` : partial.trim());
        } else {
          this.transcriptText.set(current);
        }
      });

      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.processorNode = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.processorNode.onaudioprocess = (event: AudioProcessingEvent) => {
        if (!this.recording() || !this.recognizer) return;
        try {
          this.recognizer.acceptWaveform(event.inputBuffer);
        } catch (err) {
          console.warn('Erreur acceptWaveform:', err);
        }
      };

      this.sourceNode.connect(this.processorNode);
      this.processorNode.connect(this.audioContext.destination);

      this.recording.set(true);
      this.dictationStatus.set(t('sensors.dictation.status.listening'));
    } catch (err: any) {
      console.error('Erreur dictée vocale (Vosk):', err);
      this.stopVoskEngine('internal');

      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        this.dictationStatus.set(t('sensors.dictation.status.micDenied'));
      } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
        this.dictationStatus.set(t('sensors.dictation.status.micNotFound'));
      } else {
        this.dictationStatus.set(err?.message || t('sensors.dictation.status.genericError'));
      }
    }
  }

  private stopVoskEngine(reason: 'user' | 'internal') {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode.onaudioprocess = null;
      this.processorNode = null;
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.audioContext) {
      if (this.audioContext.state !== 'closed') {
        this.audioContext.close().catch(() => {});
      }
      this.audioContext = null;
    }
    if (this.recognizer) {
      try {
        this.recognizer.retrieveFinalResult();
      } catch {
        // Le résultat final peut déjà avoir été consommé.
      }
      this.recognizer = null;
    }
    this.recording.set(false);
    this.loadingModel.set(false);
    if (reason === 'user') {
      this.dictationStatus.set(t('sensors.dictation.status.stopped'));
    }
  }

  ngOnDestroy() {
    this.destroyed = true;
    this.stop();
    this.stopWebSpeechEngine('internal');
    this.stopVoskEngine('internal');
    Object.values(this.voskModelObjectUrls).forEach((url) => {
      if (url) URL.revokeObjectURL(url);
    });
  }
}
