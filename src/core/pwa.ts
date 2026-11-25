import type { WebPushSubscriptionRecord } from './web_push';
import { base64UrlDecode } from './web_push';

/**
 * Utilidades PWA para registro de Service Worker, Web Push y detección de iOS Standalone.
 */

export interface PwaStatus {
  isIos: boolean;
  isStandalone: boolean;
  supportsServiceWorker: boolean;
}

export function isIosDevice(userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : ''): boolean {
  const hasMsStream = typeof window !== 'undefined' && Boolean((window as unknown as { MSStream?: unknown }).MSStream);
  return /iPad|iPhone|iPod/.test(userAgent) && !hasMsStream;
}

export function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;
  const isIosStandalone = (window.navigator as unknown as { standalone?: boolean })?.standalone === true;
  const isMatchMediaStandalone = typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches;
  return Boolean(isIosStandalone || isMatchMediaStandalone);
}

export function shouldShowIosInstallPrompt(): boolean {
  try {
    if (typeof localStorage === 'undefined') return false;
    const isDismissed = localStorage.getItem('dondeestan_ios_pwa_dismissed') === 'true';
    return isIosDevice() && !isStandaloneMode() && !isDismissed;
  } catch (err) {
    console.warn('No se pudo comprobar el estado de instalación PWA:', err);
    return false;
  }
}

export function dismissIosInstallPrompt(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('dondeestan_ios_pwa_dismissed', 'true');
    }
  } catch (err) {
    console.warn('No se pudo guardar la desestimación del prompt PWA:', err);
  }
}

/**
 * Actualiza el contador de mensajes o eventos no leídos en el icono de la aplicación (PWA Badging).
 */
export async function updateAppBadge(count: number): Promise<boolean> {
  if (typeof navigator === 'undefined' || !('setAppBadge' in navigator)) {
    return false;
  }
  try {
    if (count > 0) {
      await (navigator as unknown as { setAppBadge: (n: number) => Promise<void> }).setAppBadge(count);
    } else {
      await (navigator as unknown as { clearAppBadge: () => Promise<void> }).clearAppBadge();
    }
    return true;
  } catch (err) {
    console.warn('No se pudo actualizar el badging de la PWA:', err);
    return false;
  }
}

/**
 * Limpia el badge del icono de la PWA.
 */
export async function clearAppBadge(): Promise<boolean> {
  return updateAppBadge(0);
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  // Evitar registrar en entornos locales que no sean HTTPS o desarrollo HMR si no se desea
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    if (typeof registration.update === 'function') {
      registration.update().catch((err) => {
        console.warn('No se pudo actualizar el Service Worker en segundo plano:', err);
      });
    }
    return registration;
  } catch (error) {
    console.warn('Registro de Service Worker omitido o no soportado:', error);
    return null;
  }
}

export async function subscribeToWebPush(): Promise<WebPushSubscriptionRecord | null> {
  if (
    typeof window === 'undefined' ||
    !('serviceWorker' in navigator) ||
    !('PushManager' in window)
  ) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    if (!registration?.pushManager) return null;

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      const res = await fetch('/api/push/vapid-key');
      if (!res.ok) return null;
      const data = (await res.json()) as { publicKey?: string };
      if (!data.publicKey) return null;

      const keyBytes = base64UrlDecode(data.publicKey);
      const appServerKey = new Uint8Array(keyBytes.byteLength);
      appServerKey.set(keyBytes);

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: appServerKey.buffer,
      });
    }

    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      return null;
    }

    return {
      endpoint: json.endpoint,
      keys: {
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
      },
      updated_at: Date.now(),
    };
  } catch (err) {
    console.warn('No se pudo suscribir a Web Push:', err);
    return null;
  }
}

export async function getCurrentWebPushEndpoint(): Promise<string | null> {
  if (
    typeof window === 'undefined' ||
    !('serviceWorker' in navigator) ||
    !('PushManager' in window)
  ) {
    return null;
  }
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    const sub = await registration?.pushManager?.getSubscription();
    return sub?.endpoint ?? null;
  } catch {
    return null;
  }
}

export async function unsubscribeFromWebPush(): Promise<string | null> {
  if (
    typeof window === 'undefined' ||
    !('serviceWorker' in navigator) ||
    !('PushManager' in window)
  ) {
    return null;
  }
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    const sub = await registration?.pushManager?.getSubscription();
    if (!sub) return null;
    const endpoint = sub.endpoint;
    await sub.unsubscribe();
    return endpoint;
  } catch {
    return null;
  }
}
