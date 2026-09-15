import { Component, DestroyRef, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Network } from './core/network';
import { Pwa } from './core/pwa';
import { version } from '../../package.json';
import { installTouchBehavior } from './core/touch-behavior';
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  readonly version = version;
  constructor() {
    inject(DestroyRef).onDestroy(installTouchBehavior());
  }
  network = inject(Network);
  pwa = inject(Pwa);
  links = [
    { path: '/', label: 'Accueil', icon: '⌂' },
    { path: '/decouvrir', label: 'Découvrir', icon: '◫' },
    { path: '/capteurs', label: 'Capteurs', icon: '⌖' },
    { path: '/photos', label: 'Photos', icon: '▣' },
    { path: '/meteo', label: 'Météo', icon: '☀' },
  ];
}
