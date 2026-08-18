export const API_URL = import.meta.env.VITE_API_URL ?? "/api";
export const DEFAULT_ZOOM = 75;
export const MIN_ZOOM = 40;
export const MAX_ZOOM = 200;
export const ZOOM_STEP = 15;

export function assetUrl(path) {
  if (API_URL === "/api") return path;
  return `${API_URL.replace(/\/api\/?$/, "")}${path}`;
}
