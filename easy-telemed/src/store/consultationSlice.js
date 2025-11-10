import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_BACKEND_URL) ||
  "http://localhost:3001";

const withJson = async (url, options = {}) => {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    credentials: "include",
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const message = text || `HTTP ${res.status}`;
    throw new Error(message);
  }
  return res.json();
};

export const fetchConsultationDrugs = createAsyncThunk(
  "consultation/fetchDrugs",
  async (_, { rejectWithValue }) => {
    try {
      const data = await withJson(`${API_BASE}/api/consultations/drugs`, {
        headers: undefined,
      });
      return data?.drugs || [];
    } catch (error) {
      return rejectWithValue(error.message || "Failed to fetch drugs");
    }
  }
);

export const ensureConsultationPrescription = createAsyncThunk(
  "consultation/ensurePrescription",
  async ({ consultationId, issuedBy, note }, { rejectWithValue }) => {
    try {
      return await withJson(`${API_BASE}/api/consultations/${consultationId}/prescriptions`, {
        method: "POST",
        body: JSON.stringify({ issued_by: issuedBy, note: note || null }),
      });
    } catch (error) {
      return rejectWithValue(error.message || "Failed to create/get prescription");
    }
  }
);

export const addConsultationPrescriptionItems = createAsyncThunk(
  "consultation/addPrescriptionItems",
  async ({ prescriptionId, items }, { rejectWithValue }) => {
    try {
      return await withJson(
        `${API_BASE}/api/consultations/prescriptions/${prescriptionId}/items`,
        {
          method: "POST",
          body: JSON.stringify({ items }),
        }
      );
    } catch (error) {
      return rejectWithValue(error.message || "Failed to add prescription items");
    }
  }
);

export const upsertConsultationDischarge = createAsyncThunk(
  "consultation/upsertDischarge",
  async ({ consultationId, payload }, { rejectWithValue }) => {
    try {
      return await withJson(
        `${API_BASE}/api/consultations/${consultationId}/discharge-summary`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      );
    } catch (error) {
      return rejectWithValue(error.message || "Failed to upsert discharge summary");
    }
  }
);

export const markConsultationStarted = createAsyncThunk(
  "consultation/markStarted",
  async ({ consultationId, roomId }, { rejectWithValue }) => {
    try {
      return await withJson(`${API_BASE}/api/consultations/${consultationId}/start`, {
        method: "POST",
        body: JSON.stringify(roomId ? { room_id: roomId } : {}),
      });
    } catch (error) {
      return rejectWithValue(error.message || "Failed to start consultation");
    }
  }
);

export const moveConsultationToSummarizing = createAsyncThunk(
  "consultation/moveToSummarizing",
  async ({ consultationId }, { rejectWithValue }) => {
    try {
      return await withJson(`${API_BASE}/api/consultations/${consultationId}/summarize`, {
        method: "POST",
      });
    } catch (error) {
      return rejectWithValue(error.message || "Failed to move to summarizing");
    }
  }
);

export const pauseConsultationById = createAsyncThunk(
  "consultation/pause",
  async ({ consultationId }, { rejectWithValue }) => {
    try {
      return await withJson(`${API_BASE}/api/consultations/${consultationId}/pause`, {
        method: "POST",
      });
    } catch (error) {
      return rejectWithValue(error.message || "Failed to pause consultation");
    }
  }
);

export const completeConsultationSummary = createAsyncThunk(
  "consultation/completeSummary",
  async ({ consultationId }, { rejectWithValue }) => {
    try {
      return await withJson(
        `${API_BASE}/api/consultations/${consultationId}/summary/complete`,
        {
          method: "POST",
        }
      );
    } catch (error) {
      return rejectWithValue(error.message || "Failed to complete summary");
    }
  }
);

export const moveConsultationToAwaitingPayment = createAsyncThunk(
  "consultation/moveToAwaitingPayment",
  async ({ consultationId }, { rejectWithValue }) => {
    try {
      return await withJson(
        `${API_BASE}/api/consultations/${consultationId}/awaiting-payment`,
        {
          method: "POST",
        }
      );
    } catch (error) {
      return rejectWithValue(error.message || "Failed to move to awaiting payment");
    }
  }
);

export const endConsultationById = createAsyncThunk(
  "consultation/end",
  async ({ consultationId }, { rejectWithValue }) => {
    try {
      return await withJson(`${API_BASE}/api/consultations/${consultationId}/end`, {
        method: "POST",
      });
    } catch (error) {
      return rejectWithValue(error.message || "Failed to end consultation");
    }
  }
);

export const markConsultationAsPaid = createAsyncThunk(
  "consultation/markPaid",
  async ({ consultationId, payload }, { rejectWithValue }) => {
    try {
      return await withJson(`${API_BASE}/api/consultations/${consultationId}/paid`, {
        method: "POST",
        body: JSON.stringify(payload || {}),
      });
    } catch (error) {
      return rejectWithValue(error.message || "Failed to mark consultation as paid");
    }
  }
);

const initialState = {
  drugs: [],
  loadingDrugs: false,
  drugsError: null,
  actionStatus: {},
  actionError: null,
};

const setActionStatus = (state, action, status, error) => {
  state.actionStatus[action.typePrefix] = status;
  if (status === "rejected") {
    state.actionError = error || null;
  }
};

const consultationSlice = createSlice({
  name: "consultation",
  initialState,
  reducers: {
    resetConsultationState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchConsultationDrugs.pending, (state) => {
        state.loadingDrugs = true;
        state.drugsError = null;
      })
      .addCase(fetchConsultationDrugs.fulfilled, (state, action) => {
        state.loadingDrugs = false;
        state.drugs = action.payload || [];
        state.drugsError = null;
      })
      .addCase(fetchConsultationDrugs.rejected, (state, action) => {
        state.loadingDrugs = false;
        state.drugsError = action.payload || "Failed to fetch drugs";
      });

    const trackedThunks = [
      ensureConsultationPrescription,
      addConsultationPrescriptionItems,
      upsertConsultationDischarge,
      markConsultationStarted,
      moveConsultationToSummarizing,
      pauseConsultationById,
      completeConsultationSummary,
      moveConsultationToAwaitingPayment,
      endConsultationById,
      markConsultationAsPaid,
    ];

    trackedThunks.forEach((thunk) => {
      builder
        .addCase(thunk.pending, (state, action) => {
          setActionStatus(state, action, "pending");
        })
        .addCase(thunk.fulfilled, (state, action) => {
          setActionStatus(state, action, "fulfilled");
        })
        .addCase(thunk.rejected, (state, action) => {
          setActionStatus(
            state,
            action,
            "rejected",
            action.payload || action.error?.message || null
          );
        });
    });
  },
});

export const { resetConsultationState } = consultationSlice.actions;

export const selectConsultationDrugs = (state) => ({
  drugs: state.consultation.drugs,
  loading: state.consultation.loadingDrugs,
  error: state.consultation.drugsError,
});

export default consultationSlice.reducer;
