import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_BACKEND_URL) ||
  "http://localhost:3001";

const fetchJson = async (url, options = {}) => {
  const resp = await fetch(url, { credentials: "include", ...options });
  if (!resp.ok) {
    let msg = `HTTP ${resp.status}`;
    try {
      const e = await resp.json();
      msg = e.error || msg;
    } catch (error) {
      console.warn("Failed to parse matching error payload", error);
    }
    throw new Error(msg);
  }
  return resp.json();
};

export const fetchMatchingStatusByCase = createAsyncThunk(
  "matching/fetchStatusByCase",
  async (caseId, { rejectWithValue }) => {
    if (!caseId) return rejectWithValue("caseId required");
    try {
      return await fetchJson(`${API_BASE}/api/matching/status/by-case/${caseId}`);
    } catch (error) {
      return rejectWithValue(error.message || "Failed to fetch matching status");
    }
  }
);

export const fetchDoctorQueue = createAsyncThunk(
  "matching/fetchDoctorQueue",
  async (doctorId, { rejectWithValue }) => {
    if (!doctorId) return rejectWithValue("doctorId required");
    try {
      const res = await fetchJson(
        `${API_BASE}/api/matching/doctor-queue?doctorId=${encodeURIComponent(doctorId)}`
      );
      return res.items || [];
    } catch (error) {
      return rejectWithValue(error.message || "Failed to fetch doctor queue");
    }
  }
);

export const acceptMatchRequest = createAsyncThunk(
  "matching/acceptMatchRequest",
  async ({ requestId, doctorId }, { rejectWithValue }) => {
    if (!requestId || !doctorId) return rejectWithValue("requestId and doctorId required");
    try {
      const { request } = await fetchJson(`${API_BASE}/api/matching/requests/${requestId}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctorId }),
      });
      return request;
    } catch (error) {
      return rejectWithValue(error.message || "Failed to accept match request");
    }
  }
);

export const createConsultation = createAsyncThunk(
  "matching/createConsultation",
  async ({ caseId, patientId, doctorId, createdBy }, { rejectWithValue }) => {
    try {
      const { consultation } = await fetchJson(`${API_BASE}/api/matching/consultations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId, patientId, doctorId, createdBy }),
      });
      return consultation;
    } catch (error) {
      return rejectWithValue(error.message || "Failed to create consultation");
    }
  }
);

export const createMatchRequest = createAsyncThunk(
  "matching/createMatchRequest",
  async ({ caseId, specialty, mode, preferredDoctorId, expiresAt }, { rejectWithValue }) => {
    if (!caseId) return rejectWithValue("caseId is required for match request creation");
    try {
      const { request } = await fetchJson(`${API_BASE}/api/matching/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId, specialty, mode, preferredDoctorId, expiresAt }),
      });
      return request;
    } catch (error) {
      return rejectWithValue(error.message || "Failed to create match request");
    }
  }
);

export const cancelMatchRequest = createAsyncThunk(
  "matching/cancelMatchRequest",
  async (requestId, { rejectWithValue }) => {
    if (!requestId) return rejectWithValue("requestId required");
    try {
      const res = await fetchJson(`${API_BASE}/api/matching/requests/${requestId}/cancel`, {
        method: "POST",
      });
      try {
        localStorage.removeItem("activeCaseId");
      } catch (error) {
        console.warn("Failed to clear activeCaseId after cancel request", error);
      }
      return res;
    } catch (error) {
      return rejectWithValue(error.message || "Failed to cancel match request");
    }
  }
);

export const doctorHeartbeat = createAsyncThunk(
  "matching/doctorHeartbeat",
  async ({ doctorId, isActive = true }, { rejectWithValue }) => {
    if (!doctorId) return rejectWithValue("doctorId required");
    try {
      const { status } = await fetchJson(`${API_BASE}/api/doctor/heartbeat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctorId, isActive }),
      });
      return status;
    } catch (error) {
      return rejectWithValue(error.message || "Failed to send heartbeat");
    }
  }
);

const initialState = {
  doctorQueue: [],
  queueLoading: false,
  queueError: null,
  statusByCase: {},
  statusLoading: false,
  statusError: null,
  lastHeartbeat: null,
  actions: {},
  error: null,
};

const matchingSlice = createSlice({
  name: "matching",
  initialState,
  reducers: {
    resetMatchingState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDoctorQueue.pending, (state) => {
        state.queueLoading = true;
        state.queueError = null;
      })
      .addCase(fetchDoctorQueue.fulfilled, (state, action) => {
        state.queueLoading = false;
        state.doctorQueue = action.payload || [];
      })
      .addCase(fetchDoctorQueue.rejected, (state, action) => {
        state.queueLoading = false;
        state.queueError = action.payload || "Failed to fetch doctor queue";
      })
      .addCase(fetchMatchingStatusByCase.pending, (state) => {
        state.statusLoading = true;
        state.statusError = null;
      })
      .addCase(fetchMatchingStatusByCase.fulfilled, (state, action) => {
        state.statusLoading = false;
        if (action.meta?.arg) {
          state.statusByCase[action.meta.arg] = action.payload;
        }
      })
      .addCase(fetchMatchingStatusByCase.rejected, (state, action) => {
        state.statusLoading = false;
        state.statusError = action.payload || "Failed to fetch status";
      })
      .addCase(doctorHeartbeat.fulfilled, (state) => {
        state.lastHeartbeat = Date.now();
      });

    const tracked = [
      acceptMatchRequest,
      createConsultation,
      createMatchRequest,
      cancelMatchRequest,
    ];
    tracked.forEach((thunk) => {
      builder
        .addCase(thunk.pending, (state) => {
          state.actions[thunk.typePrefix] = "pending";
          state.error = null;
        })
        .addCase(thunk.fulfilled, (state) => {
          state.actions[thunk.typePrefix] = "fulfilled";
        })
        .addCase(thunk.rejected, (state, action) => {
          state.actions[thunk.typePrefix] = "rejected";
          state.error = action.payload || action.error?.message || null;
        });
    });
  },
});

export const { resetMatchingState } = matchingSlice.actions;
export const selectMatching = (state) => state.matching;
export const selectDoctorQueueState = (state) => ({
  requests: state.matching.doctorQueue,
  loading: state.matching.queueLoading,
  error: state.matching.queueError,
});

export default matchingSlice.reducer;
