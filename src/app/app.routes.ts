import { Routes } from '@angular/router';
import { Home } from './pages/home';
import { Discover } from './pages/discover';
import { Sensors } from './pages/sensors';
import { Photos } from './pages/photos';
import { WeatherPage } from './pages/weather-page';
export const routes: Routes = [
  { path: '', component: Home, title: 'Accueil · PWA Pocket' },
  { path: 'decouvrir', component: Discover, title: 'Découvrir · PWA Pocket' },
  { path: 'capteurs', component: Sensors, title: 'Capteurs · PWA Pocket' },
  { path: 'photos', component: Photos, title: 'Photos · PWA Pocket' },
  { path: 'meteo', component: WeatherPage, title: 'Météo · PWA Pocket' },
  { path: '**', redirectTo: '' },
];
