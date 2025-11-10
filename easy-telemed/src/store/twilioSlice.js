import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

const API_BASE = import.meta?.env?.VITE_BACKEND_URL || "http://localhost:3001";

export const fetchTwilioToken = createAsyncThunk(
  "twilio/fetchToken",
  async ({ identity, roomName }, { rejectWithValue }) => {
    if (!identity || !roomName) {
      return rejectWithValue("Identity and room name are required");
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const response = await fetch(`${API_BASE}/api/twilio/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ identity, roomName }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(`Token API not available (${response.status}) ${text}`.trim());
      }

      const data = await response.json();
      if (!data?.token) {
        throw new Error('Token API response missing "token" field');
      }

      return {
        identity,
        roomName,
        token: data.token,
      };
    } catch (error) {
      return rejectWithValue(error?.message || "Failed to fetch Twilio token");
    }
  }
);

const toKey = ({ identity, roomName }) => `${identity || ""}::${roomName || ""}`;

const twilioSlice = createSlice({
  name: "twilio",
  initialState: {
    tokens: {},
    loading: {},
    errors: {},
  },
  reducers: {
    clearTwilioToken: (state, action) => {
      const key = toKey(action.payload || {});
      delete state.tokens[key];
      delete state.loading[key];
      delete state.errors[key];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTwilioToken.pending, (state, action) => {
        const key = toKey(action.meta.arg || {});
        state.loading[key] = true;
        state.errors[key] = null;
      })
      .addCase(fetchTwilioToken.fulfilled, (state, action) => {
        const key = toKey(action.payload || {});
        state.loading[key] = false;
        state.tokens[key] = action.payload?.token;
        state.errors[key] = null;
      })
      .addCase(fetchTwilioToken.rejected, (state, action) => {
        const key = toKey(action.meta.arg || {});
        state.loading[key] = false;
        state.errors[key] = action.payload || action.error?.message || "Failed to fetch Twilio token";
      });
  },
});

export const { clearTwilioToken } = twilioSlice.actions;

export const selectTwilioState = (state) => state.twilio || { tokens: {}, loading: {}, errors: {} };
export const selectTwilioToken = (state, identity, roomName) => {
  const key = toKey({ identity, roomName });
  const twilio = selectTwilioState(state);
  return {
    token: twilio.tokens?.[key] || null,
    loading: Boolean(twilio.loading?.[key]),
    error: twilio.errors?.[key] || null,
  };
};

export default twilioSlice.reducer;
