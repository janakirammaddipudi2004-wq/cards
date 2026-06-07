function normalizeUrl(url: string) {
  return url.replace(/\/+$/, '');
}

function inferBackendUrl() {
  const configuredUrl = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL;
  if (configuredUrl) {
    return normalizeUrl(configuredUrl);
  }

  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;

    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3001';
    }

    if (hostname.includes('frontend')) {
      return `${protocol}//${hostname.replace('frontend', 'backend')}`;
    }
  }

  return 'http://localhost:3001';
}

export const BACKEND_URL = inferBackendUrl();
export const API_URL = normalizeUrl(import.meta.env.VITE_API_URL || BACKEND_URL);
