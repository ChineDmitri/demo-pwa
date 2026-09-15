# PWA Pocket

Une démonstration Angular en français, conçue pour présenter les possibilités d’une PWA aux utilisateurs finaux. **Site statique, sans backend, sans compte et sans clé API.**

## Démarrer

Node.js **24.15+ (branche 24 LTS)** et npm sont recommandés. Les dépendances sont verrouillées dans `package-lock.json`.

```bash
nvm use
npm ci
npm start
```

Ouvrir [localhost:4200](http://localhost:4200). Le serveur de développement désactive volontairement le service worker.

### Tester la vraie PWA

```bash
npm run build
npm run preview
```

Ouvrir [localhost:4173](http://localhost:4173). Attendre **« Prête hors ligne »** sur l’accueil avant de couper le réseau. Cette indication vérifie la présence des ressources dans le cache, après initialisation du service worker.

Le script de prévisualisation sert uniquement les fichiers compilés ; il ne fait pas partie de l’application publiée.

## Publier sur GitHub Pages

1. Créer un dépôt GitHub et y pousser ce projet sur la branche `main`.
2. Dans **Settings → Pages → Build and deployment**, choisir **GitHub Actions**.
3. Le workflow **Publier PWA Pocket** exécute les tests, compile puis publie le dossier `dist/pwa-pocket/browser`.
4. Ouvrir l’URL fournie dans l’étape de déploiement.

Le chemin de base est calculé depuis le nom du dépôt : `/nom-du-depot/`, ou `/` pour un dépôt `utilisateur.github.io`. La navigation utilise des fragments (`#/photos`) : ouvrir directement une page ou la recharger ne nécessite aucune réécriture côté serveur.

Pour un domaine personnalisé à la racine, adapter le workflow afin d’utiliser `BASE="/"`, puis configurer ce domaine dans les paramètres Pages.

Pour reproduire localement un déploiement sous un sous-chemin :

```bash
npm run build -- --base-href=/pwa-pocket/
npm run preview
```

Le serveur redirige automatiquement vers le chemin compilé. HTTPS est requis en production pour les API du téléphone et le service worker ; GitHub Pages le fournit. Une adresse HTTP du réseau local n’offre pas les mêmes possibilités que `localhost`.

Aucun dépôt distant n’est préconfiguré dans ce projet.

## Parcours de démonstration — 3 minutes

1. **Accueil** : montrer le guide d’installation ; ajouter l’application à l’écran d’accueil.
2. **Découvrir** : naviguer dans les contenus, ouvrir la fenêtre modale, tester la notification.
3. **Capteurs** : demander la position, observer latitude/longitude/altitude, puis activer le niveau à bulle.
4. **Photos** : activer la caméra, capturer une photo, l’agrandir et proposer son export.
5. **Météo** : demander les conditions actuelles autour du téléphone.
6. Revenir à l’accueil et attendre **« Prête hors ligne »**. Activer le mode avion, **recharger l’application**, ouvrir toutes les pages et retrouver la photo.
7. Sur **Météo**, montrer le message demandant une connexion. Réactiver le réseau puis actualiser.

## Fonctionnement et limites

| Fonction        | Comportement                                                                                                                                                                                                                                                                                          |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Installation    | Bouton d’installation quand le navigateur le permet ; instructions Safari/iPhone et Chrome/Android toujours disponibles.                                                                                                                                                                              |
| Hors ligne      | Préchargement du code, styles, pages, manifest et icônes par le service worker Angular. Un premier chargement complet avec réseau est nécessaire.                                                                                                                                                     |
| Connexion       | Événements du navigateur et requête vers `connectivity.txt`, sans cache et avec `ngsw-bypass`. Vérification toutes les 30 secondes lorsque la page est visible, au retour dans l’application et avant la météo. Une panne de l’hébergement est également considérée comme une connexion inutilisable. |
| Mises à jour    | Vérification au lancement et au retour du réseau. Bandeau proposant un rechargement lorsque la nouvelle version est prête.                                                                                                                                                                            |
| Géolocalisation | Autorisation au clic, délai maximal de 12 secondes. Précision affichée ; altitude parfois indisponible. Aucun suivi en arrière-plan.                                                                                                                                                                  |
| Inclinaison     | Permission explicite si nécessaire, attente maximale de 5 secondes pour la première mesure, arrêt en quittant la page. La présence de l’API ne garantit pas celle d’un capteur.                                                                                                                       |
| Caméra          | Flux vidéo sans audio, caméra arrière préférée. Arrêt en quittant la page ou en masquant l’application. Sélecteur photo de secours.                                                                                                                                                                   |
| Galerie         | JPEG redimensionnés à 1920 pixels maximum, stockés en Blob dans IndexedDB. En cas de quota dépassé, l’aperçu reste exportable.                                                                                                                                                                        |
| Export          | Téléchargement JPEG et partage natif si disponible. L’utilisateur choisit Photos, Fichiers ou une autre destination proposée par son téléphone.                                                                                                                                                       |
| Notifications   | Test immédiat depuis le service worker, après permission. Aucune notification distante ou programmée. Une démonstration visuelle séparée est explicitement identifiée.                                                                                                                                |
| Météo           | Requête directe Open-Meteo après autorisation de la position. Délai maximal de 12 secondes, erreurs explicites. Aucune météo présentée comme actuelle hors ligne.                                                                                                                                     |

### iPhone et Android

- Sur iPhone/iPad, les notifications web nécessitent notamment une application ajoutée à l’écran d’accueil (iOS/iPadOS 16.4+). Leur comportement dépend de la version du système, du navigateur et des permissions. Le refus ou l’indisponibilité est expliqué.
- La PWA ne peut pas enregistrer silencieusement une photo dans la photothèque. Le partage ou le téléchargement nécessite une action de l’utilisateur.
- Le stockage local n’est pas une sauvegarde permanente : le système ou l’utilisateur peut le supprimer. Exporter les photos importantes.
- Les capteurs, la géolocalisation et la caméra varient selon le matériel ; aucune donnée fictive n’est affichée comme mesure réelle.
- Le téléphone illustré sur l’accueil est décoratif ; sa température est fictive et signalée comme telle.

### Données et météo

Les photos restent dans le navigateur et ne sont jamais téléversées. La position de la page Capteurs n’est pas transmise. La page Météo envoie les coordonnées à Open-Meteo uniquement lorsque l’utilisateur demande ou actualise les conditions ; elles ne sont pas persistées dans l’application.

L’API gratuite Open-Meteo est utilisée pour cette **démo non commerciale**, avec attribution CC BY 4.0. Pour un usage commercial, réexaminer les conditions du fournisseur ; ne jamais mettre une clé secrète dans une application statique.

## Vérifications

```bash
npm run test:ci
npx playwright install chromium
npm run test:e2e
```

Les tests Playwright compilent une version de production sous `/pwa-pocket/` et démarrent un serveur temporaire. Fermer un ancien serveur sur le port 4173 avant les tests pour que la nouvelle compilation soit servie.

Couverture :

- permissions refusées, capteur sans réponse, délai de géolocalisation ;
- portail captif, coupure réseau, retour du réseau et météo indisponible ;
- validation des réponses météo ;
- enregistrement IndexedDB, réouverture, suppression, stockage plein et export ;
- rechargement de la PWA hors ligne, navigation et consultation des photos ;
- fenêtre modale, navigation mobile sans débordement ;
- capture depuis un flux vidéo simulé et arrêt des pistes à la navigation ;
- appel de notification simulé via un vrai enregistrement de service worker ;
- détection d’un nouveau manifest et proposition de mise à jour.

**À vérifier sur appareils réels :** installation iPhone/Android, autorisations système, GPS/altitude, mouvements du téléphone, flux de la caméra physique, affichage système des notifications et enregistrement dans Photos/Fichiers. Les simulations automatisées ne remplacent pas cette recette.

## Organisation

- `src/app/pages/` : les cinq écrans.
- `src/app/core/` : réseau, installation/mises à jour, permissions, stockage et météo.
- `src/styles.scss` : interface responsive et styles partagés, sans police distante.
- `public/` : manifest, icônes et fichier de vérification réseau.
- `e2e/` : parcours Playwright sur le build de production.
- `.github/workflows/pages.yml` : validation et publication.

## Références

- [Service worker Angular](https://angular.dev/ecosystem/service-workers/getting-started)
- [Notifications web sur iOS / WebKit](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)
- [Open-Meteo : API](https://open-meteo.com/en/docs) et [conditions d’utilisation](https://open-meteo.com/en/terms)
- [Web Share API](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share)
