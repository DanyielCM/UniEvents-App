import { apiFetch } from "./api.js";

// ── Public (unauthenticated) ────────────────────────────────────────────────

export async function getPublicEvents(params = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== null && v !== undefined && v !== "" && v !== false) {
      qs.append(k, v);
    }
  }
  return handleJson(await apiFetch(`/public/events?${qs}`));
}

export async function getPublicEvent(id) {
  return handleJson(await apiFetch(`/public/events/${id}`));
}

export async function getPublicOrganizers() {
  return handleJson(await apiFetch("/public/organizers"));
}

// ── Private (authenticated) ─────────────────────────────────────────────────

async function handleJson(resp) {
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${resp.status}`);
  }
  return resp.json();
}

export async function getCategories() {
  return handleJson(await apiFetch("/categories"));
}

export async function getLocations() {
  return handleJson(await apiFetch("/locations"));
}

export async function getMyEvents(statusFilter = null) {
  const qs = statusFilter ? `?status_filter=${statusFilter}` : "";
  return handleJson(await apiFetch(`/events/mine${qs}`));
}

export async function getEvent(id) {
  return handleJson(await apiFetch(`/events/${id}`));
}

export async function createEvent(data) {
  return handleJson(
    await apiFetch("/events", { method: "POST", body: JSON.stringify(data) })
  );
}

export async function updateEvent(id, data) {
  return handleJson(
    await apiFetch(`/events/${id}`, { method: "PATCH", body: JSON.stringify(data) })
  );
}

export async function deleteEvent(id) {
  const resp = await apiFetch(`/events/${id}`, { method: "DELETE" });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${resp.status}`);
  }
}

export async function submitEvent(id) {
  return handleJson(await apiFetch(`/events/${id}/submit`, { method: "POST" }));
}

export async function uploadCover(id, file) {
  const body = new FormData();
  body.append("cover", file);
  return handleJson(await apiFetch(`/events/${id}/cover`, { method: "POST", body }));
}

export async function getPendingEvents() {
  return handleJson(await apiFetch("/events/pending"));
}

export async function approveEvent(id) {
  return handleJson(await apiFetch(`/events/${id}/approve`, { method: "POST" }));
}

export async function rejectEvent(id, reason) {
  return handleJson(
    await apiFetch(`/events/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    })
  );
}

export async function addSponsor(eventId, { name, websiteUrl, displayOrder, logoFile }) {
  const body = new FormData();
  body.append("name", name);
  if (websiteUrl) body.append("website_url", websiteUrl);
  body.append("display_order", String(displayOrder ?? 0));
  if (logoFile) body.append("logo", logoFile);
  return handleJson(
    await apiFetch(`/events/${eventId}/sponsors`, { method: "POST", body })
  );
}

// ── Materials ────────────────────────────────────────────────────────────────

export async function getPublicEventMaterials(eventId) {
  return handleJson(await apiFetch(`/public/events/${eventId}/materials`));
}

export async function getEventMaterials(eventId) {
  return handleJson(await apiFetch(`/events/${eventId}/materials`));
}

export async function deleteMaterial(eventId, materialId) {
  const resp = await apiFetch(`/events/${eventId}/materials/${materialId}`, {
    method: "DELETE",
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
}

export async function removeSponsor(eventId, sponsorId) {
  const resp = await apiFetch(`/events/${eventId}/sponsors/${sponsorId}`, {
    method: "DELETE",
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
}
