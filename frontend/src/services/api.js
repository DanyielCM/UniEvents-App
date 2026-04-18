const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api/v1";

let onUnauthorized = null;

export function setOnUnauthorized(callback) {
  onUnauthorized = callback;
}

function getAccessToken() {
  return localStorage.getItem("access_token");
}

export function setTokens(access, refresh) {
  localStorage.setItem("access_token", access);
  localStorage.setItem("refresh_token", refresh);
}

export function clearTokens() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}

async function refreshAccessToken() {
  const refreshToken = localStorage.getItem("refresh_token");
  if (!refreshToken) return false;

  const resp = await fetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!resp.ok) {
    clearTokens();
    return false;
  }

  const data = await resp.json();
  setTokens(data.access_token, data.refresh_token);
  return true;
}

// localStorage is used for token storage for simplicity.
// Trade-off: localStorage is vulnerable to XSS but immune to CSRF.
// httpOnly cookies would be more secure against XSS but require
// backend cookie handling and CSRF protection. For a university
// project, localStorage is acceptable with proper CSP headers.

export async function apiFetch(path, options = {}) {
  const token = getAccessToken();
  const headers = { ...options.headers };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (options.body && typeof options.body === "string") {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }

  let resp = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (resp.status === 401 && token) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      headers["Authorization"] = `Bearer ${getAccessToken()}`;
      resp = await fetch(`${API_BASE}${path}`, { ...options, headers });
    } else {
      onUnauthorized?.();
    }
  }

  return resp;
}
