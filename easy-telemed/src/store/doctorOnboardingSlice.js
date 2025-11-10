import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { supabase } from "../api/SupabaseClient";

const parseDocuments = (rawDocs) => {
  if (!rawDocs) return [];
  if (Array.isArray(rawDocs)) return rawDocs;
  if (typeof rawDocs === "string") {
    try {
      const parsed = JSON.parse(rawDocs);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

export const fetchDoctorApplication = createAsyncThunk(
  "doctorOnboarding/fetchApplication",
  async (userId, { rejectWithValue }) => {
    if (!userId) return rejectWithValue("User ID is required");
    try {
      const { data, error } = await supabase
        .from("provider_applications")
        .select("*")
        .eq("applicant_user_id", userId)
        .order("created_at", { ascending: false })
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (!data) {
        return { application: null, documents: [] };
      }

      return { application: data, documents: parseDocuments(data.documents) };
    } catch (error) {
      return rejectWithValue(error?.message || "Failed to load application");
    }
  }
);

export const uploadDoctorCredential = createAsyncThunk(
  "doctorOnboarding/uploadCredential",
  async ({ userId, file }, { rejectWithValue }) => {
    if (!userId) return rejectWithValue("User ID is required");
    if (!file) return rejectWithValue("File is required");

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!sessionData?.session) {
        throw new Error("User not authenticated");
      }

      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}_${Date.now()}_credentials.${fileExt}`;
      const filePath = `doctor_credentials/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("credentials")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      return filePath;
    } catch (error) {
      return rejectWithValue(error?.message || "Failed to upload credential");
    }
  }
);

export const submitDoctorApplication = createAsyncThunk(
  "doctorOnboarding/submitApplication",
  async ({ userId, applicationData, displayName }, { rejectWithValue }) => {
    if (!userId) return rejectWithValue("User ID is required");
    try {
      const hasExistingApplication = Boolean(applicationData?.application_id);
      const basePayload = {
        ...applicationData,
        applicant_user_id: userId,
        updated_at: new Date().toISOString(),
      };

      let savedApplication = null;

      if (hasExistingApplication) {
        const applicationId = basePayload.application_id;
        const updatePayload = { ...basePayload };
        delete updatePayload.application_id;

        const { data, error: updateError } = await supabase
          .from("provider_applications")
          .update(updatePayload)
          .eq("application_id", applicationId)
          .select("*")
          .maybeSingle();

        if (updateError) throw updateError;
        savedApplication = data || { ...basePayload, application_id: applicationId };
      } else {
        const insertPayload = { ...basePayload };
        delete insertPayload.application_id;
        const { data, error: insertError } = await supabase
          .from("provider_applications")
          .insert(insertPayload)
          .select("*")
          .maybeSingle();
        if (insertError) throw insertError;
        savedApplication = data || basePayload;
      }

      const { error: userError } = await supabase
        .from("app_users")
        .update({ display_name: displayName })
        .eq("user_id", userId);

      if (userError) {
        console.warn("Failed to update user display name", userError);
      }

      return { application: savedApplication };
    } catch (error) {
      return rejectWithValue(error?.message || "Failed to submit application");
    }
  }
);

const initialState = {
  application: null,
  documents: [],
  loading: false,
  submitting: false,
  uploading: false,
  error: null,
};

const doctorOnboardingSlice = createSlice({
  name: "doctorOnboarding",
  initialState,
  reducers: {
    resetDoctorOnboarding: () => initialState,
    removeDocumentPath: (state, action) => {
      state.documents = state.documents.filter((path) => path !== action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDoctorApplication.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDoctorApplication.fulfilled, (state, action) => {
        state.loading = false;
        state.application = action.payload.application;
        state.documents = action.payload.documents || [];
      })
      .addCase(fetchDoctorApplication.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to load application";
      })
      .addCase(uploadDoctorCredential.pending, (state) => {
        state.uploading = true;
        state.error = null;
      })
      .addCase(uploadDoctorCredential.fulfilled, (state, action) => {
        state.uploading = false;
        state.documents = [...state.documents, action.payload];
      })
      .addCase(uploadDoctorCredential.rejected, (state, action) => {
        state.uploading = false;
        state.error = action.payload || "Failed to upload credential";
      })
      .addCase(submitDoctorApplication.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(submitDoctorApplication.fulfilled, (state, action) => {
        state.submitting = false;
        state.application = action.payload.application;
      })
      .addCase(submitDoctorApplication.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload || "Failed to submit application";
      });
  },
});

export const { resetDoctorOnboarding, removeDocumentPath } = doctorOnboardingSlice.actions;

export const selectDoctorOnboarding = (state) => state.doctorOnboarding;
export const selectDoctorOnboardingState = selectDoctorOnboarding;

export default doctorOnboardingSlice.reducer;
