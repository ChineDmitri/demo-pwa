export function locate(): Promise<GeolocationPosition> {
  if (!navigator.geolocation)
    return Promise.reject(new Error('Géolocalisation indisponible sur cet appareil.'));
  return new Promise((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(
      resolve,
      (e) =>
        reject(
          new Error(
            e.code === 1
              ? 'Accès à la position refusé. Autorisez-le dans les réglages du navigateur.'
              : e.code === 3
                ? 'La recherche de position a pris trop de temps. Réessayez à l’extérieur.'
                : 'Position indisponible. Réessayez à l’extérieur.',
          ),
        ),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    ),
  );
}
export const errorMessage = (e: unknown) =>
  e instanceof Error ? e.message : 'Une erreur est survenue. Réessayez.';
