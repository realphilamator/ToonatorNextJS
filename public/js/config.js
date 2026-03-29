// ============================================================
// Config
// ============================================================

const API_URL = "https://api.m2inc.dev/retoon";

function getToken() {
  return localStorage.getItem("token");
}

function setToken(token) {
  localStorage.setItem("token", token);
}

function removeToken() {
  localStorage.removeItem("token");
}

// Decode JWT payload without a library (base64url → JSON)
function parseToken(token) {
  try {
    const payload = token.split(".")[1];
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const fullUrl = `${API_URL}${path}`;
  const method = options.method || 'GET';

  const res = await fetch(fullUrl, { ...options, headers });
  if (!res.ok) return null;

  const data = await res.json();

  return data;
}

let _currentUserCache = null;

async function getCurrentUser() {
  const token = getToken();
  if (!token) return null;

  const payload = parseToken(token);
  if (!payload) { removeToken(); return null; }

  // Check token expiry
  if (payload.exp && payload.exp * 1000 < Date.now()) {
    removeToken();
    _currentUserCache = null;
    return null;
  }

  let profile;

  if (!_currentUserCache) {
    profile = await apiFetch("/profiles/me");
    if (!profile) { removeToken(); _currentUserCache = null; return null; }
    _currentUserCache = profile;
  }
  else {
    profile = _currentUserCache;
  }

  return {
    id: profile.id,
    email: payload.email,
    username: profile.username,
    spiders: profile.spiders ?? 0,
    avatar_toon: profile.avatar_toon,
    role: profile.role,
  };
}