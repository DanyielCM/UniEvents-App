import { apiFetch } from "./api.js";

async function handleJson(resp) {
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${resp.status}`);
  }
  return resp.json();
}

export async function submitFeedback(eventId, data) {
  return handleJson(
    await apiFetch(`/feedback/events/${eventId}`, {
      method: "POST",
      body: JSON.stringify(data),
    })
  );
}

export async function getMyFeedback(eventId) {
  const resp = await apiFetch(`/feedback/events/${eventId}/mine`);
  if (resp.status === 404) return null;
  return handleJson(resp);
}

export async function getPublicFeedbackSummary(eventId) {
  const resp = await apiFetch(`/public/events/${eventId}/feedback-summary`);
  if (!resp.ok) return null;
  return resp.json();
}

export async function getEventFeedback(eventId) {
  return handleJson(await apiFetch(`/feedback/events/${eventId}`));
}

export async function getEventFeedbackSummary(eventId) {
  return handleJson(await apiFetch(`/feedback/events/${eventId}/summary`));
}
