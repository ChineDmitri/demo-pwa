import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Network } from './core/network';
import { Pwa } from './core/pwa';
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
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
