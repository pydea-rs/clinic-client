import { getApiBaseUrl } from '../api/client';

/**
 * Where to connect a socket.io namespace. socket.io reads a URL's path as the
 * namespace, so a base behind a path prefix (e.g. `/api` behind nginx) must go
 * into the engine `path` option instead: `/api` + `/chat` → url `<origin>/chat`,
 * path `/api/socket.io`.
 */
export function socketTarget(
  namespace: string,
  base: string = import.meta.env.VITE_WS_URL?.trim() || getApiBaseUrl(),
): { url: string; path: string } {
  const resolved = new URL(base, globalThis.location?.origin);
  const prefix = resolved.pathname.replace(/\/+$/, '');
  return { url: `${resolved.origin}${namespace}`, path: `${prefix}/socket.io` };
}
