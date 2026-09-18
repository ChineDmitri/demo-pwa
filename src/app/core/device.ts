import { t } from './i18n';
export function locate(): Promise<GeolocationPosition> {
  if (!navigator.geolocation) return Promise.reject(new Error(t('device.geoUnsupported')));
  return new Promise((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(
      resolve,
      (e) =>
        reject(
          new Error(
            e.code === 1
              ? t('device.geoDenied')
              : e.code === 3
                ? t('device.geoTimeout')
                : t('device.geoUnavailable'),
          ),
        ),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    ),
  );
}
export const errorMessage = (e: unknown) => (e instanceof Error ? e.message : t('device.genericError'));
