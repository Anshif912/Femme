export function jwtDecode<T = any>(token: string): T {
  // Simple base64 payload decode (no verification). Uses atob for browser compatibility.
  try {
    const payload = token.split('.')[1] ?? '';
    // atob may throw if not valid base64
    const decoded = atob(payload);
    return JSON.parse(decoded) as T;
  } catch (e) {
    // Return empty object on failure to keep runtime safe.
    return {} as T;
  }
}
