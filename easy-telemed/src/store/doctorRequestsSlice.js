import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { supabase } from "../api/SupabaseClient";

export const fetchDoctorRequestList = createAsyncThunk(
  "doctorRequests/fetchDoctorRequestList",
  async (_, { rejectWithValue }) => {
    try {
      const { data, error } = await supabase
        .from("v_provider_applications_with_user")
        .select("*")
        .eq("role_requested", "doctor")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) {
        throw error;
      }
      return data || [];
    } catch (error) {
      return rejectWithValue(error?.message || "Failed to load doctor requests");
    }
  }
);

export const approveDoctorRequest = createAsyncThunk(
  "doctorRequests/approveDoctorRequest",
  async ({ applicationId, userId, reviewerId }, { rejectWithValue }) => {
    try {
      const updates = [];

      if (applicationId) {
        updates.push(
          supabase
            .from("provider_applications")
            .update({
              status: "approved",
              reviewed_at: new Date().toISOString(),
              reviewer_admin_id: reviewerId || null,
            })
            .eq("application_id", applicationId)
        );
      }

      if (userId) {
        updates.push(
          supabase
            .from("app_users")
            .update({
              verify: true,
              role: "doctor",
              verified_at: new Date().toISOString(),
            })
            .eq("user_id", userId)
        );
      }

      await Promise.all(updates);
      return { applicationId, userId };
    } catch (error) {
      return rejectWithValue(error?.message || "Failed to approve doctor request");
    }
  }
);

export const rejectDoctorRequest = createAsyncThunk(
  "doctorRequests/rejectDoctorRequest",
  async ({ applicationId, reason, reviewerId }, { rejectWithValue }) => {
    if (!applicationId) {
      return rejectWithValue("Application ID is required");
    }
    try {
      await supabase
        .from("provider_applications")
        .update({
          status: "rejected",
          rejection_reason: reason || null,
          reviewed_at: new Date().toISOString(),
          reviewer_admin_id: reviewerId || null,
        })
        .eq("application_id", applicationId);
      return { applicationId };
    } catch (error) {
      return rejectWithValue(error?.message || "Failed to reject doctor request");
    }
  }
);

export const fetchDoctorRequestCount = createAsyncThunk(
  "doctorRequests/fetchCount",
  async (_, { rejectWithValue }) => {
    try {
      const { count, error } = await supabase
        .from("app_users")
        .select("*", { count: "exact", head: true })
        .eq("role", "doctor")
        .eq("verify", false);
      if (error) throw error;
      return count || 0;
    } catch (error) {
      return rejectWithValue(error?.message || "Failed to load request count");
    }
  }
);

export const downloadDoctorCredential = createAsyncThunk(
  "doctorRequests/downloadCredential",
  async (path, { rejectWithValue }) => {
    if (!path) {
      return rejectWithValue("Credential path is required");
    }
    try {
      const { data, error } = await supabase.storage.from("credentials").download(path);
      if (error) {
        throw error;
      }
      const url = URL.createObjectURL(data);
      return { path, url };
    } catch (error) {
      return rejectWithValue(error?.message || "Failed to download credential");
    }
  }
);

const doctorRequestsSlice = createSlice({
  name: "doctorRequests",
  initialState: {
    list: [],
    loadingList: false,
    listError: null,
    submitting: false,
    submitError: null,
    count: 0,
    loadingCount: false,
    countError: null,
    downloads: {},
    downloadingPath: null,
    downloadError: null,
  },
  reducers: {
    resetDoctorRequests: (state) => {
      state.list = [];
      state.loadingList = false;
      state.listError = null;
      state.submitting = false;
      state.submitError = null;
      state.count = 0;
      state.loadingCount = false;
      state.countError = null;
      state.downloads = {};
      state.downloadingPath = null;
      state.downloadError = null;
    },
    clearDownload: (state, action) => {
      const path = action.payload;
      if (path && state.downloads[path]) {
        try {
          URL.revokeObjectURL(state.downloads[path]);
        } catch (error) {
          console.warn("Failed to revoke doctor credential URL", error);
        }
        delete state.downloads[path];
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDoctorRequestList.pending, (state) => {
        state.loadingList = true;
        state.listError = null;
      })
      .addCase(fetchDoctorRequestList.fulfilled, (state, action) => {
        state.loadingList = false;
        state.list = action.payload || [];
      })
      .addCase(fetchDoctorRequestList.rejected, (state, action) => {
        state.loadingList = false;
        state.listError = action.payload || "Failed to load doctor requests";
      })
      .addCase(fetchDoctorRequestCount.pending, (state) => {
        state.loadingCount = true;
        state.countError = null;
      })
      .addCase(fetchDoctorRequestCount.fulfilled, (state, action) => {
        state.loadingCount = false;
        state.count = action.payload || 0;
      })
      .addCase(fetchDoctorRequestCount.rejected, (state, action) => {
        state.loadingCount = false;
        state.countError = action.payload || "Failed to load request count";
      })
      .addCase(approveDoctorRequest.pending, (state) => {
        state.submitting = true;
        state.submitError = null;
      })
      .addCase(approveDoctorRequest.fulfilled, (state, action) => {
        state.submitting = false;
        state.list = state.list.filter(
          (app) => app.application_id !== action.payload.applicationId
        );
        state.count = Math.max(0, state.count - 1);
      })
      .addCase(approveDoctorRequest.rejected, (state, action) => {
        state.submitting = false;
        state.submitError = action.payload || "Failed to approve doctor request";
      })
      .addCase(rejectDoctorRequest.pending, (state) => {
        state.submitting = true;
        state.submitError = null;
      })
      .addCase(rejectDoctorRequest.fulfilled, (state, action) => {
        state.submitting = false;
        state.list = state.list.filter(
          (app) => app.application_id !== action.payload.applicationId
        );
        state.count = Math.max(0, state.count - 1);
      })
      .addCase(rejectDoctorRequest.rejected, (state, action) => {
        state.submitting = false;
        state.submitError = action.payload || "Failed to reject doctor request";
      })
      .addCase(downloadDoctorCredential.pending, (state, action) => {
        state.downloadingPath = action.meta.arg;
        state.downloadError = null;
      })
      .addCase(downloadDoctorCredential.fulfilled, (state, action) => {
        state.downloadingPath = null;
        const { path, url } = action.payload;
        state.downloads[path] = url;
      })
      .addCase(downloadDoctorCredential.rejected, (state, action) => {
        state.downloadingPath = null;
        state.downloadError = action.payload || "Failed to download credential";
      });
  },
});

export const { resetDoctorRequests, clearDownload } = doctorRequestsSlice.actions;
export default doctorRequestsSlice.reducer;
