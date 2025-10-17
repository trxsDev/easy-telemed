const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_BACKEND_URL) || 'http://localhost:3001';

export async function markConsultationStarted(consultationId, roomSidOrId) {
  const res = await fetch(`${API_BASE}/api/consultations/${consultationId}/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    // Server schema supports room_id; map provided value to room_id if present
    body: JSON.stringify(roomSidOrId ? { room_id: roomSidOrId } : {}),
  });
  if (!res.ok) throw new Error(`Failed to start consultation: ${res.status}`);
  return res.json();
}

export async function moveToSummarizing(consultationId) {
  const res = await fetch(`${API_BASE}/api/consultations/${consultationId}/summarize`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`Failed to move to summarizing: ${res.status}`);
  return res.json();
}

export async function endConsultation(consultationId) {
  const res = await fetch(`${API_BASE}/api/consultations/${consultationId}/end`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`Failed to end consultation: ${res.status}`);
  return res.json();
}

export async function fetchDrugs() {
  const res = await fetch(`${API_BASE}/api/consultations/drugs`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch drugs');
  return res.json();
}

export async function ensurePrescription(consultationId, issuedBy, note) {
  const res = await fetch(`${API_BASE}/api/consultations/${consultationId}/prescriptions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ issued_by: issuedBy, note: note || null }),
  });
  if (!res.ok) throw new Error('Failed to create/get prescription');
  return res.json();
}

export async function addPrescriptionItems(prescriptionId, items) {
  const res = await fetch(`${API_BASE}/api/consultations/prescriptions/${prescriptionId}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ items }),
  });
  if (!res.ok) throw new Error('Failed to add prescription items');
  return res.json();
}

export async function upsertDischargeSummary(consultationId, payload) {
  const res = await fetch(`${API_BASE}/api/consultations/${consultationId}/discharge-summary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to upsert discharge summary');
  return res.json();
}

export default {
  markConsultationStarted,
  moveToSummarizing,
  endConsultation,
  fetchDrugs,
  ensurePrescription,
  addPrescriptionItems,
  upsertDischargeSummary,
};
