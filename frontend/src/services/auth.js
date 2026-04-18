import { apiFetch, setTokens, clearTokens } from "./api";

export async function loginWithCredentials(email, password) {
  const resp = await fetch(
    `${import.meta.env.VITE_API_BASE_URL || "/api/v1"}/auth/login`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    },
  );

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.detail || "Autentificarea a eșuat.");
  }

  const data = await resp.json();
  setTokens(data.access_token, data.refresh_token);
  return data;
}

export async function loginWithGoogle(accessToken) {
  const resp = await fetch(
    `${import.meta.env.VITE_API_BASE_URL || "/api/v1"}/auth/google`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_token: accessToken }),
    },
  );

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.detail || "Autentificarea cu Google a eșuat.");
  }

  const data = await resp.json();
  setTokens(data.access_token, data.refresh_token);
  return data;
}

export async function fetchCurrentUser() {
  const resp = await apiFetch("/auth/me");
  if (!resp.ok) return null;
  return resp.json();
}

export async function logout() {
  await apiFetch("/auth/logout", { method: "POST" }).catch(() => {});
  clearTokens();
}
