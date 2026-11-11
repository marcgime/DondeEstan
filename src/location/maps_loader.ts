let loadPromise: Promise<void> | null = null;

export function loadGoogleMaps(apiKey?: string): Promise<void> {
  const key = apiKey || import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  if (typeof window !== 'undefined' && (window as unknown as { google?: { maps?: unknown } }).google?.maps) {
    return Promise.resolve();
  }

  if (loadPromise) {
    return loadPromise;
  }

  if (!key) {
    return Promise.reject(new Error('Clave VITE_GOOGLE_MAPS_API_KEY no configurada.'));
  }

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      key
    )}&libraries=marker,places&loading=async`;
    script.async = true;
    script.defer = true;

    script.onload = () => resolve();
    script.onerror = () => {
      loadPromise = null;
      reject(new Error('Error al cargar Google Maps JavaScript API.'));
    };

    document.head.appendChild(script);
  });

  return loadPromise;
}
