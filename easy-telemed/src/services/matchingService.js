import specializations from "../specialization.json";

const SPECIALTY_BY_ID = new Map(specializations.map((spec) => [spec.id, spec]));
const SPECIALTY_BY_NAME = specializations.reduce((acc, spec) => {
  acc[spec.name.toLowerCase()] = spec;
  if (spec.name_th) {
    acc[spec.name_th.toLowerCase()] = spec;
  }
  return acc;
}, {});

const NORMALIZE = (value = "") => value.trim().toLowerCase();

const normalizeSpecialtyList = (specialtyValue) => {
  if (!specialtyValue) return [];
  if (Array.isArray(specialtyValue)) {
    return specialtyValue
      .filter(Boolean)
      .map((item) => (typeof item === "string" ? NORMALIZE(item) : item?.name && NORMALIZE(item.name)))
      .filter(Boolean);
  }
  if (typeof specialtyValue === "string") {
    const trimmedValue = specialtyValue.trim();

    if (
      (trimmedValue.startsWith("{") && trimmedValue.endsWith("}")) ||
      (trimmedValue.startsWith("[") && trimmedValue.endsWith("]"))
    ) {
      try {
        const parsed = JSON.parse(trimmedValue);
        if (Array.isArray(parsed)) {
          return parsed
            .map((item) => {
              if (typeof item === "string") {
                return NORMALIZE(item);
              }
              if (item?.name) {
                return NORMALIZE(item.name);
              }
              return null;
            })
            .filter(Boolean);
        }
        if (parsed && typeof parsed === "object") {
          if (parsed.name) {
            return [NORMALIZE(parsed.name)];
          }
          if (parsed.id && SPECIALTY_BY_ID.has(parsed.id)) {
            const spec = SPECIALTY_BY_ID.get(parsed.id);
            return [NORMALIZE(spec.name)];
          }
        }
      } catch {
        // Not JSON, fall through to Postgres array parsing
      }
    }

    if (trimmedValue.startsWith("{") && trimmedValue.endsWith("}")) {
      const inner = trimmedValue.slice(1, -1);
      return inner
        .split(",")
        .map((item) => item.replace(/^["']|["']$/g, ""))
        .map(NORMALIZE)
        .filter(Boolean);
    }

    return [NORMALIZE(trimmedValue)];
  }
  return [];
};

const API_BASE = import.meta?.env?.VITE_BACKEND_URL || "http://localhost:3001";
const fetchJson = async (url, options = {}) => {
  const resp = await fetch(url, { credentials: "include", ...options });
  if (!resp.ok) {
    let msg = `HTTP ${resp.status}`;
    try {
      const e = await resp.json();
      msg = e.error || msg;
    } catch {}
    throw new Error(msg);
  }
  return resp.json();
};

export const fetchActiveDoctors = async () => {
  // Fetch from backend
  const { doctors } = await fetchJson(`${API_BASE}/api/availability/specialty-availability`);
  return doctors || [];
};

export const fetchSpecialtyAvailability = async () => {
  // Use backend-provided stats directly
  const { doctors, stats } = await fetchJson(`${API_BASE}/api/availability/specialty-availability`);
  return { doctors: doctors || [], stats: stats || {} };
};

export const fetchActiveDoctorsBySpecialty = async (specialtyIdOrName) => {
  const targetSpec = typeof specialtyIdOrName === "number"
    ? SPECIALTY_BY_ID.get(specialtyIdOrName)
    : SPECIALTY_BY_NAME[NORMALIZE(String(specialtyIdOrName || ""))] || null;

  const { doctors, stats } = await fetchSpecialtyAvailability();
  if (targetSpec && stats?.[targetSpec.id]) {
    const bucket = stats[targetSpec.id];
    return { specialty: bucket.specialty, doctors: bucket.doctors, activeCount: bucket.activeCount };
  }

  // Fallback: filter doctors by specialties array in case stats missing
  const filtered = (doctors || []).filter((d) => (d.specialties || []).some((s) => s.id === targetSpec?.id));
  return { specialty: targetSpec, doctors: filtered, activeCount: filtered.length };
};

export const fetchMatchingStatusByCase = async (caseId) => {
  if (!caseId) throw new Error('caseId required');
  return fetchJson(`${API_BASE}/api/matching/status/by-case/${caseId}`);
};

export const cancelMatchRequest = async (requestId) => {
  if (!requestId) throw new Error('requestId required');
  const res = await fetchJson(`${API_BASE}/api/matching/requests/${requestId}/cancel`, {
    method: 'POST',
  });
  try { localStorage.removeItem('activeCaseId'); } catch {}
  return res;
};

export const fetchDoctorQueue = async (doctorId) => {
  if (!doctorId) throw new Error('doctorId required');
  const res = await fetchJson(`${API_BASE}/api/matching/doctor-queue?doctorId=${encodeURIComponent(doctorId)}`);
  return res.items || [];
};

export const acceptMatchRequestBackend = async ({ requestId, doctorId }) => {
  if (!requestId || !doctorId) throw new Error('requestId and doctorId required');
  const { request } = await fetchJson(`${API_BASE}/api/matching/requests/${requestId}/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ doctorId }),
  });
  return request;
};

export const createConsultationBackend = async ({ caseId, patientId, doctorId, createdBy }) => {
  const { consultation } = await fetchJson(`${API_BASE}/api/matching/consultations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ caseId, patientId, doctorId, createdBy }),
  });
  return consultation;
};

// Backend endpoint for creating match requests
const createMatchRequestApi = async (body) => {
  return fetchJson(`${API_BASE}/api/matching/requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
};

export const createMatchRequest = async ({
  caseId,
  specialty,
  mode,
  preferredDoctorId = null,
  expiresAt = null,
}) => {
  if (!caseId) throw new Error("caseId is required for match request creation");
  const { request } = await createMatchRequestApi({
    caseId,
    specialty,
    mode,
    preferredDoctorId,
    expiresAt,
  });
  return request;
};

// TODO: Replace with backend-driven SSE/WebSocket events
export const subscribeMatchRequest = (/* requestId, callback */) => {
  return () => {};
};

export const acceptMatchRequest = async ({ requestId, doctorId }) => {
  throw new Error("Not implemented on frontend; use backend endpoint");
};

export const updateMatchRequestStatus = async () => {
  throw new Error("Not implemented on frontend; use backend endpoint");
};

export const createConsultationIfMissing = async () => {
  throw new Error("Not implemented on frontend; use backend endpoint");
};

// Doctor presence heartbeat
export const doctorHeartbeat = async (doctorId, isActive = true) => {
  if (!doctorId) return null;
  const { status } = await fetchJson(`${API_BASE}/api/doctor/heartbeat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ doctorId, isActive }),
  });
  return status;
};
