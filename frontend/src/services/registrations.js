import { apiFetch } from "./api.js";

async function handleJson(resp) {
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${resp.status}`);
  }
  return resp.json();
}

export async function getRegistrationInfo(eventId) {
  const resp = await apiFetch(`/public/events/${eventId}/registration-info`);
  if (!resp.ok) return null;
  return resp.json();
}

export async function getMyRegistrations() {
  return handleJson(await apiFetch("/registrations/mine"));
}

export async function getMyRegistrationForEvent(eventId) {
  const resp = await apiFetch(`/registrations/events/${eventId}/mine`);
  if (resp.status === 404) return null;
  return handleJson(resp);
}

export async function registerForEvent(eventId) {
  return handleJson(
    await apiFetch(`/registrations/events/${eventId}`, { method: "POST" })
  );
}

export async function cancelRegistration(eventId) {
  const resp = await apiFetch(`/registrations/events/${eventId}`, { method: "DELETE" });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${resp.status}`);
  }
}

export async function getParticipants(eventId, statusFilter = null) {
  const qs = statusFilter ? `?status_filter=${statusFilter}` : "";
  return handleJson(await apiFetch(`/registrations/events/${eventId}/participants${qs}`));
}

export async function checkinParticipant(eventId, ticketToken) {
  return handleJson(
    await apiFetch(`/registrations/events/${eventId}/check-in`, {
      method: "POST",
      body: JSON.stringify({ ticket_token: ticketToken }),
    })
  );
}
