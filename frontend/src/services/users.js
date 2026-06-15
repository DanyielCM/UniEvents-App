import { apiFetch } from "./api.js";

async function handleJson(resp) {
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${resp.status}`);
  }
  return resp.json();
}

export async function getUsers(params = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== null && v !== undefined && v !== "") {
      qs.append(k, v);
    }
  }
  return handleJson(await apiFetch(`/users/?${qs}`));
}

export async function updateUser(userId, data) {
  return handleJson(
    await apiFetch(`/users/${userId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    })
  );
}
