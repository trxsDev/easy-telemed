import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
// Fetch from backend API instead of calling Supabase directly
async function fetchAvailabilityAPI() {
  const base = import.meta.env?.VITE_BACKEND_URL || "http://localhost:3001";
  const resp = await fetch(`${base}/api/availability/specialty-availability`, { credentials: 'include' });
  if (!resp.ok) throw new Error(`Backend error ${resp.status}`);
  return resp.json();
}

export const loadSpecialtyAvailability = createAsyncThunk(
  "availability/loadSpecialtyAvailability",
  async (_, { rejectWithValue }) => {
    try {
      const { doctors, stats } = await fetchAvailabilityAPI();
      return { doctors, stats };
    } catch (error) {
      return rejectWithValue(error?.message || "Failed to load availability");
    }
  }
);

const availabilitySlice = createSlice({
  name: "availability",
  initialState: {
    loading: false,
    error: null,
    doctors: [],
    stats: {},
    lastUpdated: null,
  },
  reducers: {
    resetAvailability: (state) => {
      state.loading = false;
      state.error = null;
      state.doctors = [];
      state.stats = {};
      state.lastUpdated = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadSpecialtyAvailability.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadSpecialtyAvailability.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        state.doctors = action.payload.doctors || [];
        state.stats = action.payload.stats || {};
        state.lastUpdated = Date.now();
      })
      .addCase(loadSpecialtyAvailability.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to load availability";
      });
  },
});

export const { resetAvailability } = availabilitySlice.actions;
export default availabilitySlice.reducer;
