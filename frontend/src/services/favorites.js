import { apiFetch, errorMessage } from "./api.js";

async function handleJson(resp) {
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(errorMessage(err, `HTTP ${resp.status}`));
  }
  return resp.json();
}

export async function getMyFavorites() {
  return handleJson(await apiFetch("/favorites/mine"));
}

export async function getMyFavoriteIds() {
  return handleJson(await apiFetch("/favorites/mine/ids"));
}

export async function addFavorite(eventId) {
  return handleJson(
    await apiFetch(`/favorites/events/${eventId}`, { method: "POST" })
  );
}

export async function removeFavorite(eventId) {
  const resp = await apiFetch(`/favorites/events/${eventId}`, {
    method: "DELETE",
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
}
