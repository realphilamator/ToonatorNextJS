export const API_URL = 
  process.env.NEXT_PUBLIC_API_URL || 
  process.env.API_URL || 
  "https://api.m2inc.dev/retoon"; // hardcoded fallback

if (!API_URL) {
  throw new Error("Missing NEXT_PUBLIC_API_URL environment variable.");
}

/**
 * Returns auth headers using the current user's JWT when logged in.
 */
export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export function setToken(token) {
  localStorage.setItem("token", token);
}

export function removeToken() {
  localStorage.removeItem("token");
}

/**
 * Decode JWT payload without a library (base64url → JSON)
 */
export function parseToken(token) {
  try {
    const payload = token.split(".")[1];
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

/**
 * Main API fetch helper — use this instead of supabaseRequest
 */
export async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const fullUrl = `${API_URL}${path}`;
  const method = options.method || 'GET';

  const res = await fetch(fullUrl, {
    ...options,
    headers,
  });

  if (!res.ok) return null;

  const data = await res.json();

  return data;
}